# Keep distinct generic model instantiations separate

Verifies that different generic instantiations receive distinct projected models even when they originate from the same template declaration.

## TypeSpec

```tsp
model Patch<T> {
  properties?: T;
}

model FooProperties {
  value: string;

  @visibility(Lifecycle.Read)
  fooStatus: string;
}

model BarProperties {
  count: int32;

  @visibility(Lifecycle.Read)
  barStatus: string;
}

@route("/foo")
@patch
op updateFoo(@body body: Patch<FooProperties>): void;

@route("/bar")
@patch
op updateBar(@body body: Patch<BarProperties>): void;
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface PatchFooProperties */
export interface PatchFooProperties {
  properties?: FooProperties;
}

export function patchFooPropertiesSerializer(item: PatchFooProperties): any {
  return {
    properties: !item["properties"]
      ? item["properties"]
      : fooPropertiesSerializer(item["properties"]),
  };
}

/** model interface FooProperties */
export interface FooProperties {
  value: string;
  readonly fooStatus: string;
}

export function fooPropertiesSerializer(item: FooProperties): any {
  return { value: item["value"] };
}

/** model interface PatchBarProperties */
export interface PatchBarProperties {
  properties?: BarProperties;
}

export function patchBarPropertiesSerializer(item: PatchBarProperties): any {
  return {
    properties: !item["properties"]
      ? item["properties"]
      : barPropertiesSerializer(item["properties"]),
  };
}

/** model interface BarProperties */
export interface BarProperties {
  count: number;
  readonly barStatus: string;
}

export function barPropertiesSerializer(item: BarProperties): any {
  return { count: item["count"] };
}

/** model interface PatchFooPropertiesUpdate */
export interface PatchFooPropertiesUpdate {
  properties?: FooPropertiesUpdate;
}

export function patchFooPropertiesUpdateSerializer(item: PatchFooPropertiesUpdate): any {
  return {
    properties: !item["properties"]
      ? item["properties"]
      : fooPropertiesUpdateSerializer(item["properties"]),
  };
}

/** model interface FooPropertiesUpdate */
export interface FooPropertiesUpdate {
  value: string;
}

export function fooPropertiesUpdateSerializer(item: FooPropertiesUpdate): any {
  return { value: item["value"] };
}

/** model interface PatchBarPropertiesUpdate */
export interface PatchBarPropertiesUpdate {
  properties?: BarPropertiesUpdate;
}

export function patchBarPropertiesUpdateSerializer(item: PatchBarPropertiesUpdate): any {
  return {
    properties: !item["properties"]
      ? item["properties"]
      : barPropertiesUpdateSerializer(item["properties"]),
  };
}

/** model interface BarPropertiesUpdate */
export interface BarPropertiesUpdate {
  count: number;
}

export function barPropertiesUpdateSerializer(item: BarPropertiesUpdate): any {
  return { count: item["count"] };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  PatchFooPropertiesUpdate,
  patchFooPropertiesUpdateSerializer,
  PatchBarPropertiesUpdate,
  patchBarPropertiesUpdateSerializer,
} from "../models/models.js";
import { UpdateBarOptionalParams, UpdateFooOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _updateBarSend(
  context: Client,
  body: PatchBarPropertiesUpdate,
  options: UpdateBarOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/bar").patch({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: patchBarPropertiesUpdateSerializer(body),
  });
}

export async function _updateBarDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function updateBar(
  context: Client,
  body: PatchBarPropertiesUpdate,
  options: UpdateBarOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _updateBarSend(context, body, options);
  return _updateBarDeserialize(result);
}

export function _updateFooSend(
  context: Client,
  body: PatchFooPropertiesUpdate,
  options: UpdateFooOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/foo").patch({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: patchFooPropertiesUpdateSerializer(body),
  });
}

export async function _updateFooDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function updateFoo(
  context: Client,
  body: PatchFooPropertiesUpdate,
  options: UpdateFooOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _updateFooSend(context, body, options);
  return _updateFooDeserialize(result);
}
```

# Project models nested in arrays

Verifies that array element models are projected and that the containing model references the projected element type.

## TypeSpec

