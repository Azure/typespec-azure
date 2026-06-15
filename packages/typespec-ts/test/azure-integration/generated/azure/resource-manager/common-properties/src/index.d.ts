import type { Client } from '@azure-rest/core-client';
import type { ClientOptions } from '@azure-rest/core-client';
import type { HttpResponse } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import type { RequestParameters } from '@azure-rest/core-client';
import { RestError } from '@azure/core-rest-pipeline';
import type { StreamableMethod } from '@azure-rest/core-client';

export declare interface ApiErrorBaseOutput {
    code?: string;
    target?: string;
    message?: string;
}

export declare interface ApiErrorOutput {
    details?: Array<ApiErrorBaseOutput>;
    innererror?: InnerErrorOutput;
    code?: string;
    target?: string;
    message?: string;
}

export declare interface ArmResourceIdentifierResource extends TrackedResource {
    properties?: ArmResourceIdentifierResourceProperties;
}

export declare interface ArmResourceIdentifierResourceOutput extends TrackedResourceOutput {
    properties?: ArmResourceIdentifierResourcePropertiesOutput;
}

export declare interface ArmResourceIdentifierResourceProperties {
    simpleArmId: string;
    armIdWithType: string;
    armIdWithTypeAndScope: string;
    armIdWithAllScopes: string;
}

export declare interface ArmResourceIdentifierResourcePropertiesOutput {
    readonly provisioningState: ResourceProvisioningStateOutput;
    simpleArmId: string;
    armIdWithType: string;
    armIdWithTypeAndScope: string;
    armIdWithAllScopes: string;
}

export declare interface ArmResourceIdentifiersCreateOrReplace200Response extends HttpResponse {
    status: "200";
    body: ArmResourceIdentifierResourceOutput;
}

export declare interface ArmResourceIdentifiersCreateOrReplace201Response extends HttpResponse {
    status: "201";
    body: ArmResourceIdentifierResourceOutput;
}

export declare interface ArmResourceIdentifiersCreateOrReplaceBodyParam {
    body: ArmResourceIdentifierResource;
}

export declare interface ArmResourceIdentifiersCreateOrReplaceDefaultResponse extends HttpResponse {
    status: string;
    body: ErrorResponseOutput;
}

export declare type ArmResourceIdentifiersCreateOrReplaceParameters = ArmResourceIdentifiersCreateOrReplaceBodyParam & RequestParameters;

export declare interface ArmResourceIdentifiersGet {
    get(options?: ArmResourceIdentifiersGetParameters): StreamableMethod<ArmResourceIdentifiersGet200Response | ArmResourceIdentifiersGetDefaultResponse>;
    put(options: ArmResourceIdentifiersCreateOrReplaceParameters): StreamableMethod<ArmResourceIdentifiersCreateOrReplace200Response | ArmResourceIdentifiersCreateOrReplace201Response | ArmResourceIdentifiersCreateOrReplaceDefaultResponse>;
}

export declare interface ArmResourceIdentifiersGet200Response extends HttpResponse {
    status: "200";
    body: ArmResourceIdentifierResourceOutput;
}

export declare interface ArmResourceIdentifiersGetDefaultResponse extends HttpResponse {
    status: string;
    body: ErrorResponseOutput;
}

export declare type ArmResourceIdentifiersGetParameters = RequestParameters;

export declare type AzureArmModelsCommonTypesManagedIdentityClient = Client & {
    path: Routes;
};

export declare interface AzureArmModelsCommonTypesManagedIdentityClientOptions extends ClientOptions {
    apiVersion?: string;
}

export declare interface AzureEntityResource extends Resource {
}

export declare interface AzureEntityResourceOutput extends ResourceOutput {
    readonly etag?: string;
}

export declare interface CloudErrorOutput {
    error?: ApiErrorOutput;
}

export declare interface ConfidentialResource extends TrackedResource {
    properties?: ConfidentialResourceProperties;
}

export declare interface ConfidentialResourceOutput extends TrackedResourceOutput {
    properties?: ConfidentialResourcePropertiesOutput;
}

export declare interface ConfidentialResourceProperties {
    username: string;
}

export declare interface ConfidentialResourcePropertiesOutput {
    readonly provisioningState: string;
    username: string;
}

declare function createClient({ apiVersion, ...options }?: AzureArmModelsCommonTypesManagedIdentityClientOptions): AzureArmModelsCommonTypesManagedIdentityClient;
export default createClient;

export declare type CreatedByType = string;

export declare type CreatedByTypeOutput = string;

