import {
  type DiagnosticTarget,
  type Interface,
  type Namespace,
  type Program,
  validateDecoratorUniqueOnNode,
} from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import {
  $server,
  $useAuth,
  type Authentication,
  type HttpServer,
  getAuthentication,
  getServers,
  setAuthentication,
} from "@typespec/http";
import type { AzureServiceConfigurationsDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys, reportDiagnostic } from "../lib.js";

/** One named deployment, with normalized HTTP metadata and its endpoint/auth association. */
export interface AzureServiceConfiguration {
  name: string;
  server: HttpServer;
  authentication: Authentication;
}

/** Client-independent deployment facts; public is always the default and first entry. */
export interface AzureServiceConfigurations {
  defaultConfiguration: string;
  configurations: AzureServiceConfiguration[];
}

const [getConfigurations, setConfigurations] = useStateMap<Namespace, AzureServiceConfigurations>(
  AzureCoreStateKeys.azureServiceConfigurations,
);

/** Gets the nearest namespace's paired endpoint and OAuth configurations. */
export function getAzureServiceConfigurations(
  program: Program,
  target: Namespace | Interface,
): AzureServiceConfigurations | undefined {
  let current: Namespace | Interface | undefined = target;
  while (current) {
    const configurations =
      current.kind === "Namespace" ? getConfigurations(program, current) : undefined;
    if (configurations) return configurations;
    current = current.namespace;
  }
  return undefined;
}

export const $azureServiceConfigurations: AzureServiceConfigurationsDecorator = (
  context,
  target,
  configurations,
) => {
  if (!validateDecoratorUniqueOnNode(context, target, $azureServiceConfigurations)) return;
  const { program } = context;
  const invalid = (diagnosticTarget: DiagnosticTarget, reason: string) => {
    reportDiagnostic(program, {
      code: "azure-authentication-invalid",
      target: diagnosticTarget,
      format: { reason },
    });
  };
  if (
    target.decorators.some(({ decorator }) => decorator === $server || decorator === $useAuth) ||
    getServers(program, target) !== undefined ||
    getAuthentication(program, target) !== undefined
  ) {
    invalid(
      target,
      "Do not combine @azureServiceConfigurations with @server or @useAuth on the same namespace.",
    );
    return;
  }
  const diagnosticTarget = context.getArgumentTarget(0) ?? target;
  const entries = Object.entries(configurations);
  const selected = entries.find(([name]) => name === "public");
  if (!selected) {
    invalid(diagnosticTarget, "Service configurations must declare a 'public' configuration.");
    return;
  }
  const ordered = [selected, ...entries.filter((entry) => entry !== selected)];
  const result: AzureServiceConfiguration[] = [];
  const options: Authentication["options"] = [];
  for (const [name, configuration] of ordered) {
    if (!name.trim()) {
      invalid(diagnosticTarget, "Each service configuration must have a non-empty name.");
      return;
    }
    const { endpoint, description, parameters } = configuration;
    if (!endpoint.trim()) {
      invalid(
        diagnosticTarget,
        `Configuration '${name}' must declare a non-empty endpoint string.`,
      );
      return;
    }
    const diagnosticCount = program.diagnostics.length;
    context.call($useAuth, target, configuration.authentication.target);
    context.call($server, target, endpoint, description, parameters?.target);
    if (
      program.diagnostics
        .slice(diagnosticCount)
        .some((diagnostic) => diagnostic.severity === "error")
    )
      return;
    const authentication = getAuthentication(program, target)!;
    if (
      !authentication.options.some((option) =>
        option.schemes.some((scheme) => scheme.type === "oauth2"),
      )
    ) {
      invalid(target, "Service configurations must include an OAuth2 authentication scheme.");
      return;
    }
    const server = getServers(program, target)![result.length];
    result.push({ name, server, authentication });
    for (const option of authentication.options) {
      if (
        !options.some(
          (other) =>
            other.schemes.length === option.schemes.length &&
            other.schemes.every((scheme, index) => scheme.model === option.schemes[index].model),
        )
      )
        options.push(option);
    }
  }
  setAuthentication(program, target, { options });
  setConfigurations(program, target, { defaultConfiguration: "public", configurations: result });
};
