/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type DiagnosticSeverity, type EmitContext, NoTarget } from "@typespec/compiler";
import { execSync } from "child_process";
import { existsSync, opendirSync, readFileSync, unlinkSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import * as path from "path";
import * as codegen from "./codegen/index.js";
import { CodeModelError } from "./codemodel/errors.js";
import { type GoEmitterOptions, reportDiagnostic } from "./lib.js";
import { Adapter, ExternalError } from "./tcgcadapter/adapter.js";
import { AdapterError } from "./tcgcadapter/errors.js";

export async function $onEmit(context: EmitContext<GoEmitterOptions>) {
  try {
    // if there's an existing go.mod file, we'll use its module
    // identity instead of the provided value. this ensures we
    // get the correct major version suffix (if any). if there's
    // no go.mod file (e.g. the first time an SDK is generated) we
    // fall back to the provided value.
    let moduleIdentity: string | undefined;
    let currentDir = context.emitterOutputDir;
    while (true) {
      const goModFile = path.join(currentDir, "go.mod");
      if (existsSync(goModFile)) {
        const goModFileContent = readFileSync(goModFile, "utf8");
        // the module identity is specified on the "module" directive, e.g.
        //   module github.com/Azure/azure-sdk-for-go/sdk/foo/v2
        const match = goModFileContent.match(/^module\s+(\S+)/m);
        if (!match) {
          context.program.reportDiagnostic({
            code: "gomod",
            severity: "error",
            message: `failed to find module directive in ${goModFile}`,
            target: NoTarget,
          });
          return;
        }
        moduleIdentity = match[1];
        break;
      }

      // move to the parent directory
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        // we've reached the filesystem root without finding a go.mod.
        // this is expected the first time an SDK is generated, in which
        // case we fall back to the provided module identity.
        break;
      }
      currentDir = parentDir;
    }

    // if we discovered an existing go.mod, prefer the identity from go.mod
    // so we pick up the correct major version suffix. module and
    // containing-module are mutually exclusive, so update whichever was
    // provided.
    if (moduleIdentity) {
      const providedModule = context.options.module ?? context.options["containing-module"];
      // ensure the existing go.mod's major version isn't behind the requested
      // value (a suffix-less identity is v1). a stale go.mod would otherwise
      // silently downgrade the module identity, so treat it as an error.
      if (providedModule) {
        const discoveredMajor = majorVersion(moduleIdentity);
        const providedMajor = majorVersion(providedModule);
        if (discoveredMajor < providedMajor) {
          context.program.reportDiagnostic({
            code: "gomod",
            severity: "error",
            message: `the existing go.mod module identity '${moduleIdentity}' (major version v${discoveredMajor}) is behind the requested module identity '${providedModule}' (major version v${providedMajor})`,
            target: NoTarget,
          });
          return;
        }
      }
      if (context.options.module) {
        context.options.module = moduleIdentity;
      } else if (context.options["containing-module"]) {
        context.options["containing-module"] = moduleIdentity;
      }
    }

    const adapter = await Adapter.create(context);
    const codeModel = adapter.tcgcToGoCodeModel();

    await mkdir(context.emitterOutputDir, { recursive: true });

    // clean up existing generated Go files
    cleanupGeneratedFiles(context.emitterOutputDir);

    let filePrefix: string | undefined;
    if (context.options["file-prefix"]) {
      filePrefix = context.options["file-prefix"];
      // if a file prefix was specified, ensure it's properly snaked
      if (filePrefix[filePrefix.length - 1] !== "_") {
        filePrefix += "_";
      }
    }

    const emitter = new codegen.Emitter(
      codeModel,
      {
        exists: (name: string) => {
          return Promise.resolve(existsSync(`${context.emitterOutputDir}/${name}`));
        },
        read: (name: string) => readFile(`${context.emitterOutputDir}/${name}`, "utf8"),
        write: async (name: string, content: string) => {
          await mkdir(path.dirname(`${context.emitterOutputDir}/${name}`), { recursive: true });
          return writeFile(`${context.emitterOutputDir}/${name}`, content);
        },
      },
      { filePrefix },
    );
    await emitter.emit("tsp");
    await emitter.emitCloudConfig();
    await emitter.emitExamples();
    await emitter.emitLicenseFile();
    await emitter.emitMetadataFile();

    const goGenerateFile = context.options["go-generate"];
    const goGenerateFileExists = goGenerateFile
      ? existsSync(`${context.emitterOutputDir}/${goGenerateFile}`)
      : false;

    if (goGenerateFile && !goGenerateFileExists) {
      // go-generate was specified but we didn't find the file, so error and exit
      context.program.reportDiagnostic({
        code: "gogenerate",
        severity: "error",
        message: `the go-generate file wasn't found. the complete path is ${context.emitterOutputDir}/${goGenerateFile}`,
        target: NoTarget,
      });

      // don't continue so the state of the SDK can be inspected without any additional changes
      return;
    }

    // probe to see if Go tools are on the path
    try {
      execSync("go version", { stdio: ["ignore", "ignore", "ignore"] });
    } catch {
      // if the transforms file exists and we don't have Go
      // on the path then make this an error as it means we
      // expect to transform the generated code but were unable
      // to do so.
      let severity: DiagnosticSeverity = "warning";
      let message = "skip executing post emitter steps (is go on the path?)";
      if (goGenerateFileExists) {
        severity = "error";
        message =
          "unable to execute post emitter transformations due to missing go tool (is go on the path?)";
      }

      context.program.reportDiagnostic({
        code: "GoVersion",
        severity: severity,
        message: message,
        target: NoTarget,
      });

      // no Go tools available so exit
      return;
    }

    // if we have a post-generation transforms file then "go generate" it
    if (goGenerateFileExists) {
      try {
        execSync(`go generate ${goGenerateFile}`, {
          cwd: context.emitterOutputDir,
          encoding: "ascii",
        });
      } catch (err) {
        context.program.reportDiagnostic({
          code: "gogenerate",
          severity: "error",
          message: postEmitToolErrorMessage(
            `go generate ${goGenerateFile}`,
            err,
            context.emitterOutputDir,
          ),
          target: NoTarget,
        });

        // don't continue so the state of the SDK can be inspected without any additional changes
        return;
      }
    }

    // format after transforms in case any formatting gets munged
    try {
      execSync("gofmt -s -w .", { cwd: context.emitterOutputDir, encoding: "ascii" });
    } catch (err) {
      context.program.reportDiagnostic({
        code: "gofmt",
        severity: "error",
        message: postEmitToolErrorMessage("gofmt -s -w .", err, context.emitterOutputDir),
        target: NoTarget,
      });

      return;
    }

    // now go mod tidy
    try {
      execSync("go mod tidy", { cwd: context.emitterOutputDir, encoding: "ascii" });
    } catch (err) {
      context.program.reportDiagnostic({
        code: "gomodtidy",
        severity: "error",
        message: postEmitToolErrorMessage("go mod tidy", err, context.emitterOutputDir),
        target: NoTarget,
      });

      return;
    }
  } catch (error) {
    if (error instanceof AdapterError) {
      reportDiagnostic(context.program, {
        code: error.code,
        target: error.target,
        format: {
          msg: error.message,
          stack: error.stack
            ? truncateStack(error.stack, "tcgcToGoCodeModel")
            : "Stack trace unavailable\n",
        },
      });
    } else if (error instanceof CodeModelError) {
      reportDiagnostic(context.program, {
        code: error.code,
        target: NoTarget,
        format: {
          msg: error.message,
          stack: error.stack
            ? truncateStack(error.stack, "tcgcToGoCodeModel")
            : "Stack trace unavailable\n",
        },
      });
    } else if (error instanceof codegen.CodegenError) {
      reportDiagnostic(context.program, {
        code: error.code,
        target: NoTarget,
        format: {
          msg: error.message,
          stack: error.stack
            ? truncateStack(error.stack, "generate(")
            : "Stack trace unavailable\n",
        },
      });
    } else if (error instanceof ExternalError) {
      // we don't want to throw in this case as that will
      // make it appear as if the emitter crashed. just
      // exit so the diagnostic error isn't lost in the noise
      return;
    } else {
      throw error;
    }
  }
}

