import { ModelProperty, createRule, fileRef, isNullType } from "@typespec/compiler";

export const noNullableRule = createRule({
  name: "no-nullable",
  docs: fileRef.fromPackageRoot("src/rules/no-nullable.md"),
  description: "Use `?` for optional properties.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-nullable",
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
