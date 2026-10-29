import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';

export declare interface CustomDiscriminatorCat extends CustomDiscriminatorPetBase {
    petType: "feline";
    meow: boolean;
}

export declare interface CustomDiscriminatorDog extends CustomDiscriminatorPetBase {
    petType: "canine";
    bark: boolean;
}

export declare interface CustomDiscriminatorOperations {
    operations: CustomDiscriminatorOperationsOperations;
}

export declare interface CustomDiscriminatorOperationsGetCatOptionalParams extends OperationOptions {
}

export declare interface CustomDiscriminatorOperationsGetDogOptionalParams extends OperationOptions {
}

export declare interface CustomDiscriminatorOperationsOperations {
    putDog: (input: CustomDiscriminatorPetBaseUnion, options?: CustomDiscriminatorOperationsPutDogOptionalParams) => Promise<void>;
    getDog: (options?: CustomDiscriminatorOperationsGetDogOptionalParams) => Promise<CustomDiscriminatorPetBaseUnion>;
    putCat: (input: CustomDiscriminatorPetBaseUnion, options?: CustomDiscriminatorOperationsPutCatOptionalParams) => Promise<void>;
    getCat: (options?: CustomDiscriminatorOperationsGetCatOptionalParams) => Promise<CustomDiscriminatorPetBaseUnion>;
}

export declare interface CustomDiscriminatorOperationsPutCatOptionalParams extends OperationOptions {
}

export declare interface CustomDiscriminatorOperationsPutDogOptionalParams extends OperationOptions {
}

export declare interface CustomDiscriminatorPetBase {
    petType: string;
    name: string;
}

export declare type CustomDiscriminatorPetBaseUnion = CustomDiscriminatorCat | CustomDiscriminatorDog | CustomDiscriminatorPetBase;

export declare interface EnumDiscriminatorCat extends EnumDiscriminatorPetBase {
    kind: "cat";
    meow: boolean;
}

export declare interface EnumDiscriminatorDog extends EnumDiscriminatorPetBase {
    kind: "dog";
    bark: boolean;
}

export declare interface EnumDiscriminatorOperations {
    operations: EnumDiscriminatorOperationsOperations;
}

export declare interface EnumDiscriminatorOperationsGetCatOptionalParams extends OperationOptions {
}

export declare interface EnumDiscriminatorOperationsGetDogOptionalParams extends OperationOptions {
}

export declare interface EnumDiscriminatorOperationsOperations {
    putDog: (input: EnumDiscriminatorPetBaseUnion, options?: EnumDiscriminatorOperationsPutDogOptionalParams) => Promise<void>;
    getDog: (options?: EnumDiscriminatorOperationsGetDogOptionalParams) => Promise<EnumDiscriminatorPetBaseUnion>;
    putCat: (input: EnumDiscriminatorPetBaseUnion, options?: EnumDiscriminatorOperationsPutCatOptionalParams) => Promise<void>;
    getCat: (options?: EnumDiscriminatorOperationsGetCatOptionalParams) => Promise<EnumDiscriminatorPetBaseUnion>;
}

export declare interface EnumDiscriminatorOperationsPutCatOptionalParams extends OperationOptions {
}

export declare interface EnumDiscriminatorOperationsPutDogOptionalParams extends OperationOptions {
}

export declare interface EnumDiscriminatorPetBase {
    kind: EnumDiscriminatorPetKind;
    name: string;
}

export declare type EnumDiscriminatorPetBaseUnion = EnumDiscriminatorCat | EnumDiscriminatorDog | EnumDiscriminatorPetBase;

export declare type EnumDiscriminatorPetKind = "cat" | "dog";

export declare interface ExplicitDiscriminatorCat extends ExplicitDiscriminatorMammal {
    kind: "cat";
    meow: boolean;
}

export declare interface ExplicitDiscriminatorDog extends ExplicitDiscriminatorPetBase {
    kind: "dog";
    bark: boolean;
}

export declare interface ExplicitDiscriminatorMammal extends ExplicitDiscriminatorPetBase {
}

export declare interface ExplicitDiscriminatorOperations {
    operations: ExplicitDiscriminatorOperationsOperations;
}

export declare interface ExplicitDiscriminatorOperationsGetCatOptionalParams extends OperationOptions {
}

export declare interface ExplicitDiscriminatorOperationsGetDogOptionalParams extends OperationOptions {
}

