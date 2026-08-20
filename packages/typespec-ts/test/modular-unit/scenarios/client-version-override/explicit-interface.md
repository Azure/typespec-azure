# An explicit interface child can use a distinct client API version

## TypeSpec

```tsp
@service(#{ title: "Versioned Service" })
@versioned(Versions)
@client({
  name: "VersionedServiceClient",
  service: VersionedService,
})
namespace VersionedService {
  enum Versions {
    v1: "2024-01-01",
    v2: "2025-01-01",
  }

  @route("/parent")
  op getParent(@query("api-version") @apiVersion serviceVersion: Versions = Versions.v2): void;

  @route("/legacy")
  @client({
    name: "LegacyOperationsClient",
    service: VersionedService,
  })
  @Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("2021-11-01")
  interface LegacyOperations {
    getLegacy(@query("api-version") @apiVersion apiVersion: Versions = Versions.v2): void;
  }

  @route("/current")
  @client({
    name: "CurrentOperationsClient",
    service: VersionedService,
  })
  interface CurrentOperations {
    getCurrent(@query("api-version") @apiVersion apiVersion: Versions = Versions.v2): void;
  }
}
```

## Config

```yaml
needTCGC: true
```

## Client context

```ts clientContext
import { logger } from "../../logger.js";
import { Client, ClientOptions, getClient } from "@azure-rest/core-client";

export interface VersionedServiceContext extends Client {
  serviceVersion?: string;
}

/** Optional parameters for the client. */
export interface VersionedServiceClientOptionalParams extends ClientOptions {
  serviceVersion?: string;
}

export function createVersionedService(
  endpointParam: string,
  options: VersionedServiceClientOptionalParams = {},
): VersionedServiceContext {
  const endpointUrl = options.endpoint ?? String(endpointParam);
  const { serviceVersion: _, ...updatedOptions } = {
    ...options,
    loggingOptions: { logger: options.loggingOptions?.logger ?? logger.info },
  };
  const clientContext = getClient(endpointUrl, undefined, updatedOptions);
  return { ...clientContext, serviceVersion } as VersionedServiceContext;
}
```

## Operations

```ts operations
import { VersionedServiceContext as Client } from "./index.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import {
  GetParentOptionalParams,
  GetCurrentOptionalParams,
  GetLegacyOptionalParams,
} from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _getParentSend(
  context: Client,
  options: GetParentOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/parent{?api%2Dversion}",
    {
      "api%2Dversion": context.serviceVersion ?? "2025-01-01",
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).get({ ...operationOptionsToRequestParameters(options) });
}

export async function _getParentDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}
export async function getParent(
  context: Client,
  options: GetParentOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _getParentSend(context, options);
  return _getParentDeserialize(result);
}

export function _getCurrentSend(
  context: Client,
  options: GetCurrentOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/current{?api%2Dversion}",
    {
      "api%2Dversion": context.serviceVersion ?? "2025-01-01",
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).get({ ...operationOptionsToRequestParameters(options) });
}

export async function _getCurrentDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}
export async function getCurrent(
  context: Client,
  options: GetCurrentOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _getCurrentSend(context, options);
  return _getCurrentDeserialize(result);
}

export function _getLegacySend(
  context: Client,
  options: GetLegacyOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/legacy{?api%2Dversion}",
    {
      "api%2Dversion": "2021-11-01",
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).get({ ...operationOptionsToRequestParameters(options) });
}

export async function _getLegacyDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}
export async function getLegacy(
  context: Client,
  options: GetLegacyOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _getLegacySend(context, options);
  return _getLegacyDeserialize(result);
}
```
