import { AbortSignalLike } from '@azure/abort-controller';
import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { OperationState } from '@azure/core-lro';
import { PathUncheckedResponse } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { PollerLike } from '@azure/core-lro';
import { RestError } from '@azure/core-rest-pipeline';

export declare enum AzureClouds {
    AZURE_PUBLIC_CLOUD = "AZURE_PUBLIC_CLOUD",
    AZURE_CHINA_CLOUD = "AZURE_CHINA_CLOUD",
    AZURE_US_GOVERNMENT = "AZURE_US_GOVERNMENT"
}

export declare type AzureSupportedClouds = `${AzureClouds}`;

export declare type ContinuablePage<TElement, TPage = TElement[]> = TPage & {
    continuationToken?: string;
};

export declare type CreatedByType = string;

export declare interface CreateOrUpdateOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface DeleteOptionalParams extends OperationOptions {
}

export declare interface ErrorAdditionalInfo {
    readonly type?: string;
    readonly info?: any;
}

export declare interface ErrorDetail {
    readonly code?: string;
    readonly message?: string;
    readonly target?: string;
    readonly details?: ErrorDetail[];
    readonly additionalInfo?: ErrorAdditionalInfo[];
}

export declare interface ErrorResponse {
    error?: ErrorDetail;
}

export declare interface ExtensionResource extends Resource {
}

export declare interface GetOptionalParams extends OperationOptions {
}

export { isRestError }

export declare enum KnownCreatedByType {
    User = "User",
    Application = "Application",
    ManagedIdentity = "ManagedIdentity",
    Key = "Key"
}

export declare enum KnownProvisioningState {
    Succeeded = "Succeeded",
    Failed = "Failed",
    Canceled = "Canceled",
    Provisioning = "Provisioning",
    Updating = "Updating",
    Deleting = "Deleting",
    Accepted = "Accepted"
}

export declare enum KnownVersions {
    V20231201Preview = "2023-12-01-preview"
}

export declare interface ListByServiceGroupOptionalParams extends OperationOptions {
}

export declare interface PagedAsyncIterableIterator<TElement, TPage = TElement[], TPageSettings extends PageSettings = PageSettings> {
    next(): Promise<IteratorResult<TElement>>;
    [Symbol.asyncIterator](): PagedAsyncIterableIterator<TElement, TPage, TPageSettings>;
    byPage: (settings?: TPageSettings) => AsyncIterableIterator<ContinuablePage<TElement, TPage>>;
}

export declare interface PageSettings {
    continuationToken?: string;
}

export declare type ProvisioningState = string;

export declare interface Resource {
    readonly id?: string;
    readonly name?: string;
    readonly type?: string;
    readonly systemData?: SystemData;
}

export { RestError }

export declare function restorePoller<TResponse extends PathUncheckedResponse, TResult>(client: ServiceGroupExtensionClient, serializedState: string, sourceOperation: (...args: any[]) => PollerLike<OperationState<TResult>, TResult>, options?: RestorePollerOptions<TResult>): PollerLike<OperationState<TResult>, TResult>;

export declare interface RestorePollerOptions<TResult, TResponse extends PathUncheckedResponse = PathUncheckedResponse> extends OperationOptions {
    updateIntervalInMs?: number;
    abortSignal?: AbortSignalLike;
    processResponseBody?: (result: TResponse) => Promise<TResult>;
}

export declare class ServiceGroupExtensionClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: ServiceGroupExtensionClientOptionalParams);
    listByServiceGroup(serviceGroupId: string, options?: ListByServiceGroupOptionalParams): PagedAsyncIterableIterator<ServiceGroupExtensionResource>;
    delete(serviceGroupId: string, serviceGroupExtensionResourceName: string, options?: DeleteOptionalParams): Promise<void>;
    update(serviceGroupId: string, serviceGroupExtensionResourceName: string, properties: ServiceGroupExtensionResource, options?: UpdateOptionalParams): Promise<ServiceGroupExtensionResource>;
    createOrUpdate(serviceGroupId: string, serviceGroupExtensionResourceName: string, resource: ServiceGroupExtensionResource, options?: CreateOrUpdateOptionalParams): PollerLike<OperationState<ServiceGroupExtensionResource>, ServiceGroupExtensionResource>;
    get(serviceGroupId: string, serviceGroupExtensionResourceName: string, options?: GetOptionalParams): Promise<ServiceGroupExtensionResource>;
}

export declare interface ServiceGroupExtensionClientOptionalParams extends ClientOptions {
    apiVersion?: string;
    cloudSetting?: AzureSupportedClouds;
}

export declare interface ServiceGroupExtensionResource extends ExtensionResource {
    properties?: ServiceGroupExtensionResourceProperties;
}

export declare interface ServiceGroupExtensionResourceProperties {
    description?: string;
    readonly provisioningState?: ProvisioningState;
}

export declare interface SystemData {
    createdBy?: string;
    createdByType?: CreatedByType;
    createdAt?: Date;
    lastModifiedBy?: string;
    lastModifiedByType?: CreatedByType;
    lastModifiedAt?: Date;
}

export declare interface UpdateOptionalParams extends OperationOptions {
}

export { }
