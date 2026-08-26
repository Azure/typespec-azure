# Apply visibility to request models

Verifies the basic behavior across HTTP operations: read-only and metadata properties are removed from request models, while models that require no changes reuse the original model.

## TypeSpec

```tsp
model Widget {
  @visibility(Lifecycle.Read)
  id: string;

  @visibility(Lifecycle.Read)
  name: string;

  @visibility(Lifecycle.Read)
  etag?: string;

  @visibility(Lifecycle.Create)
  createOnly: string;

  @visibility(Lifecycle.Update)
  updateOnly: string;

  displayName: string;
  weight: int32;
}

model Gadget {
  displayName: string;
  weight: int32;
}

model MetadataWidget {
  @visibility(Lifecycle.Read)
  id: string;

  @header token: string;
  value: string;
}

@route("/widgets")
@post
op createWidget(@body body: Widget): Widget;

@route("/widgets/{widgetName}")
@put
op createOrUpdateWidget(
  @path widgetName: string,
  @query validateOnly?: boolean,
  @body body: Widget,
): Widget;

@route("/widgets/{widgetName}")
@patch
op updateWidget(
  @path widgetName: string,
  @query validateOnly?: boolean,
  @header ifMatch?: string,
  @body body: Widget,
): Widget;

@route("/widgets/{widgetName}")
@get
op getWidget(@path widgetName: string, @query includeDetails?: boolean): Widget;

@route("/widgets/{widgetName}")
@delete
op deleteWidget(@path widgetName: string): void;

@route("/gadgets")
@post
op createGadget(@body body: Gadget): Gadget;

@route("/metadata-widgets")
@post
op createMetadataWidget(@bodyRoot body: MetadataWidget): MetadataWidget;
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
  readonly name: string;
  readonly etag?: string;
  displayName: string;
  weight: number;
}

export function widgetSerializer(item: Widget): any {
  return { displayName: item["displayName"], weight: item["weight"] };
}

export function widgetDeserializer(item: any): Widget {
  return {
    id: item["id"],
    name: item["name"],
    etag: item["etag"],
    displayName: item["displayName"],
    weight: item["weight"],
  };
}

/** model interface Gadget */
export interface Gadget {
  displayName: string;
  weight: number;
}

export function gadgetSerializer(item: Gadget): any {
  return { displayName: item["displayName"], weight: item["weight"] };
}

export function gadgetDeserializer(item: any): Gadget {
  return {
    displayName: item["displayName"],
    weight: item["weight"],
  };
}

/** model interface MetadataWidget */
export interface MetadataWidget {
  readonly id: string;
  token: string;
  value: string;
}

export function metadataWidgetSerializer(item: MetadataWidget): any {
  return { value: item["value"] };
}

export function metadataWidgetDeserializer(item: any): MetadataWidget {
  return {
    id: item["id"],
    value: item["value"],
  };
}

/** model interface WidgetCreate */
export interface WidgetCreate {
  createOnly: string;
  displayName: string;
  weight: number;
}

export function widgetCreateSerializer(item: WidgetCreate): any {
  return {
    createOnly: item["createOnly"],
    displayName: item["displayName"],
    weight: item["weight"],
  };
}

/** model interface WidgetCreateOrUpdate */
export interface WidgetCreateOrUpdate {
  createOnly: string;
  updateOnly: string;
  displayName: string;
  weight: number;
}

export function widgetCreateOrUpdateSerializer(item: WidgetCreateOrUpdate): any {
  return {
    createOnly: item["createOnly"],
    updateOnly: item["updateOnly"],
    displayName: item["displayName"],
    weight: item["weight"],
  };
}

/** model interface WidgetUpdate */
export interface WidgetUpdate {
  updateOnly: string;
  displayName: string;
  weight: number;
}

export function widgetUpdateSerializer(item: WidgetUpdate): any {
  return {
    updateOnly: item["updateOnly"],
    displayName: item["displayName"],
    weight: item["weight"],
  };
}

/** model interface MetadataWidgetCreate */
export interface MetadataWidgetCreate {
  token: string;
  value: string;
}

export function metadataWidgetCreateSerializer(item: MetadataWidgetCreate): any {
  return { value: item["value"] };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  Widget,
  widgetDeserializer,
  Gadget,
  gadgetSerializer,
  gadgetDeserializer,
  MetadataWidget,
  metadataWidgetDeserializer,
  WidgetCreate,
  widgetCreateSerializer,
  WidgetCreateOrUpdate,
  widgetCreateOrUpdateSerializer,
  WidgetUpdate,
  widgetUpdateSerializer,
  MetadataWidgetCreate,
  metadataWidgetCreateSerializer,
} from "../models/models.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import {
  CreateMetadataWidgetOptionalParams,
  CreateGadgetOptionalParams,
  DeleteWidgetOptionalParams,
  GetWidgetOptionalParams,
  UpdateWidgetOptionalParams,
  CreateOrUpdateWidgetOptionalParams,
  CreateWidgetOptionalParams,
} from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createMetadataWidgetSend(
  context: Client,
  body: MetadataWidgetCreate,
  options: CreateMetadataWidgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/metadata-widgets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      token: body.token,
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: metadataWidgetCreateSerializer(body),
  });
}

export async function _createMetadataWidgetDeserialize(
  result: PathUncheckedResponse,
): Promise<MetadataWidget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return metadataWidgetDeserializer(result.body);
}

export async function createMetadataWidget(
  context: Client,
  body: MetadataWidgetCreate,
  options: CreateMetadataWidgetOptionalParams = { requestOptions: {} },
): Promise<MetadataWidget> {
  const result = await _createMetadataWidgetSend(context, body, options);
  return _createMetadataWidgetDeserialize(result);
}

export function _createGadgetSend(
  context: Client,
  body: Gadget,
  options: CreateGadgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/gadgets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: gadgetSerializer(body),
  });
}

export async function _createGadgetDeserialize(result: PathUncheckedResponse): Promise<Gadget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return gadgetDeserializer(result.body);
}

export async function createGadget(
  context: Client,
  body: Gadget,
  options: CreateGadgetOptionalParams = { requestOptions: {} },
): Promise<Gadget> {
  const result = await _createGadgetSend(context, body, options);
  return _createGadgetDeserialize(result);
}

export function _deleteWidgetSend(
  context: Client,
  widgetName: string,
  options: DeleteWidgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/widgets/{widgetName}",
    {
      widgetName: widgetName,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).delete({ ...operationOptionsToRequestParameters(options) });
}

export async function _deleteWidgetDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function deleteWidget(
  context: Client,
  widgetName: string,
  options: DeleteWidgetOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _deleteWidgetSend(context, widgetName, options);
  return _deleteWidgetDeserialize(result);
}

export function _getWidgetSend(
  context: Client,
  widgetName: string,
  options: GetWidgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/widgets/{widgetName}{?includeDetails}",
    {
      widgetName: widgetName,
      includeDetails: options?.includeDetails,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: { accept: "application/json", ...options.requestOptions?.headers },
  });
}

export async function _getWidgetDeserialize(result: PathUncheckedResponse): Promise<Widget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return widgetDeserializer(result.body);
}

export async function getWidget(
  context: Client,
  widgetName: string,
  options: GetWidgetOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _getWidgetSend(context, widgetName, options);
  return _getWidgetDeserialize(result);
}

export function _updateWidgetSend(
  context: Client,
  widgetName: string,
  body: WidgetUpdate,
  options: UpdateWidgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/widgets/{widgetName}{?validateOnly}",
    {
      widgetName: widgetName,
      validateOnly: options?.validateOnly,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).patch({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      ...(options?.ifMatch !== undefined ? { "if-match": options?.ifMatch } : {}),
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: widgetUpdateSerializer(body),
  });
}

export async function _updateWidgetDeserialize(result: PathUncheckedResponse): Promise<Widget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return widgetDeserializer(result.body);
}

export async function updateWidget(
  context: Client,
  widgetName: string,
  body: WidgetUpdate,
  options: UpdateWidgetOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _updateWidgetSend(context, widgetName, body, options);
  return _updateWidgetDeserialize(result);
}

export function _createOrUpdateWidgetSend(
  context: Client,
  widgetName: string,
  body: WidgetCreateOrUpdate,
  options: CreateOrUpdateWidgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/widgets/{widgetName}{?validateOnly}",
    {
      widgetName: widgetName,
      validateOnly: options?.validateOnly,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).put({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: widgetCreateOrUpdateSerializer(body),
  });
}

export async function _createOrUpdateWidgetDeserialize(
  result: PathUncheckedResponse,
): Promise<Widget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return widgetDeserializer(result.body);
}

export async function createOrUpdateWidget(
  context: Client,
  widgetName: string,
  body: WidgetCreateOrUpdate,
  options: CreateOrUpdateWidgetOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _createOrUpdateWidgetSend(context, widgetName, body, options);
  return _createOrUpdateWidgetDeserialize(result);
}

export function _createWidgetSend(
  context: Client,
  body: WidgetCreate,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/widgets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: widgetCreateSerializer(body),
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
  body: WidgetCreate,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _createWidgetSend(context, body, options);
  return _createWidgetDeserialize(result);
}
```

