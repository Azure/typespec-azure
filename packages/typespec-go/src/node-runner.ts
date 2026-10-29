// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { type DiagnosticSeverity, type EmitContext, NoTarget } from "@typespec/compiler";
import { execSync } from "child_process";
import { existsSync, opendirSync, readFileSync, unlinkSync } from "fs";
import { doNotEditRegex } from "./codegen/index.js";
import type { GoEmitterOptions } from "./lib.js";

export function runGoTools(context: EmitContext<GoEmitterOptions>) {
  const goGenerateFile = context.options["go-generate"];
  const goGenerateFileExists = goGenerateFile
    ? existsSync(`${context.emitterOutputDir}/${goGenerateFile}`)
    : false;

  if (goGenerateFile && !goGenerateFileExists) {
    context.program.reportDiagnostic({
      code: "gogenerate",
      severity: "error",
      message: `the go-generate file wasn't found. the complete path is ${context.emitterOutputDir}/${goGenerateFile}`,
      target: NoTarget,
    });
    return;
  }

  try {
    execSync("go version", { stdio: ["ignore", "ignore", "ignore"] });
  } catch {
    let severity: DiagnosticSeverity = "warning";
    let message = "skip executing post emitter steps (is go on the path?)";
    if (goGenerateFileExists) {
      severity = "error";
      message =
        "unable to execute post emitter transformations due to missing go tool (is go on the path?)";
    }
    context.program.reportDiagnostic({
      code: "GoVersion",
      severity,
      message,
      target: NoTarget,
    });
    return;
  }

  const commands: [string, string][] = [
    ...(goGenerateFileExists
      ? [[`go generate ${goGenerateFile}`, "gogenerate"] as [string, string]]
      : []),
    ["gofmt -s -w .", "gofmt"],
    ["go mod tidy", "gomodtidy"],
  ];
  for (const [command, code] of commands) {
    try {
      execSync(command, { cwd: context.emitterOutputDir, encoding: "ascii" });
    } catch (err) {
      context.program.reportDiagnostic({
        code,
        severity: "error",
        message: postEmitToolErrorMessage(command, err, context.emitterOutputDir),
        target: NoTarget,
      });
      return;
    }
  }
}

/**
 * When Windows cannot launch a tool because its working directory is too long,
 * replace the misleading ENOENT error with an actionable diagnostic.
 */
function postEmitToolErrorMessage(command: string, err: unknown, outputDir: string): string {
  const error = err as NodeJS.ErrnoException;
  if (process.platform === "win32" && error.code === "ENOENT" && outputDir.length > 260) {
    return (
      `unable to run '${command}': the tool could not be launched. This is typically caused by the ` +
      `emitter output directory path (${outputDir.length} characters) exceeding the Windows maximum ` +
      `path length of 260; Windows cannot use a working directory longer than this. ` +
      `Emit to a shorter output directory. (output directory: ${outputDir})`
    );
  }
  return error.message;
}

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
      if (doNotEditRegex.test(content)) {
        unlinkSync(dir.path + "/" + dirEnt.name);
      }
    }
  }
  dir.closeSync();
  cleanupGeneratedFiles(outputDir + "/fake");
}
