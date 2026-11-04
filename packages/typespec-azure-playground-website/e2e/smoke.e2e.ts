import { expect, test } from "@playwright/test";

const host = `http://localhost:5174`;

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