export declare interface ErrorAdditionalInfoOutput {
    readonly type?: string;
    readonly info?: any;
}

export declare interface ErrorDetailOutput {
    readonly code?: string;
    readonly message?: string;
    readonly target?: string;
    readonly details?: Array<ErrorDetailOutput>;
    readonly additionalInfo?: Array<ErrorAdditionalInfoOutput>;
}

export declare interface ErrorModelCreateForUserDefinedError200Response extends HttpResponse {
    status: "200";
    body: ConfidentialResourceOutput;
}

export declare interface ErrorModelCreateForUserDefinedError201Response extends HttpResponse {
    status: "201";
    body: ConfidentialResourceOutput;
}

export declare interface ErrorModelCreateForUserDefinedErrorBodyParam {
    body: ConfidentialResource;
}

export declare interface ErrorModelCreateForUserDefinedErrorDefaultResponse extends HttpResponse {
    status: string;
    body: CloudErrorOutput;
}

export declare type ErrorModelCreateForUserDefinedErrorParameters = ErrorModelCreateForUserDefinedErrorBodyParam & RequestParameters;

export declare interface ErrorModelGetForPredefinedError {
    get(options?: ErrorModelGetForPredefinedErrorParameters): StreamableMethod<ErrorModelGetForPredefinedError200Response | ErrorModelGetForPredefinedErrorDefaultResponse>;
    put(options: ErrorModelCreateForUserDefinedErrorParameters): StreamableMethod<ErrorModelCreateForUserDefinedError200Response | ErrorModelCreateForUserDefinedError201Response | ErrorModelCreateForUserDefinedErrorDefaultResponse>;
}

export declare interface ErrorModelGetForPredefinedError200Response extends HttpResponse {
    status: "200";
    body: ConfidentialResourceOutput;
}

export declare interface ErrorModelGetForPredefinedErrorDefaultResponse extends HttpResponse {
    status: string;
    body: ErrorResponseOutput;
}

export declare type ErrorModelGetForPredefinedErrorParameters = RequestParameters;

export declare interface ErrorResponseOutput {
    error?: ErrorDetailOutput;
}

export declare interface ExtensionResource extends Resource {
}

export declare interface ExtensionResourceOutput extends ResourceOutput {
}

export declare interface Identity {
    type?: ResourceIdentityType;
}

export declare interface IdentityOutput {
    readonly principalId?: string;
    readonly tenantId?: string;
    type?: ResourceIdentityTypeOutput;
}

export declare interface InnerErrorOutput {
    exceptiontype?: string;
    errordetail?: string;
}

export { isRestError }

export declare function isUnexpected(response: ManagedIdentityGet200Response | ManagedIdentityGetDefaultResponse): response is ManagedIdentityGetDefaultResponse;

export declare function isUnexpected(response: ManagedIdentityCreateWithSystemAssigned200Response | ManagedIdentityCreateWithSystemAssigned201Response | ManagedIdentityCreateWithSystemAssignedDefaultResponse): response is ManagedIdentityCreateWithSystemAssignedDefaultResponse;

export declare function isUnexpected(response: ManagedIdentityUpdateWithUserAssignedAndSystemAssigned200Response | ManagedIdentityUpdateWithUserAssignedAndSystemAssignedDefaultResponse): response is ManagedIdentityUpdateWithUserAssignedAndSystemAssignedDefaultResponse;

export declare function isUnexpected(response: ErrorModelGetForPredefinedError200Response | ErrorModelGetForPredefinedErrorDefaultResponse): response is ErrorModelGetForPredefinedErrorDefaultResponse;

export declare function isUnexpected(response: ErrorModelCreateForUserDefinedError200Response | ErrorModelCreateForUserDefinedError201Response | ErrorModelCreateForUserDefinedErrorDefaultResponse): response is ErrorModelCreateForUserDefinedErrorDefaultResponse;

export declare function isUnexpected(response: ArmResourceIdentifiersGet200Response | ArmResourceIdentifiersGetDefaultResponse): response is ArmResourceIdentifiersGetDefaultResponse;

export declare function isUnexpected(response: ArmResourceIdentifiersCreateOrReplace200Response | ArmResourceIdentifiersCreateOrReplace201Response | ArmResourceIdentifiersCreateOrReplaceDefaultResponse): response is ArmResourceIdentifiersCreateOrReplaceDefaultResponse;

export declare interface ManagedIdentityCreateWithSystemAssigned200Response extends HttpResponse {
    status: "200";
    body: ManagedIdentityTrackedResourceOutput;
}