export declare interface ExplicitDiscriminatorOperationsOperations {
    putDog: (input: ExplicitDiscriminatorPetBaseUnion, options?: ExplicitDiscriminatorOperationsPutDogOptionalParams) => Promise<void>;
    getDog: (options?: ExplicitDiscriminatorOperationsGetDogOptionalParams) => Promise<ExplicitDiscriminatorPetBaseUnion>;
    putCat: (input: ExplicitDiscriminatorPetBaseUnion, options?: ExplicitDiscriminatorOperationsPutCatOptionalParams) => Promise<void>;
    getCat: (options?: ExplicitDiscriminatorOperationsGetCatOptionalParams) => Promise<ExplicitDiscriminatorPetBaseUnion>;
}

export declare interface ExplicitDiscriminatorOperationsPutCatOptionalParams extends OperationOptions {
}

export declare interface ExplicitDiscriminatorOperationsPutDogOptionalParams extends OperationOptions {
}

export declare interface ExplicitDiscriminatorPetBase {
    kind: string;
    name: string;
}

export declare type ExplicitDiscriminatorPetBaseUnion = ExplicitDiscriminatorDog | ExplicitDiscriminatorPetBase;

export declare class ExtendsClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: ExtendsClientOptionalParams);
    readonly recursive: RecursiveOperations;
    readonly enumDiscriminator: EnumDiscriminatorOperations;
    readonly customDiscriminator: CustomDiscriminatorOperations;
    readonly injectedDiscriminator: InjectedDiscriminatorOperations;
    readonly explicitDiscriminator: ExplicitDiscriminatorOperations;
}

export declare interface ExtendsClientOptionalParams extends ClientOptions {
}

export declare interface InjectedDiscriminatorCat extends InjectedDiscriminatorPetBase {
    kind: "cat";
    meow: boolean;
}

export declare interface InjectedDiscriminatorDog extends InjectedDiscriminatorPetBase {
    kind: "dog";
    bark: boolean;
}

export declare interface InjectedDiscriminatorOperations {
    operations: InjectedDiscriminatorOperationsOperations;
}

export declare interface InjectedDiscriminatorOperationsGetCatOptionalParams extends OperationOptions {
}

export declare interface InjectedDiscriminatorOperationsGetDogOptionalParams extends OperationOptions {
}

export declare interface InjectedDiscriminatorOperationsOperations {
    putDog: (input: InjectedDiscriminatorPetBaseUnion, options?: InjectedDiscriminatorOperationsPutDogOptionalParams) => Promise<void>;
    getDog: (options?: InjectedDiscriminatorOperationsGetDogOptionalParams) => Promise<InjectedDiscriminatorPetBaseUnion>;
    putCat: (input: InjectedDiscriminatorPetBaseUnion, options?: InjectedDiscriminatorOperationsPutCatOptionalParams) => Promise<void>;
    getCat: (options?: InjectedDiscriminatorOperationsGetCatOptionalParams) => Promise<InjectedDiscriminatorPetBaseUnion>;
}

export declare interface InjectedDiscriminatorOperationsPutCatOptionalParams extends OperationOptions {
}

export declare interface InjectedDiscriminatorOperationsPutDogOptionalParams extends OperationOptions {
}

export declare interface InjectedDiscriminatorPetBase {
    kind: string;
    name: string;
}

export declare type InjectedDiscriminatorPetBaseUnion = InjectedDiscriminatorCat | InjectedDiscriminatorDog | InjectedDiscriminatorPetBase;

export { isRestError }

export declare interface RecursiveCat extends RecursivePetBase {
    kind: "cat";
    meow: boolean;
}

export declare interface RecursiveDog extends RecursivePetBase {
    kind: "dog";
    bark: boolean;
}

export declare interface RecursiveGetOptionalParams extends OperationOptions {
}

export declare interface RecursiveOperations {
    put: (input: RecursivePetBaseUnion, options?: RecursivePutOptionalParams) => Promise<void>;
    get: (options?: RecursiveGetOptionalParams) => Promise<RecursivePetBaseUnion>;
}

export declare interface RecursivePetBase {
    kind: string;
    name: string;
    friend?: RecursivePetBaseUnion;
    friends?: RecursivePetBaseUnion[];
    lookup?: Record<string, RecursivePetBaseUnion>;
}

export declare type RecursivePetBaseUnion = RecursiveCat | RecursiveDog | RecursivePetBase;

export declare interface RecursivePutOptionalParams extends OperationOptions {
}

export { RestError }

export { }
