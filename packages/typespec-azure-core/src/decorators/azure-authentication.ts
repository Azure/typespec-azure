import {
  type Enum,
  type Interface,
  type Model,
  type Namespace,
  type Program,
  type Union,
  isTemplateDeclaration,
  typespecTypeToJson,
  validateDecoratorUniqueOnNode,
} from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type {
  AzureServiceEnvironmentsDecorator,
  AzureTokenAuthenticationDecorator,
} from "../../generated-defs/Azure.Core.js";
import { getUnionAsEnum } from "../helpers/union-enums.js";
import { AzureCoreStateKeys, reportDiagnostic } from "../lib.js";

/** Entra resources, not HTTP endpoints or literal JWT audiences. */
export interface AzureAuthenticationAudience {
  type: Enum | Union;
  defaultAudienceName: string;
  defaultAudience: string;
  knownAudiences: Record<string, string>;
  allowCustomAudience: boolean;
}

/** Additional semantics for an existing OAuth authentication model. */
export type AzureTokenAuthentication =
  | {
      kind: "entraDefaultScope";
      audience: AzureAuthenticationAudience;
      defaultScopes: string[];
    }
  | {
      kind: "challengeBased";
      challengeContract: string;
    };

/** Deployment data; authority and tenant remain credential-owned. */
export interface AzureServiceEnvironment {
  name: string;
  audienceName: string;
  audience: string;
  defaultEndpoint?: string;
}

export interface AzureServiceEnvironments {
  environments: AzureServiceEnvironment[];
  defaultEnvironment?: string;
}

interface TokenDeclaration {
  profile: Parameters<AzureTokenAuthenticationDecorator>[2];
  audienceType?: Enum | Union;
  validated?: boolean;
  metadata?: AzureTokenAuthentication;
}

interface EnvironmentDeclaration {
  environments: Parameters<AzureServiceEnvironmentsDecorator>[3];
  defaultEnvironment?: string;
  validated?: boolean;
  metadata?: AzureServiceEnvironments;
}

const [getTokenDeclaration, setTokenDeclaration, getTokenDeclarations] = useStateMap<
  Model,
  TokenDeclaration
>(AzureCoreStateKeys.azureTokenAuthentication);

const [getEnvironmentDeclarations, setEnvironmentDeclarations, getAllEnvironmentDeclarations] =
  useStateMap<Namespace | Interface, Map<Model, EnvironmentDeclaration>>(
    AzureCoreStateKeys.azureServiceEnvironments,
  );

export const $azureTokenAuthentication: AzureTokenAuthenticationDecorator = (
  context,
  target,
  profile,
  audienceType,
) => {
  if (!validateDecoratorUniqueOnNode(context, target, $azureTokenAuthentication)) return;
  if (audienceType && audienceType.kind !== "Enum" && audienceType.kind !== "Union") {
    invalid(context.program, target, "The audience type must be a string enum or union.");
    return;
  }
  setTokenDeclaration(context.program, target, { profile, audienceType });
};

export const $azureServiceEnvironments: AzureServiceEnvironmentsDecorator = (
  context,
  target,
  authentication,
  environments,
  defaultEnvironment,
) => {
  const declarations = getEnvironmentDeclarations(context.program, target) ?? new Map();
  if (declarations.has(authentication)) {
    invalid(
      context.program,
      target,
      "Environments for this authentication model are declared more than once.",
    );
    return;
  }
  declarations.set(authentication, { environments, defaultEnvironment });
  setEnvironmentDeclarations(context.program, target, declarations);
};

/** Gets metadata for this exact authentication-model alternative. */
export function getAzureTokenAuthentication(
  program: Program,
  authentication: Model,
): AzureTokenAuthentication | undefined {
  const declaration = getTokenDeclaration(program, authentication);
  if (!declaration || isTemplateDeclaration(authentication)) return undefined;
  if (!declaration.validated) {
    declaration.validated = true;
    declaration.metadata = validateTokenAuthentication(program, authentication, declaration);
  }
  return declaration.metadata;
}

