import {
  type DiagnosticTarget,
  type Interface,
  type Model,
  type Namespace,
  type Program,
  type Tuple,
  type Type,
  type Union,
  validateDecoratorUniqueOnNode,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { useStateMap } from "@typespec/compiler/utils";
import {
  $server,
  $useAuth,
  type Authentication,
  type HttpAuth,
  type HttpServer,
  getAuthentication,
  getServers,
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

interface AuthenticationRequirement {
  type: Model | Tuple;
  models: Model[];
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
  const records: {
    name: string;
    endpoint: string;
    description?: string;
    parameters?: Model;
    requirements: AuthenticationRequirement[];
  }[] = [];
  for (const [name, configuration] of ordered) {
    if (!name.trim()) {
      invalid(diagnosticTarget, "Each service configuration must have a non-empty name.");
      return;
    }
    const { endpoint, description } = configuration;
    const authentication = configuration.authentication.target;
    const parameters = configuration.parameters?.target;
    if (!endpoint.trim()) {
      invalid(
        diagnosticTarget,
        `Configuration '${name}' must declare a non-empty endpoint string.`,
      );
      return;
    }
    if (parameters !== undefined && parameters.kind !== "Model") {
      invalid(diagnosticTarget, `Configuration '${name}' parameters must reference a model.`);
      return;
    }
    const requirements: AuthenticationRequirement[] = [];
    const active = new Set<Union>();
    const collect = (type: Type): boolean => {
      if (type.kind === "Union") {
        if (active.has(type)) {
          invalid(diagnosticTarget, "Authentication requirements cannot contain recursive unions.");
          return false;
        }
        active.add(type);
        for (const variant of type.variants.values()) {
          if (!collect(variant.type)) return false;
        }
        active.delete(type);
        return true;
      }
      if (type.kind === "Model") {
        requirements.push({ type, models: [type] });
        return true;
      }
      if (type.kind === "Tuple" && type.values.every((value) => value.kind === "Model")) {
        requirements.push({ type, models: type.values });
        return true;
      }
      invalid(
        diagnosticTarget,
        "Authentication must reference a model, an OR union, or an AND tuple of models.",
      );
      return false;
    };
    if (!collect(authentication)) return;
    records.push({
      name,
      endpoint,
      description,
      parameters,
      requirements,
    });
  }

  const alternatives: AuthenticationRequirement[] = [];
  for (const record of records) {
    for (const requirement of record.requirements) {
      if (
        !alternatives.some(
          (other) =>
            other.models.length === requirement.models.length &&
            other.models.every((model, index) => model === requirement.models[index]),
        )
      ) {
        alternatives.push(requirement);
      }
    }
  }
  context.call($useAuth, target, $(program).union.create(alternatives.map(({ type }) => type)));
  const authentication = getAuthentication(program, target);
  if (!authentication) return;
  const schemes = new Map(
    authentication.options.flatMap((option) =>
      option.schemes.map((scheme) => [scheme.model, scheme] as const),
    ),
  );
  const result: AzureServiceConfiguration[] = [];
  for (const record of records) {
    const options: Authentication["options"] = [];
    for (const requirement of record.requirements) {
      const option: HttpAuth[] = [];
      for (const model of requirement.models) {
        const scheme = schemes.get(model);
        // `@useAuth` already diagnoses invalid authentication models.
        if (!scheme) return;
        option.push(scheme);
      }
      options.push({ schemes: option });
    }
    const auth = { options };
    if (!options.some((option) => option.schemes.some((scheme) => scheme.type === "oauth2"))) {
      invalid(target, "Service configurations must include an OAuth2 authentication scheme.");
      return;
    }
    context.call($server, target, record.endpoint, record.description, record.parameters);
    const server = getServers(program, target)![result.length];
    result.push({ name: record.name, server, authentication: auth });
  }
  setConfigurations(program, target, { defaultConfiguration: "public", configurations: result });
};
