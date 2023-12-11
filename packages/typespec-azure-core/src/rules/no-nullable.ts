import { ModelProperty, createRule, isNullType } from "@typespec/compiler";

export const noNullableRule = createRule({
  name: "no-nullable",
  description: "Use `?` for optional properties.",
  severity: "warning",
  messages: {
    default:
      "Don't use `| null`. If you meant to have an optional property, use `?`. (e.g. `myProp?: string`)",
  },
  create(context) {
    return {
      modelProperty: (property: ModelProperty) => {
        if (property.type.kind !== "Union") {
          return;
        }
        if ([...property.type.variants.values()].some((x) => isNullType(x.type))) {
          context.reportDiagnostic({
            target: property,
          });
        }
      },
    };
  },
});
