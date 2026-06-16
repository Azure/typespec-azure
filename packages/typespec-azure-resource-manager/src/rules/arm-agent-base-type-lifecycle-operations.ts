import { Model, Program, createRule, getNamespaceFullName, paramMessage } from "@typespec/compiler";
import { getParentResource } from "@typespec/rest";

import { AzureBaseTypeInfo, getAzureBaseTypes } from "../base-types.js";
import { getArmResources } from "../resource.js";

export const armAgentBaseTypeLifecycleOperationsRule = createRule({
  name: "arm-agent-base-type-lifecycle-operations",
  severity: "warning",
  description:
    "Conversation and Response child resources of an Agent must define create, read, update, and delete lifecycle operations.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-agent-base-type-lifecycle-operations",
  messages: {
    default: paramMessage`Resource "${"resourceName"}" is missing required lifecycle operations: ${"missing"}.`,
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

          for (const child of children) {
            const childProps = child.typespecType.properties.get("properties");
            if (childProps?.type.kind !== "Model") continue;

            const isConversation = isConversationProperties(childProps.type);
            const isResponse = isResponseProperties(childProps.type);

            if (!isConversation && !isResponse) continue;

            // Check lifecycle operations
            const lifecycle = child.operations.lifecycle;
            const missing: string[] = [];
            if (!lifecycle.createOrUpdate) missing.push("create");
            if (!lifecycle.read) missing.push("read");
            if (!lifecycle.update) missing.push("update");
            if (!lifecycle.delete) missing.push("delete");

            if (missing.length > 0) {
              context.reportDiagnostic({
                format: {
                  resourceName: child.typespecType.name,
                  missing: missing.join(", "),
                },
                target: child.typespecType,
              });
            }
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
