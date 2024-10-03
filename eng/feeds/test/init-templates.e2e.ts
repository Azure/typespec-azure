import { NodeHost, resolvePath } from "@typespec/compiler";
import { ok } from "assert";
import { SpawnOptions, spawn } from "child_process";
import { mkdir, readFile, rm } from "fs/promises";
import { resolve } from "path/posix";
import { beforeAll, describe, it } from "vitest";
import type { InitTemplate } from "../node_modules/@typespec/compiler/dist/src/init/init-template.js";
import {
  makeScaffoldingConfig,
  scaffoldNewProject,
} from "../node_modules/@typespec/compiler/dist/src/init/scaffold.js";
const __dirname = import.meta.dirname;
const root = resolve(__dirname, "../");
const testTempRoot = resolve(root, "temp/scaffolded-template-tests");
const snapshotFolder = resolve(root, "__snapshots__");

export const templatesDir = resolvePath(root);
const content = JSON.parse(
  await readFile(resolvePath(templatesDir, "azure-scaffolding.json"), "utf-8"),
);

export const Templates = {
  baseUri: templatesDir,
  templates: content as Record<string, InitTemplate>,
};

async function execAsync(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {},
): Promise<{ exitCode: number; stdio: string; stdout: string; stderr: string; proc: any }> {
  const child = spawn(command, args, options);

  return new Promise((resolve, reject) => {
    child.on("error", (error) => {
      reject(error);
    });
    const stdio: Buffer[] = [];
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on("data", (data) => {
      stdout.push(data);
      stdio.push(data);
    });
    child.stderr?.on("data", (data) => {
      stderr.push(data);
      stdio.push(data);
    });

    child.on("exit", (exitCode) => {
      resolve({
        exitCode: exitCode ?? -1,
        stdio: Buffer.concat(stdio).toString(),
        stdout: Buffer.concat(stdout).toString(),
        stderr: Buffer.concat(stderr).toString(),
        proc: child,
      });
    });
  });
}

interface ScaffoldedTemplateFixture {
  /** Directory where the template was created. */
  readonly directory: string;
  readonly checkCommand: (
    command: string,
    args?: string[],
    options?: SpawnOptions,
  ) => Promise<void>;
}

describe("Init templates e2e tests", () => {
  beforeAll(async () => {
    await rm(testTempRoot, { recursive: true, force: true });
    await mkdir(testTempRoot, { recursive: true });
  });

  async function scaffoldTemplateTo(name: string, targetFolder: string) {
    const template = Templates.templates[name];
    ok(template, `Template '${name}' not found`);
    const parameters = Object.fromEntries(
      Object.entries(template.inputs ?? {}).map(([key, value]) => [key, value.initialValue]),
    );
    await scaffoldNewProject(
      NodeHost,
      makeScaffoldingConfig(template, {
        name,
        folderName: name,
        directory: targetFolder,
        baseUri: Templates.baseUri,
        parameters,
      }),
    );
  }
  async function scaffoldTemplateSnapshot(name: string): Promise<void> {
    await scaffoldTemplateTo(name, resolve(snapshotFolder, name));
  }

  async function scaffoldTemplateForTest(name: string): Promise<ScaffoldedTemplateFixture> {
    const targetFolder = resolve(testTempRoot, name);
    await scaffoldTemplateTo(name, targetFolder);

    return {
      directory: targetFolder,
      checkCommand: async (command: string, args: string[] = [], options: SpawnOptions = {}) => {
        const xplatCmd = process.platform === "win32" ? `${command}.cmd` : command;
        const result = await execAsync(xplatCmd, args, {
          ...options,
          cwd: targetFolder,
        });
        ok(
          result.exitCode === 0,
          [
            `Command '${command} ${args.join(" ")}' failed with exit code ${result.exitCode}`,
            "-".repeat(100),
            result.stdio,
            "-".repeat(100),
          ].join("\n"),
        );
      },
    };
  }

  describe("create templates", () => {
    beforeAll(async () => {
      await rm(snapshotFolder, { recursive: true, force: true });
    });

    it.each(["azure-arm", "azure-arm_stand_alone", "azure-core", "azure-core_stand_alone"])(
      "%s",
      (name) => scaffoldTemplateSnapshot(name),
    );
  });

  describe("validate templates", () => {
    describe("standalone templates", () => {
      it("validate emitter-ts template", async () => {
        const fixture = await scaffoldTemplateForTest("azure-arm_stand_alone");
        await fixture.checkCommand("npm", ["install"]);
        await fixture.checkCommand("npx", ["tsp", "compile", "."]);
      });

      it("validate library-ts template", async () => {
        const fixture = await scaffoldTemplateForTest("azure-core_stand_alone");
        await fixture.checkCommand("npm", ["install"]);
        await fixture.checkCommand("npx", ["tsp", "compile", "."]);
      });
    });
  });
});
