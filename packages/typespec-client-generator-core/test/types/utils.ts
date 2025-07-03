import { ok, strictEqual } from "assert";
import { SdkModelPropertyType, SdkType } from "../../src/interfaces.js";
import { SdkTestRunner } from "../test-host.js";

export function getSdkModelPropertyTypeHelper(runner: SdkTestRunner): SdkModelPropertyType {
  const sdkModel = runner.context.sdkPackage.models.find((x) => x.kind === "model");
  ok(sdkModel);
  strictEqual(sdkModel.kind, "model");
  const property = sdkModel.properties[0];
  strictEqual(property.kind, "property");
  return property;
}

export function getSdkTypeHelper(runner: SdkTestRunner): SdkType {
  return getSdkModelPropertyTypeHelper(runner).type;
}
