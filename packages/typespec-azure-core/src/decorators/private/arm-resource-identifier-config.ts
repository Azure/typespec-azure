import { typespecTypeToJson, type Scalar } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { ArmResourceIdentifierConfigDecorator } from "../../../generated-defs/Azure.Core.Foundations.Private.js";
import { AzureCoreStateKeys } from "../../lib.js";

export interface ArmResourceIdentifierConfig {
  readonly allowedResources: readonly ArmResourceIdentifierAllowedResource[];
}

export type ArmResourceDeploymentScope =
  | "Tenant"
  | "Subscription"
  | "ResourceGroup"
  | "ManagementGroup"
  | "Extension";

export interface ArmResourceIdentifierAllowedResource {
  /** The type of resource that is being referred to. For example Microsoft.Network/virtualNetworks or Microsoft.Network/virtualNetworks/subnets. See Example Types for more examples. */
  readonly type: string;

  /**
   * An array of scopes. If not specified, the default scope is ["ResourceGroup"].
   * See [Allowed Scopes](https://github.com/Azure/autorest/tree/main/docs/extensions#allowed-scopes).
   */
  readonly scopes?: ArmResourceDeploymentScope[];
}

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
