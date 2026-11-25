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

type DiagnosticMessageId = "invalidEnvelope" | "valueArray" | "missingList" | "pagingMetadata";
type DiagnosticTarget = Model | ModelProperty | Operation;
type PagingInfo = NonNullable<ReturnType<typeof getPagingOperation>[0]>;
type DiagnosticReporter = (target: DiagnosticTarget, messageId: DiagnosticMessageId) => void;
type DiagnosticCollector = ReturnType<typeof createDiagnosticCollector>;

export const listResponseEnvelopeRule = createRule({
  name: "list-response-envelope",
  docs: fileRef.fromPackageRoot("src/rules/list-response-envelope.md"),
  description:
    "ARM list operations must declare paging metadata and use the standard response envelope.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/list-response-envelope",
  messages: {
    invalidEnvelope:
      "Collection response models must contain exactly `value` and `nextLink` properties.",
    valueArray: "Collection responses must declare a 'value' property of array type.",
    missingList: "Collection GET operations must use `@list`.",
    pagingMetadata:
      "Collection responses must use JSON-named `value` and `nextLink` properties with `@pageItems` and `@nextLink` metadata.",
  },
  create(context) {
    const program = context.program;
    const metadata = createMetadataInfo(program);
    return {
      operation: (operation) => {
        if (shouldSkipOperation(program, operation)) return;

        const [httpOperation] = getHttpOperation(program, operation);
        const list = isList(program, operation);
        const collection = isCollectionGet(httpOperation.verb, httpOperation.path);
        if (!list && !collection) return;
        if (!list) {
          context.reportDiagnostic({
            target: getDiagnosticTarget(program, operation, operation),
            messageId: "missingList",
          });
        }

        const [paging] = getPagingOperation(program, operation);
        const diagnostics = createDiagnosticCollector((target, messageId) =>
          context.reportDiagnostic({
            target: getDiagnosticTarget(program, operation, target),
            messageId,
          }),
        );
        if (list && collection && !paging?.output.nextLink) {
          diagnostics.report(operation, "pagingMetadata");
        }

        for (const response of httpOperation.responses) {
          if (!includes200(response.statusCodes)) continue;
          for (const { body } of response.responses) {
            if (body === undefined || body.bodyKind !== "single") {
              if (list) diagnostics.report(body?.property ?? operation, "valueArray");
            } else {
              checkResponseBody(
                program,
                operation,
                body.type,
                body.isExplicit,
                paging,
                list,
                metadata,
                diagnostics.report,
              );
            }
          }
        }
        if (list) checkPagingMetadata(operation, program, paging, diagnostics);
        diagnostics.emit();
      },
    };
  },
});

function shouldSkipOperation(program: Program, operation: Operation): boolean {
  if (
    isTemplateDeclarationOrInstance(operation) ||
    (operation.interface !== undefined && isTemplateDeclaration(operation.interface))
  ) {
    return true;
  }
  if (getLocationContext(program, operation).type === "project") return false;
  return (
    operation.interface === undefined ||
    getLocationContext(program, operation.interface).type !== "project"
  );
}

function isCollectionGet(verb: string, path: string): boolean {
  return (
    verb === "get" &&
    isCollectionPath(path.split("?")[0], {
      excludeTerminalPathParameter: true,
      excludeDefaultSegment: true,
    })
  );
}

function createDiagnosticCollector(emitDiagnostic: DiagnosticReporter): {
  report: DiagnosticReporter;
  has: (messageId: DiagnosticMessageId) => boolean;
  hasPagingCloneDiagnostic: (original: ModelProperty) => boolean;
  emit: () => void;
} {
  const reported = new Map<DiagnosticTarget, Set<DiagnosticMessageId>>();
  const report: DiagnosticReporter = (target, messageId) => {
    let messages = reported.get(target);
    if (!messages) reported.set(target, (messages = new Set()));
    messages.add(messageId);
  };
  const has = (messageId: DiagnosticMessageId) =>
    [...reported.values()].some((messages) => messages.has(messageId));

  return {
    report,
    has,
    hasPagingCloneDiagnostic: (original) =>
      [...reported].some(
        ([target, messages]) =>
          target.kind === "ModelProperty" &&
          messages.has("pagingMetadata") &&
          isHttpPayloadCloneOf(target, original),
      ),
    emit: () => {
      for (const [target, messages] of reported) {
        for (const messageId of messages) {
          emitDiagnostic(target, messageId);
        }
      }
    },
  };
}

function checkResponseBody(
  program: Program,
  operation: Operation,
  type: Type,
  isExplicit: boolean,
  paging: PagingInfo | undefined,
  list: boolean,
  metadata: ReturnType<typeof createMetadataInfo>,
  report: DiagnosticReporter,
): void {
  if (type.kind === "Union") {
    for (const variant of type.variants.values()) {
      checkResponseBody(
        program,
        operation,
        variant.type,
        isExplicit,
        paging,
        list,
        metadata,
        report,
      );
    }
    return;
  }
  if (type.kind !== "Model" || isArrayModelType(type)) {
    if (list) report(type.kind === "Model" ? type : operation, "valueArray");
    return;
  }

  const properties = [...walkPropertiesInherited(type)].filter((property) =>
    metadata.isPayloadProperty(property, Visibility.Read, isExplicit),
  );
  const jsonName = (property: ModelProperty) =>
    resolveEncodedName(program, property, "application/json");
  const value = properties.find((property) => jsonName(property) === "value");
  const nextLink = properties.find((property) => jsonName(property) === "nextLink");

  if (list && (!value || value.type.kind !== "Model" || !isArrayModelType(value.type))) {
    report(value ?? type, "valueArray");
  } else if (
    list &&
    value &&
    paging?.output.pageItems.property !== value &&
    !hasPagingDecorator(value, "@pageItems")
  ) {
    report(value, "pagingMetadata");
  }

  if (list && value && value.name !== "value") report(value, "pagingMetadata");
  if (
    list &&
    nextLink &&
    paging?.output.nextLink?.property !== nextLink &&
    !hasPagingDecorator(nextLink, "@nextLink")
  ) {
    report(nextLink, "pagingMetadata");
  }
  if (list && nextLink && nextLink.name !== "nextLink") report(nextLink, "pagingMetadata");

  const hasExtraProperty = properties.some((property) => {
    const name = jsonName(property);
    return name !== "value" && name !== "nextLink";
  });
  let hasIndexer = false;
  for (let model: Model | undefined = type; model; model = model.baseModel) {
    if (model.indexer !== undefined) {
      hasIndexer = true;
      break;
    }
  }
  if (!value || !nextLink || hasExtraProperty || hasIndexer) report(type, "invalidEnvelope");
}

function checkPagingMetadata(
  operation: Operation,
  program: Program,
  paging: PagingInfo | undefined,
  diagnostics: DiagnosticCollector,
): void {
  for (const pagingProperty of [paging?.output.pageItems, paging?.output.nextLink]) {
    const property = pagingProperty?.property;
    if (
      property &&
      property.name !== resolveEncodedName(program, property, "application/json") &&
      !diagnostics.hasPagingCloneDiagnostic(property)
    ) {
      diagnostics.report(property, "pagingMetadata");
    }
  }
  if (
    paging === undefined &&
    !diagnostics.has("pagingMetadata") &&
    !diagnostics.has("valueArray")
  ) {
    diagnostics.report(operation, "pagingMetadata");
  }
  if (
    !(paging?.output.nextLink || hasNextLink(operation.returnType)) &&
    !diagnostics.has("pagingMetadata")
  ) {
    diagnostics.report(operation, "pagingMetadata");
  }
}

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
