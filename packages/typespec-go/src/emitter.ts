/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  type CompilerHost,
  type EmitContext,
  getDirectoryPath,
  joinPaths,
  NoTarget,
} from "@typespec/compiler";
import * as codegen from "./codegen/index.js";
import { CodeModelError } from "./codemodel/errors.js";
import { type GoEmitterOptions, reportDiagnostic } from "./lib.js";
import { cleanupGeneratedFiles, runGoTools } from "./node-runner.js";
import { Adapter, ExternalError } from "./tcgcadapter/adapter.js";
import { AdapterError } from "./tcgcadapter/errors.js";

export { cleanupGeneratedFiles } from "./node-runner.js";

export async function $onEmit(context: EmitContext<GoEmitterOptions>) {
  try {
    const host = context.program.host;
    // if there's an existing go.mod file, we'll use its module
    // identity instead of the provided value. this ensures we
    // get the correct major version suffix (if any). if there's
    // no go.mod file (e.g. the first time an SDK is generated) we
    // fall back to the provided value.
    let moduleIdentity: string | undefined;
    let currentDir = context.emitterOutputDir;
    while (true) {
      const goModFile = joinPaths(currentDir, "go.mod");
      if (await fileExists(host, goModFile)) {
        const goModFileContent = (await host.readFile(goModFile)).text;
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
      const parentDir = getDirectoryPath(currentDir);
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

    await host.mkdirp(context.emitterOutputDir);

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
        exists: (name: string) => fileExists(host, joinPaths(context.emitterOutputDir, name)),
        read: async (name: string) =>
          (await host.readFile(joinPaths(context.emitterOutputDir, name))).text,
        write: async (name: string, content: string) => {
          const filePath = joinPaths(context.emitterOutputDir, name);
          await host.mkdirp(getDirectoryPath(filePath));
          return host.writeFile(filePath, content);
        },
      },
      { filePrefix },
    );
    await emitter.emit("tsp");
    await emitter.emitCloudConfig();
    await emitter.emitExamples();
    await emitter.emitLicenseFile();
    await emitter.emitMetadataFile();

    runGoTools(context);
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

async function fileExists(host: CompilerHost, path: string): Promise<boolean> {
  try {
    return (await host.stat(path)).isFile();
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return false;
    }
    throw error;
  }
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
