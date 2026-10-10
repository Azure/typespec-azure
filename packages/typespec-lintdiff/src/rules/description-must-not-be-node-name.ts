import {
  createRule,
  getDoc,
  ignoreDiagnostics,
  paramMessage,
  resolveEncodedName,
  type Enum,
  type EnumMember,
  type Model,
  type ModelProperty,
  type Operation,
  type Scalar,
  type Union,
  type UnionVariant,
} from "@typespec/compiler";
import {
  getHeaderFieldName,
  getHttpOperation,
  getPathParamName,
  getQueryParamName,
  isStatusCode,
} from "@typespec/http";

type NamedTarget = Enum | EnumMember | Model | Scalar | Union;

export const descriptionMustNotBeNodeNameRule = createRule({
  name: "description-must-not-be-node-name",
  description: "Explicit documentation should describe a declaration rather than repeat its name.",
  severity: "warning",
  messages: {
    default: paramMessage`Description must not match the name of the node it describes. Node name:'${"name"}' Description:'${"description"}'`,
  },
  create(context) {
    const checkTarget = (target: Parameters<typeof getDoc>[1], nodeName: string | undefined) => {
      const doc = getDoc(context.program, target);
      if (doc === undefined) {
        return;
      }

      const normalizedDescription = normalize(doc);
      if (normalizedDescription.length === 0) {
        return;
      }

      const normalizedNodeName = nodeName ? normalize(nodeName) : undefined;
      if (
        normalizedDescription !== "description" &&
        (normalizedNodeName === undefined || normalizedNodeName !== normalizedDescription)
      ) {
        return;
      }

      context.reportDiagnostic({
        target,
        format: {
          name: nodeName ?? "description",
          description: doc,
        },
      });
    };

    const checkNamedTarget = (target: NamedTarget) => {
      const { name } = target;
      if (!name || name.length === 0) {
        return;
      }

      checkTarget(target, name);
    };

    return {
      model: checkNamedTarget,
      scalar: checkNamedTarget,
      enum: (target: Enum) => {
        checkNamedTarget(target);
        for (const member of target.members.values()) {
          checkNamedTarget(member);
        }
      },
      union: checkNamedTarget,
      unionVariant: (target: UnionVariant) => {
        checkTarget(
          target,
          typeof target.name === "string"
            ? target.name
            : target.type.kind === "String"
              ? target.type.value
              : undefined,
        );
      },
      operation: (target: Operation) => {
        // HTTP validation owns resolution diagnostics; this rule only checks documentation.
        const httpOperation = ignoreDiagnostics(getHttpOperation(context.program, target));
        checkTarget(target, httpOperation.verb);
      },
      modelProperty: (target: ModelProperty) => {
        if (isStatusCode(context.program, target)) {
          return;
        }

        const emittedName =
          getPathParamName(context.program, target) ??
          getQueryParamName(context.program, target) ??
          getHeaderFieldName(context.program, target);

        if (emittedName !== undefined) {
          checkTarget(target, emittedName);
          return;
        }

        checkTarget(target, resolveEncodedName(context.program, target, "application/json"));
      },
    };
  },
});

function normalize(value: string): string {
  return value.trim().replace(/\./g, "").toLowerCase();
}
