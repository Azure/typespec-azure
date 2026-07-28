import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { useRelationshipRequiredPropertiesRule } from "../../src/rules/use-relationship-required-properties.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    useRelationshipRequiredPropertiesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("use-relationship-required-properties", () => {
  it("passes when a Relationship extension resource uses the Relationship template", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        using Azure.ResourceManager.BaseTypes.Relationships;
        @armProviderNamespace namespace MyService;

        model MyRelationshipProperties is RelationshipProperties {}

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        model MyRelationship is Relationship<MyRelationshipProperties> {
          ...ResourceNameParameter<MyRelationship>;
        }
      `,
      )
      .toBeValid();
  });

  it("emits warning when Relationship resource is missing required properties", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        using Azure.ResourceManager.BaseTypes.Relationships;
        @armProviderNamespace namespace MyService;

        model IncompleteRelationshipProperties {
          sourceId: string;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        @azureBaseType(#{ baseType: "Relationship", version: "2024-06-01" })
        model MyRelationship is ExtensionResource<IncompleteRelationshipProperties> {
          ...ResourceNameParameter<MyRelationship>;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/use-relationship-required-properties",
        message:
          "Relationship resources must include required properties: sourceTenant, targetId, targetTenant, provisioningState.",
      });
  });

  it("emits warning when Relationship resource is not an extension resource", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        using Azure.ResourceManager.BaseTypes.Relationships;
        @armProviderNamespace namespace MyService;

        model MyRelationshipProperties is RelationshipProperties {}

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        @azureBaseType(#{ baseType: "Relationship", version: "2024-06-01" })
        model MyRelationship is TrackedResource<MyRelationshipProperties> {
          ...ResourceNameParameter<MyRelationship>;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/use-relationship-required-properties",
        message: "Relationship resources must be extension resources.",
      });
  });

  it("does not emit for non-Relationship base types", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model MyProperties {
          displayName: string;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        @azureBaseType(#{ baseType: "SomethingElse", version: "2024-06-01" })
        model MyResource is TrackedResource<MyProperties> {
          ...ResourceNameParameter<MyResource>;
        }
      `,
      )
      .toBeValid();
  });
});
