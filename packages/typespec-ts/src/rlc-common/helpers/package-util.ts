import { RLCModel } from "../interfaces.js";

export function isAzureMonorepoPackage(model: RLCModel): boolean {
  return Boolean(model.options?.azureSdkForJs);
}

export function isAzureStandalonePackage(model: RLCModel): boolean {
  return !model.options?.azureSdkForJs;
}
