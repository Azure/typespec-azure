import type { Program } from "@typespec/compiler";
import { getArmResource, registerArmResourceFromModel } from "./private.decorators.js";
import { isCustomAzureResourceMarkedAzure } from "./resource.js";
import { ArmStateKeys } from "./state.js";

export function $onValidate(program: Program): void {
  for (const resourceType of program.stateMap(ArmStateKeys.resourceOperationList).keys()) {
    if (resourceType.kind !== "Model") continue;
    if (!isCustomAzureResourceMarkedAzure(program, resourceType)) continue;
    if (getArmResource(program, resourceType)) continue;
    registerArmResourceFromModel(program, resourceType);
  }
}
