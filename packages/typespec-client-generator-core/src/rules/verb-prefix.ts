import type { Operation } from "@typespec/compiler";
import { getAllHttpServices, type HttpVerb } from "@typespec/http";
import type { TCGCContext } from "../interfaces.js";
import { AllScopes } from "../internal-utils.js";
import { getLibraryName } from "../public-utils.js";

export function* getOperationsWithIncorrectVerbPrefix(
  context: TCGCContext,
  verb: HttpVerb,
  prefix: string,
): Iterable<{ operation: Operation; operationName: string }> {
  const [services] = getAllHttpServices(context.program);
  for (const service of services) {
    for (const endpoint of service.operations) {
      if (endpoint.verb !== verb) continue;
      const operationName = getLibraryName(context, endpoint.operation, AllScopes);
      if (!operationName.toLowerCase().startsWith(prefix)) {
        yield { operation: endpoint.operation, operationName };
      }
    }
  }
}
