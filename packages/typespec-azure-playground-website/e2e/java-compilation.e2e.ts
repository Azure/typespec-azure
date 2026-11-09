import { expect, test } from "@playwright/test";
import type { BrowserHost } from "@typespec/playground";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import samples from "../samples/dist/samples.js";

const run = promisify(execFile);

for (const { sampleName, wasm, expectedFile } of [
  {
    sampleName: "Widget Manager",
    wasm: "generator.wasm",
    expectedFile: "contoso/widgetmanager/implementation/JsonMergePatchHelper.java",
  },
  {
    sampleName: "Tracked Resource",
    wasm: "arm.wasm",
    expectedFile: "models/Employee.java",
  },
]) {
  test(`compiles the ${sampleName} Java client generated in WASM`, async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const sample = samples[sampleName];
    const wasmRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith(".wasm") && request.url().includes("/java-wasm/")) {
        wasmRequests.push(request.url());
      }
    });
    await page.goto("http://localhost:5174");
    await page.waitForFunction(() => (window as any).host && (window as any).compiler);
    const files = await page.evaluate(async (sample) => {
      const { host, compiler } = window as unknown as {
        host: BrowserHost;
        compiler: typeof import("@typespec/compiler");
      };
      await host.writeFile("/test/java-compilation.tsp", sample.content);
      const program = await compiler.compile(host, "/test/java-compilation.tsp", {
        ...sample.compilerOptions,
        emit: ["@azure-tools/typespec-java"],
        outputDir: "/test/java-compilation",
      });
      if (program.hasError()) {
        throw new Error(program.diagnostics.map((diagnostic) => diagnostic.message).join("\n"));
      }
      const root = "/test/java-compilation/@azure-tools/typespec-java";
      const files: Record<string, string> = {};
      async function visit(directory: string) {
        for (const name of await host.readDir(directory)) {
          const path = `${directory}/${name}`;
          if ((await host.stat(path)).isDirectory()) {
            await visit(path);
          } else if (path.endsWith(".java") || path === `${root}/pom.xml`) {
            files[path.slice(root.length + 1)] = (await host.readFile(path)).text;
          }
        }
      }
      await visit(root);
      return files;
    }, sample);

    expect(Object.keys(files)).toContainEqual(expect.stringContaining(expectedFile));
    expect(Object.keys(files)).toContain("pom.xml");
    expect(wasmRequests).toHaveLength(1);
    expect(wasmRequests[0].endsWith(`/${wasm}`)).toBe(true);
    const project = testInfo.outputPath("java");
    for (const [relative, content] of Object.entries(files)) {
      const parts = relative.split("/");
      expect(parts).not.toContain("..");
      const path = join(project, ...parts);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content);
    }
    const args = ["--batch-mode", "--no-transfer-progress", "-DskipTests", "compile"];
    const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "mvn";
    const commandArgs =
      process.platform === "win32" ? ["/d", "/s", "/c", `mvn ${args.join(" ")}`] : args;
    try {
      const { stdout, stderr } = await run(command, commandArgs, {
        cwd: project,
        timeout: 180_000,
        maxBuffer: 10 * 1024 * 1024,
      });
      await testInfo.attach("maven.log", {
        body: stdout + stderr,
        contentType: "text/plain",
      });
    } catch (error) {
      const failure = error as Error & { stdout?: string; stderr?: string };
      throw new Error(
        [failure.message, failure.stdout, failure.stderr].filter(Boolean).join("\n"),
        {
          cause: error,
        },
      );
    }
  });
}
