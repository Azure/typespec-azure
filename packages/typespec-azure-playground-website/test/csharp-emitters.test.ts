import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCSharpEmitters } from "../src/csharp-emitters.js";

const server = "https://csharp-playground-server.azurewebsites.net";
const storage = "https://typespec.blob.core.windows.net/pkgs";
const generators = [
  {
    generatorName: "AzureClientGenerator",
    packageName: "@azure-typespec/http-client-csharp",
    packageVersion: "1.2.3-beta.1+build.2",
  },
  {
    generatorName: "ManagementClientGenerator",
    packageName: "@azure-typespec/http-client-csharp-mgmt",
    packageVersion: "4.5.6",
  },
  {
    generatorName: "ProvisioningGenerator",
    packageName: "@azure-typespec/http-client-csharp-provisioning",
    packageVersion: "7.8.9",
  },
];
const addImportMap = vi.fn();
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("importShim", { addImportMap });
  vi.stubGlobal("fetch", fetchMock);
  addImportMap.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    if (url === `${server}/generators`) {
      return Response.json({ generators });
    }
    for (const generator of generators) {
      const base = `${storage}/${generator.packageName}/${generator.packageVersion}/`;
      if (url === `${base}import-map.json`) {
        return Response.json({
          version: generator.packageVersion,
          imports: {
            [generator.packageName]: `${base}index.js`,
            "@typespec/http-client": `${storage}/@typespec/http-client/${generator.packageVersion}/index.js`,
          },
        });
      }
    }
    throw new Error(`Unexpected request: ${url}`);
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("Azure C# runtime versions", () => {
  it("uses each server package version instead of latest and scopes bundled peers", async () => {
    expect(await loadCSharpEmitters()).toEqual(generators.map((x) => x.packageName));
    const map = addImportMap.mock.calls[0][0];
    expect(Object.keys(map.imports)).toHaveLength(3);
    for (const generator of generators) {
      const base = `${storage}/${generator.packageName}/${generator.packageVersion}/`;
      expect(map.imports[generator.packageName]).toBe(`${base}index.js`);
      expect(map.scopes[base]["@typespec/http-client"]).toBe(
        `${storage}/@typespec/http-client/${generator.packageVersion}/index.js`,
      );
    }
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("reports catalog HTTP failures without registering mismatched emitters", async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 503 }));
    await expect(loadCSharpEmitters()).rejects.toThrow("HTTP 503");
    expect(addImportMap).not.toHaveBeenCalled();
  });

  it("requires metadata for every Azure runtime", async () => {
    fetchMock.mockResolvedValue(Response.json({ generators: generators.slice(0, 1) }));
    await expect(loadCSharpEmitters()).rejects.toThrow("all three");
    expect(addImportMap).not.toHaveBeenCalled();
  });

  it("rejects a package registered under the wrong generator", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        generators: [{ ...generators[0], generatorName: "ProvisioningGenerator" }],
      }),
    );
    await expect(loadCSharpEmitters()).rejects.toThrow("Invalid Azure C# generator catalog entry");
    expect(addImportMap).not.toHaveBeenCalled();
  });

  it("reports missing versioned browser maps rather than falling back to latest", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ generators }));
    fetchMock.mockResolvedValue(Response.json({}, { status: 404 }));
    await expect(loadCSharpEmitters()).rejects.toThrow("HTTP 404");
    expect(addImportMap).not.toHaveBeenCalled();
  });

  it("rejects browser maps for a different version", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ generators }));
    fetchMock.mockImplementation(async () => Response.json({ version: "0.0.0", imports: {} }));
    await expect(loadCSharpEmitters()).rejects.toThrow("Invalid browser import map");
    expect(addImportMap).not.toHaveBeenCalled();
  });

  it("rejects a bundle URL outside the matching package version", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ generators }));
    fetchMock.mockImplementation(async (url: string) => {
      const generator = generators.find((x) => url.includes(`${x.packageName}/`))!;
      return Response.json({
        version: generator.packageVersion,
        imports: { [generator.packageName]: `${storage}/${generator.packageName}/latest/index.js` },
      });
    });
    await expect(loadCSharpEmitters()).rejects.toThrow("Browser bundle does not match");
    expect(addImportMap).not.toHaveBeenCalled();
  });
});
