import { expect, test } from "@playwright/test";
import samples from "../samples/dist/samples.js";

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

  test("emits Java clients in WASM and isolates consecutive edits", async ({ page }) => {
    const runtimeRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/java-wasm/")) runtimeRequests.push(request.url());
    });
    await page.goto(host);
    await page.waitForFunction(() => (window as any).host !== undefined);
    expect(runtimeRequests).toEqual([]);

    const result = await page.evaluate(async (armSample) => {
      const { host, compiler } = window as any;
      const source = `
        import "@typespec/http";
        using TypeSpec.Http;
        @service
        @server("https://example.com", "Example")
        namespace Playground;
        model Widget { name: string; next?: Widget; }
        @get @route("/widgets/{name}")
        op getWidget(@path name: string): Widget;
      `;
      const compile = async (namespace: string, text: string, partialUpdate = false) => {
        await host.writeFile("/test/java.tsp", text);
        return compiler.compile(host, "/test/java.tsp", {
          emit: ["@azure-tools/typespec-java"],
          options: { "@azure-tools/typespec-java": { namespace, "partial-update": partialUpdate } },
          outputDir: `/test/${namespace}`,
        });
      };
      const first = await compile("com.azure.first", source);
      if (first.hasError())
        throw new Error(first.diagnostics.map((x: any) => x.message).join("\n"));
      const firstRoot =
        "/test/com.azure.first/@azure-tools/typespec-java/src/main/java/com/azure/first";
      const firstModel = (await host.readFile(`${firstRoot}/models/Widget.java`)).text;
      const client = (await host.readFile(`${firstRoot}/PlaygroundClient.java`)).text;
      const rejected = await compile("com.azure.rejected", source, true);
      const arm = await compile("com.azure.management", armSample.content);
      if (arm.hasError()) throw new Error(arm.diagnostics.map((x: any) => x.message).join("\n"));
      const armRoot =
        "/test/com.azure.management/@azure-tools/typespec-java/src/main/java/com/azure/management";
      const armModel = (await host.readFile(`${armRoot}/models/Employee.java`)).text;
      const second = await compile(
        "com.azure.second",
        source.replace("name: string;", "name: string; revision: int32;"),
      );
      if (second.hasError())
        throw new Error(second.diagnostics.map((x: any) => x.message).join("\n"));
      const secondRoot =
        "/test/com.azure.second/@azure-tools/typespec-java/src/main/java/com/azure/second";
      const secondModel = (await host.readFile(`${secondRoot}/models/Widget.java`)).text;
      const wrapped = await compile(
        "com.azure.wrapped",
        source.replace(
          "model Widget",
          `
            @doc("""
            {@link
            Base64}
            {@link java.util.Collections#unmodifiableList(
            List)}
            """)
            model Widget
          `,
        ),
      );
      if (wrapped.hasError())
        throw new Error(wrapped.diagnostics.map((x: any) => x.message).join("\n"));
      const wrappedRoot =
        "/test/com.azure.wrapped/@azure-tools/typespec-java/src/main/java/com/azure/wrapped";
      return {
        firstModel,
        client,
        armModel,
        rejected: rejected.diagnostics.map((x: any) => x.message),
        secondModel,
        wrappedModel: (await host.readFile(`${wrappedRoot}/models/Widget.java`)).text,
      };
    }, samples["Tracked Resource"]);
    expect(result.client).toContain("class PlaygroundClient");
    expect(result.client).toContain("getWidget(");
    expect(result.armModel).toContain("interface Employee");
    expect(result.armModel).toContain("com.azure.core.management");
    expect(result.firstModel).toContain("Widget next");
    expect(result.firstModel).not.toMatch(/import [^\n;]*\.\./);
    expect(result.firstModel).not.toContain("import java.util.Base64;");
    expect(result.firstModel).not.toContain("import java.util.stream.Collectors;");
    expect(result.firstModel).toContain("import com.azure.json.JsonReader;");
    expect(result.firstModel).not.toContain("revision");
    expect(result.rejected).toEqual([
      expect.stringContaining("does not support customization or partial updates"),
    ]);
    expect(result.secondModel).toContain("package com.azure.second.models;");
    expect(result.secondModel).toContain("revision");
    expect(result.secondModel).not.toContain("com.azure.first");
    expect(result.wrappedModel).toContain("import java.util.Base64;");
    expect(result.wrappedModel).toContain("import java.util.List;");
    expect(runtimeRequests.some((url) => url.endsWith("/generator.wasm"))).toBe(true);
    expect(runtimeRequests.some((url) => url.endsWith("/arm.wasm"))).toBe(true);
  });
});