## Classic Client

```ts classicClient
import {
  createMetadataWidget,
  createGadget,
  deleteWidget,
  getWidget,
  updateWidget,
  createOrUpdateWidget,
  createWidget,
} from "./api/operations.js";
import {
  CreateMetadataWidgetOptionalParams,
  CreateGadgetOptionalParams,
  DeleteWidgetOptionalParams,
  GetWidgetOptionalParams,
  UpdateWidgetOptionalParams,
  CreateOrUpdateWidgetOptionalParams,
  CreateWidgetOptionalParams,
} from "./api/options.js";
import {
  Widget,
  Gadget,
  MetadataWidget,
  WidgetCreate,
  WidgetCreateOrUpdate,
  WidgetUpdate,
  MetadataWidgetCreate,
} from "./models/models.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { TestingClientOptionalParams } from "./api/testingContext.js";

export class TestingClient {
  private _client: TestingContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: TestingClientOptionalParams = {}) {
    this._client = createTesting(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  createMetadataWidget(
    body: MetadataWidgetCreate,
    options: CreateMetadataWidgetOptionalParams = { requestOptions: {} },
  ): Promise<MetadataWidget> {
    return createMetadataWidget(this._client, body, options);
  }

  createGadget(
    body: Gadget,
    options: CreateGadgetOptionalParams = { requestOptions: {} },
  ): Promise<Gadget> {
    return createGadget(this._client, body, options);
  }

  deleteWidget(
    widgetName: string,
    options: DeleteWidgetOptionalParams = { requestOptions: {} },
  ): Promise<void> {
    return deleteWidget(this._client, widgetName, options);
  }

  getWidget(
    widgetName: string,
    options: GetWidgetOptionalParams = { requestOptions: {} },
  ): Promise<Widget> {
    return getWidget(this._client, widgetName, options);
  }

  updateWidget(
    widgetName: string,
    body: WidgetUpdate,
    options: UpdateWidgetOptionalParams = { requestOptions: {} },
  ): Promise<Widget> {
    return updateWidget(this._client, widgetName, body, options);
  }

  createOrUpdateWidget(
    widgetName: string,
    body: WidgetCreateOrUpdate,
    options: CreateOrUpdateWidgetOptionalParams = { requestOptions: {} },
  ): Promise<Widget> {
    return createOrUpdateWidget(this._client, widgetName, body, options);
  }

  createWidget(
    body: WidgetCreate,
    options: CreateWidgetOptionalParams = { requestOptions: {} },
  ): Promise<Widget> {
    return createWidget(this._client, body, options);
  }
}
```

