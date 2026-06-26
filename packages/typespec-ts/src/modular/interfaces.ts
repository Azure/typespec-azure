import { ClientOptions } from "../interfaces.js";

export interface ModularOptions {
  sourceRoot: string;
  compatibilityMode: boolean;
  experimentalExtensibleEnums: boolean;
}
export interface ModularEmitterOptions {
  options: ClientOptions;
  modularOptions: ModularOptions;
}

export interface ModularClientOptions {
  subfolder?: string;
  rlcClientName: string;
}

export interface OperationPathAndDeserDetails {
  path: string;
  expectedStatusesExpression: string;
  deserName: string;
  renamedDeserName?: string;
}
