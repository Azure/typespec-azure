import {
  type DiagnosticMessages,
  type LinterRuleContext,
  type Model,
  type Operation,
  type Program,
  type Type,
  createRule,
  fileRef,
  getEffectiveModelType,
  getProperty,
  isArrayModelType,
  isErrorType,
  isType,
} from "@typespec/compiler";
import { type HttpOperation, getAllHttpServices } from "@typespec/http";

import { getArmProviderNamespace } from "../namespace.js";
import { type ArmLifecycleOperationKind, resolveResourceOperations } from "../operations.js";
import { getArmResource } from "../resource.js";
import { isInternalTypeSpec } from "./utils.js";

export const armResourceOperationsRule = createRule({
  name: "arm-resource-operation-response",
  docs: fileRef.fromPackageRoot("src/rules/arm-resource-operation-response.md"),
  severity: "warning",
  description: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-resource-operation-response",
  messages: {
    default: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
    collection:
      "The value array items in a collection GET response must match the response schema of the corresponding individual GET operation.",
  },
  create(context) {
    const pairedCollections = new Set<Operation>();
    return {
      root: (program) => {
        const [services] = getAllHttpServices(program);
        const reported = new Set<Operation>();
        for (const service of services) {
          if (!getArmProviderNamespace(program, service.namespace)) continue;

          const gets = new Map<string, HttpOperation[]>();
          for (const operation of service.operations) {
            if (
              operation.verb !== "get" ||
              isInternalTypeSpec(program, operation.operation)
            ) {
              continue;
            }
            const path = getResourcePath(operation.path);
            if (path === undefined) continue;
            const operations = gets.get(path);
            if (operations === undefined) {
              gets.set(path, [operation]);
            } else {
              operations.push(operation);
            }
          }

          for (const [path, reads] of gets) {
            const collectionPath = getCollectionPath(path);
            if (collectionPath === undefined) continue;
            const collections = gets.get(collectionPath);
            if (collections === undefined) continue;

            for (const read of reads) {
              const resourceModels = get200ResponseModels(program, read);
              if (resourceModels.length === 0) continue;
              for (const collection of collections) {
                pairedCollections.add(collection.operation);
                if (reported.has(collection.operation)) continue;
                for (const response of get200ResponseModels(program, collection)) {
                  const value = getProperty(response, "value")?.type;
                  // Envelope shape validation belongs to list-response-envelope.
                  if (value?.kind !== "Model" || !isArrayModelType(value)) continue;
                  const item = value.indexer.value;
                  if (
                    item.kind !== "Model" ||
                    !resourceModels.includes(getEffectiveModelType(program, item))
                  ) {
                    context.reportDiagnostic({
                      target: collection.operation,
                      messageId: "collection",
                    });
                    reported.add(collection.operation);
                    break;
                  }
                }
              }
            }
          }
        }
      },
      model: (model: Model) => {
        if (!isInternalTypeSpec(context.program, model)) {
          const armResource = getArmResource(context.program, model);
          if (armResource) {
            const resourceOperations = resolveResourceOperations(context.program, model);
            const kinds: ArmLifecycleOperationKind[] = ["read", "createOrUpdate", "update"];
            kinds
              .map((k) => resourceOperations.lifecycle[k])
              .forEach(
                (op) => op && checkArmResourceOperationReturnType(context, model, op.operation),
              );
            const lists = resourceOperations.lists;
            for (const key in lists) {
              if (!pairedCollections.has(lists[key].operation)) {
                checkArmResourceOperationReturnType(context, model, lists[key].operation);
              }
            }
          }
        }
      },
    };
  },
});

function getResourcePath(path: string): string | undefined {
  const pathWithoutQuery = path.split("?")[0].replace(/\/$/, "");
  const providerIndex = pathWithoutQuery.lastIndexOf("/providers/");
  return providerIndex === -1
    ? undefined
    : pathWithoutQuery.slice(providerIndex).replace(/\{[^/]+\}/g, "{}");
}

function getCollectionPath(path: string): string | undefined {
  const segments = path.split("/");
  if (
    segments.length < 5 ||
    segments.length % 2 !== 1 ||
    (segments.at(-1) !== "{}" && segments.at(-1) !== "default")
  ) {
    return undefined;
  }
  return path.slice(0, path.lastIndexOf("/"));
}

function get200ResponseModels(program: Program, operation: HttpOperation): Model[] {
  const models: Model[] = [];
  const visited = new Set<Type>();
  function collect(type: Type) {
    if (visited.has(type)) return;
    visited.add(type);
    if (type.kind === "Union") {
      for (const variant of type.variants.values()) {
        collect(variant.type);
      }
    } else if (type.kind === "Model" && !isErrorType(type)) {
      models.push(getEffectiveModelType(program, type));
    }
  }
  for (const response of operation.responses) {
    if (response.statusCodes !== 200) continue;
    for (const { body } of response.responses) {
      if (body?.bodyKind === "single") collect(body.type);
    }
  }
  return models;
}

function checkArmResourceOperationReturnType(
  context: LinterRuleContext<DiagnosticMessages>,
  model: Model,
  operation: Operation,
) {
  if (!isInternalTypeSpec(context.program, operation)) {
    const returnType = operation.returnType;
    if (returnType.kind === "Model") {
      throwIfNotMatchingArmModel(context, operation, model, returnType);
    } else if (returnType.kind === "Union") {
      for (const variant of returnType.variants.values()) {
        if (!isErrorType(variant.type) && variant.type.kind === "Model") {
          const modelCandidate = getEffectiveModelType(context.program, variant.type);
          throwIfNotMatchingArmModel(context, operation, model, modelCandidate);
          if (modelCandidate.templateMapper !== undefined) {
            // ArmResponse<FooResource>
            for (const arg of modelCandidate.templateMapper.args) {
              if (isType(arg) && arg.kind === "Model") {
                throwIfNotMatchingArmModel(context, operation, model, arg);
                if (arg.templateMapper !== undefined) {
                  const modelArgs = arg.templateMapper.args.filter(
                    (a) => isType(a) && a.kind === "Model",
                  );
                  const resourceArgs = modelArgs.filter(
                    (a) => getArmResource(context.program, a) !== undefined,
                  );
                  // if there is only one ARM resource argument, it must match the expected ARM resource
                  if (resourceArgs.length === 1) {
                    throwIfNotMatchingArmModel(context, operation, model, resourceArgs[0]);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  function throwIfNotMatchingArmModel(
    context: LinterRuleContext<DiagnosticMessages>,
    operation: Operation,
    model: Model,
    modelCandidate: Model,
  ) {
    if (getArmResource(context.program, modelCandidate) !== undefined && modelCandidate !== model) {
      context.reportDiagnostic({
        target: operation,
      });
    }
  }
}
