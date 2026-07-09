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
  it("passes when Relationship resource is an extension resource with required properties", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes.Relationships;
        @armProviderNamespace namespace MyService;

        model MyRelationshipProperties is RelationshipProperties {
          note?: string;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        model MyRelationship is Relationship<MyRelationshipProperties> {
          ...ResourceNameParameter<MyRelationship>;
        }
      `,
      )
      .toBeValid();
  });

  it("emits warning when Relationship resource is missing sourceId", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model Metadata {
          sourceType: string;
          targetType: string;
        }

        model MyRelationshipProperties {
          @visibility(Lifecycle.Read)
          baseTypes: BaseTypeInfo[];
          targetId: string;
          targetTenant: string;
          metadata: Metadata;
          ...DefaultProvisioningStateProperty;
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
        message: `Relationship resources must define a required "sourceId" property.`,
      });
  });

  it("emits warning when Relationship resource is missing targetId", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model Metadata {
          sourceType: string;
          targetType: string;
        }

        model MyRelationshipProperties {
          @visibility(Lifecycle.Read)
          baseTypes: BaseTypeInfo[];
          sourceId: string;
          targetTenant: string;
          metadata: Metadata;
          ...DefaultProvisioningStateProperty;
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
        message: `Relationship resources must define a required "targetId" property.`,
      });
  });

  it("emits warning when Relationship resource is missing targetTenant", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model Metadata {
          sourceType: string;
          targetType: string;
        }

        model MyRelationshipProperties {
          @visibility(Lifecycle.Read)
          baseTypes: BaseTypeInfo[];
          sourceId: string;
          targetId: string;
          metadata: Metadata;
          ...DefaultProvisioningStateProperty;
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
        message: `Relationship resources must define a required "targetTenant" property.`,
      });
  });

  it("emits warning when Relationship resource is missing metadata", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model MyRelationshipProperties {
          @visibility(Lifecycle.Read)
          baseTypes: BaseTypeInfo[];
          sourceId: string;
          targetId: string;
          targetTenant: string;
          ...DefaultProvisioningStateProperty;
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
        message: `Relationship resources must define a required "metadata" property.`,
      });
  });

  it("emits warning when Relationship metadata is missing sourceType", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model Metadata {
          targetType: string;
        }

        model MyRelationshipProperties {
          @visibility(Lifecycle.Read)
          baseTypes: BaseTypeInfo[];
          sourceId: string;
          targetId: string;
          targetTenant: string;
          metadata: Metadata;
          ...DefaultProvisioningStateProperty;
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
        message: `Relationship metadata must define a required "sourceType" property.`,
      });
  });

  it("emits warning when Relationship metadata is missing targetType", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model Metadata {
          sourceType: string;
        }

        model MyRelationshipProperties {
          @visibility(Lifecycle.Read)
          baseTypes: BaseTypeInfo[];
          sourceId: string;
          targetId: string;
          targetTenant: string;
          metadata: Metadata;
          ...DefaultProvisioningStateProperty;
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
        message: `Relationship metadata must define a required "targetType" property.`,
      });
  });

  it("emits warning when Relationship resource is missing provisioningState", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model Metadata {
          sourceType: string;
          targetType: string;
        }

        model MyRelationshipProperties {
          @visibility(Lifecycle.Read)
          baseTypes: BaseTypeInfo[];
          sourceId: string;
          targetId: string;
          targetTenant: string;
          metadata: Metadata;
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
        message: `Relationship resources must define a "provisioningState" property.`,
      });
  });

  it("emits warning when Relationship resource is not an extension resource", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model Metadata {
          sourceType: string;
          targetType: string;
        }

        model MyRelationshipProperties {
          @visibility(Lifecycle.Read)
          baseTypes: BaseTypeInfo[];
          sourceId: string;
          targetId: string;
          targetTenant: string;
          metadata: Metadata;
          ...DefaultProvisioningStateProperty;
        }

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
          @key("myResourceName") @segment("myResources") name: string;
        }
      `,
      )
      .toBeValid();
  });
});
