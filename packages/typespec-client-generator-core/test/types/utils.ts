import { ok, strictEqual } from "assert";
import { SdkContext, SdkModelPropertyType, SdkType } from "../../src/interfaces.js";

export function getSdkModelPropertyTypeHelper(context: SdkContext): SdkModelPropertyType {
  const sdkModel = context.sdkPackage.models.find((x) => x.kind === "model");
  ok(sdkModel);
  strictEqual(sdkModel.kind, "model");
  const property = sdkModel.properties[0];
  strictEqual(property.kind, "property");
  return property;
}

export function getSdkTypeHelper(context: SdkContext): SdkType {
  return getSdkModelPropertyTypeHelper(context).type;
}