```tsp
model Item {
  @visibility(Lifecycle.Read)
  id: string;

  value: string;
}

model Batch {
  items: Item[];
}

@post
op createBatch(@body body: Batch): Batch;
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Batch */
export interface Batch {
  items: Item[];
}

export function batchSerializer(item: Batch): any {
  return { items: itemArraySerializer(item["items"]) };
}

export function batchDeserializer(item: any): Batch {
  return {
    items: itemArrayDeserializer(item["items"]),
  };
}

export function itemArraySerializer(result: Array<Item>): any[] {
  return result.map((item) => {
    return itemSerializer(item);
  });
}

export function itemArrayDeserializer(result: Array<Item>): any[] {
  return result.map((item) => {
    return itemDeserializer(item);
  });
}

/** model interface Item */
export interface Item {
  readonly id: string;
  value: string;
}

export function itemSerializer(item: Item): any {
  return { value: item["value"] };
}

export function itemDeserializer(item: any): Item {
  return {
    id: item["id"],
    value: item["value"],
  };
}

/** model interface BatchCreate */
export interface BatchCreate {
  items: ItemCreate[];
}

export function batchCreateSerializer(item: BatchCreate): any {
  return { items: itemCreateArraySerializer(item["items"]) };
}

export function itemCreateArraySerializer(result: Array<ItemCreate>): any[] {
  return result.map((item) => {
    return itemCreateSerializer(item);
  });
}

/** model interface ItemCreate */
export interface ItemCreate {
  value: string;
}

export function itemCreateSerializer(item: ItemCreate): any {
  return { value: item["value"] };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import { Batch, batchDeserializer, BatchCreate, batchCreateSerializer } from "../models/models.js";
import { CreateBatchOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createBatchSend(
  context: Client,
  body: BatchCreate,
  options: CreateBatchOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: batchCreateSerializer(body),
  });
}

export async function _createBatchDeserialize(result: PathUncheckedResponse): Promise<Batch> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return batchDeserializer(result.body);
}

export async function createBatch(
  context: Client,
  body: BatchCreate,
  options: CreateBatchOptionalParams = { requestOptions: {} },
): Promise<Batch> {
  const result = await _createBatchSend(context, body, options);
  return _createBatchDeserialize(result);
}
```

# Project model references through container properties

Verifies that model references nested in dictionaries, nullable types, tuples, and unions are replaced with their projected equivalents.

## TypeSpec

