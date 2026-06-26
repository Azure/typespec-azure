import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { armAgentBaseTypeChildResourcesRule } from "../../src/rules/arm-agent-base-type-child-resources.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armAgentBaseTypeChildResourcesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("arm-agent-base-type-child-resources", () => {
  it("passes when Agent resource has both Conversation and Response child resources", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model MyAgentProperties {
          displayName: string;
          description: string;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        @azureBaseType(#{ baseType: "Agent", version: "2024-06-01" })
        model MyAgent is TrackedResource<MyAgentProperties> {
          @key("myAgentName") @segment("myAgents") name: string;
        }

        model MyConversationProperties is Azure.ResourceManager.BaseTypes.Agents.ConversationProperties {
        }

        @parentResource(MyAgent)
        model MyConversation is ProxyResource<MyConversationProperties> {
          @key("conversationName") @segment("conversations") name: string;
        }

        model MyResponseProperties is Azure.ResourceManager.BaseTypes.Agents.ResponseProperties {
        }

        @parentResource(MyAgent)
        model MyResponse is ProxyResource<MyResponseProperties> {
          @key("responseName") @segment("responses") name: string;
        }
      `,
      )
      .toBeValid();
  });

  it("emits warning when Agent resource is missing Conversation child resource", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model MyAgentProperties {
          displayName: string;
          description: string;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        @azureBaseType(#{ baseType: "Agent", version: "2024-06-01" })
        model MyAgent is TrackedResource<MyAgentProperties> {
          @key("myAgentName") @segment("myAgents") name: string;
        }

        model MyResponseProperties is Azure.ResourceManager.BaseTypes.Agents.ResponseProperties {
        }

        @parentResource(MyAgent)
        model MyResponse is ProxyResource<MyResponseProperties> {
          @key("responseName") @segment("responses") name: string;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-agent-base-type-child-resources",
        message:
          "Agent resources must have both a Conversation and a Response child resource. Missing: Conversation.",
      });
  });

  it("emits warning when Agent resource is missing Response child resource", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model MyAgentProperties {
          displayName: string;
          description: string;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        @azureBaseType(#{ baseType: "Agent", version: "2024-06-01" })
        model MyAgent is TrackedResource<MyAgentProperties> {
          @key("myAgentName") @segment("myAgents") name: string;
        }

        model MyConversationProperties is Azure.ResourceManager.BaseTypes.Agents.ConversationProperties {
        }

        @parentResource(MyAgent)
        model MyConversation is ProxyResource<MyConversationProperties> {
          @key("conversationName") @segment("conversations") name: string;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-agent-base-type-child-resources",
        message:
          "Agent resources must have both a Conversation and a Response child resource. Missing: Response.",
      });
  });

  it("emits warning when Agent resource is missing both child resources", async () => {
    await tester
      .expect(
        `
        using Azure.ResourceManager.BaseTypes;
        @armProviderNamespace namespace MyService;

        model MyAgentProperties {
          displayName: string;
          description: string;
        }

        #suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "test"
        @azureBaseType(#{ baseType: "Agent", version: "2024-06-01" })
        model MyAgent is TrackedResource<MyAgentProperties> {
          @key("myAgentName") @segment("myAgents") name: string;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-agent-base-type-child-resources",
        message:
          "Agent resources must have both a Conversation and a Response child resource. Missing: Conversation, Response.",
      });
  });

  it("does not emit for non-Agent base types", async () => {
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