export declare interface ManagedIdentityCreateWithSystemAssigned201Response extends HttpResponse {
    status: "201";
    body: ManagedIdentityTrackedResourceOutput;
}

export declare interface ManagedIdentityCreateWithSystemAssignedBodyParam {
    body: ManagedIdentityTrackedResource;
}

export declare interface ManagedIdentityCreateWithSystemAssignedDefaultResponse extends HttpResponse {
    status: string;
    body: ErrorResponseOutput;
}

export declare type ManagedIdentityCreateWithSystemAssignedParameters = ManagedIdentityCreateWithSystemAssignedBodyParam & RequestParameters;

export declare interface ManagedIdentityGet {
    get(options?: ManagedIdentityGetParameters): StreamableMethod<ManagedIdentityGet200Response | ManagedIdentityGetDefaultResponse>;
    put(options: ManagedIdentityCreateWithSystemAssignedParameters): StreamableMethod<ManagedIdentityCreateWithSystemAssigned200Response | ManagedIdentityCreateWithSystemAssigned201Response | ManagedIdentityCreateWithSystemAssignedDefaultResponse>;
    patch(options: ManagedIdentityUpdateWithUserAssignedAndSystemAssignedParameters): StreamableMethod<ManagedIdentityUpdateWithUserAssignedAndSystemAssigned200Response | ManagedIdentityUpdateWithUserAssignedAndSystemAssignedDefaultResponse>;
}

export declare interface ManagedIdentityGet200Response extends HttpResponse {
    status: "200";
    body: ManagedIdentityTrackedResourceOutput;
}

export declare interface ManagedIdentityGetDefaultResponse extends HttpResponse {
    status: string;
    body: ErrorResponseOutput;
}

export declare type ManagedIdentityGetParameters = RequestParameters;

export declare interface ManagedIdentityTrackedResource extends TrackedResource {
    properties?: ManagedIdentityTrackedResourceProperties;
    identity?: ManagedServiceIdentity;
}

export declare interface ManagedIdentityTrackedResourceOutput extends TrackedResourceOutput {
    properties?: ManagedIdentityTrackedResourcePropertiesOutput;
    identity?: ManagedServiceIdentityOutput;
}

export declare interface ManagedIdentityTrackedResourceProperties {
}

export declare interface ManagedIdentityTrackedResourcePropertiesOutput {
    readonly provisioningState: string;
}

export declare interface ManagedIdentityUpdateWithUserAssignedAndSystemAssigned200Response extends HttpResponse {
    status: "200";
    body: ManagedIdentityTrackedResourceOutput;
}

export declare interface ManagedIdentityUpdateWithUserAssignedAndSystemAssignedBodyParam {
    body: ManagedIdentityTrackedResource;
}

export declare interface ManagedIdentityUpdateWithUserAssignedAndSystemAssignedDefaultResponse extends HttpResponse {
    status: string;
    body: ErrorResponseOutput;
}

export declare type ManagedIdentityUpdateWithUserAssignedAndSystemAssignedParameters = ManagedIdentityUpdateWithUserAssignedAndSystemAssignedBodyParam & RequestParameters;

export declare interface ManagedServiceIdentity {
    type: ManagedServiceIdentityType;
    userAssignedIdentities?: Record<string, UserAssignedIdentity>;
}

export declare interface ManagedServiceIdentityOutput {
    readonly principalId?: string;
    readonly tenantId?: string;
    type: ManagedServiceIdentityTypeOutput;
    userAssignedIdentities?: Record<string, UserAssignedIdentityOutput>;
}

export declare type ManagedServiceIdentityType = string;

export declare type ManagedServiceIdentityTypeOutput = string;

export declare interface Plan {
    name: string;
    publisher: string;
    product: string;
    promotionCode?: string;
    version?: string;
}

export declare interface PlanOutput {
    name: string;
    publisher: string;
    product: string;
    promotionCode?: string;
    version?: string;
}

export declare interface PrivateEndpoint {
}

export declare interface PrivateEndpointConnection extends Resource {
    properties?: PrivateEndpointConnectionProperties;
}

export declare interface PrivateEndpointConnectionOutput extends ResourceOutput {
    properties?: PrivateEndpointConnectionPropertiesOutput;
}

export declare interface PrivateEndpointConnectionProperties {
    privateEndpoint?: PrivateEndpoint;
    privateLinkServiceConnectionState: PrivateLinkServiceConnectionState;
}

export declare interface PrivateEndpointConnectionPropertiesOutput {
    privateEndpoint?: PrivateEndpointOutput;
    privateLinkServiceConnectionState: PrivateLinkServiceConnectionStateOutput;
    readonly provisioningState?: PrivateEndpointConnectionProvisioningStateOutput;
}

