import {
  createRule,
  fileRef,
  getLocationContext,
  getNamespaceFullName,
  getPagingOperation,
  isArrayModelType,
  isList,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  resolveEncodedName,
  walkPropertiesInherited,
  type Interface,
  type Model,
  type ModelProperty,
  type Operation,
  type Program,
  type Type,
} from "@typespec/compiler";
import {
  createMetadataInfo,
  getHttpOperation,
  Visibility,
  type HttpStatusCodesEntry,
} from "@typespec/http";
import { isCollectionPath } from "./utils.js";

export const listResponseEnvelopeRule = createRule({
  name: "list-response-envelope",
  docs: fileRef.fromPackageRoot("src/rules/list-response-envelope.md"),
  description:
    "ARM list operations must declare paging metadata and use the standard response envelope.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/list-response-envelope",
  messages: {
    default:
      "Collection response models must declare exactly the `value` and `nextLink` properties.",
    valueArray: "Collection responses must declare a 'value' property of array type.",
    missingList: "Collection GET operations must use `@list`.",
    pageItems: "The collection response `value` must use `@pageItems`.",
    nextLink: "The collection response `nextLink` must use `@nextLink`.",
    pagingNextLink: "Collection operations must declare `@nextLink` paging metadata.",
    additionalProperties: "Collection response models must not allow additional properties.",
    pagingName: "Paging property TypeSpec names must match their JSON wire names.",
  },
  create(context) {
    const program = context.program;
    const metadata = createMetadataInfo(program);
    return {
      operation: (operation) => {
        if (
          isTemplateDeclarationOrInstance(operation) ||
          (operation.interface !== undefined && isTemplateDeclaration(operation.interface)) ||
          (getLocationContext(program, operation).type !== "project" &&
            (operation.interface === undefined ||
              getLocationContext(program, operation.interface).type !== "project"))
        )
          return;

        const [httpOperation] = getHttpOperation(program, operation);
        const list = isList(program, operation);
        const collection =
          httpOperation.verb === "get" &&
          isCollectionPath(httpOperation.path.split("?")[0], {
            excludeTerminalPathParameter: true,
            excludeDefaultSegment: true,
          });
        if (!list && !collection) return;
        if (!list)
          context.reportDiagnostic({
            target: getDiagnosticTarget(program, operation, operation),
            messageId: "missingList",
          });

        const [paging] = getPagingOperation(program, operation);
        const reported = new Map<Model | ModelProperty | Operation, Set<string>>();
        const report = (
          target: Model | ModelProperty | Operation,
          messageId:
            | "default"
            | "valueArray"
            | "pageItems"
            | "nextLink"
            | "pagingNextLink"
            | "additionalProperties"
            | "pagingName",
        ) => {
          let messages = reported.get(target);
          if (!messages) reported.set(target, (messages = new Set()));
          if (messages.has(messageId)) return;
          messages.add(messageId);
          context.reportDiagnostic({
            target: getDiagnosticTarget(program, operation, target),
            messageId,
          });
        };
        const checkBody = (type: Type, isExplicit: boolean) => {
          if (type.kind === "Union") {
            for (const variant of type.variants.values()) {
              checkBody(variant.type, isExplicit);
            }
            return;
          }
          if (type.kind !== "Model" || isArrayModelType(type)) {
            const target = type.kind === "Model" ? type : operation;
            report(target, "valueArray");
            report(target, "pageItems");
            report(target, "default");
            return;
          }
          const properties = [...walkPropertiesInherited(type)].filter((property) =>
            metadata.isPayloadProperty(property, Visibility.Read, isExplicit),
          );
          const jsonName = (property: ModelProperty) =>
            resolveEncodedName(program, property, "application/json");
          const value = properties.find((property) => jsonName(property) === "value");
          const nextLink = properties.find((property) => jsonName(property) === "nextLink");
          if (value && value.name !== "value") report(value, "pagingName");
          if (nextLink && nextLink.name !== "nextLink") report(nextLink, "pagingName");
          if (!value || value.type.kind !== "Model" || !isArrayModelType(value.type)) {
            report(value ?? type, "valueArray");
          }
          if (
            !value ||
            (paging?.output.pageItems.property !== value &&
              !(
                value.type.kind === "Model" &&
                isArrayModelType(value.type) &&
                hasPagingDecorator(value, "@pageItems")
              ))
          ) {
            report(value ?? type, "pageItems");
          }
          if (
            nextLink &&
            paging?.output.nextLink?.property !== nextLink &&
            !hasPagingDecorator(nextLink, "@nextLink")
          ) {
            report(nextLink, "nextLink");
          }
          if (!nextLink) report(type, "default");
          for (const property of properties) {
            if (jsonName(property) !== "value" && jsonName(property) !== "nextLink") {
              report(property, "default");
            }
          }
          for (let model: Model | undefined = type; model; model = model.baseModel) {
            if (model.indexer !== undefined) {
              report(type, "additionalProperties");
              break;
            }
          }
        };
        for (const response of httpOperation.responses) {
          if (!includes200(response.statusCodes)) continue;
          for (const { body } of response.responses) {
            if (body === undefined || body.bodyKind !== "single") {
              const target = body?.property ?? operation;
              report(target, "valueArray");
              report(target, "pageItems");
              report(target, "default");
            } else {
              checkBody(body.type, body.isExplicit);
            }
          }
        }
        for (const pagingProperty of [paging?.output.pageItems, paging?.output.nextLink]) {
          const property = pagingProperty?.property;
          if (
            property &&
            property.name !== resolveEncodedName(program, property, "application/json") &&
            ![...reported].some(
              ([target, messages]) =>
                target.kind === "ModelProperty" &&
                messages.has("pagingName") &&
                isHttpPayloadCloneOf(target, property),
            )
          ) {
            report(property, "pagingName");
          }
        }
        const hasReported = (messageId: string) =>
          [...reported.values()].some((messages) => messages.has(messageId));
        if (paging === undefined && !hasReported("pageItems")) {
          report(operation, "pageItems");
        }
        if (
          !(paging?.output.nextLink || hasNextLink(operation.returnType)) &&
          !hasReported("nextLink")
        ) {
          report(operation, "pagingNextLink");
        }
      },
    };
  },
});

