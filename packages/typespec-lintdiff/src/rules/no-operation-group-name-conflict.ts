import {
  AllScopes,
  createTCGCContext,
  getClientNameOverride,
  getClientType,
  getLibraryName,
  isInScope,
  listClients,
  listOperationsInClient,
  listSubClients,
} from "@azure-tools/typespec-client-generator-core";
import {
  createRule,
  getDiscriminatedUnionFromInheritance,
  getDiscriminator,
  ListenerFlow,
  navigateType,
  paramMessage,
  type Enum,
  type Model,
  type Scalar,
  type Type,
  type Union,
  type UnionVariant,
} from "@typespec/compiler";

export const noOperationGroupNameConflictRule = createRule({
  name: "no-operation-group-name-conflict",
  description: "Operation group names should not conflict with type names in the same client API.",
  severity: "warning",
  messages: {
    default: paramMessage`Operation group '${"groupName"}' conflicts with type '${"typeName"}'. Rename the group, for example by using a plural name.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false, scope: AllScopes },
    );
    // SDK classification visits every alternative and allocates names for unreachable types.
    const classificationContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false, scope: AllScopes },
    );
    return {
      root() {
        for (const client of listClients(tcgcContext)) {
          const names = new Set<string>();
          const visited = new Set<Model | Scalar | Enum | Union>();
          function addName(type: Model | Scalar | Enum | Union) {
            if (type.name && !context.program.checker.isStdType(type)) {
              names.add(getLibraryName(tcgcContext, type, AllScopes));
            }
          }
          function collect(type: Model | Scalar | Enum | Union) {
            if (visited.has(type)) {
              return ListenerFlow.NoRecursion;
            }
            visited.add(type);
            addName(type);
            return undefined;
          }
          function visit(type: Type) {
            if (type.kind === "EnumMember") {
              addName(type.enum);
            } else {
              navigateType(type, listeners, {});
            }
          }
          function collectVariant(variant: UnionVariant) {
            if (
              variant.union.name &&
              getClientType(classificationContext, variant.union).kind === "enum"
            ) {
              addName(variant.union);
            }
            // A member reference does not make the union's other alternatives reachable.
            visit(variant.type);
            return ListenerFlow.NoRecursion;
          }
          function collectModel(model: Model) {
            if (visited.has(model)) return ListenerFlow.NoRecursion;
            visited.add(model);
            // Inheritance contributes names and members, not the base's other subtypes.
            for (let current: Model | undefined = model; current; current = current.baseModel) {
              addName(current);
              for (const property of current.properties.values()) {
                if (isInScope(tcgcContext, property)) visit(property.type);
              }
              if (current.indexer) visit(current.indexer.value);
            }
            const discriminator = getDiscriminator(context.program, model);
            if (discriminator) {
              const [alternatives, diagnostics] = getDiscriminatedUnionFromInheritance(
                model,
                discriminator,
              );
              // The compiler already reports invalid discriminator graphs.
              if (diagnostics.length === 0) {
                for (const alternative of alternatives.variants.values()) {
                  visit(alternative);
                }
              }
            }
            return ListenerFlow.NoRecursion;
          }
          const listeners = {
            model: collectModel,
            scalar: collect,
            enum: collect,
            union: collect,
            unionVariant: collectVariant,
          };
          for (const operation of listOperationsInClient(tcgcContext, client, true)) {
            visit(operation.parameters);
            visit(operation.returnType);
          }

          for (const group of listSubClients(tcgcContext, client, true)) {
            const groupName =
              group.type && getClientNameOverride(tcgcContext, group.type, AllScopes)
                ? getLibraryName(tcgcContext, group.type, AllScopes)
                : group.name;
            if (!names.has(groupName)) continue;
            // Virtual or merged groups have no declaration; use their first authored operation.
            const target = group.type ?? listOperationsInClient(tcgcContext, group, true)[0];
            if (target) {
              context.reportDiagnostic({ target, format: { groupName, typeName: groupName } });
            }
          }
        }
      },
    };
  },
});
