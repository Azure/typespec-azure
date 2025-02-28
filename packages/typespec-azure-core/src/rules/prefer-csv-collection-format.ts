import { ModelProperty, createRule } from "@typespec/compiler";
import { getHeaderFieldOptions } from "@typespec/http";
import { isExcludedCoreType } from "./utils.js";

export const preferCsvCollectionFormatRule = createRule({
  name: "prefer-csv-collection-format",
  description: `It is recommended to use "csv" for collection format of parameters.`,
  severity: "warning",
  messages: {
    default: `It is recommended to use "csv" for collection format of parameters.`,
  },
  create(context) {
    return {
      modelProperty: (property: ModelProperty) => {
        if (isExcludedCoreType(context.program, property)) return;

        const headerOptions = getHeaderFieldOptions(context.program, property);
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        if (headerOptions?.format !== undefined && headerOptions?.format !== "csv") {
          context.reportDiagnostic({
            target: property,
          });
        }
      },
    };
  },
});
