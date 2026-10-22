import {
  type Enum,
  type EnumMember,
  type Model,
  type Program,
  isTemplateDeclaration,
  typespecTypeToJson,
  validateDecoratorUniqueOnNode,
} from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { AzureTokenAuthenticationDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys, reportDiagnostic } from "../lib.js";

/** Known Entra resources, independent of native audience API shape, custom input, or endpoints. */
export interface AzureAuthenticationAudience {
  type: Enum;
  defaultAudienceName: string;
  defaultAudience: string;
  knownAudiences: Record<string, string>;
}

/** Additional semantics for an existing OAuth authentication model. */
export interface AzureTokenAuthentication {
  kind: "entraDefaultScope";
  audience: AzureAuthenticationAudience;
  defaultScopes: string[];
}

interface TokenDeclaration {
  profile: Parameters<AzureTokenAuthenticationDecorator>[2];
  validated?: boolean;
  metadata?: AzureTokenAuthentication;
}

const [getTokenDeclaration, setTokenDeclaration, getTokenDeclarations] = useStateMap<
  Model,
  TokenDeclaration
>(AzureCoreStateKeys.azureTokenAuthentication);

export const $azureTokenAuthentication: AzureTokenAuthenticationDecorator = (
  context,
  target,
  profile,
) => {
  if (!validateDecoratorUniqueOnNode(context, target, $azureTokenAuthentication)) return;
  setTokenDeclaration(context.program, target, { profile });
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

export function isAzureAuthenticationAudience(program: Program, type: Enum): boolean {
  return [...getTokenDeclarations(program)].some(
    ([authentication, declaration]) =>
      "defaultAudience" in declaration.profile &&
      declaration.profile.defaultAudience.value.enum === type &&
      getAzureTokenAuthentication(program, authentication)?.kind === "entraDefaultScope",
  );
}

export function validateAzureAuthentication(program: Program): void {
  for (const authentication of getTokenDeclarations(program).keys()) {
    getAzureTokenAuthentication(program, authentication);
  }
}

function invalid(program: Program, target: Model | Enum, reason: string): undefined {
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
  const { profile } = declaration;
  const audience = getAudience(program, profile.defaultAudience.value);
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
  defaultAudience: EnumMember,
): AzureAuthenticationAudience | undefined {
  const type = defaultAudience.enum;
  const defaultAudienceName = defaultAudience.name;
  const members: [string, string][] = [];
  for (const member of type.members.values()) {
    const value = member.value ?? member.name;
    if (typeof value !== "string") {
      return invalid(program, type, "Audience members must be string resources.");
    }
    if (!value || value.trim() !== value) {
      return invalid(
        program,
        type,
        "Audience resources must be non-empty strings without surrounding whitespace.",
      );
    }
    members.push([member.name, value]);
  }
  const knownAudiences = Object.fromEntries(members);
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
  };
}