```tsp
model Item {
  @visibility(Lifecycle.Read)
  id: string;

  value: string;
}

model Container {
  dictionary: Record<Item>;
  nullable: Item | null;
  tuple: [Item, string];
  unionValue: Item | string;
}

@post
op createContainer(@body body: Container): Container;
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Container */
export interface Container {
  dictionary: Record<string, Item>;
  nullable: Item | null;
  tuple: [Item, string];
  unionValue: Item | string;
}

export function containerSerializer(item: Container): any {
  return {
    dictionary: itemRecordSerializer(item["dictionary"]),
    nullable: !item["nullable"] ? item["nullable"] : itemSerializer(item["nullable"]),
    tuple: item["tuple"],
    unionValue: _containerUnionValueSerializer(item["unionValue"]),
  };
}

export function containerDeserializer(item: any): Container {
  return {
    dictionary: itemRecordDeserializer(item["dictionary"]),
    nullable: !item["nullable"] ? item["nullable"] : itemDeserializer(item["nullable"]),
    tuple: item["tuple"],
    unionValue: _containerUnionValueDeserializer(item["unionValue"]),
  };
}

export function itemRecordSerializer(item: Record<string, Item>): Record<string, any> {
  const result: Record<string, any> = {};
  Object.keys(item).map((key) => {
    result[key] = !item[key] ? item[key] : itemSerializer(item[key]);
  });
  return result;
}

export function itemRecordDeserializer(item: Record<string, any>): Record<string, Item> {
  const result: Record<string, any> = {};
  Object.keys(item).map((key) => {
    result[key] = !item[key] ? item[key] : itemDeserializer(item[key]);
  });
  return result;
}

/** model interface Item */
export interface Item {
  readonly id: string;
  value: string;
}

export function itemSerializer(item: Item): any {
  return { value: item["value"] };
}

export function itemDeserializer(item: any): Item {
  return {
    id: item["id"],
    value: item["value"],
  };
}

/** Alias for _ContainerUnionValue */
export type _ContainerUnionValue = Item | string;

export function _containerUnionValueSerializer(item: _ContainerUnionValue): any {
  return item;
}

export function _containerUnionValueDeserializer(item: any): _ContainerUnionValue {
  return item;
}

/** model interface ContainerCreate */
export interface ContainerCreate {
  dictionary: Record<string, ItemCreate>;
  nullable: ItemCreate | null;
  tuple: [ItemCreate, string];
  unionValue: ItemCreate | string;
}

export function containerCreateSerializer(item: ContainerCreate): any {
  return {
    dictionary: itemCreateRecordSerializer(item["dictionary"]),
    nullable: !item["nullable"] ? item["nullable"] : itemCreateSerializer(item["nullable"]),
    tuple: item["tuple"],
    unionValue: _containerUnionValueSerializer_1(item["unionValue"]),
  };
}

export function itemCreateRecordSerializer(item: Record<string, ItemCreate>): Record<string, any> {
  const result: Record<string, any> = {};
  Object.keys(item).map((key) => {
    result[key] = !item[key] ? item[key] : itemCreateSerializer(item[key]);
  });
  return result;
}

/** model interface ItemCreate */
export interface ItemCreate {
  value: string;
}

export function itemCreateSerializer(item: ItemCreate): any {
  return { value: item["value"] };
}

/** Alias for _ContainerUnionValue */
export type _ContainerUnionValue_1 = ItemCreate | string;

export function _containerUnionValueSerializer_1(item: _ContainerUnionValue_1): any {
  return item;
}

export function _containerUnionValueDeserializer_1(item: any): _ContainerUnionValue_1 {
  return item;
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  Container,
  containerDeserializer,
  ContainerCreate,
  containerCreateSerializer,
} from "../models/models.js";
import { CreateContainerOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createContainerSend(
  context: Client,
  body: ContainerCreate,
  options: CreateContainerOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: containerCreateSerializer(body),
  });
}

export async function _createContainerDeserialize(
  result: PathUncheckedResponse,
): Promise<Container> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return containerDeserializer(result.body);
}

export async function createContainer(
  context: Client,
  body: ContainerCreate,
  options: CreateContainerOptionalParams = { requestOptions: {} },
): Promise<Container> {
  const result = await _createContainerSend(context, body, options);
  return _createContainerDeserialize(result);
}
```

# Project model references in non-model body roots

Verifies that top-level array, nullable, and dictionary request bodies project their nested model types and expose those types in operation parameters.

## TypeSpec

```tsp
model Item {
  @visibility(Lifecycle.Read)
  id: string;

  value: string;
}

@route("/items")
@post
op createItems(@body body: Item[]): void;

@route("/nullable-item")
@post
op createNullableItem(@body body: Item | null): void;

@route("/item-map")
@post
op createItemMap(@body body: Record<Item>): void;
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Item */
export interface Item {
  readonly id: string;
  value: string;
}

export function itemSerializer(item: Item): any {
  return { value: item["value"] };
}

/** model interface ItemCreate */
export interface ItemCreate {
  value: string;
}

export function itemCreateSerializer(item: ItemCreate): any {
  return { value: item["value"] };
}

export function itemCreateArraySerializer(result: Array<ItemCreate>): any[] {
  return result.map((item) => {
    return itemCreateSerializer(item);
  });
}

export function itemCreateRecordSerializer(item: Record<string, ItemCreate>): Record<string, any> {
  const result: Record<string, any> = {};
  Object.keys(item).map((key) => {
    result[key] = !item[key] ? item[key] : itemCreateSerializer(item[key]);
  });
  return result;
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  ItemCreate,
  itemCreateSerializer,
  itemCreateArraySerializer,
  itemCreateRecordSerializer,
} from "../models/models.js";
import {
  CreateItemMapOptionalParams,
  CreateNullableItemOptionalParams,
  CreateItemsOptionalParams,
} from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createItemMapSend(
  context: Client,
  body: Record<string, ItemCreate>,
  options: CreateItemMapOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/item-map").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: itemCreateRecordSerializer(body),
  });
}

export async function _createItemMapDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function createItemMap(
  context: Client,
  body: Record<string, ItemCreate>,
  options: CreateItemMapOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _createItemMapSend(context, body, options);
  return _createItemMapDeserialize(result);
}

export function _createNullableItemSend(
  context: Client,
  body: ItemCreate | null,
  options: CreateNullableItemOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/nullable-item").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: !body ? body : itemCreateSerializer(body),
  });
}

export async function _createNullableItemDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function createNullableItem(
  context: Client,
  body: ItemCreate | null,
  options: CreateNullableItemOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _createNullableItemSend(context, body, options);
  return _createNullableItemDeserialize(result);
}

export function _createItemsSend(
  context: Client,
  body: ItemCreate[],
  options: CreateItemsOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/items").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: itemCreateArraySerializer(body),
  });
}

export async function _createItemsDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function createItems(
  context: Client,
  body: ItemCreate[],
  options: CreateItemsOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _createItemsSend(context, body, options);
  return _createItemsDeserialize(result);
}
```

