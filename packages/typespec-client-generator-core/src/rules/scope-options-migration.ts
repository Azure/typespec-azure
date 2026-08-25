import {
  createRule,
  defineCodeFix,
  fileRef,
  getSourceLocation,
  type DecoratorApplication,
  type Enum,
  type EnumMember,
  type Interface,
  type LinterRuleContext,
  type Model,
  type ModelProperty,
  type Namespace,
  type Operation,
  type Scalar,
  type Type,
  type Union,
  type UnionVariant,
} from "@typespec/compiler";
import { SyntaxKind, type StringLiteralNode } from "@typespec/compiler/ast";

/**
 * Decorator names (without the leading `@`, in the `Azure.ClientGenerator.Core` or
 * `Azure.ClientGenerator.Core.Legacy` namespaces) that accept a legacy positional
 * string `scope` argument as their final parameter.
 */
const scopedDecoratorNames = new Set([
  "clientName",
  "convenientAPI",
  "protocolAPI",
  "client",
  "operationGroup",
  "usage",
  "access",
  "override",
  "useSystemTextJsonConverter",
  "clientInitialization",
  "paramAlias",
  "clientNamespace",
  "alternateType",
  "scope",
  "apiVersion",
  "clientApiVersions",
  "deserializeEmptyStringAsNull",
  "responseAsBool",
  "clientLocation",
  "clientDoc",
  "clientOption",
  "hierarchyBuilding",
  "flattenProperty",
  "markAsLro",
  "markAsPageable",
  "disablePageable",
  "nextLinkVerb",
  "clientDefaultValue",
]);

function isTcgcScopedDecorator(application: DecoratorApplication): boolean {
  const name = application.definition?.name;
  if (name === undefined) return false;
  const namespace = application.definition?.namespace?.name;
  const unqualified = name.replace(/^@/, "");
  return (
    scopedDecoratorNames.has(unqualified) &&
    (namespace === "Core" ||
      // getNamespaceFullName is not needed here; checking the immediate namespace
      // name is sufficient since only TCGC's own `Core`/`Legacy` namespaces define
      // decorators with these exact names.
      namespace === "Legacy")
  );
}

/**
 * Find the index of the last declared parameter (named `scope`, per the shared
 * `Scope` alias convention used by every TCGC scoped decorator) and check whether
 * the call site actually supplied an argument at that position using the legacy
 * positional string form (as opposed to omitting it, or using the options bag).
 */
function getLegacyScopeArgNode(application: DecoratorApplication): StringLiteralNode | undefined {
  const parameters = application.definition?.parameters;
  if (!parameters || parameters.length === 0) return undefined;

  const scopeParamIndex = parameters.findIndex((p) => p.name === "scope");
  if (scopeParamIndex === -1) return undefined;

  const arg = application.args[scopeParamIndex];
  const argNode = arg?.node;
  if (argNode?.kind !== SyntaxKind.StringLiteral) return undefined;

  return argNode;
}

function createLegacyScopeToOptionsBagCodeFix(argNode: StringLiteralNode) {
  return defineCodeFix({
    id: "legacy-scope-to-options-bag",
    label: `Convert to \`#{ scope: ${argNode.value === undefined ? '"..."' : JSON.stringify(argNode.value)} }\``,
    fix: (fixContext) => {
      const location = getSourceLocation(argNode);
      return fixContext.replaceText(location, `#{ scope: ${JSON.stringify(argNode.value)} }`);
    },
  });
}

function checkDecorators(
  context: LinterRuleContext<{ default: string }>,
  target: Type & { decorators: DecoratorApplication[] },
) {
  for (const application of target.decorators) {
    if (!isTcgcScopedDecorator(application)) continue;

    const argNode = getLegacyScopeArgNode(application);
    if (argNode === undefined) continue;

    context.reportDiagnostic({
      target,
      codefixes: [createLegacyScopeToOptionsBagCodeFix(argNode)],
    });
  }
}

export const scopeOptionsMigrationRule = createRule({
  name: "scope-options-migration",
  docs: fileRef.fromPackageRoot("src/rules/scope-options-migration.md"),
  description:
    "Suggests migrating the legacy positional string `scope` argument to the typed `#{ scope: ... }` options bag.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/scope-options-migration",
  messages: {
    default:
      'This decorator\'s legacy positional string `scope` argument can be migrated to the typed `#{ scope: "..." }` options bag. Both forms are supported today; migrating is optional.',
  },
  create(context) {
    return {
      model: (model: Model) => checkDecorators(context, model),
      modelProperty: (property: ModelProperty) => checkDecorators(context, property),
      operation: (operation: Operation) => checkDecorators(context, operation),
      namespace: (namespace: Namespace) => checkDecorators(context, namespace),
      interface: (iface: Interface) => checkDecorators(context, iface),
      enum: (en: Enum) => checkDecorators(context, en),
      enumMember: (member: EnumMember) => checkDecorators(context, member),
      union: (union: Union) => checkDecorators(context, union),
      unionVariant: (variant: UnionVariant) => checkDecorators(context, variant),
      scalar: (scalar: Scalar) => checkDecorators(context, scalar),
    };
  },
});
