import { assert, beforeAll, describe, it } from "vitest";

import { emitModularClientContextFromTypeSpec } from "../util/emit-util.js";

describe("Logging options", () => {
  let clientContext: string;

  beforeAll(async () => {
    const result = await emitModularClientContextFromTypeSpec(`
      @route("/read")
      @get
      op read(): void;
    `);
    clientContext = result!.getFullText();
  });

  it("preserves allowed header and query parameter names", () => {
    assert.include(clientContext, "...options.loggingOptions");
  });

  it("uses the caller's logger when provided and the package logger otherwise", () => {
    assert.include(clientContext, "logger: options.loggingOptions?.logger ?? logger.info");
  });
});