export declare type PrivateEndpointConnectionProvisioningState = string;

export declare type PrivateEndpointConnectionProvisioningStateOutput = string;

export declare interface PrivateEndpointOutput {
    readonly id?: string;
}

export declare type PrivateEndpointServiceConnectionStatus = string;

export declare type PrivateEndpointServiceConnectionStatusOutput = string;

export declare interface PrivateLinkResource extends Resource {
    properties?: PrivateLinkResourceProperties;
}

export declare interface PrivateLinkResourceOutput extends ResourceOutput {
    properties?: PrivateLinkResourcePropertiesOutput;
}

export declare interface PrivateLinkResourceProperties {
    requiredZoneNames?: string[];
}

export declare interface PrivateLinkResourcePropertiesOutput {
    readonly groupId?: string;
    readonly requiredMembers?: string[];
    requiredZoneNames?: string[];
}

export declare interface PrivateLinkServiceConnectionState {
    status?: PrivateEndpointServiceConnectionStatus;
    description?: string;
    actionsRequired?: string;
}

export declare interface PrivateLinkServiceConnectionStateOutput {
    status?: PrivateEndpointServiceConnectionStatusOutput;
    description?: string;
    actionsRequired?: string;
}

export declare interface ProxyResource extends Resource {
}

export declare interface ProxyResourceOutput extends ResourceOutput {
}

export declare interface Resource {
}

export declare type ResourceIdentityType = "SystemAssigned";

export declare type ResourceIdentityTypeOutput = "SystemAssigned";

export declare interface ResourceModelWithAllowedPropertySet extends TrackedResource {
    managedBy?: string;
    kind?: string;
    identity?: Identity;
    sku?: Sku;
    plan?: Plan;
}

export declare interface ResourceModelWithAllowedPropertySetOutput extends TrackedResourceOutput {
    managedBy?: string;
    kind?: string;
    readonly etag?: string;
    identity?: IdentityOutput;
    sku?: SkuOutput;
    plan?: PlanOutput;
}

export declare interface ResourceOutput {
    readonly id?: string;
    readonly name?: string;
    readonly type?: string;
    readonly systemData?: SystemDataOutput;
}

export declare type ResourceProvisioningState = string;

export declare type ResourceProvisioningStateOutput = string;

export { RestError }

export declare interface Routes {
    (path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Azure.ResourceManager.CommonProperties/managedIdentityTrackedResources/{managedIdentityTrackedResourceName}", subscriptionId: string, resourceGroupName: string, managedIdentityTrackedResourceName: string): ManagedIdentityGet;
    (path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Azure.ResourceManager.CommonProperties/confidentialResources/{confidentialResourceName}", subscriptionId: string, resourceGroupName: string, confidentialResourceName: string): ErrorModelGetForPredefinedError;
    (path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Azure.ResourceManager.CommonProperties/armResourceIdentifierResources/{armResourceIdentifierResourceName}", subscriptionId: string, resourceGroupName: string, armResourceIdentifierResourceName: string): ArmResourceIdentifiersGet;
}

export declare interface Sku {
    name: string;
    tier?: SkuTier;
    size?: string;
    family?: string;
    capacity?: number;
}

export declare interface SkuOutput {
    name: string;
    tier?: SkuTierOutput;
    size?: string;
    family?: string;
    capacity?: number;
}

export declare type SkuTier = "Free" | "Basic" | "Standard" | "Premium";

export declare type SkuTierOutput = "Free" | "Basic" | "Standard" | "Premium";

export declare interface SystemData {
    createdBy?: string;
    createdByType?: CreatedByType;
    createdAt?: Date | string;
    lastModifiedBy?: string;
    lastModifiedByType?: CreatedByType;
    lastModifiedAt?: Date | string;
}

export declare interface SystemDataOutput {
    createdBy?: string;
    createdByType?: CreatedByTypeOutput;
    createdAt?: string;
    lastModifiedBy?: string;
    lastModifiedByType?: CreatedByTypeOutput;
    lastModifiedAt?: string;
}

export declare interface TrackedResource extends Resource {
    tags?: Record<string, string>;
    location: string;
}

export declare interface TrackedResourceOutput extends ResourceOutput {
    tags?: Record<string, string>;
    location: string;
}

export declare interface UserAssignedIdentity {
}

export declare interface UserAssignedIdentityOutput {
    readonly principalId?: string;
    readonly clientId?: string;
}

export { }
