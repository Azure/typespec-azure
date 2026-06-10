// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { File as RLCFile, RLCModel, RLCSampleGroup } from "./interfaces.js";
import { sampleTemplate } from "./static/sample-template.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: to fix the handlebars issue
import hbs from "handlebars";
import { joinPaths } from "@typespec/compiler";

// Build sample files for the model based on the sample groups
export function buildSamples(model: RLCModel) {
  if (!model.options || !model.options.packageDetails) {
    return;
  }
  const sampleGroups: RLCSampleGroup[] | undefined = model.sampleGroups;
  if (!sampleGroups || sampleGroups.length === 0) {
    return;
  }
  const sampleFiles: RLCFile[] = [];
  for (const sampleGroup of sampleGroups) {
    const sampleGroupFileContents = hbs.compile(sampleTemplate, {
      noEscape: true,
    });
    const filePath = joinPaths("samples-dev", `${sampleGroup.filename}.ts`);
    sampleFiles.push({
      path: filePath,
      content: sampleGroupFileContents(sampleGroup),
    });
  }
  return sampleFiles;
}
