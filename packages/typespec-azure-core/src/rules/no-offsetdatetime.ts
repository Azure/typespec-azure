import {
  DiagnosticTarget,
  ModelProperty,
  Operation,
  Program,
  Scalar,
  Type,
  UnionVariant,
  createRule,
} from "@typespec/compiler";
import { isExcludedCoreType } from "./utils.js";

export const noOffsetDateTimeRule = createRule({
  name: "no-offsetdatetime",
  description:
    "Prefer using `utcDateTime` when representing a datetime unless an offset is necessary.",
  severity: "warning",
  messages: {
    default:
      "Prefer using `utcDateTime` when representing a datetime unless an offset is necessary.",
  },
  create(context) {
    const [offsetDateTime] = context.program.resolveTypeReference("TypeSpec.offsetDateTime");

    const reportIfOffset = (program: Program, type: Type, target: DiagnosticTarget) => {
      if (type === offsetDateTime) {
        context.reportDiagnostic({
          target,
        });
      }
    };

    return {
      scalar: (model: Scalar) => {
        if (isExcludedCoreType(context.program, model)) return;
        if (model.baseScalar) {
          reportIfOffset(context.program, model.baseScalar, model);
        }
      },
      modelProperty: (property: ModelProperty) => {
        if (isExcludedCoreType(context.program, property)) return;
        reportIfOffset(context.program, property.type, property);
      },
      unionVariant: (variant: UnionVariant) => {
        if (isExcludedCoreType(context.program, variant)) return;
        reportIfOffset(context.program, variant.type, variant);
      },
      operation: (operation: Operation) => {
        if (isExcludedCoreType(context.program, operation)) return;
        reportIfOffset(context.program, operation.returnType, operation);
      },
    };
  },
});