/** Gets the nearest environment declaration for the specified authentication model. */
export function getAzureServiceEnvironments(
  program: Program,
  target: Namespace | Interface,
  authentication: Model,
): AzureServiceEnvironments | undefined {
  let current: Namespace | Interface | undefined = target;
  while (current) {
    const declaration = getEnvironmentDeclarations(program, current)?.get(authentication);
    if (declaration) return validateEnvironments(program, current, authentication, declaration);
    current = current.namespace;
  }
  return undefined;
}

/** Lists authentication models referenced by applicable environment declarations. */
export function getAzureServiceEnvironmentAuthenticationModels(
  program: Program,
  target: Namespace | Interface,
): Model[] {
  const models = new Set<Model>();
  let current: Namespace | Interface | undefined = target;
  while (current) {
    for (const model of getEnvironmentDeclarations(program, current)?.keys() ?? []) {
      models.add(model);
    }
    current = current.namespace;
  }
  return [...models];
}

export function validateAzureAuthentication(program: Program): void {
  for (const authentication of getTokenDeclarations(program).keys()) {
    getAzureTokenAuthentication(program, authentication);
  }
  for (const [target, declarations] of getAllEnvironmentDeclarations(program)) {
    for (const [authentication, declaration] of declarations) {
      validateEnvironments(program, target, authentication, declaration);
    }
  }
}

