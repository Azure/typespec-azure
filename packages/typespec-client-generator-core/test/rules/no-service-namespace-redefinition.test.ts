import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noServiceNamespaceRedefinitionRule } from "../../src/rules/no-service-namespace-redefinition.js";
import { createClientCustomizationInput, SimpleBaseTester } from "../tester.js";

const libraryName = "@azure-tools/typespec-client-generator-core";
const diagnosticCode =
  "@azure-tools/typespec-client-generator-core/no-service-namespace-redefinition";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await SimpleBaseTester.createInstance();
  tester = createLinterRuleTester(runner, noServiceNamespaceRedefinitionRule, libraryName);
});

describe("no-service-namespace-redefinition", () => {
  it("is valid for augment decorators in client.tsp", async () => {
    await tester
      .expect(
        createClientCustomizationInput(
          `
          @service
          namespace My.Service;

          model Widget {
            name: string;
          }
          `,
          `
          @@clientName(Widget.name, "widgetName");
          `,
          [],
          ["My.Service"],
        ),
      )
      .toBeValid();
  });

  it("is valid for custom types in a Customizations namespace", async () => {
    await tester
      .expect(
        createClientCustomizationInput(
          `
          @service
          namespace My.Service;
          `,
          `
          namespace Customizations;

          model WidgetOptions {
            mode: string;
          }
          `,
        ),
      )
      .toBeValid();
  });

  it("does not flag Azure.Core library namespaces", async () => {
    await tester
      .expect(
        createClientCustomizationInput(
          `
          @service
          namespace My.Service;
          `,
          `
          namespace Azure.Core;

          model Helper {
            value: string;
          }
          `,
        ),
      )
      .toBeValid();
  });

  it("does not flag Azure.ResourceManager library namespaces", async () => {
    await tester
      .expect(
        createClientCustomizationInput(
          `
          @service
          namespace My.Service;
          `,
          `
          namespace Azure.ResourceManager;

          model Helper {
            value: string;
          }
          `,
        ),
      )
      .toBeValid();
  });

  it("emits diagnostic when client.tsp redefines the service namespace", async () => {
    await tester
      .expect(
        createClientCustomizationInput(
          `
          @service
          namespace My.Service;
          `,
          `
          namespace My.Service;

          model WidgetOptions {
            mode: string;
          }
          `,
        ),
      )
      .toEmitDiagnostics([
        {
          code: diagnosticCode,
          severity: "warning",
          message:
            'client.tsp must not define namespace "My.Service" because it is in the service namespace "My.Service". Put new types in another namespace such as "Customizations" and use augment decorators for service customizations.',
        },
      ]);
  });

  it("emits diagnostic when client.tsp defines a child namespace of the service namespace", async () => {
    await tester
      .expect(
        createClientCustomizationInput(
          `
          @service
          namespace My.Service;
          `,
          `
          namespace My.Service.Customizations;

          model WidgetOptions {
            mode: string;
          }
          `,
        ),
      )
      .toEmitDiagnostics([
        {
          code: diagnosticCode,
          severity: "warning",
          message:
            'client.tsp must not define namespace "My.Service.Customizations" because it is in the service namespace "My.Service". Put new types in another namespace such as "Customizations" and use augment decorators for service customizations.',
        },
      ]);
  });
});
