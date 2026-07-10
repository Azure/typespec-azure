import {
  createRule,
  getNamespaceFullName,
  listServices,
  paramMessage,
  resolvePath,
  type Statement,
} from "@typespec/compiler";
import {
  type NamespaceStatementNode,
  SyntaxKind,
  type TypeSpecScriptNode,
} from "@typespec/compiler/ast";

export const noServiceNamespaceRedefinitionRule = createRule({
  name: "no-service-namespace-redefinition",
  description: "Prevent client.tsp from redefining the service namespace.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-service-namespace-redefinition",
  messages: {
    default:
      paramMessage`client.tsp must not define namespace "${"namespace"}" because it is in the service namespace "${"serviceNamespace"}". Put new types in another namespace such as "Customizations" and use augment decorators for service customizations.`,
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

        const serviceNamespaces = listServices(context.program)
          .map((service) => getNamespaceFullName(service.type))
          .filter((serviceNamespace) => serviceNamespace.length > 0)
          .sort((left, right) => right.length - left.length);

        if (serviceNamespaces.length === 0) {
          return;
        }

        for (const namespaceDecl of getNamespaceDeclarations(clientScript)) {
          const matchingServiceNamespace = serviceNamespaces.find((serviceNamespace) => {
            return (
              namespaceDecl.fullName === serviceNamespace ||
              namespaceDecl.fullName.startsWith(`${serviceNamespace}.`)
            );
          });

          if (!matchingServiceNamespace) {
            continue;
          }

          context.reportDiagnostic({
            target: namespaceDecl.node,
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
