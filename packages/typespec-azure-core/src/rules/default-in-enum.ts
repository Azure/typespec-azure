import {
  createRule,
  fileRef,
  ignoreDiagnostics,
  type ModelProperty,
  Numeric,
  type Union,
} from "@typespec/compiler";
import { getUnionAsEnum, type UnionEnumVariant } from "../helpers/union-enums.js";

export const defaultInEnumRule = createRule({
  name: "default-in-enum",
  docs: fileRef.fromPackageRoot("src/rules/default-in-enum.md"),
  description: "Defaults for extensible enums should be one of their declared values.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/default-in-enum",
  messages: {
    default: "Default value should be one of the declared enum values.",
  },
  create(context) {
    return {
      modelProperty(property: ModelProperty) {
        const defaultValue = property.defaultValue;
        if (defaultValue === undefined || property.type.kind !== "Union") {
          return;
        }

        const enumType = ignoreDiagnostics(getUnionAsEnum(property.type));
        if (enumType === undefined || !enumType.open) {
          return;
        }

        const members = [...getDeclaredMembers(property.type)];
        let matches: boolean;
        switch (defaultValue.valueKind) {
          case "StringValue":
            matches = members.some((member) => member.value === defaultValue.value);
            break;
          case "NumericValue":
            matches = members.some((member) => {
              const type = member.type;
              const value =
                type.kind === "UnionVariant" && type.type.kind === "Number"
                  ? type.type.numericValue
                  : typeof member.value === "number"
                    ? Numeric(String(member.value))
                    : undefined;
              return value?.toString() === defaultValue.value.toString();
            });

            break;
          case "EnumValue":
            matches = members.some(
              (member) => member.value === (defaultValue.value.value ?? defaultValue.value.name),
            );
            break;
          default:
            return;
        }

        if (!matches) {
          context.reportDiagnostic({ target: property });
        }
      },
    };
  },
});

function* getDeclaredMembers(union: Union): Generator<UnionEnumVariant<string | number>> {
  for (const variant of union.variants.values()) {
    switch (variant.type.kind) {
      case "String":
      case "Number":
        yield { value: variant.type.value, type: variant };
        break;
      case "Union":
        yield* getDeclaredMembers(variant.type);
        break;
      case "Enum":
        for (const member of variant.type.members.values()) {
          yield { value: member.value ?? member.name, type: member };
        }
        break;
    }
  }
}
