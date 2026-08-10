import {
  type Diagnostic,
  type Model,
  type ModelProperty,
  type Program,
  createDiagnosticCollector,
  getTypeName,
  isNeverType,
  isUnknownType,
  walkPropertiesInherited,
} from "@typespec/compiler";
import type { LroResultDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys, createDiagnostic } from "../lib.js";
import { createMarkerDecorator } from "./utils.js";

export const [
  /**
   *  Returns `true` if that property was annotated with the `@lroResult` decorator.
   */
  isLroResultProperty,
  markLroResultProperty,
  /** {@inheritdoc LroResultDecorator} */
  $lroResult,
] = createMarkerDecorator<LroResultDecorator>(AzureCoreStateKeys.lroResult);

/**
 * Gets the logical result property from a StatusMonitor
 * @param program The program to process.
 * @param entity The StatusMonitor model to process.
 * @param useDefault Use the default result property if no other
 * property is marked. (defaults to true)
 */
export function getLroResult(
  program: Program,
  entity: Model,
  useDefault: boolean = true,
): [ModelProperty | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  let count = 0;
  let resultProperty: ModelProperty | undefined = undefined;
  let defaultProperty: ModelProperty | undefined = undefined;
  for (const prop of walkPropertiesInherited(entity)) {
    if (isLroResultProperty(program, prop)) {
      resultProperty = prop;
      count++;
    }

    if (prop.name.toLowerCase() === "result") defaultProperty = prop;
  }

  if (count > 1) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-status-monitor-invalid-result-property",
        target: entity,
        format: { resultType: "result", decorator: "@lroResult" },
      }),
    );
  }

  if (resultProperty === undefined && useDefault) resultProperty = defaultProperty;
  if (resultProperty && isNeverType(resultProperty.type)) resultProperty = undefined;

  // Validate that the result property type is valid (Model, Scalar, or unknown)
  if (
    resultProperty &&
    !isNeverType(resultProperty.type) &&
    resultProperty.type.kind !== "Model" &&
    resultProperty.type.kind !== "Scalar" &&
    !(resultProperty.type.kind === "Intrinsic" && isUnknownType(resultProperty.type))
  ) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-status-monitor-invalid-result-property-type",
        target: resultProperty,
        format: {
          propertyName: resultProperty.name,
          typeName: getTypeName(resultProperty.type),
        },
      }),
    );
  }

  return diagnostics.wrap(resultProperty);
}
