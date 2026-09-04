import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';

export declare type AgentEndpointProtocol = string;

export declare interface EndpointConfig {
    protocol: AgentEndpointProtocol;
}

export declare interface EnumValueOperations {
    send: (body: EndpointConfig, options?: EnumValueSendOptionalParams) => Promise<EndpointConfig>;
}

export declare interface EnumValueSendOptionalParams extends OperationOptions {
}

export declare class ExactNameClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: ExactNameClientOptionalParams);
    readonly parameter: ParameterOperations;
    readonly operation: OperationOperations;
    readonly enumValue: EnumValueOperations;
    readonly property: PropertyOperations;
    readonly model: ModelOperations;
}

export declare interface ExactNameClientOptionalParams extends ClientOptions {
}

export { isRestError }

export declare enum KnownAgentEndpointProtocol {
    Activity = "activity",
    Responses = "responses",
    A2A = "a2a",
    Mcp = "mcp"
}

export declare interface ModelOperations {
    send: (body: my_model, options?: ModelSendOptionalParams) => Promise<my_model>;
}

export declare interface ModelSendOptionalParams extends OperationOptions {
}

export declare interface my_model {
    name: string;
}

export declare interface OperationmyOpOptionalParams extends OperationOptions {
}

export declare interface OperationOperations {
    myOp: (options?: OperationmyOpOptionalParams) => Promise<void>;
}

export declare interface ParameterOperations {
    send: (myParam: string, options?: ParameterSendOptionalParams) => Promise<void>;
}

export declare interface ParameterSendOptionalParams extends OperationOptions {
}

export declare interface PropertyOperations {
    send: (body: ScopedModel, options?: PropertySendOptionalParams) => Promise<ScopedModel>;
}

export declare interface PropertySendOptionalParams extends OperationOptions {
}

export { RestError }

export declare interface ScopedModel {
    _myName: string;
}

export { }
