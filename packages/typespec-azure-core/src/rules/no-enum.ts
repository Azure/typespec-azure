import {
  CodeFix,
  Enum,
  EnumMemberNode,
  EnumSpreadMemberNode,
  Node,
  SyntaxKind,
  createRule,
  getSourceLocation,
  paramMessage,
} from "@typespec/compiler";
import { getVersionsForEnum } from "@typespec/versioning";
export const noEnumRule = createRule({
  name: "no-enum",
  description: "Azure services should not use enums.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-enum",
  messages: {
    default: paramMessage`Azure services should not use the enum keyword. Extensible enums should be defined as unions with "string" as an accepted variant (ex: \`union Choice { Yes: "yes", No: "no", string };\`).`,
  },
  create(context) {
    return {
      enum: (en: Enum) => {
        if (getVersionsForEnum(context.program, en).length > 0) {
          return;
        }
        context.reportDiagnostic({
          format: { enumName: en.name },
          target: en,
          codefixes: [createEnumToExtensibleUnionCodeFix(en)],
        });
      },
    };
  },
});

function createEnumToExtensibleUnionCodeFix(en: Enum): CodeFix {
  function convertEnumMemberToUnionVariant(node: EnumMemberNode | EnumSpreadMemberNode) {
    switch (node.kind) {
      case SyntaxKind.EnumSpreadMember:
        return getSourceLocation(node.target).file.text.slice(node.target.pos, node.target.end);
      case SyntaxKind.EnumMember:
        return node.value
          ? `${node.id.sv}: ${
              node.value.kind === SyntaxKind.NumericLiteral
                ? node.value.value
                : `"${node.value.value}"`
            }}`
          : `"${node.id.sv}"`;
    }
  }

  return {
    id: "enum-to-extensible-union",
    label: "Convert to extensible union",
    fix(context) {
      const type = typeof [...en.members.values()][0].value === "number" ? "number" : "string";
      return [
        context.replaceText(
          getSourceLocation(en.node),
          `${getNodeTrivia(en.node)}union ${en.name} {${type}, ${en.node.members.map(
            (member) => `${getNodeTrivia(member)}${convertEnumMemberToUnionVariant(member)}`
          )}}`
        ),
      ];
    },
  };
}

function getNodeTrivia(node: Node): string {
  let endOfTrivia = node.pos;
  for (const directive of node.directives ?? []) {
    if (directive.pos > endOfTrivia) {
      endOfTrivia = directive.pos;
    }
  }
  for (const doc of node.docs ?? []) {
    if (doc.pos > endOfTrivia) {
      endOfTrivia = doc.pos;
    }
  }
  if ("decorators" in node) {
    for (const dec of node.decorators ?? []) {
      if (dec.pos > endOfTrivia) {
        endOfTrivia = dec.pos;
      }
    }
  }

  return getSourceLocation(node).file.text.slice(node.pos, endOfTrivia);
}