# Propagate nested model differences to parent request models

Verifies that visibility is applied recursively and that a nested model difference projects an otherwise unchanged parent across write operations.

## TypeSpec

```tsp
model Child {
  @visibility(Lifecycle.Read)
  id: string;

  value: string;
}

model Parent {
  name: string;
  child: Child;
}

@route("/parents")
@post
op createParent(@body body: Parent): Parent;

@route("/parents/{parentName}")
@put
op replaceParent(@path parentName: string, @body body: Parent): Parent;
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

/** model interface Parent */
export interface Parent {
  name: string;
  child: Child;
}

export function parentSerializer(item: Parent): any {
  return { name: item["name"], child: childSerializer(item["child"]) };
}

export function parentDeserializer(item: any): Parent {
  return {
    name: item["name"],
    child: childDeserializer(item["child"]),
  };
}

/** model interface Child */
export interface Child {
  readonly id: string;
  value: string;
}

export function childSerializer(item: Child): any {
  return { value: item["value"] };
}

export function childDeserializer(item: any): Child {
  return {
    id: item["id"],
    value: item["value"],
  };
}

/** model interface ParentCreate */
export interface ParentCreate {
  name: string;
  child: ChildCreate;
}

export function parentCreateSerializer(item: ParentCreate): any {
  return { name: item["name"], child: childCreateSerializer(item["child"]) };
}

/** model interface ChildCreate */
export interface ChildCreate {
  value: string;
}

export function childCreateSerializer(item: ChildCreate): any {
  return { value: item["value"] };
}

/** model interface ParentCreateOrUpdate */
export interface ParentCreateOrUpdate {
  name: string;
  child: ChildCreateOrUpdate;
}

export function parentCreateOrUpdateSerializer(item: ParentCreateOrUpdate): any {
  return { name: item["name"], child: childCreateOrUpdateSerializer(item["child"]) };
}

/** model interface ChildCreateOrUpdate */
export interface ChildCreateOrUpdate {
  value: string;
}

export function childCreateOrUpdateSerializer(item: ChildCreateOrUpdate): any {
  return { value: item["value"] };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  Parent,
  parentDeserializer,
  ParentCreate,
  parentCreateSerializer,
  ParentCreateOrUpdate,
  parentCreateOrUpdateSerializer,
} from "../models/models.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import { ReplaceParentOptionalParams, CreateParentOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _replaceParentSend(
  context: Client,
  parentName: string,
  body: ParentCreateOrUpdate,
  options: ReplaceParentOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/parents/{parentName}",
    {
      parentName: parentName,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).put({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: parentCreateOrUpdateSerializer(body),
  });
}

export async function _replaceParentDeserialize(result: PathUncheckedResponse): Promise<Parent> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return parentDeserializer(result.body);
}

export async function replaceParent(
  context: Client,
  parentName: string,
  body: ParentCreateOrUpdate,
  options: ReplaceParentOptionalParams = { requestOptions: {} },
): Promise<Parent> {
  const result = await _replaceParentSend(context, parentName, body, options);
  return _replaceParentDeserialize(result);
}

export function _createParentSend(
  context: Client,
  body: ParentCreate,
  options: CreateParentOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/parents").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: parentCreateSerializer(body),
  });
}

export async function _createParentDeserialize(result: PathUncheckedResponse): Promise<Parent> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return parentDeserializer(result.body);
}

export async function createParent(
  context: Client,
  body: ParentCreate,
  options: CreateParentOptionalParams = { requestOptions: {} },
): Promise<Parent> {
  const result = await _createParentSend(context, body, options);
  return _createParentDeserialize(result);
}
```

