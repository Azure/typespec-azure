import { code } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { ServerDataModel, ServerModel, ServerTypeRef } from "../model.js";
import { GENERATED_FILE_HEADER } from "./file-header.js";
import { operationTypeBindingValue } from "./render-operations.js";

/**
 * Renders the service-specific serialization binding. Stable request/response/XML conversion
 * lives in Azurite's handwritten runtime; generated output supplies only operation and XML
 * metadata for this service.
 */
export function renderSerialization(
  serverModel: ServerModel,
  runtimeImport = "../runtime/serializationRuntime.js",
) {
  return (
    <ts.SourceFile path="serialization.ts">
      {code`
        ${GENERATED_FILE_HEADER}
        import {
          createSerializationRuntime,
          type XmlModelMetadata,
        } from ${JSON.stringify(runtimeImport)};
        import { operations } from "./operations";
      `}
      <hbr />
      <XmlModelMetadata models={serverModel.models} />
      <hbr />
      {code`
        const runtime = createSerializationRuntime({ operations, xmlModels });

        export const deserializeRequest = runtime.deserializeRequest;
        export const serializeResponse = runtime.serializeResponse;
        export const hasGeneratedSerialization = runtime.hasGeneratedSerialization;
      `}
    </ts.SourceFile>
  );
}

export function XmlModelMetadata(props: { models: readonly ServerDataModel[] }) {
  return (
    <>
      {code`const xmlModels: Record<string, XmlModelMetadata> =`}
      <ts.ValueExpression jsValue={xmlModelsValue(props.models)} />
      {code`;`}
    </>
  );
}

function xmlModelsValue(models: readonly ServerDataModel[]) {
  return Object.fromEntries(
    models.map((model) => [
      model.name,
      {
        name: model.name,
        wireName: model.wireName,
        properties: model.properties.map((prop) => xmlPropertyMetadataValue(prop, models)),
      },
    ]),
  );
}

function xmlPropertyMetadataValue(
  prop: ServerDataModel["properties"][number],
  models: readonly ServerDataModel[],
) {
  const itemName = getArrayItemName(prop.type, prop.wireName, models);
  return withoutUndefined({
    name: prop.name,
    wireName: prop.wireName,
    type: operationTypeBindingValue(prop.type),
    attribute: prop.xmlAttribute,
    unwrapped: prop.xmlUnwrapped,
    itemName,
  });
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

function getArrayItemName(
  type: ServerTypeRef,
  fallback: string,
  models: readonly ServerDataModel[],
): string | undefined {
  if (type.kind !== "array") return undefined;
  const element = type.element;
  if (element.kind === "model") {
    const model = models.find((candidate) => candidate.name === element.name);
    return model?.wireName ?? element.name;
  }
  return fallback;
}
