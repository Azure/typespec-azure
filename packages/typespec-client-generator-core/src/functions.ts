import { FunctionContext, ModelProperty, Operation, Type } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { reportDiagnostic } from "./lib.js";

// Helper function to clone an operation with new parameters and/or return type
function cloneOperation(
  tk: ReturnType<typeof $>,
  operation: Operation,
  options: {
    parameters?: ModelProperty[];
    returnType?: Type;
  },
): Operation {
  const newOp = tk.operation.create({
    name: operation.name,
    parameters: options.parameters ?? [...operation.parameters.properties.values()],
    returnType: options.returnType ?? operation.returnType,
  });

  // Copy decorators from the original operation
  if (operation.decorators) {
    (newOp as any).decorators = [...operation.decorators];
  }

  // Set the source operation for tracing
  (newOp as any).sourceOperation = operation.sourceOperation ?? operation;

  return newOp;
}

// Helper function to clone a model property
function cloneModelProperty(tk: ReturnType<typeof $>, prop: ModelProperty): ModelProperty {
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
  return clonedProp;
}

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
        newProperties.push(cloneModelProperty(tk, replacement));
      }
      // If replacement is undefined (void), we skip adding this parameter (removal)
    } else {
      newProperties.push(cloneModelProperty(tk, prop));
    }
  }

  return cloneOperation(tk, operation, { parameters: newProperties });
}

/**
 * Replace the return type of an operation with a new type.
 *
 * @param context The function context provided by TypeSpec
 * @param operation The operation to transform
 * @param returnType The new return type for the operation
 * @returns A new operation with the return type replaced
 */
export function replaceResponse(
  context: FunctionContext,
  operation: Operation,
  returnType: Type,
): Operation {
  const program = context.program;
  const tk = $(program);

  // Clone all parameters
  const newProperties: ModelProperty[] = [];
  for (const prop of operation.parameters.properties.values()) {
    newProperties.push(cloneModelProperty(tk, prop));
  }

  return cloneOperation(tk, operation, {
    parameters: newProperties,
    returnType: returnType,
  });
}

/**
 * Add a new parameter to an operation.
 *
 * @param context The function context provided by TypeSpec
 * @param operation The operation to transform
 * @param parameter The parameter to add to the operation
 * @returns A new operation with the parameter added
 */
export function addParameter(
  context: FunctionContext,
  operation: Operation,
  parameter: ModelProperty,
): Operation {
  const program = context.program;
  const tk = $(program);

  // Clone all existing parameters and add the new one
  const newProperties: ModelProperty[] = [];
  for (const prop of operation.parameters.properties.values()) {
    newProperties.push(cloneModelProperty(tk, prop));
  }
  newProperties.push(cloneModelProperty(tk, parameter));

  return cloneOperation(tk, operation, { parameters: newProperties });
}
