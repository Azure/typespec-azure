# Apply visibility to standard ARM resource operations

Verifies that standard ARM operation templates use projected request models while resource responses retain read-only properties.

## TypeSpec

```tsp
@armProviderNamespace
@service(#{ title: "Visibility ARM Service" })
namespace Microsoft.Visibility;

model WidgetProperties {
  displayName: string;

  @visibility(Lifecycle.Read)
  provisioningState?: string;
}

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrReplace is ArmResourceCreateOrReplaceSync<Widget>;
  update is ArmResourcePatchSync<Widget, WidgetProperties>;
  delete is ArmResourceDeleteSync<Widget>;
}
```

## Configuration

```yaml
needArmTemplate: true
needNamespaces: false
mustEmptyDiagnostic: false
experimentalSplitModelsByVisibility: true
hierarchy-client: false
azureArm: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** Concrete tracked resource types can be created by aliasing this type using a specific property type. */
export interface Widget extends TrackedResource {
  /** The resource-specific properties for this resource. */
  properties?: WidgetProperties;
}

export function widgetSerializer(item: Widget): any {
  return {
    tags: item["tags"],
    location: item["location"],
    properties: !item["properties"]
      ? item["properties"]
      : widgetPropertiesSerializer(item["properties"]),
  };
}

export function widgetDeserializer(item: any): Widget {
  return {
    tags: !item["tags"]
      ? item["tags"]
      : Object.fromEntries(Object.entries(item["tags"]).map(([k, p]: [string, any]) => [k, p])),
    location: item["location"],
    id: item["id"],
    name: item["name"],
    type: item["type"],
    systemData: !item["systemData"]
      ? item["systemData"]
      : systemDataDeserializer(item["systemData"]),
    properties: !item["properties"]
      ? item["properties"]
      : widgetPropertiesDeserializer(item["properties"]),
  };
}

/** model interface WidgetProperties */
export interface WidgetProperties {
  displayName: string;
  readonly provisioningState?: string;
}

export function widgetPropertiesSerializer(item: WidgetProperties): any {
  return { displayName: item["displayName"] };
}

export function widgetPropertiesDeserializer(item: any): WidgetProperties {
  return {
    displayName: item["displayName"],
    provisioningState: item["provisioningState"],
  };
}

/** The resource model definition for an Azure Resource Manager tracked top level resource which has 'tags' and a 'location' */
export interface TrackedResource extends Resource {
  /** Resource tags. */
  tags?: Record<string, string>;
  /** The geo-location where the resource lives */
  location: string;
}

export function trackedResourceSerializer(item: TrackedResource): any {
  return { tags: item["tags"], location: item["location"] };
}

export function trackedResourceDeserializer(item: any): TrackedResource {
  return {
    id: item["id"],
    name: item["name"],
    type: item["type"],
    systemData: !item["systemData"]
      ? item["systemData"]
      : systemDataDeserializer(item["systemData"]),
    tags: !item["tags"]
      ? item["tags"]
      : Object.fromEntries(Object.entries(item["tags"]).map(([k, p]: [string, any]) => [k, p])),
    location: item["location"],
  };
}

/** Common fields that are returned in the response for all Azure Resource Manager resources */
export interface Resource {
  /** Fully qualified resource ID for the resource. Ex - /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProviderNamespace}/{resourceType}/{resourceName} */
  readonly id?: string;
  /** The name of the resource */
  readonly name?: string;
  /** The type of the resource. E.g. "Microsoft.Compute/virtualMachines" or "Microsoft.Storage/storageAccounts" */
  readonly type?: string;
  /** Azure Resource Manager metadata containing createdBy and modifiedBy information. */
  readonly systemData?: SystemData;
}

export function resourceSerializer(_item: Resource): any {
  return {};
}

export function resourceDeserializer(item: any): Resource {
  return {
    id: item["id"],
    name: item["name"],
    type: item["type"],
    systemData: !item["systemData"]
      ? item["systemData"]
      : systemDataDeserializer(item["systemData"]),
  };
}

/** Metadata pertaining to creation and last modification of the resource. */
export interface SystemData {
  /** The identity that created the resource. */
  createdBy?: string;
  /** The type of identity that created the resource. */
  createdByType?: CreatedByType;
  /** The timestamp of resource creation (UTC). */
  createdAt?: Date;
  /** The identity that last modified the resource. */
  lastModifiedBy?: string;
  /** The type of identity that last modified the resource. */
  lastModifiedByType?: CreatedByType;
  /** The timestamp of resource last modification (UTC) */
  lastModifiedAt?: Date;
}

export function systemDataDeserializer(item: any): SystemData {
  return {
    createdBy: item["createdBy"],
    createdByType: item["createdByType"],
    createdAt: !item["createdAt"] ? item["createdAt"] : new Date(item["createdAt"]),
    lastModifiedBy: item["lastModifiedBy"],
    lastModifiedByType: item["lastModifiedByType"],
    lastModifiedAt: !item["lastModifiedAt"]
      ? item["lastModifiedAt"]
      : new Date(item["lastModifiedAt"]),
  };
}

/** The kind of entity that created the resource. */
export type CreatedByType = "User" | "Application" | "ManagedIdentity" | "Key";

/** Common error response for all Azure Resource Manager APIs to return error details for failed operations. */
export interface ErrorResponse {
  /** The error object. */
  error?: ErrorDetail;
}

export function errorResponseDeserializer(item: any): ErrorResponse {
  return {
    error: !item["error"] ? item["error"] : errorDetailDeserializer(item["error"]),
  };
}

/** The error detail. */
export interface ErrorDetail {
  /** The error code. */
  readonly code?: string;
  /** The error message. */
  readonly message?: string;
  /** The error target. */
  readonly target?: string;
  /** The error details. */
  readonly details?: ErrorDetail[];
  /** The error additional info. */
  readonly additionalInfo?: ErrorAdditionalInfo[];
}

export function errorDetailDeserializer(item: any): ErrorDetail {
  return {
    code: item["code"],
    message: item["message"],
    target: item["target"],
    details: !item["details"] ? item["details"] : errorDetailArrayDeserializer(item["details"]),
    additionalInfo: !item["additionalInfo"]
      ? item["additionalInfo"]
      : errorAdditionalInfoArrayDeserializer(item["additionalInfo"]),
  };
}

export function errorDetailArrayDeserializer(result: Array<ErrorDetail>): any[] {
  return result.map((item) => {
    return errorDetailDeserializer(item);
  });
}

export function errorAdditionalInfoArrayDeserializer(result: Array<ErrorAdditionalInfo>): any[] {
  return result.map((item) => {
    return errorAdditionalInfoDeserializer(item);
  });
}

/** The resource management error additional info. */
export interface ErrorAdditionalInfo {
  /** The additional info type. */
  readonly type?: string;
  /** The additional info. */
  readonly info?: any;
}

export function errorAdditionalInfoDeserializer(item: any): ErrorAdditionalInfo {
  return {
    type: item["type"],
    info: item["info"],
  };
}

/** Concrete tracked resource types can be created by aliasing this type using a specific property type. */
export interface WidgetCreateOrUpdate extends TrackedResourceCreateOrUpdate {
  /** The resource-specific properties for this resource. */
  properties?: WidgetPropertiesCreateOrUpdate;
}

export function widgetCreateOrUpdateSerializer(item: WidgetCreateOrUpdate): any {
  return {
    tags: item["tags"],
    location: item["location"],
    properties: !item["properties"]
      ? item["properties"]
      : widgetPropertiesCreateOrUpdateSerializer(item["properties"]),
  };
}

/** model interface WidgetPropertiesCreateOrUpdate */
export interface WidgetPropertiesCreateOrUpdate {
  displayName: string;
}

export function widgetPropertiesCreateOrUpdateSerializer(
  item: WidgetPropertiesCreateOrUpdate,
): any {
  return { displayName: item["displayName"] };
}

/** The resource model definition for an Azure Resource Manager tracked top level resource which has 'tags' and a 'location' */
export interface TrackedResourceCreateOrUpdate extends ResourceCreateOrUpdate {
  /** Resource tags. */
  tags?: Record<string, string>;
  /** The geo-location where the resource lives */
  location: string;
}

export function trackedResourceCreateOrUpdateSerializer(item: TrackedResourceCreateOrUpdate): any {
  return { tags: item["tags"], location: item["location"] };
}

/** Common fields that are returned in the response for all Azure Resource Manager resources */
export interface ResourceCreateOrUpdate {}

export function resourceCreateOrUpdateSerializer(_item: ResourceCreateOrUpdate): any {
  return {};
}

/** Concrete tracked resource types can be created by aliasing this type using a specific property type. */
export interface WidgetUpdate extends TrackedResourceUpdate {
  /** The resource-specific properties for this resource. */
  properties?: WidgetPropertiesUpdate;
}

export function widgetUpdateSerializer(item: WidgetUpdate): any {
  return {
    tags: item["tags"],
    properties: !item["properties"]
      ? item["properties"]
      : widgetPropertiesUpdateSerializer(item["properties"]),
  };
}

/** model interface WidgetPropertiesUpdate */
export interface WidgetPropertiesUpdate {
  displayName: string;
}

export function widgetPropertiesUpdateSerializer(item: WidgetPropertiesUpdate): any {
  return { displayName: item["displayName"] };
}

/** The resource model definition for an Azure Resource Manager tracked top level resource which has 'tags' and a 'location' */
export interface TrackedResourceUpdate extends ResourceUpdate {
  /** Resource tags. */
  tags?: Record<string, string>;
}

export function trackedResourceUpdateSerializer(item: TrackedResourceUpdate): any {
  return { tags: item["tags"] };
}

/** Common fields that are returned in the response for all Azure Resource Manager resources */
export interface ResourceUpdate {}

export function resourceUpdateSerializer(_item: ResourceUpdate): any {
  return {};
}
```

