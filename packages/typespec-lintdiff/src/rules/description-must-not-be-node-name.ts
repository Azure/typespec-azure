import {
  createRule,
  getDoc,
  isKey,
  paramMessage,
  type Enum,
  type Model,
  type ModelProperty,
  type Operation,
  type Scalar,
  type Union,
} from "@typespec/compiler";
import {
  getHeaderFieldName,
  getOperationVerb,
  getPathParamName,
  getQueryParamName,
  isStatusCode,
} from "@typespec/http";

type NamedTarget = Enum | Model | Scalar | Union;

export const descriptionMustNotBeNodeNameRule = createRule({
  name: "description-must-not-be-node-name",
  description:
    "Explicit documentation must not repeat the emitted OpenAPI node name.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Description must not match the name of the node it describes. Node name:'${"name"}' Description:'${"description"}'`,
  },
  create(context) {
    const checkTarget = (
      target: Parameters<typeof getDoc>[1],
      nodeName: string | undefined,
    ) => {
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
        (normalizedNodeName === undefined ||
          normalizedNodeName !== normalizedDescription)
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
      enum: checkNamedTarget,
      union: checkNamedTarget,
      operation: (target: Operation) => {
        checkTarget(target, getOperationVerb(context.program, target));
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

        if (isKey(context.program, target)) {
          return;
        }

        checkTarget(
          target,
          target.name,
        );
      },
    };
  },
});

function normalize(value: string): string {
  return value.trim().replace(/\./g, "").toLowerCase();
}
