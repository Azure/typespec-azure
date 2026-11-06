import {
  createRule,
  type DecoratedType,
  type DecoratorArgument,
  fileRef,
  getNamespaceFullName,
  navigateProgram,
  paramMessage,
  type Type,
  walkPropertiesInherited,
} from "@typespec/compiler";
import { parseScopes } from "../internal-utils.js";

export const noUnsupportedScopeRule = createRule({
  name: "no-unsupported-scope",
  description: "Use supported language scopes for TCGC decorators.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-unsupported-scope",
  docs: fileRef.fromPackageRoot("src/rules/no-unsupported-scope.md"),
  messages: {
    default: paramMessage`Unsupported TCGC language scope '${"scope"}'. Supported Azure SDK scopes are 'csharp', 'java', 'python', 'javascript', and 'go'. Use 'javascript' for TypeScript SDKs.`,
  },
  create(context) {
    const supportedScopes = new Set(["csharp", "java", "python", "javascript", "go"]);
    const reported = new Map<NonNullable<DecoratorArgument["node"]>, Set<string>>();

    function check(type: Type & DecoratedType) {
      for (const decorator of type.decorators) {
        const definition = decorator.definition;
        if (!definition) continue;
        const namespace = getNamespaceFullName(definition.namespace);
        if (
          namespace !== "Azure.ClientGenerator.Core" &&
          !namespace.startsWith("Azure.ClientGenerator.Core.")
        ) {
          continue;
        }
        for (const [index, argument] of decorator.args.entries()) {
          const parameter = definition.parameters[index];
          if (parameter.name !== "scope" && parameter.name !== "options") continue;

          let value = argument.value;
          if (value.entityKind === "Type" && value.kind === "Model") {
            const property = [...walkPropertiesInherited(value)].find((x) => x.name === "scope");
            if (!property) continue;
            value = property.type;
          } else if (value.entityKind === "Value" && value.valueKind === "ObjectValue") {
            const property = value.properties.get("scope");
            if (!property) continue;
            value = property.value;
          }

          const scope =
            value.entityKind === "Value" && value.valueKind === "StringValue"
              ? value.value
              : value.entityKind === "Type" && value.kind === "String"
                ? value.value
                : undefined;
          if (!scope) continue;

          const [negations = [], positives = []] = parseScopes(scope);
          for (const name of new Set([...negations, ...positives])) {
            if (!supportedScopes.has(name)) {
              const target = argument.node ?? decorator.node;
              if (target) {
                const scopes = reported.get(target) ?? new Set<string>();
                if (scopes.has(name)) continue;
                scopes.add(name);
                reported.set(target, scopes);
              }
              context.reportDiagnostic({
                target: target ?? type,
                format: { scope: name },
              });
            }
          }
        }
      }
    }

    return {
      root(program) {
        // Scope typos matter even on templates that have not been instantiated.
        navigateProgram(
          program,
          {
            namespace: check,
            interface: check,
            operation: check,
            model: check,
            modelProperty: check,
            scalar: check,
            enum: check,
            enumMember: check,
            union: check,
            unionVariant: check,
          },
          { includeTemplateDeclaration: true },
        );
      },
    };
  },
});
