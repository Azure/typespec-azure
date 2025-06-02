import { createRule, Model, paramMessage, Union } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import {
  SdkEnumType,
  SdkModelType,
  SdkNullableType,
  SdkType,
  SdkUnionType,
  UsageFlags,
} from "../interfaces.js";
import { createSdkPackage } from "../package.js";

export const noUnnamedTypesRule = createRule({
  name: "no-unnamed-types",
  description: "Requires types to be named rather than defined anonymously or inline.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-unnamed-types",
  messages: {
    default: paramMessage`Anonymous ${"type"} with generated name "${"generatedName"}" detected. Define this ${"type"} separately with a proper name to improve code readability and reusability.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      {
        mutateNamespace: false,
      },
    );
    // we create the package to see if the model is used in the final output
    createSdkPackage(tcgcContext);
    return {
      model: (model: Model) => {
        const createdModel = tcgcContext.__referencedTypeCache.get(model);
        if (
          createdModel &&
          createdModel.usage !== UsageFlags.None &&
          (createdModel.usage & UsageFlags.LroInitial) === 0 &&
          createdModel.isGeneratedName
        ) {
          context.reportDiagnostic({
            target: model,
            format: {
              type: "model",
              generatedName: createdModel.name,
            },
          });
        }
      },
      union: (union: Union) => {
        const createdUnion = tcgcContext.__referencedTypeCache.get(union);
        if (
          createdUnion &&
          isUnionType(createdUnion) &&
          createdUnion.usage !== UsageFlags.None &&
          createdUnion.isGeneratedName
        ) {
          // report diagnostic for unions and nullable unions
          context.reportDiagnostic({
            target: union,
            format: {
              type: "union",
              generatedName: createdUnion.name,
            },
          });
        }
      },
    };
  },
});

function isUnionType(
  union: SdkModelType | SdkEnumType | SdkNullableType | SdkUnionType<SdkType>,
): boolean {
  if (union.kind === "nullable") {
    return union.type.kind === "union";
  }
  return union.kind === "union" || union.kind === "enum";
}
