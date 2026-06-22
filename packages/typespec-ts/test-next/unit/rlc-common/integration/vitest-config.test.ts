import { describe, expect, it } from "vitest";

import { buildVitestConfig } from "../../../../src/rlc-common/metadata/build-vitest-config.js";

import { createMockModel } from "./mock-helper.js";

describe("vitest.config", () => {
  describe("azure monorepo", () => {
    it("vitest.browser.config.ts", () => {
      const model = createMockModel({
        withTests: true,
        isMonorepo: true,
      });

      const result = buildVitestConfig(model, "browser");
      expect(result?.content).includes(
        `export { default } from "../../../eng/vitestconfigs/browser.config.ts";`,
      );
    });
  });
});
