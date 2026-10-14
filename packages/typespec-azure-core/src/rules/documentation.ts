import { getDoc, paramMessage, type Program, type SemanticNodeListener } from "@typespec/compiler";

export type DocumentationTarget = Parameters<typeof getDoc>[1];

export const documentationMessages = {
  default: paramMessage`The ${"kind"} named '${"name"}' should have a documentation or description, use doc comment /** */ to provide it.`,
  empty: "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
  uninformative: paramMessage`Description must not match the name of the node it describes. Node name:'${"name"}' Description:'${"description"}'`,
};

export function hasMeaningfulDocumentation(program: Program, target: DocumentationTarget): boolean {
  return (getDoc(program, target)?.trim().length ?? 0) > 0;
}

/** Preserve missing-documentation exemptions while validating explicitly authored documentation. */
export function withExplicitDocumentation(
  program: Program,
  listeners: SemanticNodeListener,
  requiredTargets: Set<DocumentationTarget>,
  validate: (target: DocumentationTarget) => void,
): SemanticNodeListener {
  const check = (target: DocumentationTarget) => {
    if (requiredTargets.has(target) && !hasMeaningfulDocumentation(program, target)) {
      return;
    }
    validate(target);
  };
  return {
    ...listeners,
    namespace: (target) => {
      listeners.namespace?.(target);
      check(target);
    },
    interface: (target) => {
      listeners.interface?.(target);
      check(target);
    },
    scalar: (target) => {
      listeners.scalar?.(target);
      check(target);
    },
    operation: (target) => {
      listeners.operation?.(target);
      check(target);
    },
    model: (target) => {
      listeners.model?.(target);
      check(target);
    },
    modelProperty: (target) => {
      listeners.modelProperty?.(target);
      check(target);
    },
    enum: (target) => {
      listeners.enum?.(target);
      check(target);
      // The compiler does not emit enumMember events.
      for (const member of target.members.values()) check(member);
    },
    union: (target) => {
      listeners.union?.(target);
      check(target);
    },
    unionVariant: (target) => {
      listeners.unionVariant?.(target);
      check(target);
    },
  };
}
