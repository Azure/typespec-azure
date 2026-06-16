import { Model, Program, createRule, getNamespaceFullName, paramMessage } from "@typespec/compiler";
import { getParentResource } from "@typespec/rest";

import { AzureBaseTypeInfo, getAzureBaseTypes } from "../base-types.js";
import { getArmResources } from "../resource.js";

export const armAgentBaseTypeChildResourcesRule = createRule({
  name: "arm-agent-base-type-child-resources",
  severity: "warning",
  description:
    "Resources decorated with @azureBaseType for the Agent base type must have both a Conversation and a Response child resource.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-agent-base-type-child-resources",
  messages: {
    default: paramMessage`Agent resources must have both a Conversation and a Response child resource. Missing: ${"missing"}.`,
  },
  create(context) {
    return {
      root: (program: Program) => {
        const resources = getArmResources(program);

        // Identify agent resources
        const agentResources = resources.filter((r) => hasAgentBaseType(r.typespecType));

        for (const agentResource of agentResources) {
          // Find child resources whose @parentResource points to this agent
          const children = resources.filter((r) => {
            const parent = getParentResource(context.program, r.typespecType);
            return parent === agentResource.typespecType;
          });

          let hasConversation = false;
          let hasResponse = false;

          for (const child of children) {
            const childProps = child.typespecType.properties.get("properties");
            if (childProps?.type.kind === "Model") {
              if (isConversationProperties(childProps.type)) {
                hasConversation = true;
              }
              if (isResponseProperties(childProps.type)) {
                hasResponse = true;
              }
            }
          }

          const missing: string[] = [];
          if (!hasConversation) missing.push("Conversation");
          if (!hasResponse) missing.push("Response");

          if (missing.length > 0) {
            context.reportDiagnostic({
              format: { missing: missing.join(", ") },
              target: agentResource.typespecType,
            });
          }
        }
      },
    };

    function hasAgentBaseType(model: Model): boolean {
      const directTypes = getAzureBaseTypes(context.program, model);
      if (directTypes && isAgent(directTypes)) return true;

      if (model.sourceModels) {
        for (const source of model.sourceModels) {
          const sourceTypes = getAzureBaseTypes(context.program, source.model);
          if (sourceTypes && isAgent(sourceTypes)) return true;
        }
      }

      return false;
    }

    function isAgent(types: AzureBaseTypeInfo[]): boolean {
      return types.some((bt) => bt.baseType === "Agent");
    }

    function isConversationProperties(model: Model): boolean {
      return checkModelName(model, "ConversationProperties");
    }

    function isResponseProperties(model: Model): boolean {
      return checkModelName(model, "ResponseProperties");
    }

    function checkModelName(model: Model, name: string): boolean {
      if (model.name === name) {
        const ns = model.namespace ? getNamespaceFullName(model.namespace) : "";
        if (ns === "Azure.ResourceManager.BaseTypes.Agents") return true;
      }
      if (model.baseModel) {
        if (checkModelName(model.baseModel, name)) return true;
      }
      if (model.sourceModels) {
        for (const source of model.sourceModels) {
          if (checkModelName(source.model, name)) return true;
        }
      }
      return false;
    }
  },
});
