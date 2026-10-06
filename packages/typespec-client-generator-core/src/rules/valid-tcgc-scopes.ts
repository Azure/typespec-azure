import {
  type DecoratedType,
  type Model,
  type Type,
  createRule,
  fileRef,
  getNamespaceFullName,
  paramMessage,
} from "@typespec/compiler";

const supportedScopes = ["csharp", "go", "java", "javascript", "python"];
const tcgcNamespace = "Azure.ClientGenerator.Core";

export const validTcgcScopesRule = createRule({
  name: "valid-tcgc-scopes",
  description: "TCGC scopes must use supported Azure SDK emitter identifiers",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/valid-tcgc-scopes",
  docs: fileRef.fromPackageRoot("src/rules/valid-tcgc-scopes.md"),
  messages: {
    default: paramMessage`Unsupported TCGC language scope "${"scope"}". Use one of: ${"supportedScopes"}.`,
  },
  create(context) {
    function checkDecorators(type: DecoratedType & Type) {
      for (const decorator of type.decorators) {
        const definition = decorator.definition;
        if (!definition || !isTcgcNamespace(getNamespaceFullName(definition.namespace))) {
          continue;
        }

        for (const [index, parameter] of definition.parameters.entries()) {
          if (parameter.name !== "scope" && parameter.name !== "options") {
            continue;
          }

          const scope = getScopeValue(decorator.args[index]?.jsValue);
          if (scope === undefined) {
            continue;
          }

          for (const scopeName of parseScopeNames(scope)) {
            if (!supportedScopes.includes(scopeName)) {
              context.reportDiagnostic({
                target: decorator.node ?? type,
                format: {
                  scope: scopeName,
                  supportedScopes: supportedScopes.join(", "),
                },
              });
            }
          }
        }
      }
    }

    return {
      scalar: checkDecorators,
      model: checkDecorators,
      modelProperty: checkDecorators,
      enum: checkDecorators,
      enumMember: checkDecorators,
      union: checkDecorators,
      unionVariant: checkDecorators,
      operation: checkDecorators,
      interface: checkDecorators,
      namespace: checkDecorators,
    };
  },
});

function isTcgcNamespace(namespace: string): boolean {
  return namespace === tcgcNamespace || namespace.startsWith(`${tcgcNamespace}.`);
}

function getScopeValue(scopeArg: unknown): string | undefined {
  if (typeof scopeArg === "string") {
    return scopeArg;
  }

  if (typeof scopeArg === "object" && scopeArg !== null && "scope" in scopeArg) {
    return typeof scopeArg.scope === "string" ? scopeArg.scope : undefined;
  }

  if (
    typeof scopeArg === "object" &&
    scopeArg !== null &&
    "kind" in scopeArg &&
    scopeArg.kind === "Model"
  ) {
    let model: Model | undefined = scopeArg as Model;
    while (model) {
      const scope = model.properties.get("scope")?.type;
      if (scope?.kind === "String") {
        return scope.value;
      }
      model = model.baseModel;
    }
  }

  return undefined;
}

function parseScopeNames(scope: string): string[] {
  const scopeList = scope.startsWith("!(") && scope.endsWith(")") ? scope.slice(2, -1) : scope;
  return scopeList
    .split(",")
    .map((name) => name.trim().replace(/^!/, "").trim())
    .filter((name) => name.length > 0);
}
