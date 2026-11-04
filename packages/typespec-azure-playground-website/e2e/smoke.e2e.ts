import { expect, test } from "@playwright/test";

const host = `http://localhost:5174`;
const csharpEmitters = [
  "@azure-typespec/http-client-csharp",
  "@azure-typespec/http-client-csharp-mgmt",
  "@azure-typespec/http-client-csharp-provisioning",
];

test.beforeEach(async ({ page }) => {
  for (const name of csharpEmitters) {
    await page.route(`https://typespec.blob.core.windows.net/pkgs/${name}/latest.json`, (route) =>
      route.fulfill({
        headers: { "access-control-allow-origin": "*" },
        json: { imports: { [name]: `${host}/test-emitters/${name}.js` } },
      }),
    );
  }
});

test("loads Azure C# emitters on demand from their standalone import maps", async ({ page }) => {
  const loadedEmitters: string[] = [];
  for (const name of csharpEmitters) {
    await page.route(`${host}/test-emitters/${name}.js`, (route) => {
      loadedEmitters.push(name);
      return route.fulfill({
        contentType: "application/javascript",
        body: `
            export const $lib = { name: ${JSON.stringify(name)}, emitter: {} };
            const $onEmit = async ({ program, emitterOutputDir }) => {
              await program.host.writeFile(emitterOutputDir + "/Widget.cs", "public class Widget {}");
            };
            export const _TypeSpecLibrary_ = {
              typespecSourceFiles: {
                "package.json": ${JSON.stringify(JSON.stringify({ name, version: "1.0.0", main: "index.js" }))},
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

  for (const name of csharpEmitters) {
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
  }
  expect(loadedEmitters).toEqual(csharpEmitters);
});

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
