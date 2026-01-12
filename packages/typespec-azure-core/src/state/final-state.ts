import type { Operation, Program } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { HttpOperation, HttpOperationResponse } from "@typespec/http";
import { AzureCoreStateKeys, reportDiagnostic } from "../lib.js";

/**
 * Azure SDK polling information: provides data contained in the
 * long-running-operation-options.final-state-via field
 */
export enum FinalStateValue {
  /** Poll the Azure-AsyncOperation header */
  azureAsyncOperation = "azure-async-operation",
  /** Poll the location header */
  location = "location",
  /** poll the Operation-Location header */
  operationLocation = "operation-location",
  /** poll (GET) the same uri as the original operation */
  originalUri = "original-uri",
  /** Poll on a header or field other than those above */
  customLink = "custom-link",
  /** Call a polling operation using the data in LroMetadata */
  customOperationReference = "custom-operation-reference",
}

export const [
  /**
   * Get the overridden final state value for this operation, if any
   * @param program The program to process
   * @param operation The operation to check for an override value
   * @returns The FinalStateValue if it exists, otherwise undefined
   */
  getFinalStateOverride,
  setFinalStateOverride,
] = useStateMap<Operation, FinalStateValue>(AzureCoreStateKeys.finalStateOverride);

export function validateFinalState(
  program: Program,
  operation: HttpOperation,
  finalState: FinalStateValue,
): FinalStateValue | undefined {
  if (finalState === FinalStateValue.originalUri) {
    if (operation.verb !== "put" && operation.verb !== "patch") {
      reportDiagnostic(program, {
        code: "invalid-final-state",
        target: operation.operation,
        messageId: "notPut",
      });
      return undefined;
    }

    return FinalStateValue.originalUri;
  }

  const header = getLroHeaderName(finalState);
  if (header === undefined) {
    reportDiagnostic(program, {
      code: "invalid-final-state",
      target: operation.operation,
      messageId: "badValue",
      format: { finalStateValue: finalState },
    });
    return undefined;
  }

  for (const response of operation.responses) {
    const lroHeaders = getLroHeaders(response);
    if (lroHeaders?.has(header)) {
      return finalState;
    }
  }

  return undefined;
}

export type LroHeader = "azure-asyncoperation" | "location" | "operation-location";

function getLroHeaderName(finalState: FinalStateValue): LroHeader | undefined {
  switch (finalState) {
    case FinalStateValue.azureAsyncOperation:
      return "azure-asyncoperation";
    case FinalStateValue.location:
      return "location";
    case FinalStateValue.operationLocation:
      return "operation-location";
    default:
      return undefined;
  }
}

function getLroHeader(propertyName: string): LroHeader | undefined {
  const name = propertyName.toLowerCase();
  switch (name) {
    case "azure-asyncoperation":
    case "location":
    case "operation-location":
      return name;
    default:
      return undefined;
  }
}

function getLroHeaders(response: HttpOperationResponse): Set<LroHeader> | undefined {
  const result = new Set<LroHeader>();
  for (const content of response.responses) {
    if (content.headers) {
      for (const candidate of Object.keys(content.headers)) {
        const headerName = getLroHeader(candidate);
        if (headerName !== undefined) {
          result.add(headerName);
        }
      }
    }
  }

  return result;
}
