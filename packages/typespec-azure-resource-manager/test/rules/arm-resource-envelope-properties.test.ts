import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
  expectDiagnosticEmpty,
  expectDiagnostics,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armResourceEnvelopeProperties } from "../../src/rules/arm-resource-invalid-envelope-property.js";

const ruleCode =
  "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armResourceEnvelopeProperties,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

async function diagnoseWithRule(
  code: string | Record<string, string>,
  testRunner: TesterInstance = runner,
) {
  const [, diagnostics] = await testRunner.compileAndDiagnose(code, {
    compilerOptions: {
      linterRuleSet: {
        enable: {
          [ruleCode]: true,
        },
      },
    },
  });
  return diagnostics;
}

it("succeed when only using allow properties at the root", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<{}> {
          @key @segment("foo") name: string;
          ...ManagedServiceIdentityProperty;
        }
      `,
    )
    .toBeValid();
});

it("emit warning if using non allowed property name at the root of the resource object", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<{}> {
          @key @segment("foo") name: string;

          disallowed?: string;
        }
      `,
    )
    .toEmitDiagnostics({
      code: ruleCode,
      message:
        'Property "disallowed" is not valid in the resource envelope.  Please remove this property, or add it to the resource-specific property bag.',
    });
});

it("honors an existing suppression on a directly declared property", async () => {
  const diagnostics = await diagnoseWithRule(`
    @armProviderNamespace namespace MyService;

    @Azure.ResourceManager.Private.genericResourceInternal
    model FooResource {
      #suppress "${ruleCode}" "Matching legacy API"
      disallowed?: string;
    }
  `);

  expectDiagnosticEmpty(diagnostics);
});

it("honors a suppression on a concrete template instance", async () => {
  const diagnostics = await diagnoseWithRule(`
        @armProviderNamespace namespace MyService;

        model LegacyResourceTemplate<Properties> {
          disallowed?: string;
        }

        #suppress "${ruleCode}" "Matching legacy API"
        @Azure.ResourceManager.Private.genericResourceInternal
        model FooResource is LegacyResourceTemplate<{}>;
      `);

  expectDiagnosticEmpty(diagnostics);
});

it("honors a suppression on the source property of a template instance", async () => {
  const diagnostics = await diagnoseWithRule(`
        @armProviderNamespace namespace MyService;

        model LegacyResourceTemplate<Properties> {
          #suppress "${ruleCode}" "Matching legacy API"
          disallowed?: string;
        }

        @Azure.ResourceManager.Private.genericResourceInternal
        model FooResource is LegacyResourceTemplate<{}>;
      `);

  expectDiagnosticEmpty(diagnostics);
});

it("preserves per-resource suppression for template instances", async () => {
  const diagnostics = await diagnoseWithRule(`
        @armProviderNamespace namespace MyService;

        model LegacyResourceTemplate<Properties> {
          disallowed?: string;
        }

        #suppress "${ruleCode}" "Matching legacy API"
        @Azure.ResourceManager.Private.genericResourceInternal
        model FooResource is LegacyResourceTemplate<{}>;

        @Azure.ResourceManager.Private.genericResourceInternal
        model BarResource is LegacyResourceTemplate<{}>;
      `);

  expectDiagnostics(diagnostics, {
    code: ruleCode,
    message:
      'Property "disallowed" is not valid in the resource envelope.  Please remove this property, or add it to the resource-specific property bag.',
  });
});

it("honors a suppression on a spread source property", async () => {
  const diagnostics = await diagnoseWithRule(`
        @armProviderNamespace namespace MyService;

        model LegacyEnvelope {
          #suppress "${ruleCode}" "Matching legacy API"
          disallowed?: string;
        }

        @Azure.ResourceManager.Private.genericResourceInternal
        model FooResource {
          ...LegacyEnvelope;
        }
      `);

  expectDiagnosticEmpty(diagnostics);
});

it("honors a suppression on a resource containing a spread property", async () => {
  const diagnostics = await diagnoseWithRule(`
        @armProviderNamespace namespace MyService;

        model LegacyEnvelope {
          disallowed?: string;
        }

        #suppress "${ruleCode}" "Matching legacy API"
        @Azure.ResourceManager.Private.genericResourceInternal
        model FooResource {
          ...LegacyEnvelope;
        }
      `);

  expectDiagnosticEmpty(diagnostics);
});

it("preserves a consumer namespace suppression across source namespaces", async () => {
  const diagnostics = await diagnoseWithRule(`
        namespace Common {
          model LegacyEnvelope {
            disallowed?: string;
          }
        }

        #suppress "${ruleCode}" "Matching legacy API"
        @armProviderNamespace
        namespace MyService {
          @Azure.ResourceManager.Private.genericResourceInternal
          model FooResource {
            ...Common.LegacyEnvelope;
          }
        }
      `);

  expectDiagnosticEmpty(diagnostics);
});

it("preserves a consumer suppression for a source property in another file", async () => {
  const importedRunner = await Tester.import("./legacy.tsp").createInstance();

  const diagnostics = await diagnoseWithRule(
    {
      "main.tsp": `
        #suppress "${ruleCode}" "Matching legacy API"
        @armProviderNamespace
        namespace MyService {
          @Azure.ResourceManager.Private.genericResourceInternal
          model FooResource {
            ...ExternalLegacy.Library.LegacyEnvelope;
          }
        }
      `,
      "legacy.tsp": `
        namespace ExternalLegacy.Library {
          model LegacyEnvelope {
            disallowed?: string;
          }
        }
      `,
    },
    importedRunner,
  );

  expectDiagnosticEmpty(diagnostics);
});

it("honors an existing suppression on an inherited base property", async () => {
  const diagnostics = await diagnoseWithRule(`
        @armProviderNamespace namespace MyService;

        model LegacyBase {
          #suppress "${ruleCode}" "Matching legacy API"
          disallowed?: string;
        }

        @Azure.ResourceManager.Private.genericResourceInternal
        model FooResource extends LegacyBase {}
      `);

  expectDiagnosticEmpty(diagnostics);
});
