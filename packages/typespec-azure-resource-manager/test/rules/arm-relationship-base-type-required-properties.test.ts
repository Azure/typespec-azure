import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { armRelationshipBaseTypeRequiredPropertiesRule } from "../../src/rules/arm-relationship-base-type-required-properties.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armRelationshipBaseTypeRequiredPropertiesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("arm-relationship-base-type-required-properties", () => {
  it("passes when a Relationship extension resource uses the Relationship template", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        using Azure.ResourceManager.BaseTypes.Relationships;
        @armProviderNamespace namespace MyService;

        model MyRelationshipMetadata is RelationshipMetadata {
          description?: string;
        }

        model MyRelationshipOriginInformation is RelationshipOriginInformation {
          discoveryVersion?: string;
        }

        model MyRelationshipProperties is RelationshipProperties<
          MyRelationshipMetadata,
          MyRelationshipOriginInformation
        > {}

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
          metadata: RelationshipMetadata;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        @azureBaseType(#{ baseType: "Relationship", version: "2024-06-01" })
        model MyRelationship is ExtensionResource<IncompleteRelationshipProperties> {
          ...ResourceNameParameter<MyRelationship>;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-relationship-base-type-required-properties",
        message:
          "Relationship resources must include required properties: sourceTenant, targetId, targetTenant, provisioningState.",
      });
  });

  it("emits warning when Relationship metadata is missing required properties", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        using Azure.ResourceManager.BaseTypes.Relationships;
        @armProviderNamespace namespace MyService;

        model IncompleteRelationshipMetadata {
          sourceType: string;
        }

        model MyRelationshipProperties {
          sourceId: string;
          sourceTenant: string;
          targetId: string;
          targetTenant: string;
          metadata: IncompleteRelationshipMetadata;
          provisioningState: string;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        @azureBaseType(#{ baseType: "Relationship", version: "2024-06-01" })
        model MyRelationship is ExtensionResource<MyRelationshipProperties> {
          ...ResourceNameParameter<MyRelationship>;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-relationship-base-type-required-properties",
        message: "Relationship metadata must include required properties: targetType.",
      });
  });

  it("emits warning when Relationship originInformation is missing relationshipOriginType", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        using Azure.ResourceManager.BaseTypes.Relationships;
        @armProviderNamespace namespace MyService;

        model IncompleteOriginInformation {
          discoveryEngine?: string;
        }

        model MyRelationshipProperties {
          sourceId: string;
          sourceTenant: string;
          targetId: string;
          targetTenant: string;
          metadata: RelationshipMetadata;
          originInformation?: IncompleteOriginInformation;
          provisioningState: string;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        @azureBaseType(#{ baseType: "Relationship", version: "2024-06-01" })
        model MyRelationship is ExtensionResource<MyRelationshipProperties> {
          ...ResourceNameParameter<MyRelationship>;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-relationship-base-type-required-properties",
        message:
          "Relationship originInformation must include required properties: relationshipOriginType.",
      });
  });

  it("emits warning when Relationship originInformation has optional relationshipOriginType", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        using Azure.ResourceManager.BaseTypes.Relationships;
        @armProviderNamespace namespace MyService;

        model IncompleteOriginInformation {
          relationshipOriginType?: string;
          discoveryEngine?: string;
        }

        model MyRelationshipProperties {
          sourceId: string;
          sourceTenant: string;
          targetId: string;
          targetTenant: string;
          metadata: RelationshipMetadata;
          originInformation?: IncompleteOriginInformation;
          provisioningState: string;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        @azureBaseType(#{ baseType: "Relationship", version: "2024-06-01" })
        model MyRelationship is ExtensionResource<MyRelationshipProperties> {
          ...ResourceNameParameter<MyRelationship>;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-relationship-base-type-required-properties",
        message:
          "Relationship originInformation must include required properties: relationshipOriginType.",
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
        code: "@azure-tools/typespec-azure-resource-manager/arm-relationship-base-type-required-properties",
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
