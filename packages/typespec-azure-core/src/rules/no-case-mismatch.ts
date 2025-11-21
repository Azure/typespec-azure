import {
  type Enum,
  type Model,
  type Namespace,
  type Union,
  createRule,
  isTemplateInstance,
  paramMessage,
} from "@typespec/compiler";
import { DuplicateTracker } from "@typespec/compiler/utils";

type DataType = Model | Union | Enum;

export const noCaseMismatchRule = createRule({
  name: "no-case-mismatch",
  description: "Validate that no 2 types have the same name with different casing.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-case-mismatch",
  messages: {
    default: paramMessage`Type '${"typeName"}' has a name that differs only by casing from another type: ${"otherNames"}`,
  },
  create(context) {
    const duplicateTrackers = new Map<Namespace, DuplicateTracker<string, DataType>>();

    const track = (type: DataType) => {
      if (!(type.namespace && type.name) || isTemplateInstance(type)) {
        return;
      }
      let tracker = duplicateTrackers.get(type.namespace);
      if (tracker === undefined) {
        tracker = new DuplicateTracker<string, DataType>();
        duplicateTrackers.set(type.namespace, tracker);
      }
      tracker.track(type.name.toLowerCase(), type);
    };
    return {
      model: (en: Model) => track(en),
      union: (en: Union) => track(en),
      enum: (en: Enum) => track(en),
      exit: () => {
        for (const [_, tracker] of duplicateTrackers) {
          for (const [_k, duplicates] of tracker.entries()) {
            for (const duplicate of duplicates) {
              context.reportDiagnostic({
                format: {
                  typeName: duplicate.name!,
                  otherNames: duplicates
                    .map((d) => d.name)
                    .filter((name) => name !== duplicate.name)
                    .join(", "),
                },
                target: duplicate,
              });
            }
          }
        }
      },
    };
  },
});
