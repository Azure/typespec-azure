import { ModelProperty, createRule } from "@typespec/compiler";
import { getHeaderFieldOptions, getQueryParamOptions } from "@typespec/http";
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
        const queryOptions = getQueryParamOptions(context.program, property);
        if (
          (headerOptions?.format !== undefined && headerOptions?.format !== "csv") ||
          (queryOptions?.format !== undefined && queryOptions?.format !== "csv")
        ) {
          context.reportDiagnostic({
            target: property,
          });
        }
      },
    };
  },
});
