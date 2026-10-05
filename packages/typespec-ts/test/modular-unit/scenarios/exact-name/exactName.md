# Exact names for models, properties, enum members, operations, and parameters

Exact client names should be emitted without applying the TypeScript emitter's normal
name normalization.

## TypeSpec

```tsp
union OriginalEnum {
  string,

  #suppress "experimental-feature" "exact name test"
  @clientName(exact("enum_value"))
  originalValue: "original",

  #suppress "experimental-feature" "exact name test"
  @clientName(exact("enum-value"))
  punctuatedValue: "punctuated",
}

model OriginalModel {
  #suppress "experimental-feature" "exact name test"
  @clientName(exact("_my_name"))
  originalProperty: string;

  #suppress "experimental-feature" "exact name test"
  @clientName(exact("property-name"))
  punctuatedProperty: string;

  #suppress "experimental-feature" "exact name test"
  @clientName(exact("123"))
  numericProperty: string;

  #suppress "experimental-feature" "exact name test"
  @clientName(exact("property\"name"))
  quotedProperty: string;

  originalEnum: OriginalEnum;
}

model StopParameters {
  value: string;
}

model OriginalDate {
  value: string;
}

#suppress "experimental-feature" "exact name test"
@clientName(exact("my_operation"))
@route("/test")
@post
op originalOperation(
  #suppress "experimental-feature" "exact name test"
  @clientName(exact("my_parameter"))
  @query
  originalParameter: string,

  #suppress "experimental-feature" "exact name test"
  @clientName(exact("optional_parameter"))
  @query
  optionalParameter?: string,

  #suppress "experimental-feature" "exact name test"
  @clientName(exact("endpoint"))
  @query
  originalEndpoint: string,

  #suppress "experimental-feature" "exact name test"
  @clientName(exact("my_operation"))
  @query
  matchingParameter: string,

  @body body: OriginalModel,
): OriginalModel;

@route("/nested")
@post
op nestedOperation(
  body: {
    #suppress "experimental-feature" "exact name test"
    @clientName(exact("stop-parameters"))
    @bodyRoot
    stopParameters: StopParameters;
  },
): void;

@route("/date")
@post
op useDate(@body body: OriginalDate): OriginalDate;

#suppress "experimental-feature" "exact name test"
@@clientName(OriginalModel, exact("my_model"));
#suppress "experimental-feature" "exact name test"
@@clientName(OriginalDate, exact("Date"));
```

```yaml
needTCGC: true
experimental-extensible-enums: true
```

## Models

```ts models interface my_model
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface my_model */
export interface my_model {
  _my_name: string;
  "property-name": string;
  "123": string;
  'property"name': string;
  originalEnum: OriginalEnum;
}
```

```ts models interface Date
/** model interface Date */
export interface Date {
  value: string;
}
```

```ts models enum KnownOriginalEnum
/** Known values of {@link OriginalEnum} that the service accepts. */
export enum KnownOriginalEnum {
  /** original */
  enum_value = "original",
  /** punctuated */
  "enum-value" = "punctuated",
}
```

```ts models function my_modelSerializer
export function my_modelSerializer(item: my_model): any {
  return {
    originalProperty: item["_my_name"],
    punctuatedProperty: item["property-name"],
    numericProperty: item["123"],
    quotedProperty: item['property"name'],
    originalEnum: item["originalEnum"],
  };
}
```

```ts models function my_modelDeserializer
export function my_modelDeserializer(item: any): my_model {
  return {
    _my_name: item["originalProperty"],
    "property-name": item["punctuatedProperty"],
    "123": item["numericProperty"],
    'property"name': item["quotedProperty"],
    originalEnum: item["originalEnum"],
  };
}
```

## Operation options

```ts models:withOptions interface my_operationOptionalParams
export interface my_operationOptionalParams extends OperationOptions {
  optional_parameter?: string;
}
```

## Operations

```ts operations function my_operation
export async function my_operation(
  context: Client,
  my_parameter: string,
  endpoint: string,
  my_operation: string,
  body: my_model,
  options: my_operationOptionalParams = { requestOptions: {} },
): Promise<my_model> {
  const result = await _my_operationSend(
    context,
    my_parameter,
    endpoint,
    my_operation,
    body,
    options,
  );
  return _my_operationDeserialize(result);
}
```

