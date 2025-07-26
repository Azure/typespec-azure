import { typespecTypeToJson, type Scalar } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { ArmResourceIdentifierConfigDecorator } from "../../../generated-defs/Azure.Core.Foundations.Private.js";
import type { ArmResourceIdentifierConfig } from "../../decorators.js";
import { AzureCoreStateKeys } from "../../lib.js";

export const [
  /** Returns the config attached to an armResourceIdentifierScalar */
  getArmResourceIdentifierConfig,
  setArmResourceIdentifierConfig,
] = useStateMap<Scalar, ArmResourceIdentifierConfig>(
  AzureCoreStateKeys.armResourceIdentifierConfig,
);

/** @internal */
export const $armResourceIdentifierConfig: ArmResourceIdentifierConfigDecorator = (
  context,
  entity,
  config,
) => {
  if (config.kind !== "Model") return;
  const prop = config.properties.get("allowedResources");
  if (prop === undefined || prop.type.kind !== "Tuple") return;
  const [data, diagnostics] = typespecTypeToJson<ArmResourceIdentifierConfig["allowedResources"]>(
    prop.type,
    context.getArgumentTarget(0)!,
  );
  context.program.reportDiagnostics(diagnostics);

  if (data) {
    setArmResourceIdentifierConfig(context.program, entity, {
      allowedResources: data,
    });
  }
};
