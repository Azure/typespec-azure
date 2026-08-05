# Paged result model used in both paging and non-paging operations should not have \_ prefix

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.ResourceManager;

@armProviderNamespace
@service
@versioned(Versions)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Microsoft.Test;

enum Versions {
  v2023_12_01: "2023-12-01",
}

model TestResource is TrackedResource<TestProperties> {
  @key("testName")
  @path
  @segment("tests")
  name: string;
}

model TestProperties {
  state?: string;
}

model UsageListResult {
  @nextLink
  nextLink?: string;

  @pageItems
  value?: Usage[];
}

model Usage {
  test?: string;
}

// Paging operation: uses @list so UsageListResult is treated as a paged result
interface UsagesOperationGroup {
  @autoRoute
  @get
  @action("usages")
  @list
  list is ArmProviderActionSync<
    Response = UsageListResult,
    Scope = SubscriptionActionScope,
    Parameters = {
      ...LocationParameter;
    }
  >;
}

// Non-paging operation: no @list, returns UsageListResult directly
@armResourceOperations
interface TestResources {
  @action("usages")
  listUsages is ArmResourceActionSync<
    TestResource,
    Request = void,
    Response = ArmResponse<UsageListResult>,
    BaseParameters = Azure.ResourceManager.Foundations.DefaultBaseParameters<TestResource>
  >;
}
```

```yaml
withRawContent: true
```

## ts models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/** model interface UsageListResult */
export interface UsageListResult {
  nextLink?: string;
  value?: Usage[];
}

export function usageListResultDeserializer(item: any): UsageListResult {
  return {
    nextLink: item["nextLink"],
    value: !item["value"] ? item["value"] : usageArrayDeserializer(item["value"]),
  };
}

export function usageArrayDeserializer(result: Array<Usage>): any[] {
  return result.map((item) => {
    return usageDeserializer(item);
  });
}

/** model interface Usage */
export interface Usage {
  test?: string;
}

export function usageDeserializer(item: any): Usage {
  return {
    test: item["test"],
  };
}

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

/** Known values of {@link Versions} that the service accepts. */
export enum KnownVersions {
  /** 2023-12-01 */
  V20231201 = "2023-12-01",
}
```

# Paged result model used as a model property should not have \_ prefix

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.ResourceManager;

@armProviderNamespace
@service
@versioned(Versions)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Microsoft.Test;

enum Versions {
  v2023_12_01: "2023-12-01",
}

model TestResource is TrackedResource<TestProperties> {
  @key("testName")
  @path
  @segment("tests")
  name: string;
}

model TestProperties {
  state?: string;

  /** List of language extensions. */
  languageExtensions?: LanguageExtensionsList;
}

model LanguageExtensionsList {
  @nextLink
  nextLink?: string;

  @pageItems
  @identifiers(#[])
  value?: LanguageExtension[];
}

model LanguageExtension {
  name?: string;
}

// Paging operation: uses @list so LanguageExtensionsList is treated as a paged result
@armResourceOperations
interface TestResources {
  get is ArmResourceRead<TestResource>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<TestResource>;

  @list
  listLanguageExtensions is ArmResourceActionSync<
    TestResource,
    Request = void,
    Response = ArmResponse<LanguageExtensionsList>,
    BaseParameters = Azure.ResourceManager.Foundations.DefaultBaseParameters<TestResource>
  >;
}
```

```yaml
withRawContent: true
```

## ts models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/** Concrete tracked resource types can be created by aliasing this type using a specific property type. */
export interface TestResource extends TrackedResource {
  /** The resource-specific properties for this resource. */
  properties?: TestProperties;
}

export function testResourceSerializer(item: TestResource): any {
  return {
    tags: item["tags"],
    location: item["location"],
    properties: !item["properties"]
      ? item["properties"]
      : testPropertiesSerializer(item["properties"]),
  };
}

export function testResourceDeserializer(item: any): TestResource {
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
      : testPropertiesDeserializer(item["properties"]),
  };
}

/** model interface TestProperties */
export interface TestProperties {
  state?: string;
  /** List of language extensions. */
  languageExtensions?: LanguageExtensionsList;
}

export function testPropertiesSerializer(item: TestProperties): any {
  return {
    state: item["state"],
    languageExtensions: !item["languageExtensions"]
      ? item["languageExtensions"]
      : languageExtensionsListSerializer(item["languageExtensions"]),
  };
}

export function testPropertiesDeserializer(item: any): TestProperties {
  return {
    state: item["state"],
    languageExtensions: !item["languageExtensions"]
      ? item["languageExtensions"]
      : languageExtensionsListDeserializer(item["languageExtensions"]),
  };
}

/** model interface LanguageExtensionsList */
export interface LanguageExtensionsList {
  nextLink?: string;
  value?: LanguageExtension[];
}

export function languageExtensionsListSerializer(item: LanguageExtensionsList): any {
  return {
    nextLink: item["nextLink"],
    value: !item["value"] ? item["value"] : languageExtensionArraySerializer(item["value"]),
  };
}

export function languageExtensionsListDeserializer(item: any): LanguageExtensionsList {
  return {
    nextLink: item["nextLink"],
    value: !item["value"] ? item["value"] : languageExtensionArrayDeserializer(item["value"]),
  };
}

export function languageExtensionArraySerializer(result: Array<LanguageExtension>): any[] {
  return result.map((item) => {
    return languageExtensionSerializer(item);
  });
}

export function languageExtensionArrayDeserializer(result: Array<LanguageExtension>): any[] {
  return result.map((item) => {
    return languageExtensionDeserializer(item);
  });
}

/** model interface LanguageExtension */
export interface LanguageExtension {
  name?: string;
}

export function languageExtensionSerializer(item: LanguageExtension): any {
  return { name: item["name"] };
}

export function languageExtensionDeserializer(item: any): LanguageExtension {
  return {
    name: item["name"],
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

/** Known values of {@link Versions} that the service accepts. */
export enum KnownVersions {
  /** 2023-12-01 */
  V20231201 = "2023-12-01",
}
```
