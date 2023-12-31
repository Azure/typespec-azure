import { ModelProperty, Namespace, Operation, createRule } from "@typespec/compiler";
import { getVersion } from "@typespec/versioning";
import { isExcludedCoreType } from "./utils.js";

function isApiVersionParam(prop: ModelProperty): boolean {
  return prop.name === "apiVersion" && prop.type.kind === "Scalar" && prop.type.name === "string";
}

// TODO: Remove this function once we have a mechanism for overriding or disabling linter rules
// See: https://github.com/microsoft/typespec/issues/1785
function isArmProviderNamespace(ns: Namespace): boolean {
  for (const dec of ns.decorators) {
    if (dec.decorator.name === "$armProviderNamespace") {
      return true;
    }
  }
  return false;
}

export const apiVersionRule = createRule({
  name: "operation-missing-api-version",
  description: "Operations need an api version parameter.",
  severity: "warning",
  messages: {
    default: `Operation is missing an api version parameter.`,
  },
  create(context) {
    return {
      operation: (op: Operation) => {
        if (isExcludedCoreType(context.program, op)) return;
        if (!op.namespace) return;
        // ignore ARM namespaces. They have their own rule
        if (isArmProviderNamespace(op.namespace)) return;
        const versionMap = getVersion(context.program, op.namespace);
        // rule only applies to versioned Azure operations
        if (!versionMap) return;
        for (const param of op.parameters.properties.values()) {
          if (isApiVersionParam(param)) return;
        }
        context.reportDiagnostic({
          target: op,
        });
      },
    };
  },
});
