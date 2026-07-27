import {
  createRule,
  getEncode,
  getMaxLength,
  getPattern,
  isStringType,
  paramMessage,
  type ModelProperty,
  type Program,
  type Type,
} from "@typespec/compiler";
import { isArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation } from "@typespec/http";

const URL_MAX_LENGTH = 2083;

export const pathParameterSchemaRule = createRule({
  name: "path-parameter-schema",
  description:
    "Path parameters should resolve to string schemas and specify maxLength and pattern constraints.",
  severity: "warning",
  messages: {
    wrongType: "Path parameter should be defined as type: string.",
    missingBoth:
      "Path parameter should specify a maximum length (maxLength) and characters allowed (pattern).",
    missingMaxLength: "Path parameter should specify a maximum length (maxLength).",
    maxLengthTooLarge:
      paramMessage`Path parameter maximum length should be less than ${"maxLength"}`,
    missingPattern: "Path parameter should specify characters allowed (pattern).",
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (isArmProviderNamespace(context.program, namespace)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        for (const parameter of httpOperation.parameters.parameters) {
          if (parameter.type !== "path") {
            continue;
          }

          reportPathParameterDiagnostics(context.program, parameter.param, (messageId) => {
            context.reportDiagnostic({
              target: parameter.param,
              messageId,
              format:
                messageId === "maxLengthTooLarge"
                  ? { maxLength: URL_MAX_LENGTH }
                  : undefined,
            });
          });
        }
      },
    };
  },
});

function reportPathParameterDiagnostics(
  program: Program,
  parameter: ModelProperty,
  report: (
    messageId:
      | "wrongType"
      | "missingBoth"
      | "missingMaxLength"
      | "maxLengthTooLarge"
      | "missingPattern",
  ) => void,
): void {
  if (!isStringSchemaType(program, parameter)) {
    report("wrongType");
  }

  const maxLength = getMaxLength(program, parameter) ?? getMaxLength(program, parameter.type);
  const pattern = getPattern(program, parameter) ?? getPattern(program, parameter.type);

  if (maxLength === undefined && pattern === undefined) {
    report("missingBoth");
  } else if (maxLength === undefined) {
    report("missingMaxLength");
  } else if (maxLength >= URL_MAX_LENGTH) {
    report("maxLengthTooLarge");
  } else if (pattern === undefined) {
    report("missingPattern");
  }
}

function isStringSchemaType(program: Program, type: Type): boolean {
  switch (type.kind) {
    case "ModelProperty":
      return isStringSchemaType(program, type.type);
    case "Scalar":
      return isStringType(program, type) || isStringEncoding(program, type);
    case "String":
      return true;
    case "Enum":
      return [...type.members.values()].every((member) => typeof member.value !== "number");
    case "Union":
      return [...type.variants.values()].every((variant) =>
        isStringSchemaType(program, variant.type),
      );
    default:
      return isStringEncoding(program, type);
  }
}

function isStringEncoding(program: Program, type: Type): boolean {
  if (type.kind !== "ModelProperty" && type.kind !== "Scalar") {
    return false;
  }

  return getEncode(program, type)?.type.name === "string";
}
