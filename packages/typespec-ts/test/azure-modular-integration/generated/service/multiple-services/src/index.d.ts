import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';

export { isRestError }

export declare interface OperationsOpAOptionalParams extends OperationOptions {
}

export declare interface OperationsOpBOptionalParams extends OperationOptions {
}

export declare interface OperationsOperations {
    opA: (options?: OperationsOpAOptionalParams) => Promise<void>;
}

export { RestError }

export declare class ServiceAClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: ServiceAClientOptionalParams);
    readonly operations: OperationsOperations;
    readonly subNamespace: SubNamespaceOperations;
}

export declare interface ServiceAClientOptionalParams extends ClientOptions {
}

export declare class ServiceBClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: ServiceBClientOptionalParams);
    readonly operations: ServiceBClientOperationsOperations;
    readonly subNamespace: ServiceBClientSubNamespaceOperations;
}

export declare interface ServiceBClientOperationsOperations {
    opB: (options?: OperationsOpBOptionalParams) => Promise<void>;
}

export declare interface ServiceBClientOptionalParams extends ClientOptions {
}

export declare interface ServiceBClientSubNamespaceOperations {
    subOpB: (options?: SubNamespaceSubOpBOptionalParams) => Promise<void>;
}

export declare interface SubNamespaceOperations {
    subOpA: (options?: SubNamespaceSubOpAOptionalParams) => Promise<void>;
}

export declare interface SubNamespaceSubOpAOptionalParams extends OperationOptions {
}

export declare interface SubNamespaceSubOpBOptionalParams extends OperationOptions {
}

export declare type VersionsA = "av1" | "av2";

export declare type VersionsB = "bv1" | "bv2";

export { }
