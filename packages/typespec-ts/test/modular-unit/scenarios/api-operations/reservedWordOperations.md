# should generate reserved words operation with prefix $ continue

## TypeSpec

```tsp
model Test {
  result: string;
}
op continue(): Test;
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import { Test, testDeserializer } from "../models/models.js";
import { ContinueOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _$continueSend(
  context: Client,
  options: ContinueOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: { accept: "application/json", ...options.requestOptions?.headers },
  });
}

export async function _$continueDeserialize(result: PathUncheckedResponse): Promise<Test> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return testDeserializer(result.body);
}
/**
 *  @fixme continue is a reserved word that cannot be used as an operation name.
 *         Please add @clientName("clientName") or @clientName("<JS-Specific-Name>", "javascript")
 *         to the operation to override the generated name.
 */
export async function $continue(
  context: Client,
  options: ContinueOptionalParams = { requestOptions: {} },
): Promise<Test> {
  const result = await _$continueSend(context, options);
  return _$continueDeserialize(result);
}
```

# should generate reserved words operation with prefix $ return

## TypeSpec

```tsp
model Test {
  result: string;
}
op `return`(): Test;
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import { Test, testDeserializer } from "../models/models.js";
import { ReturnOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _$returnSend(
  context: Client,
  options: ReturnOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: { accept: "application/json", ...options.requestOptions?.headers },
  });
}

export async function _$returnDeserialize(result: PathUncheckedResponse): Promise<Test> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return testDeserializer(result.body);
}
/**
 *  @fixme return is a reserved word that cannot be used as an operation name.
 *         Please add @clientName("clientName") or @clientName("<JS-Specific-Name>", "javascript")
 *         to the operation to override the generated name.
 */
export async function $return(
  context: Client,
  options: ReturnOptionalParams = { requestOptions: {} },
): Promise<Test> {
  const result = await _$returnSend(context, options);
  return _$returnDeserialize(result);
}
```

# should generate reserved words operation global

## TypeSpec

```tsp
model Test {
  result: string;
}
op global(): Test;
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import { Test, testDeserializer } from "../models/models.js";
import { GlobalOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _globalSend(
  context: Client,
  options: GlobalOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: { accept: "application/json", ...options.requestOptions?.headers },
  });
}

export async function _globalDeserialize(result: PathUncheckedResponse): Promise<Test> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return testDeserializer(result.body);
}
export async function global(
  context: Client,
  options: GlobalOptionalParams = { requestOptions: {} },
): Promise<Test> {
  const result = await _globalSend(context, options);
  return _globalDeserialize(result);
}
```

# should rename reserved word operation using singularized operation group name

## TypeSpec

```tsp
@route("/conversations")
interface Conversations {
  @delete
  delete(@path conversationName: string): void;
}
```

```yaml
enable-operation-group: true
```

## Operations

```ts operations
import { TestingContext as Client } from "../index.js";
import { expandUrlTemplate } from "../../static-helpers/urlTemplate.js";
import { ConversationsDeleteOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _deleteConversationSend(
  context: Client,
  conversationName: string,
  options: ConversationsDeleteOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/conversations/{conversationName}",
    {
      conversationName: conversationName,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).delete({ ...operationOptionsToRequestParameters(options) });
}

export async function _deleteConversationDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}
export async function deleteConversation(
  context: Client,
  conversationName: string,
  options: ConversationsDeleteOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _deleteConversationSend(context, conversationName, options);
  return _deleteConversationDeserialize(result);
}
```

# should preserve reserved word operation name when an explicit @clientName override is set

When the user explicitly names a reserved-word operation via `@clientName`, the emitter treats
it as an intentional choice: it does not disambiguate the name with the operation group and does
not emit a `@fixme`. The public method keeps the reserved word (`delete`), while the generated
API-layer function stays guarded (`$delete`) because a reserved word is not a valid function
binding in JavaScript.

## TypeSpec

```tsp
@route("/conversations")
interface Conversations {
  @delete
  @clientName("delete")
  delete(@path conversationName: string): void;
}
```

```yaml
enable-operation-group: true
needTCGC: true
```

## Operations

```ts operations
import { TestingContext as Client } from "../index.js";
import { expandUrlTemplate } from "../../static-helpers/urlTemplate.js";
import { ConversationsDeleteOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _$deleteSend(
  context: Client,
  conversationName: string,
  options: ConversationsDeleteOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/conversations/{conversationName}",
    {
      conversationName: conversationName,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).delete({ ...operationOptionsToRequestParameters(options) });
}

export async function _$deleteDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}
export async function $delete(
  context: Client,
  conversationName: string,
  options: ConversationsDeleteOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _$deleteSend(context, conversationName, options);
  return _$deleteDeserialize(result);
}
```
