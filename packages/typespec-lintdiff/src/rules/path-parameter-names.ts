import { getArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { compilerAssert, createRule, paramMessage } from "@typespec/compiler";
import { unsafe_mutateSubgraphWithNamespace } from "@typespec/compiler/experimental";
import {
  getAllHttpServices,
  getHttpService,
  type HttpOperationParameter,
  type HttpService,
} from "@typespec/http";
import { getVersioningMutators } from "@typespec/versioning";

const pathParameterPattern = /[^{}]+(?=})/;

export const pathParameterNamesRule = createRule({
  name: "path-parameter-names",
  description: "Paths should use consistent path parameter names after the same segment.",
  severity: "warning",
  messages: {
    default: paramMessage`Inconsistent path parameter names "${"name"}" and "${"expectedName"}".`,
  },
  create(context) {
    function checkService(
      service: HttpService,
      reportedPathSegmentsByTarget: Map<object, Set<string>>,
    ) {
      const parameterNameForSegment = new Map<string, string>();
      const operationsByPath = new Map<string, HttpService["operations"][number]>();
      for (const httpOperation of service.operations) {
        if (httpOperation.path.includes("?") || operationsByPath.has(httpOperation.path)) {
          continue;
        }
        operationsByPath.set(httpOperation.path, httpOperation);
      }

      const operations = [...operationsByPath.values()].sort((left, right) =>
        compareUrl(left.path, right.path),
      );
      for (const httpOperation of operations) {
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

          const target =
            getPathParameterTarget(pathParameters.get(parameterName)) ?? httpOperation.operation;
          const targetIdentity = target.node ?? target;
          const pathSegmentIdentity = `${httpOperation.path}\0${index}`;
          const reportedPathSegments = reportedPathSegmentsByTarget.get(targetIdentity);
          if (reportedPathSegments?.has(pathSegmentIdentity)) {
            continue;
          }
          if (reportedPathSegments === undefined) {
            reportedPathSegmentsByTarget.set(targetIdentity, new Set([pathSegmentIdentity]));
          } else {
            reportedPathSegments.add(pathSegmentIdentity);
          }
          context.reportDiagnostic({
            target,
            format: {
              name: parameterName,
              expectedName,
            },
          });
        }
      }
    }

    return {
      root: (program) => {
        const [services] = getAllHttpServices(program);
        for (const service of services) {
          if (getArmProviderNamespace(program, service.namespace) !== undefined) {
            continue;
          }

          const reportedPathSegmentsByTarget = new Map<object, Set<string>>();
          const versioning = getVersioningMutators(program, service.namespace);
          if (versioning === undefined) {
            checkService(service, reportedPathSegmentsByTarget);
          } else if (versioning.kind === "transient") {
            const projected = unsafe_mutateSubgraphWithNamespace(
              program,
              [versioning.mutator],
              service.namespace,
            );
            compilerAssert(projected.type.kind === "Namespace", "Expected a projected namespace");
            checkService(getHttpService(program, projected.type)[0], reportedPathSegmentsByTarget);
          } else {
            for (const snapshot of versioning.snapshots) {
              const projected = unsafe_mutateSubgraphWithNamespace(
                program,
                [snapshot.mutator],
                service.namespace,
              );
              compilerAssert(projected.type.kind === "Namespace", "Expected a projected namespace");
              checkService(
                getHttpService(program, projected.type)[0],
                reportedPathSegmentsByTarget,
              );
            }
          }
        }
      },
    };
  },
});

function getPathParameterTarget(parameter: HttpOperationParameter | undefined) {
  return parameter?.param;
}

function compareUrl(leftPath: string, rightPath: string) {
  const leftParts = leftPath.split("/").slice(1);
  const rightParts = rightPath.split("/").slice(1);

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++) {
    if (index === leftParts.length) return -1;
    if (index === rightParts.length) return 1;

    const leftIsParameter = leftParts[index][0] === "{";
    const rightIsParameter = rightParts[index][0] === "{";
    if (leftIsParameter && rightIsParameter) {
      continue;
    }
    if (leftIsParameter || rightIsParameter) {
      return leftIsParameter ? -1 : 1;
    }

    const result =
      +(leftParts[index] > rightParts[index]) || -(rightParts[index] > leftParts[index]);
    if (result !== 0) {
      return result;
    }
  }

  return 0;
}
