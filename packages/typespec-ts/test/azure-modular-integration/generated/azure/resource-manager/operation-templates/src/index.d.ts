import { AbortSignalLike } from '@azure/abort-controller';
import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { OperationState } from '@azure/core-lro';
import { PathUncheckedResponse } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { PollerLike } from '@azure/core-lro';
import { RestError } from '@azure/core-rest-pipeline';

export declare interface ActionRequest {
    actionType?: string;
    parameters?: string;
}

export declare interface ActionResult {
    result: string;
}

export declare type ActionType = string;

export declare enum AzureClouds {
    AZURE_PUBLIC_CLOUD = "AZURE_PUBLIC_CLOUD",
    AZURE_CHINA_CLOUD = "AZURE_CHINA_CLOUD",
    AZURE_US_GOVERNMENT = "AZURE_US_GOVERNMENT"
}

export declare type AzureSupportedClouds = `${AzureClouds}`;

export declare interface ChangeAllowanceRequest {
    totalAllowed?: number;
    reason?: string;
}

export declare interface ChangeAllowanceResult {
    totalAllowed: number;
    status: string;
}

export declare interface CheckNameAvailabilityCheckGlobalOptionalParams extends OperationOptions {
}

export declare interface CheckNameAvailabilityCheckLocalOptionalParams extends OperationOptions {
}

export declare interface CheckNameAvailabilityOperations {
    checkLocal: (location: string, body: CheckNameAvailabilityRequest, options?: CheckNameAvailabilityCheckLocalOptionalParams) => Promise<CheckNameAvailabilityResponse>;
    checkGlobal: (body: CheckNameAvailabilityRequest, options?: CheckNameAvailabilityCheckGlobalOptionalParams) => Promise<CheckNameAvailabilityResponse>;
}

export declare type CheckNameAvailabilityReason = string;

export declare interface CheckNameAvailabilityRequest {
    name?: string;
    type?: string;
}

export declare interface CheckNameAvailabilityResponse {
    nameAvailable?: boolean;
    reason?: CheckNameAvailabilityReason;
    message?: string;
}

export declare interface Collection extends ProxyResource {
    properties?: CollectionProperties;
}

export declare interface CollectionProperties {
    displayName?: string;
}

export declare interface Configuration extends TrackedResource {
    properties?: ConfigurationProperties;
}

export declare interface ConfigurationProperties {
    configValue?: string;
    readonly provisioningState?: string;
}

export declare type ContinuablePage<TElement, TPage = TElement[]> = TPage & {
    continuationToken?: string;
};

export declare interface CostReport extends ExtensionResource {
    properties?: CostReportProperties;
}

export declare interface CostReportProperties {
    downloadUrl?: string;
    readonly provisioningState?: string;
}

export declare type CreatedByType = string;

export declare interface DiagnosticInfo {
    name: string;
    status: string;
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

export declare interface ExportRequest {
    format: string;
}

export declare interface ExportResult {
    content: string;
}

export declare interface ExtensionResource extends Resource {
}

export { isRestError }

export declare enum KnownActionType {
    Internal = "Internal"
}

export declare enum KnownCheckNameAvailabilityReason {
    Invalid = "Invalid",
    AlreadyExists = "AlreadyExists"
}

export declare enum KnownCreatedByType {
    User = "User",
    Application = "Application",
    ManagedIdentity = "ManagedIdentity",
    Key = "Key"
}

export declare enum KnownOrigin {
    User = "user",
    System = "system",
    UserSystem = "user,system"
}

export declare enum KnownVersions {
    V20231201Preview = "2023-12-01-preview"
}

export declare interface LegacyCreateOrReplaceOptionalBodyOptionalParams extends OperationOptions {
    resource?: Configuration;
}

export declare interface LegacyOperations {
    createOrReplaceOptionalBody: (resourceGroupName: string, configurationName: string, options?: LegacyCreateOrReplaceOptionalBodyOptionalParams) => Promise<Configuration>;
    routedGet: (resourceGroupName: string, name: string, diagnosticName: string, options?: LegacyRoutedGetOptionalParams) => Promise<DiagnosticInfo>;
}

export declare interface LegacyRoutedGetOptionalParams extends OperationOptions {
}

export declare interface LogStatusRequest {
    filter?: string;
}

export declare interface LroCreateOrReplaceOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface LroDeleteOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface LroExportArrayOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface LroExportOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface LroGetLroOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface LroOperations {
    getLro: (scope: string, operationId: string, options?: LroGetLroOptionalParams) => PollerLike<OperationState<CostReport>, CostReport>;
    exportArray: (body: ExportRequest, options?: LroExportArrayOptionalParams) => PollerLike<OperationState<ExportResult[]>, ExportResult[]>;
    delete: (resourceGroupName: string, orderName: string, options?: LroDeleteOptionalParams) => PollerLike<OperationState<void>, void>;
    export: (resourceGroupName: string, orderName: string, body: ExportRequest, options?: LroExportOptionalParams) => PollerLike<OperationState<ExportResult>, ExportResult>;
    createOrReplace: (resourceGroupName: string, orderName: string, resource: Order, options?: LroCreateOrReplaceOptionalParams) => PollerLike<OperationState<Order>, Order>;
}

export declare interface LroPagingOperations {
    postPagingLroWithBody: (resourceGroupName: string, productName: string, body: VnetProfile, options?: LroPagingPostPagingLroWithBodyOptionalParams) => PagedAsyncIterableIterator<Product>;
    postPagingLro: (resourceGroupName: string, productName: string, options?: LroPagingPostPagingLroOptionalParams) => PagedAsyncIterableIterator<Product>;
}

export declare interface LroPagingPostPagingLroOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface LroPagingPostPagingLroWithBodyOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface Monitor extends TrackedResource {
    properties?: MonitorProperties;
}

export declare interface MonitoredResource {
    id: string;
    sendingMetrics?: boolean;
}

export declare interface MonitorProperties {
    status?: string;
    readonly provisioningState?: string;
}

export declare interface Operation {
    readonly name?: string;
    readonly isDataAction?: boolean;
    display?: OperationDisplay;
    readonly origin?: Origin;
    readonly actionType?: ActionType;
}

export declare interface OperationDisplay {
    readonly provider?: string;
    readonly resource?: string;
    readonly operation?: string;
    readonly description?: string;
}

export declare interface OperationsListOptionalParams extends OperationOptions {
}

export declare interface OperationsOperations {
    list: (options?: OperationsListOptionalParams) => PagedAsyncIterableIterator<Operation>;
}

export declare class OperationTemplatesClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: OperationTemplatesClientOptionalParams);
    constructor(subscriptionId: string, options?: OperationTemplatesClientOptionalParams);
    readonly paging: PagingOperations;
    readonly optionalBody: OptionalBodyOperations;
    readonly legacy: LegacyOperations;
    readonly lroPaging: LroPagingOperations;
    readonly lro: LroOperations;
    readonly checkNameAvailability: CheckNameAvailabilityOperations;
    readonly operations: OperationsOperations;
}

