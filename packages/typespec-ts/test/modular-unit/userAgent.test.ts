import { assert, describe, it } from "vitest";

import { emitModularClientContextFromTypeSpec } from "../util/emit-util.js";

// See https://azure.github.io/azure-sdk/general_azurecore.html#telemetry-policy
// The generated user agent must only contain `[<application_id> ]azsdk-js-<package>/<version>`
// and must NOT include the legacy internal layering tokens `azsdk-js-client` / `azsdk-js-api`.
describe("User-Agent telemetry policy", () => {
  const spec = `
  @route("/read")
  @get
  op read(): void;
  `;

  it("emits azsdk-js-<package>/<version> and forwards the caller application id", async () => {
    const result = await emitModularClientContextFromTypeSpec(spec, {
      packageDetails: {
        name: "@azure/foo-bar",
        nameWithoutScope: "foo-bar",
        version: "1.2.3",
      },
    } as any);
    const text = result!.getFullText();

    assert.include(text, "const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;");
    assert.include(
      text,
      "const userAgentInfo = `azsdk-js-foo-bar/1.2.3`;",
    );
    assert.include(
      text,
      "const userAgentPrefix = prefixFromOptions ? `${prefixFromOptions} ${userAgentInfo}` : `${userAgentInfo}`;",
    );
    assert.include(text, "userAgentOptions: { userAgentPrefix }");

    // Legacy internal layering tokens must be gone.
    assert.notInclude(text, "azsdk-js-api");
    assert.notInclude(text, "azsdk-js-client");
  });

  it("emits no user-agent override when package name/version is unavailable", async () => {
    const result = await emitModularClientContextFromTypeSpec(spec);
    const text = result!.getFullText();

    assert.notInclude(text, "userAgentPrefix");
    assert.notInclude(text, "userAgentOptions");
    assert.notInclude(text, "azsdk-js");
  });
});