# Project model parameters in spread bodies

Verifies that writable scalar spread parameters remain unchanged while nested model parameters and their serialization use projected request models.

## TypeSpec

```tsp
model Widget {
  @visibility(Lifecycle.Read)
  id: string;

  displayName: string;
  weight: int32;
}

model Detail {
  @visibility(Lifecycle.Read)
  detailId: string;

  note: string;
}

model Container {
  @visibility(Lifecycle.Read)
  containerId: string;

  title: string;
  detail: Detail;
}

@route("/widgets")
@post
op createWidget(...Widget): Widget;

@route("/containers")
@post
op createContainer(...Container): Container;
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Widget */
export interface Widget {
  readonly id: string;
  displayName: string;
  weight: number;
}

export function widgetDeserializer(item: any): Widget {
  return {
    id: item["id"],
    displayName: item["displayName"],
    weight: item["weight"],
  };
}

/** model interface DetailCreate */
export interface DetailCreate {
  note: string;
}

export function detailCreateSerializer(item: DetailCreate): any {
  return { note: item["note"] };
}

/** model interface Detail */
export interface Detail {
  readonly detailId: string;
  note: string;
}

export function detailSerializer(item: Detail): any {
  return { note: item["note"] };
}

export function detailDeserializer(item: any): Detail {
  return {
    detailId: item["detailId"],
    note: item["note"],
  };
}

/** model interface Container */
export interface Container {
  readonly containerId: string;
  title: string;
  detail: Detail;
}

export function containerDeserializer(item: any): Container {
  return {
    containerId: item["containerId"],
    title: item["title"],
    detail: detailDeserializer(item["detail"]),
  };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  Widget,
  widgetDeserializer,
  DetailCreate,
  detailCreateSerializer,
  Container,
  containerDeserializer,
} from "../models/models.js";
import { CreateContainerOptionalParams, CreateWidgetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createContainerSend(
  context: Client,
  title: string,
  detail: DetailCreate,
  options: CreateContainerOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/containers").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: { title: title, detail: detailCreateSerializer(detail) },
  });
}

export async function _createContainerDeserialize(
  result: PathUncheckedResponse,
): Promise<Container> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return containerDeserializer(result.body);
}

export async function createContainer(
  context: Client,
  title: string,
  detail: DetailCreate,
  options: CreateContainerOptionalParams = { requestOptions: {} },
): Promise<Container> {
  const result = await _createContainerSend(context, title, detail, options);
  return _createContainerDeserialize(result);
}

export function _createWidgetSend(
  context: Client,
  displayName: string,
  weight: number,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/widgets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: { displayName: displayName, weight: weight },
  });
}

export async function _createWidgetDeserialize(result: PathUncheckedResponse): Promise<Widget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return widgetDeserializer(result.body);
}

export async function createWidget(
  context: Client,
  displayName: string,
  weight: number,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _createWidgetSend(context, displayName, weight, options);
  return _createWidgetDeserialize(result);
}
```

# Repoint cyclic references to the projected model

