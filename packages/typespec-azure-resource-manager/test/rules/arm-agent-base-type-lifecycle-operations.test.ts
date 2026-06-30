import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { armAgentBaseTypeLifecycleOperationsRule } from "../../src/rules/arm-agent-base-type-lifecycle-operations.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armAgentBaseTypeLifecycleOperationsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("arm-agent-base-type-lifecycle-operations", () => {
  it("passes when Conversation and Response have all lifecycle operations", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        using Azure.ResourceManager.BaseTypes.Agents;
        @armProviderNamespace namespace MyService;

        model MyDefinition is AgentDefinitionPlatform<true, true> {}
        model MyAgentProperties is AgentPropertiesPlatform<MyDefinition> {
          ...DefaultProvisioningStateProperty;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        model MyAgent is Agent<MyAgentProperties> {
          ...ResourceNameParameter<MyAgent>;
        }

        model MyConversationProperties is ConversationProperties {
          ...DefaultProvisioningStateProperty;
        }

        model MyConversation is AgentConversation<MyConversationProperties, MyAgent> {
          ...ResourceNameParameter<MyConversation>;
        }

        model MyResponseProperties is ResponseProperties {
          ...DefaultProvisioningStateProperty;
        }

        model MyResponse is AgentResponse<MyResponseProperties, MyAgent> {
          ...ResourceNameParameter<MyResponse>;
        }

        interface Operations extends Azure.ResourceManager.Operations {}

        @armResourceOperations
        interface Agents {
          get is ArmResourceRead<MyAgent>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyAgent>;
          update is ArmTagsPatchSync<MyAgent>;
          delete is ArmResourceDeleteWithoutOkAsync<MyAgent>;
          listByResourceGroup is ArmResourceListByParent<MyAgent>;
        }

        @armResourceOperations
        interface Conversations {
          get is ArmResourceRead<MyConversation>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyConversation>;
          update is ArmCustomPatchSync<MyConversation, Azure.ResourceManager.Foundations.ResourceUpdateModel<MyConversation, MyConversationProperties>>;
          delete is ArmResourceDeleteWithoutOkAsync<MyConversation>;
          listByAgent is ArmResourceListByParent<MyConversation>;
        }

        @armResourceOperations
        interface Responses {
          get is ArmResourceRead<MyResponse>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyResponse>;
          update is ArmCustomPatchSync<MyResponse, Azure.ResourceManager.Foundations.ResourceUpdateModel<MyResponse, MyResponseProperties>>;
          delete is ArmResourceDeleteWithoutOkAsync<MyResponse>;
          listByAgent is ArmResourceListByParent<MyResponse>;
        }
      `,
      )
      .toBeValid();
  });

  it("emits warning when Conversation is missing delete operation", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        using Azure.ResourceManager.BaseTypes.Agents;
        @armProviderNamespace namespace MyService;

        model MyDefinition is AgentDefinitionPlatform<true, true> {}
        model MyAgentProperties is AgentPropertiesPlatform<MyDefinition> {
          ...DefaultProvisioningStateProperty;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        model MyAgent is Agent<MyAgentProperties> {
          ...ResourceNameParameter<MyAgent>;
        }

        model MyConversationProperties is ConversationProperties {
          ...DefaultProvisioningStateProperty;
        }

        model MyConversation is AgentConversation<MyConversationProperties, MyAgent> {
          ...ResourceNameParameter<MyConversation>;
        }

        model MyResponseProperties is ResponseProperties {
          ...DefaultProvisioningStateProperty;
        }

        model MyResponse is AgentResponse<MyResponseProperties, MyAgent> {
          ...ResourceNameParameter<MyResponse>;
        }

        interface Operations extends Azure.ResourceManager.Operations {}

        @armResourceOperations
        interface Agents {
          get is ArmResourceRead<MyAgent>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyAgent>;
          update is ArmTagsPatchSync<MyAgent>;
          delete is ArmResourceDeleteWithoutOkAsync<MyAgent>;
          listByResourceGroup is ArmResourceListByParent<MyAgent>;
        }

        @armResourceOperations
        interface Conversations {
          get is ArmResourceRead<MyConversation>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyConversation>;
          update is ArmCustomPatchSync<MyConversation, Azure.ResourceManager.Foundations.ResourceUpdateModel<MyConversation, MyConversationProperties>>;
          listByAgent is ArmResourceListByParent<MyConversation>;
        }

        @armResourceOperations
        interface Responses {
          get is ArmResourceRead<MyResponse>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyResponse>;
          update is ArmCustomPatchSync<MyResponse, Azure.ResourceManager.Foundations.ResourceUpdateModel<MyResponse, MyResponseProperties>>;
          delete is ArmResourceDeleteWithoutOkAsync<MyResponse>;
          listByAgent is ArmResourceListByParent<MyResponse>;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-agent-base-type-lifecycle-operations",
        message: `Resource "MyConversation" is missing required lifecycle operations: delete.`,
      });
  });

  it("emits warning when Response is missing read and update operations", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        using Azure.ResourceManager.BaseTypes.Agents;
        @armProviderNamespace namespace MyService;

        model MyDefinition is AgentDefinitionPlatform<true, true> {}
        model MyAgentProperties is AgentPropertiesPlatform<MyDefinition> {
          ...DefaultProvisioningStateProperty;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        model MyAgent is Agent<MyAgentProperties> {
          ...ResourceNameParameter<MyAgent>;
        }

        model MyConversationProperties is ConversationProperties {
          ...DefaultProvisioningStateProperty;
        }

        model MyConversation is AgentConversation<MyConversationProperties, MyAgent> {
          ...ResourceNameParameter<MyConversation>;
        }

        model MyResponseProperties is ResponseProperties {
          ...DefaultProvisioningStateProperty;
        }

        model MyResponse is AgentResponse<MyResponseProperties, MyAgent> {
          ...ResourceNameParameter<MyResponse>;
        }

        interface Operations extends Azure.ResourceManager.Operations {}

        @armResourceOperations
        interface Agents {
          get is ArmResourceRead<MyAgent>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyAgent>;
          update is ArmTagsPatchSync<MyAgent>;
          delete is ArmResourceDeleteWithoutOkAsync<MyAgent>;
          listByResourceGroup is ArmResourceListByParent<MyAgent>;
        }

        @armResourceOperations
        interface Conversations {
          get is ArmResourceRead<MyConversation>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyConversation>;
          update is ArmCustomPatchSync<MyConversation, Azure.ResourceManager.Foundations.ResourceUpdateModel<MyConversation, MyConversationProperties>>;
          delete is ArmResourceDeleteWithoutOkAsync<MyConversation>;
          listByAgent is ArmResourceListByParent<MyConversation>;
        }

        @armResourceOperations
        interface Responses {
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyResponse>;
          delete is ArmResourceDeleteWithoutOkAsync<MyResponse>;
          listByAgent is ArmResourceListByParent<MyResponse>;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-agent-base-type-lifecycle-operations",
        message: `Resource "MyResponse" is missing required lifecycle operations: read, update.`,
      });
  });

  it("emits warnings for both Conversation and Response when both are missing operations", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        using Azure.ResourceManager.BaseTypes.Agents;
        @armProviderNamespace namespace MyService;

        model MyDefinition is AgentDefinitionPlatform<true, true> {}
        model MyAgentProperties is AgentPropertiesPlatform<MyDefinition> {
          ...DefaultProvisioningStateProperty;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        model MyAgent is Agent<MyAgentProperties> {
          ...ResourceNameParameter<MyAgent>;
        }

        model MyConversationProperties is ConversationProperties {
          ...DefaultProvisioningStateProperty;
        }

        model MyConversation is AgentConversation<MyConversationProperties, MyAgent> {
          ...ResourceNameParameter<MyConversation>;
        }

        model MyResponseProperties is ResponseProperties {
          ...DefaultProvisioningStateProperty;
        }

        model MyResponse is AgentResponse<MyResponseProperties, MyAgent> {
          ...ResourceNameParameter<MyResponse>;
        }

        interface Operations extends Azure.ResourceManager.Operations {}

        @armResourceOperations
        interface Agents {
          get is ArmResourceRead<MyAgent>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyAgent>;
          update is ArmTagsPatchSync<MyAgent>;
          delete is ArmResourceDeleteWithoutOkAsync<MyAgent>;
          listByResourceGroup is ArmResourceListByParent<MyAgent>;
        }

        @armResourceOperations
        interface Conversations {
          get is ArmResourceRead<MyConversation>;
          listByAgent is ArmResourceListByParent<MyConversation>;
        }

        @armResourceOperations
        interface Responses {
          get is ArmResourceRead<MyResponse>;
          listByAgent is ArmResourceListByParent<MyResponse>;
        }
      `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-resource-manager/arm-agent-base-type-lifecycle-operations",
          message: `Resource "MyConversation" is missing required lifecycle operations: create, update, delete.`,
        },
        {
          code: "@azure-tools/typespec-azure-resource-manager/arm-agent-base-type-lifecycle-operations",
          message: `Resource "MyResponse" is missing required lifecycle operations: create, update, delete.`,
        },
      ]);
  });

  it("does not emit for non-Agent child resources", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model MyProperties {
          ...DefaultProvisioningStateProperty;
        }

        model MyResource is TrackedResource<MyProperties> {
          ...ResourceNameParameter<MyResource>;
        }

        model ChildProperties {
          ...DefaultProvisioningStateProperty;
        }

        @parentResource(MyResource)
        model ChildResource is ProxyResource<ChildProperties> {
          @key("childName") @segment("children") name: string;
        }

        interface Operations extends Azure.ResourceManager.Operations {}

        @armResourceOperations
        interface Resources {
          get is ArmResourceRead<MyResource>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyResource>;
          delete is ArmResourceDeleteWithoutOkAsync<MyResource>;
          listByResourceGroup is ArmResourceListByParent<MyResource>;
        }

        @armResourceOperations
        interface Children {
          get is ArmResourceRead<ChildResource>;
        }
      `,
      )
      .toBeValid();
  });

  it("emits warning when Conversation has no operations interface", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        using Azure.ResourceManager.BaseTypes.Agents;
        @armProviderNamespace namespace MyService;

        model MyDefinition is AgentDefinitionPlatform<true, true> {}
        model MyAgentProperties is AgentPropertiesPlatform<MyDefinition> {
          ...DefaultProvisioningStateProperty;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        model MyAgent is Agent<MyAgentProperties> {
          ...ResourceNameParameter<MyAgent>;
        }

        model MyConversationProperties is ConversationProperties {
          ...DefaultProvisioningStateProperty;
        }

        model MyConversation is AgentConversation<MyConversationProperties, MyAgent> {
          ...ResourceNameParameter<MyConversation>;
        }

        model MyResponseProperties is ResponseProperties {
          ...DefaultProvisioningStateProperty;
        }

        model MyResponse is AgentResponse<MyResponseProperties, MyAgent> {
          ...ResourceNameParameter<MyResponse>;
        }

        interface Operations extends Azure.ResourceManager.Operations {}

        @armResourceOperations
        interface Agents {
          get is ArmResourceRead<MyAgent>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyAgent>;
          update is ArmTagsPatchSync<MyAgent>;
          delete is ArmResourceDeleteWithoutOkAsync<MyAgent>;
          listByResourceGroup is ArmResourceListByParent<MyAgent>;
        }

        @armResourceOperations
        interface Responses {
          get is ArmResourceRead<MyResponse>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<MyResponse>;
          update is ArmCustomPatchSync<MyResponse, Azure.ResourceManager.Foundations.ResourceUpdateModel<MyResponse, MyResponseProperties>>;
          delete is ArmResourceDeleteWithoutOkAsync<MyResponse>;
          listByAgent is ArmResourceListByParent<MyResponse>;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-agent-base-type-lifecycle-operations",
        message: `Resource "MyConversation" is missing required lifecycle operations: create, read, update, delete.`,
      });
  });
});