```ts operations function nestedOperation
export async function nestedOperation(
  context: Client,
  body: {
    "stop-parameters": StopParameters;
  },
  options: NestedOperationOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _nestedOperationSend(context, body, options);
  return _nestedOperationDeserialize(result);
}
```

## Classic client

```ts classicClient
import { useDate, nestedOperation, my_operation } from "./api/operations.js";
import {
  UseDateOptionalParams,
  NestedOperationOptionalParams,
  my_operationOptionalParams,
} from "./api/options.js";
import { my_model, StopParameters, Date } from "./models/models.js";
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

  useDate(body: Date, options: UseDateOptionalParams = { requestOptions: {} }): Promise<Date> {
    return useDate(this._client, body, options);
  }

  nestedOperation(
    body: {
      "stop-parameters": StopParameters;
    },
    options: NestedOperationOptionalParams = { requestOptions: {} },
  ): Promise<void> {
    return nestedOperation(this._client, body, options);
  }

  my_operation(
    my_parameter: string,
    endpoint: string,
    my_operation: string,
    body: my_model,
    options: my_operationOptionalParams = { requestOptions: {} },
  ): Promise<my_model> {
    return my_operation(this._client, my_parameter, endpoint, my_operation, body, options);
  }
}
```

# Exact names for operation groups

Exact operation and operation-group names should be preserved in both the modular and
classic clients. Reserved operation names should only be escaped where TypeScript syntax
requires it.

## TypeSpec

```tsp
namespace Operations {
  #suppress "experimental-feature" "exact name test"
  @clientName(exact("my_operation"))
  @route("/test")
  @get
  op originalOperation(): void;

  #suppress "experimental-feature" "exact name test"
  @clientName(exact("class"))
  @route("/contextual")
  @get
  op contextualOperation(): void;
}

#suppress "experimental-feature" "exact name test"
@@clientName(Operations, exact("my_group"));
```

```yaml
needTCGC: true
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import { classOptionalParams, my_operationOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _$classSend(
  context: Client,
  options: classOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/contextual").get({ ...operationOptionsToRequestParameters(options) });
}

export async function _$classDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function $class(
  context: Client,
  options: classOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _$classSend(context, options);
  return _$classDeserialize(result);
}

export function _my_operationSend(
  context: Client,
  options: my_operationOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/test").get({ ...operationOptionsToRequestParameters(options) });
}

export async function _my_operationDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function my_operation(
  context: Client,
  options: my_operationOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _my_operationSend(context, options);
  return _my_operationDeserialize(result);
}
```

## Classic client

```ts classicClient
import { my_groupOperations, _getmy_groupOperations } from "./classic/my_group/index.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { TestingClientOptionalParams } from "./api/testingContext.js";

export class TestingClient {
  private _client: TestingContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: TestingClientOptionalParams = {}) {
    this._client = createTesting(endpointParam, options);
    this.pipeline = this._client.pipeline;
    this.my_group = _getmy_groupOperations(this._client);
  }

  /** The operation groups for my_group */
  public readonly my_group: my_groupOperations;
}
```

```ts classicOperations interface my_groupOperations
/** Interface representing a my_group operations. */
export interface my_groupOperations {
  class: (options?: my_groupclassOptionalParams) => Promise<void>;
  my_operation: (options?: my_operationOptionalParams) => Promise<void>;
}
```

# Nested exact operation groups

Nested operation groups with the same exact root name should add only one property to the
classic client.

## TypeSpec

```tsp
namespace Operations {
  @route("/direct")
  @get
  op directOperation(): void;

  namespace ChildOne {
    @route("/child-one")
    @get
    op childOneOperation(): void;
  }

  namespace ChildTwo {
    @route("/child-two")
    @get
    op childTwoOperation(): void;
  }
}

#suppress "experimental-feature" "exact name test"
@@clientName(Operations, exact("my_group"));
```