function includes200(status: HttpStatusCodesEntry): boolean {
  return status === 200 || (typeof status === "object" && status.start <= 200 && status.end >= 200);
}

// HTTP may synthesize a filtered body model whose properties clone the original response properties.
function isHttpPayloadCloneOf(clone: ModelProperty, original: ModelProperty): boolean {
  const model = clone.model;
  return (
    clone.sourceProperty === original &&
    model?.node === undefined &&
    model !== undefined &&
    model.sourceModels.some(({ model: source }) =>
      [...walkPropertiesInherited(source)].includes(original),
    )
  );
}

// Paging metadata can be absent or point to another property when the compiler reports errors.
function hasPagingDecorator(property: ModelProperty, name: "@pageItems" | "@nextLink"): boolean {
  return property.decorators.some(
    (x) =>
      x.definition?.name === name && getNamespaceFullName(x.definition.namespace) === "TypeSpec",
  );
}

function hasNextLink(type: Type, visited = new Set<Type>()): boolean {
  if (visited.has(type)) return false;
  visited.add(type);
  if (type.kind === "Union") {
    return [...type.variants.values()].some((variant) => hasNextLink(variant.type, visited));
  }
  if (type.kind === "Model") {
    return [...walkPropertiesInherited(type)].some(
      (property) =>
        hasPagingDecorator(property, "@nextLink") || hasNextLink(property.type, visited),
    );
  }
  return false;
}

function getDiagnosticTarget(
  program: Program,
  operation: Operation,
  target: Model | ModelProperty | Operation,
): Interface | Operation | Model | ModelProperty {
  if (getLocationContext(program, target).type === "project") return target;
  return getLocationContext(program, operation).type === "project"
    ? operation
    : (operation.interface ?? operation);
}
