import { CompilerHost, getDirectoryPath, joinPaths, NoTarget, Program } from "@typespec/compiler";
import { format } from "prettier";
import prettierPluginBabel from "prettier/plugins/babel";
import prettierPluginEstree from "prettier/plugins/estree";
import prettierPluginTypescript from "prettier/plugins/typescript";
import { prettierJSONOptions, prettierTypeScriptOptions, reportDiagnostic } from "../lib.js";
import { buildSchemaTypes, ContentBuilder, File, RLCModel } from "../rlc-common/index.js";

export async function emitModels(rlcModels: RLCModel, program: Program) {
  const schemaOutput = buildSchemaTypes(rlcModels);
  if (schemaOutput) {
    const { inputModelFile, outputModelFile } = schemaOutput;
    if (inputModelFile) {
      await emitFile(inputModelFile, program);
    }
    if (outputModelFile) {
      await emitFile(outputModelFile, program);
    }
  }
}

export async function emitContentByBuilder(
  program: Program,
  builderFnOrList: ContentBuilder | ContentBuilder[],
  rlcModels: RLCModel,
  emitterOutputDir?: string,
) {
  if (!Array.isArray(builderFnOrList)) {
    builderFnOrList = [builderFnOrList];
  }
  for (const builderFn of builderFnOrList) {
    let contentFiles: File[] | File | undefined = builderFn(rlcModels);
    if (!contentFiles) {
      continue;
    }
    if (!Array.isArray(contentFiles)) {
      contentFiles = [contentFiles];
    }
    for (const file of contentFiles) {
      await emitFile(file, program, emitterOutputDir);
    }
  }
}

async function emitFile(file: File, program: Program, emitterOutputDir?: string) {
  if (program.compilerOptions.noEmit || program.hasError()) {
    return;
  }
  const host: CompilerHost = program.host;
  const filePath = joinPaths(emitterOutputDir ?? "", file.path);
  const isJson = /\.json$/gi.test(filePath);
  const isSourceCode = /\.(ts|js)$/gi.test(filePath);
  const licenseHeader = `// Copyright (c) Microsoft Corporation.\n// Licensed under the MIT License.\n`;
  let prettierFileContent = file.content;

  if (isSourceCode) {
    prettierFileContent = `${licenseHeader.trimStart()}\n${prettierFileContent}`;
  }
  // Format the contents if necessary
  if (isJson || isSourceCode) {
    try {
      prettierFileContent = await format(prettierFileContent, {
        ...(isJson ? prettierJSONOptions : prettierTypeScriptOptions),
        plugins: [prettierPluginTypescript, prettierPluginEstree, prettierPluginBabel],
      });
    } catch (e) {
      reportDiagnostic(program, {
        code: "file-formatting-error",
        format: {
          filePath: filePath,
          error: String(e),
        },
        target: NoTarget,
      });
      // Continue with unformatted content rather than crashing
    }
  }
  await host.mkdirp(getDirectoryPath(filePath));
  await host.writeFile(filePath, prettierFileContent);
}
