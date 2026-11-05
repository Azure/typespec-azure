import { expect, test } from "@playwright/test";

const host = `http://localhost:5174`;
const csharpEmitters = [
  "@azure-typespec/http-client-csharp",
  "@azure-typespec/http-client-csharp-mgmt",
  "@azure-typespec/http-client-csharp-provisioning",
];
const server = "https://csharp-playground-server.azurewebsites.net";
const storage = "https://typespec.blob.core.windows.net/pkgs";
const generators = csharpEmitters.map((packageName, index) => ({
  packageName,
  packageVersion: `1.0.${index}`,
  generatorName: ["AzureClientGenerator", "ManagementClientGenerator", "ProvisioningGenerator"][
    index
  ],
}));

test.beforeEach(async ({ page }) => {
  await page.route(`${server}/generators`, (route) =>
    route.fulfill({
      headers: { "access-control-allow-origin": "*" },
      json: { generators },
    }),
  );
  for (const { packageName, packageVersion } of generators) {
    const base = `${storage}/${packageName}/${packageVersion}`;
    await page.route(`${base}/import-map.json`, (route) =>
      route.fulfill({
        headers: { "access-control-allow-origin": "*" },
        json: {
          version: packageVersion,
          imports: {
            [packageName]: `${base}/index.js`,
            "@typespec/http-client": `${base}/peer.js`,
          },
        },
      }),
    );
    await page.route(`${base}/peer.js`, (route) =>
      route.fulfill({
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/javascript",
        body: `export const runtimeVersion = ${JSON.stringify(packageVersion)};`,
      }),
    );
  }
});

test("loads Azure C# emitters on demand at each server's package version", async ({ page }) => {
  const loadedEmitters: string[] = [];
  for (const { packageName: name, packageVersion } of generators) {
    await page.route(`${storage}/${name}/${packageVersion}/index.js`, (route) => {
      loadedEmitters.push(name);
      return route.fulfill({
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/javascript",
        body: `
            import { runtimeVersion } from "@typespec/http-client";
            export const $lib = { name: ${JSON.stringify(name)}, emitter: {} };
            const $onEmit = async ({ program, emitterOutputDir }) => {
              await program.host.writeFile(emitterOutputDir + "/Widget.cs", "// " + runtimeVersion + "\\npublic class Widget {}");
            };
            export const _TypeSpecLibrary_ = {
              typespecSourceFiles: {
                "package.json": ${JSON.stringify(JSON.stringify({ name, version: packageVersion, main: "index.js" }))},
              },
              jsSourceFiles: { "index.js": { $lib, $onEmit } },
            };
          `,
      });
    });
  }

  await page.goto(host);
  await page.waitForFunction(() => (window as any).host !== undefined);
  expect(loadedEmitters).toEqual([]);

  for (const { packageName: name, packageVersion } of generators) {
    const output = await page.evaluate(async (emitter) => {
      const { host: browserHost, compiler } = window as any;
      await browserHost.loadLibrary(emitter);
      await browserHost.writeFile("/test/csharp.tsp", "@service namespace Playground;");
      const program = await compiler.compile(browserHost, "/test/csharp.tsp", {
        emit: [emitter],
        outputDir: "/test/csharp-output",
      });
      if (program.hasError()) {
        throw new Error(program.diagnostics.map((x: any) => x.message).join("\n"));
      }
      return (await browserHost.readFile(`/test/csharp-output/${emitter}/Widget.cs`)).text;
    }, name);
    expect(output).toContain("public class Widget");
    expect(output).toContain(`// ${packageVersion}`);
  }
  expect(loadedEmitters).toEqual(csharpEmitters);
});

for (const failure of ["catalog", "browser map"]) {
  test(`keeps existing emitters usable when the C# ${failure} is unavailable`, async ({ page }) => {
    await page.route(
      failure === "catalog"
        ? `${server}/generators`
        : `${storage}/${generators[0].packageName}/${generators[0].packageVersion}/import-map.json`,
      (route) =>
        route.fulfill({ status: 503, headers: { "access-control-allow-origin": "*" }, body: "" }),
    );
    await page.goto(host);
    await expect(
      page.getByText("Azure C# emitters are unavailable", { exact: false }),
    ).toBeVisible();
    await page.waitForFunction(() => (window as any).host !== undefined);
    expect(
      await page.evaluate(async () => {
        const { host: browserHost, compiler } = window as any;
        await browserHost.writeFile(
          "/test/existing.tsp",
          'import "@typespec/http"; model Widget {}',
        );
        const program = await compiler.compile(browserHost, "/test/existing.tsp", {});
        return program.hasError();
      }),
    ).toBe(false);
  });
}

test.describe("typespec-azure-playground-website UI tests", () => {
  test.skip(process.platform === "win32", "https://github.com/microsoft/typespec/issues/1223");

  test("compiled arm sample", async ({ page }) => {
    await page.goto(host);
    const samplesButton = page.locator('button[aria-label="Browse samples"]');
    await samplesButton.click();
    await page.locator("text=Azure Core Scalars").first().click();
    // Check the version is there
    await expect(page.getByText(`"title": "Azure Core Scalars"`)).toBeVisible();
  });

  test("emits a Go client in the browser", async ({ page }) => {
    await page.goto(host);
    await page.waitForFunction(() => (window as any).host !== undefined);
    const result = await page.evaluate(async () => {
      const { host, compiler } = window as any;
      await host.writeFile(
        "/test/go.tsp",
        `
          import "@typespec/http";
          using TypeSpec.Http;
          @service
          namespace Playground;
          model Widget { name: string; }
          @get @route("/widgets/{name}")
          op getWidget(@path name: string): Widget;
        `,
      );
      const program = await compiler.compile(host, "/test/go.tsp", {
        emit: ["@azure-tools/typespec-go"],
        options: {
          "@azure-tools/typespec-go": {
            module: "example.com/playground",
            "generate-fakes": true,
          },
        },
        outputDir: "/test/go-output",
      });
      if (program.diagnostics.length > 0) {
        throw new Error(program.diagnostics.map((x: any) => x.message).join("\n"));
      }
      const outputDir = "/test/go-output/@azure-tools/typespec-go";
      return {
        models: (await host.readFile(`${outputDir}/models.go`)).text,
        client: (await host.readFile(`${outputDir}/playground_client.go`)).text,
        files: await host.readDir(`${outputDir}/fake`),
        metadata: JSON.parse((await host.readFile(`${outputDir}/testdata/_metadata.json`)).text),
      };
    });
    expect(result.models).toContain("type Widget struct");
    expect(result.client).toContain("func (client *PlaygroundClient) GetWidget");
    expect(result.files).toContain("playground_server.go");
    expect(result.metadata.emitterVersion).toBeTruthy();
  });
});