export declare interface OperationTemplatesClientOptionalParams extends ClientOptions {
    apiVersion?: string;
    cloudSetting?: AzureSupportedClouds;
}

export declare interface OptionalBodyGetOptionalParams extends OperationOptions {
}

export declare interface OptionalBodyOperations {
    providerPost: (options?: OptionalBodyProviderPostOptionalParams) => Promise<ChangeAllowanceResult>;
    post: (resourceGroupName: string, widgetName: string, options?: OptionalBodyPostOptionalParams) => Promise<ActionResult>;
    patch: (resourceGroupName: string, widgetName: string, options?: OptionalBodyPatchOptionalParams) => Promise<Widget>;
    get: (resourceGroupName: string, widgetName: string, options?: OptionalBodyGetOptionalParams) => Promise<Widget>;
}

export declare interface OptionalBodyPatchOptionalParams extends OperationOptions {
    properties?: Widget;
}

export declare interface OptionalBodyPostOptionalParams extends OperationOptions {
    body?: ActionRequest;
}

export declare interface OptionalBodyProviderPostOptionalParams extends OperationOptions {
    body?: ChangeAllowanceRequest;
}

export declare interface Order extends TrackedResource {
    properties?: OrderProperties;
}

export declare interface OrderProperties {
    productId: string;
    amount: number;
    readonly provisioningState?: string;
}

export declare type Origin = string;

export declare interface PagedAsyncIterableIterator<TElement, TPage = TElement[], TPageSettings extends PageSettings = PageSettings> {
    next(): Promise<IteratorResult<TElement>>;
    [Symbol.asyncIterator](): PagedAsyncIterableIterator<TElement, TPage, TPageSettings>;
    byPage: (settings?: TPageSettings) => AsyncIterableIterator<ContinuablePage<TElement, TPage>>;
}

export declare interface PageSettings {
    continuationToken?: string;
}

export declare interface PagingGetOptionalParams extends OperationOptions {
}

export declare interface PagingMarkAsPageableOptionalParams extends OperationOptions {
}

export declare interface PagingOperations {
    markAsPageable: (resourceGroupName: string, monitorName: string, options?: PagingMarkAsPageableOptionalParams) => PagedAsyncIterableIterator<Collection>;
    postActionPaging: (resourceGroupName: string, monitorName: string, options?: PagingPostActionPagingOptionalParams) => PagedAsyncIterableIterator<MonitoredResource>;
    get: (resourceGroupName: string, monitorName: string, options?: PagingGetOptionalParams) => Promise<Monitor>;
}

export declare interface PagingPostActionPagingOptionalParams extends OperationOptions {
    body?: LogStatusRequest;
}

export declare interface Product extends TrackedResource {
    properties?: ProductProperties;
}

export declare interface ProductProperties {
    productId?: string;
    readonly provisioningState?: string;
}

export declare interface ProxyResource extends Resource {
}

export declare interface Resource {
    readonly id?: string;
    readonly name?: string;
    readonly type?: string;
    readonly systemData?: SystemData;
}

export { RestError }

export declare function restorePoller<TResponse extends PathUncheckedResponse, TResult>(client: OperationTemplatesClient, serializedState: string, sourceOperation: (...args: any[]) => PollerLike<OperationState<TResult>, TResult>, options?: RestorePollerOptions<TResult>): PollerLike<OperationState<TResult>, TResult>;

export declare interface RestorePollerOptions<TResult, TResponse extends PathUncheckedResponse = PathUncheckedResponse> extends OperationOptions {
    updateIntervalInMs?: number;
    abortSignal?: AbortSignalLike;
    processResponseBody?: (result: TResponse) => Promise<TResult>;
}

export declare interface SystemData {
    createdBy?: string;
    createdByType?: CreatedByType;
    createdAt?: Date;
    lastModifiedBy?: string;
    lastModifiedByType?: CreatedByType;
    lastModifiedAt?: Date;
}

export declare interface TrackedResource extends Resource {
    tags?: Record<string, string>;
    location: string;
}

export declare interface VnetProfile {
    vnetId: string;
}

export declare interface Widget extends TrackedResource {
    properties?: WidgetProperties;
}

export declare interface WidgetProperties {
    name?: string;
    description?: string;
    readonly provisioningState?: string;
}

export { }
