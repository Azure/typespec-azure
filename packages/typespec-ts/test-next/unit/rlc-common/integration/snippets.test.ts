// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, expect, it } from "vitest";

import { buildSnippets } from "../../../../src/rlc-common/test/build-snippets.js";
import { createMockModel } from "./mock-helper.js";

describe("Snippets file generation", () => {
  describe("Should generate snippets for modular", () => {
    it("should create snippets with subscriptionId", () => {
      const clientName = "testClient";
      const model = createMockModel({
        scopeName: "azure",
        hasSubscriptionId: true,
        isModularLibrary: true,
        azureArm: true,
        addCredentials: true,
      });
      const snippetsFile = buildSnippets(model, clientName);

      expect(snippetsFile?.content).includes(
        `const subscriptionId = "00000000-0000-0000-0000-000000000000";`,
      );
      expect(snippetsFile?.content).includes(
        "const client = new testClient(new DefaultAzureCredential(), subscriptionId);",
      );
    });

    it("should create snippets without subscriptionId", () => {
      const clientName = "testClient";
      const model = createMockModel({
        scopeName: "azure",
        isModularLibrary: true,
        azureArm: true,
        addCredentials: true,
      });
      const snippetsFile = buildSnippets(model, clientName);

      expect(snippetsFile?.content).includes(
        "const client = new testClient(new DefaultAzureCredential());",
      );
    });
  });
});