## Classic Client

```ts classicClient
import { replaceParent, createParent } from "./api/operations.js";
import { ReplaceParentOptionalParams, CreateParentOptionalParams } from "./api/options.js";
import { Parent, ParentCreate, ParentCreateOrUpdate } from "./models/models.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { TestingClientOptionalParams } from "./api/testingContext.js";

export class TestingClient {
  private _client: TestingContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: TestingClientOptionalParams = {}) {
    this._client = createTesting(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  replaceParent(
    parentName: string,
    body: ParentCreateOrUpdate,
    options: ReplaceParentOptionalParams = { requestOptions: {} },
  ): Promise<Parent> {
    return replaceParent(this._client, parentName, body, options);
  }

  createParent(
    body: ParentCreate,
    options: CreateParentOptionalParams = { requestOptions: {} },
  ): Promise<Parent> {
    return createParent(this._client, body, options);
  }
}
```

# Preserve user models when projected names collide

Verifies that an existing user model keeps its name while the generated visibility projection receives a valid fallback name.

## TypeSpec

```tsp
model Widget {
  @visibility(Lifecycle.Read)
  id: string;

  displayName: string;
}

model WidgetCreate {
  foo: string;
  bar: int32;
}

@route("/widgets")
@post
op createWidget(@body body: Widget): Widget;

@route("/others")
@post
op createOther(@body body: WidgetCreate): WidgetCreate;
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
}

export function widgetSerializer(item: Widget): any {
  return { displayName: item["displayName"] };
}

export function widgetDeserializer(item: any): Widget {
  return {
    id: item["id"],
    displayName: item["displayName"],
  };
}

/** model interface WidgetCreate */
export interface WidgetCreate {
  foo: string;
  bar: number;
}

export function widgetCreateSerializer(item: WidgetCreate): any {
  return { foo: item["foo"], bar: item["bar"] };
}

export function widgetCreateDeserializer(item: any): WidgetCreate {
  return {
    foo: item["foo"],
    bar: item["bar"],
  };
}

/** model interface WidgetCreate */
export interface WidgetCreate_1 {
  displayName: string;
}

export function widgetCreateSerializer_1(item: WidgetCreate_1): any {
  return { displayName: item["displayName"] };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  Widget,
  widgetDeserializer,
  WidgetCreate,
  widgetCreateSerializer,
  widgetCreateDeserializer,
  WidgetCreate_1,
  widgetCreateSerializer_1,
} from "../models/models.js";
import { CreateOtherOptionalParams, CreateWidgetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createOtherSend(
  context: Client,
  body: WidgetCreate,
  options: CreateOtherOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/others").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: widgetCreateSerializer(body),
  });
}

export async function _createOtherDeserialize(
  result: PathUncheckedResponse,
): Promise<WidgetCreate> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return widgetCreateDeserializer(result.body);
}

export async function createOther(
  context: Client,
  body: WidgetCreate,
  options: CreateOtherOptionalParams = { requestOptions: {} },
): Promise<WidgetCreate> {
  const result = await _createOtherSend(context, body, options);
  return _createOtherDeserialize(result);
}

export function _createWidgetSend(
  context: Client,
  body: WidgetCreate_1,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/widgets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: widgetCreateSerializer_1(body),
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
  body: WidgetCreate_1,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _createWidgetSend(context, body, options);
  return _createWidgetDeserialize(result);
}
```

## Classic Client

```ts classicClient
import { createOther, createWidget } from "./api/operations.js";
import { CreateOtherOptionalParams, CreateWidgetOptionalParams } from "./api/options.js";
import { Widget, WidgetCreate, WidgetCreate_1 } from "./models/models.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { TestingClientOptionalParams } from "./api/testingContext.js";

export class TestingClient {
  private _client: TestingContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: TestingClientOptionalParams = {}) {
    this._client = createTesting(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  createOther(
    body: WidgetCreate,
    options: CreateOtherOptionalParams = { requestOptions: {} },
  ): Promise<WidgetCreate> {
    return createOther(this._client, body, options);
  }

  createWidget(
    body: WidgetCreate_1,
    options: CreateWidgetOptionalParams = { requestOptions: {} },
  ): Promise<Widget> {
    return createWidget(this._client, body, options);
  }
}
```
