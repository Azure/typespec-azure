import { FunctionContext, ModelProperty, Operation } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { reportDiagnostic } from "./lib.js";

/**
 * Replace a parameter in an operation with a new parameter definition or remove it entirely.
 *
 * @param context The function context provided by TypeSpec
 * @param operation The operation to transform
 * @param selector The parameter to replace - either a string name or a ModelProperty reference
 * @param replacement The replacement parameter, or undefined to remove the parameter
 * @returns A new operation with the parameter replaced or removed
 */
export function replaceParameter(
  context: FunctionContext,
  operation: Operation,
  selector: string | ModelProperty,
  replacement: ModelProperty | undefined,
): Operation {
  const program = context.program;
  const tk = $(program);

  // Find the parameter to replace
  const selectorName = typeof selector === "string" ? selector : selector.name;
  const existingParam = operation.parameters.properties.get(selectorName);

  if (!existingParam) {
    reportDiagnostic(program, {
      code: "replace-parameter-not-found",
      format: { paramName: selectorName, operationName: operation.name },
      target: context.functionCallTarget,
    });
    // Return the original operation unchanged
    return operation;
  }

  // Build the new parameters by cloning properties
  const newProperties: ModelProperty[] = [];

  for (const [name, prop] of operation.parameters.properties) {
    if (name === selectorName) {
      // If replacement is provided (not void/undefined), add it
      if (replacement !== undefined) {
        // Create a new property with the replacement's characteristics
        const newProp = tk.modelProperty.create({
          name: replacement.name,
          type: replacement.type,
          optional: replacement.optional,
          defaultValue: replacement.defaultValue,
        });
        // Copy decorators from the replacement if they exist
        if (replacement.decorators) {
          (newProp as any).decorators = [...replacement.decorators];
        }
        newProperties.push(newProp);
      }
      // If replacement is undefined (void), we skip adding this parameter (removal)
    } else {
      // Clone the existing property to avoid referencing the original
      const clonedProp = tk.modelProperty.create({
        name: prop.name,
        type: prop.type,
        optional: prop.optional,
        defaultValue: prop.defaultValue,
      });
      // Copy decorators from the original property
      if (prop.decorators) {
        (clonedProp as any).decorators = [...prop.decorators];
      }
      newProperties.push(clonedProp);
    }
  }

  // Create the new operation using the typekit
  const newOp = tk.operation.create({
    name: operation.name,
    parameters: newProperties,
    returnType: operation.returnType,
  });

  // Copy decorators from the original operation
  if (operation.decorators) {
    (newOp as any).decorators = [...operation.decorators];
  }

  // Set the source operation for tracing
  (newOp as any).sourceOperation = operation.sourceOperation ?? operation;

  return newOp;
}
