import {
  Interface,
  Namespace,
  Operation,
  createRule,
  ignoreDiagnostics,
  isTemplateDeclarationOrInstance,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isListOperation } from "@typespec/rest";
import { getPagedResult } from "../decorators.js";
import { isAzureSubNamespace, isExcludedCoreType } from "./utils.js";

function isArmProviderNamespace(ns: Namespace | undefined): boolean {
  if (!ns) return false;
  for (const dec of ns.decorators) {
    if (dec.decorator.name === "$armProviderNamespace") {
      return true;
    }
  }
  return false;
}

function isArmResourceOperations(inter: Interface | undefined): boolean {
  if (!inter) return false;
  for (const dec of inter.decorators) {
    if (dec.decorator.name === "$armResourceOperations") {
      return true;
    }
  }
  return false;
}

export const useStandardNames = createRule({
  name: "use-standard-names",
  description: "Use recommended names for operations.",
  severity: "warning",
  messages: {
    get: "GET operations that return single objects should start with 'get'",
    list: "GET operations that return lists should start with 'list'",
    createOrReplace:
      "PUT operations that return both 201 and 200 should start with 'createOrReplace'",
    putCreate: "PUT operations that return 201 should start with 'create' or 'createOrReplace'",
    putReplace: "PUT operations that return 200 should start with 'replace' or 'createOrReplace'",
    patch:
      "PATCH operations that return 201 should start with 'create', 'update', or 'createOrUpdate'",
    delete: "DELETE operations should start with 'delete'",
  },
  create(context) {
    return {
      operation: (op: Operation) => {
        if (isArmProviderNamespace(op.namespace)) return;
        if (isArmResourceOperations(op.interface)) return;
        if (isTemplateDeclarationOrInstance(op)) return;
        if (isExcludedCoreType(context.program, op)) return;
        if (!isAzureSubNamespace(context.program, op.namespace)) return;
        const httpOp = ignoreDiagnostics(getHttpOperation(context.program, op));
        const verb = httpOp.verb;
        const name = op.name;
        const statusCodes = httpOp.responses.map((x) => x.statusCodes.toString());
        // operation is a list if it is decoratored as such (for example, through a template) or returns a paged result
        const isList =
          isListOperation(context.program, op) || getPagedResult(context.program, op) !== undefined;
        let errorMessage:
          | "list"
          | "get"
          | "createOrReplace"
          | "putCreate"
          | "putReplace"
          | "patch"
          | "delete"
          | undefined;
        switch (verb) {
          case "get":
            if (isList && !name.startsWith("list")) {
              errorMessage = "list";
            } else if (!isList && !name.startsWith("get")) {
              errorMessage = "get";
            }
            break;
          case "put":
            const is201 = statusCodes.includes("201");
            const is200 = statusCodes.includes("200");
            if (is201 && is200 && !name.startsWith("createOrReplace")) {
              errorMessage = "createOrReplace";
            } else if (
              is201 &&
              !is200 &&
              !["create", "createOrReplace"].some((x) => name.startsWith(x))
            ) {
              errorMessage = "putCreate";
            } else if (
              is200 &&
              !is201 &&
              !["replace", "createOrReplace"].some((x) => name.startsWith(x))
            ) {
              errorMessage = "putReplace";
            }
            break;
          case "patch":
            const allowed = ["create", "update", "createOrUpdate".toLocaleLowerCase()];
            if (statusCodes.includes("201") && !allowed.some((x) => name.startsWith(x))) {
              errorMessage = "patch";
            }
            break;
          case "delete":
            if (!name.startsWith("delete")) {
              errorMessage = "delete";
            }
            break;
        }
        if (errorMessage !== undefined) {
          context.reportDiagnostic({
            messageId: errorMessage,
            target: op,
          });
        }
      },
    };
  },
});
