import {
  type Diagnostic,
  type Model,
  type ModelProperty,
  type Program,
  createDiagnosticCollector,
  walkPropertiesInherited,
} from "@typespec/compiler";
import type { LroErrorResultDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys, createDiagnostic } from "../lib.js";
import { createMarkerDecorator } from "./utils.js";

export const [
  /**
   *  Returns `true` if that property was annotated with the `@lroErrorResult` decorator.
   */
  isLroErrorResultProperty,
  markLroErrorResultProperty,
  /** {@inheritdoc LroErrorResultDecorator} */
  $lroErrorResult,
] = createMarkerDecorator<LroErrorResultDecorator>(AzureCoreStateKeys.lroErrorResult);

/**
 * Gets the error result property from a StatusMonitor
 * @param program The program to process.
 * @param entity The StatusMonitor model to process.
 * @param useDefault Use the default error property if no other
 * property is marked. (defaults to true)
 */
export function getLroErrorResult(
  program: Program,
  entity: Model,
  useDefault: boolean = true,
): [ModelProperty | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  let count = 0;
  let resultProperty: ModelProperty | undefined = undefined;
  let defaultProperty: ModelProperty | undefined = undefined;
  for (const prop of walkPropertiesInherited(entity)) {
    if (isLroErrorResultProperty(program, prop)) {
      resultProperty = prop;
      count++;
    }

    if (prop.name.toLowerCase() === "error") defaultProperty = prop;
  }

  if (count > 1) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-status-monitor-invalid-result-property",
        target: entity,
        format: { resultType: "error", decorator: "@lroErrorResult" },
      }),
    );
  }

  if (resultProperty === undefined && useDefault) resultProperty = defaultProperty;
  return diagnostics.wrap(resultProperty);
}
