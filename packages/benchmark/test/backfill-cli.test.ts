import { execFileSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { linkCSharpEmitter } from "../src/csharp.js";

it.each([
  { threshold: "0.08", reruns: "1" },
  { threshold: "0", reruns: "0" },
])(
  "backfills clean commits and forwards sampling options: %j",
  async ({ threshold, reruns }) => {
    const root = await mkdtemp(join(tmpdir(), "benchmark-cli-test-"));
    let output: string | undefined;
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    try {
      git("init", "-q", "-b", "main");
      git("config", "user.name", "Test");
      git("config", "user.email", "test@example.com");
      await writeFile(join(root, ".gitignore"), "**/dist/\nnode_modules/\n.emitters/\n");
      for (const name of ["old", "new"]) {
        await writeFile(join(root, "source"), name);
        git("add", ".gitignore", "source");
        git("commit", "-qm", name);
      }
      const head = git("rev-parse", "HEAD");
      const benchmark = join(root, "packages/benchmark");
      for (const part of ["dist/src", "src", "specs/sample", "external-spec", "scripts"]) {
        await mkdir(join(benchmark, part), { recursive: true });
      }
      await writeFile(
        join(benchmark, "package.json"),
        JSON.stringify({ name: "fixture", type: "module" }),
      );
      for (const name of ["tsconfig.json", "tsconfig.build.json", ".gitignore"]) {
        await writeFile(join(benchmark, name), "{}");
      }
      await writeFile(
        join(benchmark, "dist/src/cli.js"),
        `
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const args = process.argv.slice(2);
const value = (name) => args[args.indexOf(name) + 1];
const generated = join(process.cwd(), "packages/generated/dist");
const contaminated = existsSync(join(generated, "stale.js"));
mkdirSync(generated, { recursive: true });
writeFileSync(join(generated, "stale.js"), "generated");
writeFileSync(value("--output"), JSON.stringify({
  commit: value("--commit"), timestamp: "2026-09-22T16:00:00Z",
  runner: {}, specs: {}, contaminated, workspace: process.cwd(), arguments: args
}));
`,
      );
      for (const name of ["@azure-typespec/http-client-csharp", "@typespec/http-client-csharp"]) {
        const dir = join(benchmark, ".emitters/node_modules", name);
        await mkdir(dir, { recursive: true });
        await writeFile(
          join(dir, "package.json"),
          JSON.stringify({ name, version: "1.0.0", main: "index.js" }),
        );
        await writeFile(join(dir, "index.js"), "");
      }
      await linkCSharpEmitter(benchmark);
      const alias = `${root}-alias`;
      await symlink(benchmark, alias, "junction");
      const bin = join(root, "bin");
      await mkdir(bin);
      const pnpm = join(bin, process.platform === "win32" ? "pnpm.cmd" : "pnpm");
      await writeFile(
        pnpm,
        process.platform === "win32" ? "@exit /b 0\r\n" : "#!/bin/sh\nexit 0\n",
      );
      await chmod(pnpm, 0o755);
      const env = { ...process.env };
      const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
      env[pathKey] = `${bin}${delimiter}${env[pathKey]}`;
      const stdout = execFileSync(
        process.execPath,
        [
          fileURLToPath(new URL("../dist/src/cli.js", import.meta.url)),
          "backfill",
          "--from",
          "2",
          "--source-branch",
          "main",
          "--force",
          "--specs-dir",
          join(alias, "specs"),
          "--iterations",
          "1",
          "--warmup",
          "0",
          "--emitter-iterations",
          "1",
          "--emitter-warmup",
          "0",
          "--noise-cv-threshold",
          threshold,
          "--max-reruns",
          reruns,
          "--rerun-iterations",
          "10",
        ],
        { cwd: root, encoding: "utf8", env },
      );
      output = /Results and logs: ([^\r\n]+)/.exec(stdout)?.[1];
      expect(output).toBeDefined();
      const results = await Promise.all(
        (await readdir(output!))
          .filter((file) => file.endsWith(".json"))
          .map(async (file) => JSON.parse(await readFile(join(output!, file), "utf8"))),
      );
      expect(results).toHaveLength(2);
      expect(new Set(results.map((result) => result.workspace)).size).toBe(2);
      for (const result of results) {
        expect(result.contaminated).toBe(false);
        expect(result.timestamp).toBe("2026-09-22T16:00:00Z");
        expect(result.commitTimestamp).toBe(git("show", "-s", "--format=%cI", result.commit));
        const argument = (name: string) => result.arguments[result.arguments.indexOf(name) + 1];
        expect(argument("--warmup")).toBe("0");
        expect(argument("--emitter-warmup")).toBe("0");
        expect(argument("--noise-cv-threshold")).toBe(threshold);
        expect(argument("--max-reruns")).toBe(reruns);
        expect(argument("--rerun-iterations")).toBe("10");
      }
      expect(git("rev-parse", "HEAD")).toBe(head);
      expect(git("branch", "--show-current")).toBe("main");
    } finally {
      await rm(`${root}-alias`, { force: true });
      if (output) await rm(output, { recursive: true, force: true });
      await rm(root, { recursive: true, force: true });
    }
  },
  60_000,
);
