import { code } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { ServerDataModel, ServerModel, ServerTypeRef } from "../model.js";
import { GENERATED_FILE_HEADER } from "./file-header.js";
import { type OperationTypeDescriptor, operationTypeDescriptorValue } from "./render-operations.js";

type XmlPropertyDescriptor = readonly [
  name: string,
  wireName: string,
  type: OperationTypeDescriptor,
  mode?: "attribute" | "unwrapped",
  itemName?: string,
];

type XmlModelDescriptorMap = Record<
  string,
  readonly [wireName: string, properties: readonly XmlPropertyDescriptor[]]
>;

/**
 * Renders the service-specific serialization binding. Stable request/response/XML conversion
 * lives in Azurite's handwritten runtime; generated output supplies only operation and XML
 * metadata for this service.
 */
export function renderSerialization(
  serverModel: ServerModel,
  runtimeImport = "../runtime/serializationRuntime",
) {
  return (
    <ts.SourceFile path="serialization.ts">
      {code`
        ${GENERATED_FILE_HEADER}
        import {
          createSerializationRuntime,
          defineXmlModels,
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
      {code`const xmlModels: Record<string, XmlModelMetadata> = defineXmlModels(`}
      <ts.ValueExpression jsValue={xmlModelsValue(props.models)} />
      {code`);`}
    </>
  );
}

function xmlModelsValue(models: readonly ServerDataModel[]) {
  return Object.fromEntries(
    models.map((model) => [
      model.name,
      [model.wireName, model.properties.map((prop) => xmlPropertyMetadataValue(prop, models))],
    ]),
  ) as XmlModelDescriptorMap;
}

function xmlPropertyMetadataValue(
  prop: ServerDataModel["properties"][number],
  models: readonly ServerDataModel[],
) {
  const itemName = getArrayItemName(prop.type, prop.wireName, models);
  return withoutTrailingUndefined([
    prop.name,
    prop.wireName,
    operationTypeDescriptorValue(prop.type),
    prop.xmlAttribute ? "attribute" : prop.xmlUnwrapped ? "unwrapped" : undefined,
    itemName,
  ]) as unknown as XmlPropertyDescriptor;
}

function withoutTrailingUndefined<T extends readonly unknown[]>(items: T): T {
  const trimmed = [...items];
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === undefined) {
    trimmed.pop();
  }
  return trimmed as unknown as T;
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
