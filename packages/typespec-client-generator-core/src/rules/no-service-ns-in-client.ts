import {
  createRule,
  getNamespaceFullName,
  isService,
  type Namespace,
  paramMessage,
  type Program,
  resolvePath,
  type Statement,
} from "@typespec/compiler";
import {
  type NamespaceStatementNode,
  SyntaxKind,
  type TypeSpecScriptNode,
} from "@typespec/compiler/ast";

export const noServiceNsInClientRule = createRule({
  name: "no-service-ns-in-client",
  description: "Prevent client.tsp from redefining the service namespace.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-service-ns-in-client",
  messages: {
    default: paramMessage`client.tsp must not define namespace "${"namespace"}" because it is in the service namespace "${"serviceNamespace"}". Put new types in another namespace such as "Customizations" and use augment decorators for service customizations.`,
  },
  create(context) {
    let processed = false;

    return {
      namespace() {
        if (processed) {
          return;
        }
        processed = true;

        const clientTspPath = resolvePath(context.program.projectRoot, "client.tsp");
        const clientScript = context.program.sourceFiles.get(clientTspPath);
        if (!clientScript) {
          return;
        }

        for (const namespaceDecl of getNamespaceDeclarations(clientScript)) {
          const namespace = context.program.checker.getTypeForNode(namespaceDecl.lookupNode);
          if (namespace.kind !== "Namespace") {
            continue;
          }

          const matchingServiceNamespace = findEnclosingServiceNamespace(
            namespace,
            context.program,
          );

          if (!matchingServiceNamespace) {
            continue;
          }

          context.reportDiagnostic({
            target: namespaceDecl.lookupNode,
            format: {
              namespace: namespaceDecl.fullName,
              serviceNamespace: matchingServiceNamespace,
            },
          });
        }
      },
    };
  },
});

interface NamespaceDeclaration {
  fullName: string;
  lookupNode: NamespaceStatementNode;
  node: NamespaceStatementNode;
}

function getNamespaceDeclarations(script: TypeSpecScriptNode): NamespaceDeclaration[] {
  return collectNamespaceDeclarations(script.statements, []);
}

function collectNamespaceDeclarations(
  statements: readonly Statement[],
  parentSegments: string[],
): NamespaceDeclaration[] {
  const declarations: NamespaceDeclaration[] = [];

  for (const statement of statements) {
    if (statement.kind !== SyntaxKind.NamespaceStatement) {
      continue;
    }

    declarations.push(...collectNamespaceStatementDeclarations(statement, parentSegments));
  }

  return declarations;
}

function collectNamespaceStatementDeclarations(
  statement: NamespaceStatementNode,
  parentSegments: string[],
): NamespaceDeclaration[] {
  const segments = [...parentSegments, statement.id.sv];
  let current = statement;

  while (true) {
    const nestedStatement = current.statements;
    if (!isNamespaceStatementNode(nestedStatement)) {
      break;
    }

    current = nestedStatement;
    segments.push(current.id.sv);
  }

  const declarations: NamespaceDeclaration[] = [
    {
      fullName: segments.join("."),
      lookupNode: current,
      node: statement,
    },
  ];

  if (Array.isArray(current.statements)) {
    declarations.push(...collectNamespaceDeclarations(current.statements, segments));
  }

  return declarations;
}

function isNamespaceStatementNode(
  statement: NamespaceStatementNode | readonly Statement[] | undefined,
): statement is NamespaceStatementNode {
  return statement !== undefined && !Array.isArray(statement);
}

function findEnclosingServiceNamespace(namespace: Namespace, program: Program): string | undefined {
  let current: Namespace | undefined = namespace;

  while (current) {
    if (isService(program, current)) {
      return getNamespaceFullName(current);
    }

    current = current.namespace;
  }

  return undefined;
}
