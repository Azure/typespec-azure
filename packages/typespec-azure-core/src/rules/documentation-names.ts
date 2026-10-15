import {
  getDoc,
  ignoreDiagnostics,
  isArrayModelType,
  resolveEncodedName,
  type LinterRuleContext,
} from "@typespec/compiler";
import {
  getHeaderFieldName,
  getHttpOperation,
  getHttpPart,
  getPathParamName,
  getQueryParamName,
  isStatusCode,
} from "@typespec/http";
import { type DocumentationTarget, type documentationMessages } from "./documentation.js";

export function createDocumentationNameValidator(
  context: LinterRuleContext<typeof documentationMessages>,
): (target: DocumentationTarget) => void {
  const checkTarget = (
    target: Parameters<typeof getDoc>[1],
    nodeName: string | undefined = "name" in target && typeof target.name === "string"
      ? target.name
      : undefined,
  ) => {
    if (
      !nodeName &&
      (target.kind === "Model" ||
        target.kind === "Scalar" ||
        target.kind === "Enum" ||
        target.kind === "EnumMember" ||
        target.kind === "Union")
    ) {
      return;
    }
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
      messageId: "uninformative",
      target,
      format: {
        name: nodeName ?? "description",
        description: doc,
      },
    });
  };

  return (target) => {
    switch (target.kind) {
      case "Model":
      case "Scalar":
      case "Enum":
      case "EnumMember":
      case "Union":
        checkTarget(target);
        return;
      case "UnionVariant":
        checkTarget(
          target,
          typeof target.name === "string"
            ? target.name
            : target.type.kind === "String"
              ? target.type.value
              : undefined,
        );
        return;
      case "Operation": {
        const doc = getDoc(context.program, target);
        const normalizedDescription = doc === undefined ? undefined : normalize(doc);
        if (!normalizedDescription) {
          return;
        }
        if (normalizedDescription === normalize(target.name)) {
          checkTarget(target);
          return;
        }
        // HTTP validation owns resolution diagnostics; this rule only checks documentation.
        const httpOperation = ignoreDiagnostics(getHttpOperation(context.program, target));
        checkTarget(target, httpOperation.verb);
        return;
      }
      case "ModelProperty": {
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

        const partType =
          target.type.kind === "Model" && isArrayModelType(target.type)
            ? target.type.indexer.value
            : target.type;
        const httpPart = getHttpPart(context.program, partType);
        checkTarget(
          target,
          httpPart
            ? (httpPart.options.name ?? target.name)
            : resolveEncodedName(context.program, target, "application/json"),
        );
        return;
      }
    }
  };
}

function normalize(value: string): string {
  return value.trim().replace(/\./g, "").toLowerCase();
}
