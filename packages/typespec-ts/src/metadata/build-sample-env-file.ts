// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { ClientModel } from "../interfaces.js";

const sampleEnvText = `
# Feel free to add your own environment variables.
`;

export function buildSampleEnvFile(model: ClientModel) {
  if (model.options?.generateMetadata === true || model.options?.generateSample === true) {
    const filePath = "sample.env";
    return {
      path: filePath,
      content: sampleEnvText.trim(),
    };
  }
  return undefined;
}
