import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { armPutResponseResourceRule } from "../../src/rules/arm-put-response-resource.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armPutResponseResourceRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const service = `
  using TypeSpec.OpenAPI;
  @armProviderNamespace namespace Microsoft.Test;
  model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
  model Unmarked { value?: string; }
`;
const code = "@azure-tools/typespec-azure-resource-manager/arm-put-response-resource";
const diagnostic = {
  code,
  severity: "warning" as const,
  message: "ARM PUT operations must return an Azure resource model in their 200 or 201 response.",
};

it.each(["Unmarked", "Unmarked[]", "string", "unknown"])(
  "rejects an unmarked success payload: %s",
  async (body) => {
    await tester
      .expect(`${service} @put op replace(@body body: Unmarked): ArmResponse<${body}>;`)
      .toEmitDiagnostics([diagnostic]);
  },
);

it.each(["ArmResponse<Widget>", "ArmCreatedResponse<Widget>", "CommonTypes.ProxyResource"])(
  "accepts a resource marker from the payload hierarchy: %s",
  async (response) => {
    await tester
      .expect(`${service} @put op replace(@body body: Unmarked): ${response};`)
      .toBeValid();
  },
);

it.each([
  "ArmCreatedResponse<Unmarked>",
  "{ @statusCode status: 200; } | ArmCreatedResponse<Unmarked>",
])("checks a body-bearing 201 when 200 has no body: %s", async (response) => {
  await tester
    .expect(`${service} @put op replace(@body body: Unmarked): ${response};`)
    .toEmitDiagnostics([diagnostic]);
});

it("uses the body-bearing 200 before the 201 response", async () => {
  await tester
    .expect(
      `${service}
      @put op replace(@body body: Unmarked): ArmResponse<Widget> | ArmCreatedResponse<Unmarked>;
    `,
    )
    .toBeValid();
});

it("checks all content variants for the selected status without duplicate warnings", async () => {
  await tester
    .expect(
      `${service}
      model OtherPayload { other?: string; }
      @put op replace(@body body: Unmarked):
        ArmResponse<Unmarked> | ArmResponse<OtherPayload> | ArmCreatedResponse<Widget>;
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it.each(["true", '"custom"'])("accepts an explicit truthy resource marker: %s", async (value) => {
  await tester
    .expect(
      `${service}
      @extension("x-ms-azure-resource", ${value})
      model Custom { value?: string; }
      @put op replace(@body body: Custom): ArmResponse<Custom>;
    `,
    )
    .toBeValid();
});

it("accepts the custom-resource marker option without canonical registration", async () => {
  await tester
    .expect(
      `${service}
      @Azure.ResourceManager.Legacy.customAzureResource(#{ isAzureResource: true })
      model Custom { value?: string; }
      @put op replace(@body body: Custom): ArmResponse<Custom>;
    `,
    )
    .toBeValid();
});

it("honors an explicit marker override on a custom resource", async () => {
  await tester
    .expect(
      `${service}
      @extension("x-ms-azure-resource", false)
      @Azure.ResourceManager.Legacy.customAzureResource(#{ isAzureResource: true })
      model Custom { value?: string; }
      @put op replace(@body body: Custom): ArmResponse<Custom>;
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it("retains a valid inherited marker despite a false marker on the derived schema", async () => {
  await tester
    .expect(
      `${service}
      @extension("x-ms-azure-resource", false)
      model Child extends Widget { extra?: string; }
      @put op replace(@body body: Unmarked): ArmResponse<Child>;
    `,
    )
    .toBeValid();
});

it.each([
  "@get op read(): ArmResponse<Unmarked>;",
  "@put op replace(@body body: Unmarked): AcceptedResponse;",
  "@put op replace(@body body: Unmarked): NoContentResponse;",
  "@put op replace(@body body: Unmarked): void;",
])("does not own other verbs or missing response bodies: %s", async (operation) => {
  await tester.expect(`${service} ${operation}`).toBeValid();
});

it("does not apply ARM policy to a data-plane service", async () => {
  await tester
    .expect(`@service namespace DataPlane; @put op replace(@body body: string): string;`)
    .toBeValid();
});

it("diagnoses an unregistered PUT action rather than silently treating it as a resource", async () => {
  await tester
    .expect(
      `${service}
      @armResourceOperations interface Widgets {
        @put @armResourceAction(Widget)
        execute(...ResourceInstanceParameters<Widget>, @body body: Unmarked): ArmResponse<Unmarked>;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it("preserves authored exceptions for a legacy non-resource result", async () => {
  await Tester.compile(
    `${service}
    #suppress "${code}" "The existing API returns a command result rather than an ARM resource."
    @put op replace(@body body: Unmarked): ArmResponse<Unmarked>;
  `,
    { compilerOptions: { linterRuleSet: { enable: { [code]: true } } } },
  );
});
