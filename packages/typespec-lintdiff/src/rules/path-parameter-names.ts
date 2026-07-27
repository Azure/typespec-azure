import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation, type HttpOperationParameter } from "@typespec/http";

const pathParameterPattern = /[^{}]+(?=})/;

export const pathParameterNamesRule = createRule({
  name: "path-parameter-names",
  description: "Paths should use consistent path parameter names after the same segment.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Inconsistent path parameter names "${"name"}" and "${"expectedName"}".`,
  },
  create(context) {
    const parameterNameForSegment = new Map<string, string>();

    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        const pathParameters = new Map(
          httpOperation.parameters.parameters
            .filter((parameter) => parameter.type === "path")
            .map((parameter) => [parameter.name, parameter] as const),
        );
        const segments = httpOperation.path.split("/").slice(1);

        for (const [index, segment] of segments.slice(1).entries()) {
          const parameterName = segment.match(pathParameterPattern)?.[0];
          if (parameterName === undefined) {
            continue;
          }

          const precedingSegment = segments[index];
          const expectedName = parameterNameForSegment.get(precedingSegment);
          if (expectedName === undefined) {
            parameterNameForSegment.set(precedingSegment, parameterName);
            continue;
          }

          if (expectedName === parameterName) {
            continue;
          }

          context.reportDiagnostic({
            target: getPathParameterTarget(pathParameters.get(parameterName)) ?? operation,
            format: {
              name: parameterName,
              expectedName,
            },
          });
        }
      },
    };
  },
});

function getPathParameterTarget(parameter: HttpOperationParameter | undefined) {
  return parameter?.param;
}
