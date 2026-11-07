# Should keep optional query param name when exact clientName is applied to a reserved keyword

## Typespec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service
namespace Test;

interface Test {
  @route("/test")
  patch(@query("type") type?: string): void;
}

#suppress "experimental-feature" "exact name test"
@@clientName(Test.patch::parameters.type, exact("type"));
```

This is the tspconfig.yaml.

```yaml
withRawContent: true
mustEmptyDiagnostic: false
experimental-extensible-enums: true
```

## Operations Options

```ts models:withOptions interface PatchOptionalParams
export interface PatchOptionalParams extends OperationOptions {
  type?: string;
}
```

## Operations

```ts operations
import { TestContext as Client } from "./index.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import { PatchOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _patchSend(
  context: Client,
  options: PatchOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/test{?type}",
    {
      type: options?.type,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).get({ ...operationOptionsToRequestParameters(options) });
}

export async function _patchDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function patch(
  context: Client,
  options: PatchOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _patchSend(context, options);
  return _patchDeserialize(result);
}
```

# Should keep optional header param name when exact clientName is applied to a reserved keyword

## Typespec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service
namespace Test;

interface Test {
  @route("/test")
  patch(@header("type") type?: string): void;
}

#suppress "experimental-feature" "exact name test"
@@clientName(Test.patch::parameters.type, exact("type"));
```

This is the tspconfig.yaml.

```yaml
withRawContent: true
mustEmptyDiagnostic: false
experimental-extensible-enums: true
```

## Operations Options

```ts models:withOptions interface PatchOptionalParams
export interface PatchOptionalParams extends OperationOptions {
  type?: string;
}
```

## Operations

```ts operations function _patchSend
export function _patchSend(
  context: Client,
  options: PatchOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/test").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      ...(options?.type !== undefined ? { type: options?.type } : {}),
      ...options.requestOptions?.headers,
    },
  });
}
```

# Should keep optional body param name when exact clientName is applied to a reserved keyword

## Typespec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service
namespace Test;

interface Test {
  @route("/test")
  patch(@body type?: string): void;
}

#suppress "experimental-feature" "exact name test"
@@clientName(Test.patch::parameters.type, exact("type"));
```

This is the tspconfig.yaml.

```yaml
withRawContent: true
mustEmptyDiagnostic: false
experimental-extensible-enums: true
```

## Operations Options

```ts models:withOptions interface PatchOptionalParams
export interface PatchOptionalParams extends OperationOptions {
  type?: string;
}
```

## Operations

```ts operations function _patchSend
export function _patchSend(
  context: Client,
  options: PatchOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/test").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "text/plain",
    body: !options?.type ? options?.type : options?.type,
  });
}
```
