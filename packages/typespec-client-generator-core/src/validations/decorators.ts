import { ModelProperty, Type } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { clientDefaultValueKey, getAlternateType } from "../decorators.js";
import { TCGCContext } from "../interfaces.js";
import { AllScopes } from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";

export function validateDecorators(context: TCGCContext) {
  validateClientDefaultValueTypes(context);
}

function validateClientDefaultValueTypes(context: TCGCContext) {
  const tk = $(context.program);
  for (const [target, scopedData] of context.program.stateMap(clientDefaultValueKey).entries()) {
    if (!(target as ModelProperty).type) continue;
    const property = target as ModelProperty;

    // Get the stored value from the scoped data (check emitter scope, then AllScopes)
    const value = scopedData[context.emitterName] ?? scopedData[AllScopes];
    if (value === undefined) continue;

    // Use alternate type if present, otherwise fall back to the property type
    const alternateType = getAlternateType(context, property);
    const typeToCheck: Type | undefined =
      alternateType !== undefined && alternateType.kind !== "externalTypeInfo"
        ? alternateType
        : undefined;
    const effectiveType = typeToCheck ?? property.type;

    if (!tk.scalar.is(effectiveType)) continue;

    const valueType = typeof value;
    const isMatch =
      (valueType === "string" && tk.scalar.extendsString(effectiveType)) ||
      (valueType === "number" && tk.scalar.extendsNumeric(effectiveType)) ||
      (valueType === "boolean" && tk.scalar.extendsBoolean(effectiveType));

    if (!isMatch) {
      const valueTypeLabel = valueType === "number" ? "numeric" : valueType;
      reportDiagnostic(context.program, {
        code: "client-default-value-type-mismatch",
        format: { valueType: valueTypeLabel, propertyType: effectiveType.name },
        target: property,
      });
    }
  }
}
