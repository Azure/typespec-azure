# Decimal inputs preserve descriptions and include precision guidance

## TypeSpec

```tsp
@route("/amount")
@put
@doc("Updates the stored amount.")
op update(
  @doc("The amount to store.") @body amount: decimal128,
  @doc("An optional adjustment.") @query adjustment?: decimal,
): void;
```

## Operations

The required decimal input includes precision guidance in its parameter documentation.

```ts operations
import { TestingContext as Client } from "./index.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import { UpdateOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _updateSend(
  context: Client,
  amount: number,
  options: UpdateOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/amount{?adjustment}",
    {
      adjustment: options?.adjustment,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).put({
    ...operationOptionsToRequestParameters(options),
    contentType: "text/plain",
    body: amount,
  });
}

export async function _updateDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

/**
 * Updates the stored amount.
 *
 * @param amount - The amount to store.
 * **Important:** JavaScript uses IEEE 754 floating-point arithmetic, which can introduce
 * rounding errors for decimal values (e.g., `0.1 + 0.2 !== 0.3`).
 *
 * To avoid precision issues:
 * - Use integer math for fixed-point values (e.g., represent cents instead of dollars).
 * - Or use a decimal library (e.g., `decimal.js`) for exact calculations.
 */
export async function update(
  context: Client,
  amount: number,
  options: UpdateOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _updateSend(context, amount, options);
  return _updateDeserialize(result);
}
```

## Client

The client method includes the same guidance as the standalone operation.

```ts classicClient
import { update } from "./api/operations.js";
import { UpdateOptionalParams } from "./api/options.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { TestingClientOptionalParams } from "./api/testingContext.js";

/** Client for Testing. */
export class TestingClient {
  private _client: TestingContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  /** Creates an instance of TestingClient. */
  constructor(endpointParam: string, options: TestingClientOptionalParams = {}) {
    this._client = createTesting(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  /**
   * Updates the stored amount.
   *
   * @param amount - The amount to store.
   * **Important:** JavaScript uses IEEE 754 floating-point arithmetic, which can introduce
   * rounding errors for decimal values (e.g., `0.1 + 0.2 !== 0.3`).
   *
   * To avoid precision issues:
   * - Use integer math for fixed-point values (e.g., represent cents instead of dollars).
   * - Or use a decimal library (e.g., `decimal.js`) for exact calculations.
   */
  update(amount: number, options: UpdateOptionalParams = { requestOptions: {} }): Promise<void> {
    return update(this._client, amount, options);
  }
}
```

## Options

The optional decimal input includes precision guidance on the options property.

```ts models:withOptions interface UpdateOptionalParams
export interface UpdateOptionalParams extends OperationOptions {
  /**
   * An optional adjustment.
   *
   * **Important:** JavaScript uses IEEE 754 floating-point arithmetic, which can introduce
   * rounding errors for decimal values (e.g., `0.1 + 0.2 !== 0.3`).
   *
   * To avoid precision issues:
   * - Use integer math for fixed-point values (e.g., represent cents instead of dollars).
   * - Or use a decimal library (e.g., `decimal.js`) for exact calculations.
   */
  adjustment?: number;
}
```
