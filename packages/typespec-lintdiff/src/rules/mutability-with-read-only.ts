import { createRule, paramMessage, type ModelProperty } from "@typespec/compiler";
import { getExtensions, isReadonlyProperty } from "@typespec/openapi";

export const mutabilityWithReadOnlyRule = createRule({
  name: "mutability-with-read-only",
  description:
    "Properties that emit readOnly: true and manually configure x-ms-mutability must use only ['read'].",
  severity: "warning",
  messages: {
    default:
      paramMessage`Readonly property '${"name"}' must use only \`["read"]\` for \`x-ms-mutability\`, not ${"actual"}.`,
  },
  create(context) {
    const reported = new Set<ModelProperty>();

    return {
      modelProperty: (property) => {
        const mutability = getMutabilityExtension(context.program, property);
        if (mutability === undefined || mutability.length === 0) {
          return;
        }

        if (!isReadonlyProperty(context.program, property)) {
          return;
        }

        if (mutability.length === 1 && mutability[0] === "read") {
          return;
        }

        if (reported.has(property)) {
          return;
        }
        reported.add(property);

        context.reportDiagnostic({
          target: property,
          format: {
            name: property.name,
            actual: JSON.stringify(mutability),
          },
        });
      },
    };
  },
});

function getMutabilityExtension(program: Parameters<typeof getExtensions>[0], property: ModelProperty):
  | string[]
  | undefined {
  const extension = getExtensions(program, property).get("x-ms-mutability");
  if (!Array.isArray(extension)) {
    return undefined;
  }

  const values = extension.filter((value): value is string => typeof value === "string");
  return values.length === extension.length ? values : undefined;
}