## Operations

```ts operations
import { VisibilityContext as Client } from "./index.js";
import {
  Widget,
  widgetDeserializer,
  errorResponseDeserializer,
  WidgetCreateOrUpdate,
  widgetCreateOrUpdateSerializer,
  WidgetUpdate,
  widgetUpdateSerializer,
} from "../models/models.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import {
  DeleteOptionalParams,
  UpdateOptionalParams,
  CreateOrReplaceOptionalParams,
  GetOptionalParams,
} from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _$deleteSend(
  context: Client,
  apiVersion: string,
  resourceGroupName: string,
  widgetName: string,
  options: DeleteOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Visibility/widgets/{widgetName}{?api%2Dversion}",
    {
      subscriptionId: context.subscriptionId,
      resourceGroupName: resourceGroupName,
      widgetName: widgetName,
      "api%2Dversion": apiVersion,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).delete({ ...operationOptionsToRequestParameters(options) });
}

export async function _$deleteDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["200", "204"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError(result);
    if (result.body) {
      error.details = errorResponseDeserializer(result.body);
    }

    throw error;
  }

  return;
}

/** Delete a Widget */
export async function $delete(
  context: Client,
  apiVersion: string,
  resourceGroupName: string,
  widgetName: string,
  options: DeleteOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _$deleteSend(context, apiVersion, resourceGroupName, widgetName, options);
  return _$deleteDeserialize(result);
}

export function _updateSend(
  context: Client,
  apiVersion: string,
  resourceGroupName: string,
  widgetName: string,
  properties: WidgetUpdate,
  options: UpdateOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Visibility/widgets/{widgetName}{?api%2Dversion}",
    {
      subscriptionId: context.subscriptionId,
      resourceGroupName: resourceGroupName,
      widgetName: widgetName,
      "api%2Dversion": apiVersion,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).patch({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: widgetUpdateSerializer(properties),
  });
}

export async function _updateDeserialize(result: PathUncheckedResponse): Promise<Widget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError(result);
    if (result.body) {
      error.details = errorResponseDeserializer(result.body);
    }

    throw error;
  }

  return widgetDeserializer(result.body);
}

/** Update a Widget */
export async function update(
  context: Client,
  apiVersion: string,
  resourceGroupName: string,
  widgetName: string,
  properties: WidgetUpdate,
  options: UpdateOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _updateSend(
    context,
    apiVersion,
    resourceGroupName,
    widgetName,
    properties,
    options,
  );
  return _updateDeserialize(result);
}

export function _createOrReplaceSend(
  context: Client,
  apiVersion: string,
  resourceGroupName: string,
  widgetName: string,
  resource: WidgetCreateOrUpdate,
  options: CreateOrReplaceOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Visibility/widgets/{widgetName}{?api%2Dversion}",
    {
      subscriptionId: context.subscriptionId,
      resourceGroupName: resourceGroupName,
      widgetName: widgetName,
      "api%2Dversion": apiVersion,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).put({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: widgetCreateOrUpdateSerializer(resource),
  });
}

export async function _createOrReplaceDeserialize(result: PathUncheckedResponse): Promise<Widget> {
  const expectedStatuses = ["200", "201"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError(result);
    if (result.body) {
      error.details = errorResponseDeserializer(result.body);
    }

    throw error;
  }

  return widgetDeserializer(result.body);
}

/** Create a Widget */
export async function createOrReplace(
  context: Client,
  apiVersion: string,
  resourceGroupName: string,
  widgetName: string,
  resource: WidgetCreateOrUpdate,
  options: CreateOrReplaceOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _createOrReplaceSend(
    context,
    apiVersion,
    resourceGroupName,
    widgetName,
    resource,
    options,
  );
  return _createOrReplaceDeserialize(result);
}

export function _getSend(
  context: Client,
  apiVersion: string,
  resourceGroupName: string,
  widgetName: string,
  options: GetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Visibility/widgets/{widgetName}{?api%2Dversion}",
    {
      subscriptionId: context.subscriptionId,
      resourceGroupName: resourceGroupName,
      widgetName: widgetName,
      "api%2Dversion": apiVersion,
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

export async function _getDeserialize(result: PathUncheckedResponse): Promise<Widget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError(result);
    if (result.body) {
      error.details = errorResponseDeserializer(result.body);
    }

    throw error;
  }

  return widgetDeserializer(result.body);
}

/** Get a Widget */
export async function get(
  context: Client,
  apiVersion: string,
  resourceGroupName: string,
  widgetName: string,
  options: GetOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _getSend(context, apiVersion, resourceGroupName, widgetName, options);
  return _getDeserialize(result);
}
```
