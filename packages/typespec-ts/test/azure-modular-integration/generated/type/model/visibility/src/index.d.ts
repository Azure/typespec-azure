import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';

export declare interface DeleteModelOptionalParams extends OperationOptions {
}

export declare interface GetModelOptionalParams extends OperationOptions {
}

export declare interface HeadModelOptionalParams extends OperationOptions {
}

export { isRestError }

export declare interface PatchModelOptionalParams extends OperationOptions {
}

export declare interface PostModelOptionalParams extends OperationOptions {
}

export declare interface PutModelOptionalParams extends OperationOptions {
}

export declare interface PutReadOnlyModelOptionalParams extends OperationOptions {
}

export declare interface ReadOnlyModel {
    readonly optionalNullableIntList?: number[];
    readonly optionalStringRecord?: Record<string, string>;
}

export declare interface ReadOnlyModelCreateOrUpdate {
}

export { RestError }

export declare class VisibilityClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: VisibilityClientOptionalParams);
    putReadOnlyModel(input: ReadOnlyModelCreateOrUpdate, options?: PutReadOnlyModelOptionalParams): Promise<ReadOnlyModel>;
    deleteModel(input: VisibilityModelDelete, options?: DeleteModelOptionalParams): Promise<void>;
    postModel(input: VisibilityModelCreate, options?: PostModelOptionalParams): Promise<void>;
    patchModel(input: VisibilityModelUpdate, options?: PatchModelOptionalParams): Promise<void>;
    putModel(input: VisibilityModelCreateOrUpdate, options?: PutModelOptionalParams): Promise<void>;
    headModel(input: VisibilityModelQuery, options?: HeadModelOptionalParams): Promise<void>;
    getModel(input: VisibilityModelQuery, options?: GetModelOptionalParams): Promise<VisibilityModel>;
}

export declare interface VisibilityClientOptionalParams extends ClientOptions {
}

export declare interface VisibilityModel {
    readonly readProp: string;
}

export declare interface VisibilityModelCreate {
    createProp: string[];
}

export declare interface VisibilityModelCreateOrUpdate {
    createProp: string[];
    updateProp: number[];
}

export declare interface VisibilityModelDelete {
    deleteProp: boolean;
}

export declare interface VisibilityModelQuery {
    queryProp: number;
}

export declare interface VisibilityModelUpdate {
    updateProp: number[];
}

export { }