/**
 * The Windows maximum path length. A process's current directory cannot exceed
 * this, so launching a Go tool with a longer working directory fails.
 */
const WINDOWS_MAX_PATH = 260;

/**
 * Build the diagnostic message for a post-emit Go tool that failed to run.
 *
 * When a tool cannot be launched because the emitter output directory exceeds
 * the Windows maximum path length, the underlying failure surfaces as a
 * spurious ENOENT against the command shell rather than anything mentioning the
 * path. In that case, replace the opaque error with an actionable explanation.
 *
 * @param command the command that was executed (for context in the message)
 * @param err the error thrown by execSync
 * @param outputDir the emitter output directory used as the working directory
 * @returns the diagnostic message
 */
function postEmitToolErrorMessage(command: string, err: unknown, outputDir: string): string {
  const error = err as NodeJS.ErrnoException;
  if (
    process.platform === "win32" &&
    error.code === "ENOENT" &&
    outputDir.length > WINDOWS_MAX_PATH
  ) {
    return (
      `unable to run '${command}': the tool could not be launched. This is typically caused by the ` +
      `emitter output directory path (${outputDir.length} characters) exceeding the Windows maximum ` +
      `path length of ${WINDOWS_MAX_PATH}; Windows cannot use a working directory longer than this. ` +
      `Emit to a shorter output directory. (output directory: ${outputDir})`
    );
  }
  return error.message;
}

/**
 * drop frames after the specified frame.
 *
 * @param stack the stack to truncate
 * @returns the truncated stack
 */
function truncateStack(stack: string, finalFrame: string): string {
  const lines = stack.split("\n");
  stack = "";
  for (const line of lines) {
    stack += `${line}\n`;
    if (line.includes(finalFrame)) {
      break;
    }
  }
  return stack;
}

/**
 * extracts the major version from a Go module identity's version suffix.
 * e.g. "github.com/foo/bar/v2" returns 2. modules without a suffix are v0/v1,
 * so 1 is returned.
 *
 * @param identity the Go module identity
 * @returns the major version
 */
function majorVersion(identity: string): number {
  const match = identity.match(/\/v(\d+)$/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Clean up existing generated Go files in the output directory.
 * Removes any .go files that contain the Microsoft code generator comment.
 *
 * exported for testing purposes only.
 *
 * @param outputDir the directory to clean up
 */
export function cleanupGeneratedFiles(outputDir: string) {
  if (!existsSync(outputDir)) {
    return;
  }
  const dir = opendirSync(outputDir);
  while (true) {
    const dirEnt = dir.readSync();
    if (dirEnt === null) {
      break;
    }
    if (dirEnt.isFile() && dirEnt.name.endsWith(".go")) {
      const content = readFileSync(dir.path + "/" + dirEnt.name, "utf8");
      if (codegen.doNotEditRegex.test(content)) {
        unlinkSync(dir.path + "/" + dirEnt.name);
      }
    }
  }
  dir.closeSync();
  cleanupGeneratedFiles(outputDir + "/fake");
}