```yaml
needTCGC: true
```

## Classic client

```ts classicClient
import { my_groupOperations, _getmy_groupOperations } from "./classic/my_group/index.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { TestingClientOptionalParams } from "./api/testingContext.js";

export class TestingClient {
  private _client: TestingContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: TestingClientOptionalParams = {}) {
    this._client = createTesting(endpointParam, options);
    this.pipeline = this._client.pipeline;
    this.my_group = _getmy_groupOperations(this._client);
  }

  /** The operation groups for my_group */
  public readonly my_group: my_groupOperations;
}
```

# Exact client name

An exact client name should be emitted without normalization.

## TypeSpec

```tsp
@route("/test")
@get
op test(): void;

#suppress "experimental-feature" "exact name test"
@@clientName(Azure.TypeScript.Testing, exact("my_client"));
```

```yaml
needTCGC: true
```

## Classic client

```ts classicClient
import { test } from "./api/operations.js";
import { TestOptionalParams } from "./api/options.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { my_clientOptionalParams } from "./api/myClientContext.js";

export class my_client {
  private _client: my_clientContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: my_clientOptionalParams = {}) {
    this._client = createmy_client(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  test(options: TestOptionalParams = { requestOptions: {} }): Promise<void> {
    return test(this._client, options);
  }
}
```

# Exact property names in generated examples

Generated samples and tests should map wire example keys to escaped exact client property
names.

## TypeSpec

```tsp
model ExampleModel {
  #suppress "experimental-feature" "exact name test"
  @encodedName("application/json", "wireName")
  @clientName(exact("property\"name"))
  originalProperty: string;
}

@route("/example")
@post
op create(@body body: ExampleModel): ExampleModel;
```

```yaml
needTCGC: true
```

## Example

```json for create
{
  "title": "create",
  "operationId": "create",
  "parameters": {
    "body": {
      "wireName": "request value"
    }
  },
  "responses": {
    "200": {
      "body": {
        "wireName": "response value"
      }
    }
  }
}
```

## Sample

```ts samples
/** This file path is /samples-dev/createSample.ts */
import { TestingClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to execute create
 *
 * @summary execute create
 * x-ms-original-file: 2021-10-01-preview/json_for_create.json
 */
async function create(): Promise<void> {
  const endpoint = process.env.TESTING_ENDPOINT || "";
  const client = new TestingClient(endpoint);
  const result = await client.create({ 'property"name': "request value" });
  console.log(result);
}

async function main(): Promise<void> {
  await create();
}

main().catch(console.error);
```

## Test

```ts tests
/** This file path is /test/generated/createTest.spec.ts */

import { TestingClient } from "../../src/index.js";
import { createRecorder } from "./util/recordedClient.js";
import { Recorder } from "@azure-tools/test-recorder";
import { assert, beforeEach, afterEach, it, describe } from "vitest";

describe("test create", () => {
  let recorder: Recorder;
  let client: TestingClient;

  beforeEach(async function (ctx) {
    recorder = await createRecorder(ctx);
    const endpoint = process.env.TESTING_ENDPOINT || "";
    const clientOptions = recorder.configureClientOptions({});
    client = new TestingClient(endpoint, clientOptions);
  });

  afterEach(async function () {
    await recorder.stop();
  });

  it("should execute create for create", async function () {
    const result = await client.create({ 'property"name': "request value" });
    assert.ok(result);
    assert.strictEqual(result['property"name'], "response value");
  });
});
```

# Exact model names with model namespaces

When model namespaces are enabled, the namespace prefix should be normalized independently
while the exact model name remains unchanged.

## TypeSpec

```tsp
namespace Models {
  model OriginalModel {
    value: string;
  }
}

@route("/model")
@post
op useModel(@body body: Models.OriginalModel): Models.OriginalModel;

#suppress "experimental-feature" "exact name test"
@@clientName(Models.OriginalModel, exact("my_model"));
```

```yaml
needTCGC: true
enableModelNamespace: true
```

## Models

```ts models interface Modelsmy_model
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Modelsmy_model */
export interface Modelsmy_model {
  value: string;
}
```