function invalid(
  program: Program,
  target: Model | Namespace | Interface | Enum | Union,
  reason: string,
): undefined {
  reportDiagnostic(program, {
    code: "azure-authentication-invalid",
    target,
    format: { reason },
  });
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOAuthScopes(program: Program, authentication: Model): string[][] | undefined {
  const [value, diagnostics] = typespecTypeToJson<unknown>(authentication, authentication);
  program.reportDiagnostics(diagnostics);
  if (diagnostics.length > 0) return undefined;
  if (!isObject(value) || value.type !== "oauth2" || !Array.isArray(value.flows)) {
    return invalid(program, authentication, "The target must be an OAuth authentication model.");
  }
  const result: string[][] = [];
  for (const flow of value.flows) {
    if (!isObject(flow) || typeof flow.type !== "string") {
      return invalid(program, authentication, "Each OAuth flow must declare its flow type.");
    }
    const scopes = flow.scopes ?? value.defaultScopes ?? [];
    if (!Array.isArray(scopes) || !scopes.every((scope) => typeof scope === "string")) {
      return invalid(program, authentication, "OAuth scopes must be arrays of strings.");
    }
    result.push(scopes);
  }
  if (result.length === 0) {
    return invalid(program, authentication, "At least one OAuth flow is required.");
  }
  return result;
}

function validateTokenAuthentication(
  program: Program,
  authentication: Model,
  declaration: TokenDeclaration,
): AzureTokenAuthentication | undefined {
  const flows = getOAuthScopes(program, authentication);
  if (!flows) return undefined;
  const { profile, audienceType } = declaration;
  if (profile.kind === "challengeBased") {
    if (audienceType) {
      return invalid(
        program,
        authentication,
        "Only an Entra default-scope profile accepts an audience type.",
      );
    }
    if (!profile.challengeContract.trim()) {
      return invalid(
        program,
        authentication,
        "A challenge profile requires a non-empty challenge contract.",
      );
    }
    return { kind: "challengeBased", challengeContract: profile.challengeContract };
  }
  if (!audienceType) {
    return invalid(
      program,
      authentication,
      "An Entra default-scope profile requires an audience type.",
    );
  }
  const audience = getAudience(program, audienceType, profile.defaultAudience);
  if (!audience) return undefined;
  const scope = `${audience.defaultAudience}/.default`;
  if (flows.some((scopes) => scopes.length !== 1 || scopes[0] !== scope)) {
    return invalid(
      program,
      authentication,
      `Every OAuth flow must use the default scope '${scope}'.`,
    );
  }
  return { kind: "entraDefaultScope", audience, defaultScopes: [scope] };
}

function getAudience(
  program: Program,
  type: Enum | Union,
  defaultAudienceName: string,
): AzureAuthenticationAudience | undefined {
  let members: [string | symbol, string][];
  let allowCustomAudience = false;
  if (type.kind === "Enum") {
    members = [];
    for (const member of type.members.values()) {
      const value = member.value ?? member.name;
      if (typeof value !== "string") {
        return invalid(program, type, "Audience members must be string resources.");
      }
      members.push([member.name, value]);
    }
  } else {
    const [union, diagnostics] = getUnionAsEnum(type);
    if (!union || diagnostics.length > 0 || union.kind !== "string" || union.nullable) {
      return invalid(program, type, "An audience must be a non-nullable string enum or union.");
    }
    members = [...union.flattenedMembers].map(([name, member]) => [name, member.value]);
    allowCustomAudience = union.open;
  }
  if (members.some(([, value]) => !value || value.trim() !== value)) {
    return invalid(
      program,
      type,
      "Audience resources must be non-empty strings without surrounding whitespace.",
    );
  }
  const knownAudiences = Object.fromEntries(
    members.filter((entry): entry is [string, string] => typeof entry[0] === "string"),
  );
  if (!Object.hasOwn(knownAudiences, defaultAudienceName)) {
    return invalid(
      program,
      type,
      `The default audience '${defaultAudienceName}' must name an audience member.`,
    );
  }
  return {
    type,
    defaultAudienceName,
    defaultAudience: knownAudiences[defaultAudienceName],
    knownAudiences,
    allowCustomAudience,
  };
}

function validateEnvironments(
  program: Program,
  target: Namespace | Interface,
  authentication: Model,
  declaration: EnvironmentDeclaration,
): AzureServiceEnvironments | undefined {
  if (declaration.validated) return declaration.metadata;
  declaration.validated = true;
  const profile = getAzureTokenAuthentication(program, authentication);
  if (profile?.kind !== "entraDefaultScope") {
    return invalid(
      program,
      target,
      "Service environments require an Entra default-scope authentication model.",
    );
  }
  const environments: AzureServiceEnvironment[] = [];
  for (const [name, options] of Object.entries(declaration.environments)) {
    if (!name.trim() || !Object.hasOwn(profile.audience.knownAudiences, options.audience)) {
      return invalid(
        program,
        target,
        `Environment '${name}' must reference a named audience member.`,
      );
    }
    if (options.defaultEndpoint !== undefined && !isServiceEndpoint(options.defaultEndpoint)) {
      return invalid(
        program,
        target,
        `Environment '${name}' must use an absolute HTTP or HTTPS defaultEndpoint.`,
      );
    }
    environments.push({
      name,
      audienceName: options.audience,
      audience: profile.audience.knownAudiences[options.audience],
      ...(options.defaultEndpoint === undefined
        ? {}
        : { defaultEndpoint: options.defaultEndpoint }),
    });
  }
  if (declaration.defaultEnvironment !== undefined) {
    const selected = environments.find(
      (environment) => environment.name === declaration.defaultEnvironment,
    );
    if (!selected) {
      return invalid(
        program,
        target,
        `The default environment '${declaration.defaultEnvironment}' is not declared.`,
      );
    }
    if (selected.audienceName !== profile.audience.defaultAudienceName) {
      return invalid(
        program,
        target,
        "The default environment must use the default audience member.",
      );
    }
  }
  declaration.metadata = {
    environments,
    ...(declaration.defaultEnvironment === undefined
      ? {}
      : { defaultEnvironment: declaration.defaultEnvironment }),
  };
  return declaration.metadata;
}

function isServiceEndpoint(value: string): boolean {
  if (!/^https?:\/\//i.test(value) || value.trim() !== value || !URL.canParse(value)) return false;
  const url = new URL(value);
  return !!url.hostname && !url.username && !url.password && !url.hash;
}