Verifies that a self-referential request model uses its projected type for the recursive property and serializer while the response model remains unchanged.

## TypeSpec

```tsp
model Node {
  @visibility(Lifecycle.Read)
  nodeId: string;

  label: string;
  next?: Node;
}

@post
op createNode(@body body: Node): Node;
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Node */
export interface Node {
  readonly nodeId: string;
  label: string;
  next?: Node;
}

export function nodeSerializer(item: Node): any {
  return {
    label: item["label"],
    next: !item["next"] ? item["next"] : nodeSerializer(item["next"]),
  };
}

export function nodeDeserializer(item: any): Node {
  return {
    nodeId: item["nodeId"],
    label: item["label"],
    next: !item["next"] ? item["next"] : nodeDeserializer(item["next"]),
  };
}

/** model interface NodeCreate */
export interface NodeCreate {
  label: string;
  next?: NodeCreate;
}

export function nodeCreateSerializer(item: NodeCreate): any {
  return {
    label: item["label"],
    next: !item["next"] ? item["next"] : nodeCreateSerializer(item["next"]),
  };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import { Node, nodeDeserializer, NodeCreate, nodeCreateSerializer } from "../models/models.js";
import { CreateNodeOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createNodeSend(
  context: Client,
  body: NodeCreate,
  options: CreateNodeOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: nodeCreateSerializer(body),
  });
}

export async function _createNodeDeserialize(result: PathUncheckedResponse): Promise<Node> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return nodeDeserializer(result.body);
}

export async function createNode(
  context: Client,
  body: NodeCreate,
  options: CreateNodeOptionalParams = { requestOptions: {} },
): Promise<Node> {
  const result = await _createNodeSend(context, body, options);
  return _createNodeDeserialize(result);
}
```

# Project named model additional properties

Verifies that model-valued additional properties reference the applicable visibility projection.

## TypeSpec

```tsp
model Item {
  @visibility(Lifecycle.Read)
  id: string;

  value: string;
}

model ItemMap is Record<Item>;

@route("/items")
@post
op createItems(@body body: ItemMap): ItemMap;
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { serializeRecord } from "../static-helpers/serialization/serialize-record.js";

/** model interface ItemMap */
export interface ItemMap {
  /** Additional properties */
  additionalProperties?: Record<string, Item>;
}

export function itemMapSerializer(item: ItemMap): any {
  return { ...serializeRecord(item.additionalProperties ?? {}, undefined, itemSerializer) };
}

export function itemMapDeserializer(item: any): ItemMap {
  return {
    additionalProperties: serializeRecord(item, [], itemDeserializer),
  };
}

/** model interface Item */
export interface Item {
  readonly id: string;
  value: string;
}

export function itemSerializer(item: Item): any {
  return { value: item["value"] };
}

export function itemDeserializer(item: any): Item {
  return {
    id: item["id"],
    value: item["value"],
  };
}

/** model interface ItemMapCreate */
export interface ItemMapCreate {
  /** Additional properties */
  additionalProperties?: Record<string, ItemCreate>;
}

export function itemMapCreateSerializer(item: ItemMapCreate): any {
  return { ...serializeRecord(item.additionalProperties ?? {}, undefined, itemCreateSerializer) };
}

/** model interface ItemCreate */
export interface ItemCreate {
  value: string;
}

export function itemCreateSerializer(item: ItemCreate): any {
  return { value: item["value"] };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  ItemMap,
  itemMapDeserializer,
  ItemMapCreate,
  itemMapCreateSerializer,
} from "../models/models.js";
import { CreateItemsOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createItemsSend(
  context: Client,
  body: ItemMapCreate,
  options: CreateItemsOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/items").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: itemMapCreateSerializer(body),
  });
}

export async function _createItemsDeserialize(result: PathUncheckedResponse): Promise<ItemMap> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return itemMapDeserializer(result.body);
}

export async function createItems(
  context: Client,
  body: ItemMapCreate,
  options: CreateItemsOptionalParams = { requestOptions: {} },
): Promise<ItemMap> {
  const result = await _createItemsSend(context, body, options);
  return _createItemsDeserialize(result);
}
```
