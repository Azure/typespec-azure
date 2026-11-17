import type {
  SdkClientType,
  SdkPathParameter,
  SdkServiceOperation,
} from "@azure-tools/typespec-client-generator-core";
import {
  isSupportedKeyCredential,
  isSupportedTokenCredential,
} from "../../utils/credential-utils.js";
import type { SdkContext } from "../../utils/interfaces.js";
import { NameType, normalizeName, pascalCase } from "../../utils/name-utils.js";
import { getClassicalClientName, getClientName } from "./naming-helpers.js";

const DEFAULT_SCOPE_SUFFIX = "/.default";

export interface ResolvedServiceConfigurationEntry {
  name: string;
  serverUrl: string;
  templateArguments: SdkPathParameter[];
  hasOAuth2: boolean;
  oauth2Scopes: string[];
  audience?: string;
  apiKeyHeaderName?: string;
  customHttpAuthHeaderName?: string;
  customHttpAuthSharedKeyPrefix?: string;
}

export interface ResolvedAudienceMember {
  memberName: string;
  value: string;
  configurationName: string;
}

export type ServiceConfigurationEndpointMode = "caller-supplied" | "fixed" | "templated";

export interface ResolvedServiceConfigurations {
  defaultConfiguration: string;
  configurations: ResolvedServiceConfigurationEntry[];
  endpointMode: ServiceConfigurationEndpointMode;
  serviceConfigTypeName: string;
  knownAudienceEnumName?: string;
  audienceMembers: ResolvedAudienceMember[];
  hasCredentials: boolean;
  hasOAuth2: boolean;
  hasAudienceSupport: boolean;
  hasApiKeyAuth: boolean;
  hasCustomHttpAuth: boolean;
}

export function getClientServiceConfigurations(
  client: SdkClientType<SdkServiceOperation>,
): ResolvedServiceConfigurations | undefined {
  const catalog = client.clientInitialization.serviceConfigurations;
  if (!catalog || catalog.configurations.length < 2) {
    return undefined;
  }

  const classicalClientName = getClassicalClientName(client);
  const modularClientName = getClientName(client);
  const serviceConfigTypeName = `${classicalClientName}ServiceConfiguration`;

  const configurations: ResolvedServiceConfigurationEntry[] = [];
  const audienceMembers: ResolvedAudienceMember[] = [];
  const usedMemberNames = new Set<string>();

  for (const cfg of catalog.configurations) {
    let hasOAuth2 = false;
    const scopeSet = new Set<string>();
    let apiKeyHeaderName: string | undefined;
    let customHttpAuthHeaderName: string | undefined;
    let customHttpAuthSharedKeyPrefix: string | undefined;

    for (const option of cfg.authentication.options) {
      for (const scheme of option.schemes) {
        if (isSupportedTokenCredential(scheme) && scheme.type === "oauth2") {
          hasOAuth2 = true;
          for (const flow of scheme.flows) {
            if (!flow.scopes) {
              continue;
            }
            if (
              flow.scopes.length === 1 &&
              flow.scopes[0]?.value.toLowerCase() === "user_impersonation"
            ) {
              continue;
            }
            for (const scope of flow.scopes) {
              scopeSet.add(scope.value);
            }
          }
        } else if (isSupportedKeyCredential(scheme)) {
          if (scheme.type === "apiKey" && scheme.in === "header") {
            apiKeyHeaderName = scheme.name;
          } else if (scheme.type === "http") {
            customHttpAuthHeaderName = "Authorization";
            customHttpAuthSharedKeyPrefix = ["basic", "bearer"].includes(
              scheme.scheme.toLowerCase(),
            )
              ? pascalCase(scheme.scheme)
              : scheme.scheme;
          }
        }
      }
    }

    const oauth2Scopes = [...scopeSet];
    const audience = extractDefaultScopeAudience(oauth2Scopes);
    if (audience) {
      const baseMemberName = normalizeName(cfg.name, NameType.EnumMemberName, true);
      let memberName = baseMemberName;
      let suffix = 2;
      while (usedMemberNames.has(memberName)) {
        memberName = `${baseMemberName}${suffix}`;
        suffix++;
      }
      usedMemberNames.add(memberName);
      audienceMembers.push({
        memberName,
        value: audience,
        configurationName: cfg.name,
      });
    }

    configurations.push({
      name: cfg.name,
      serverUrl: cfg.endpoint.serverUrl,
      templateArguments: cfg.endpoint.templateArguments,
      hasOAuth2,
      oauth2Scopes,
      audience,
      apiKeyHeaderName,
      customHttpAuthHeaderName,
      customHttpAuthSharedKeyPrefix,
    });
  }

  const endpointMode = resolveEndpointMode(configurations);
  const hasOAuth2 = configurations.some((c) => c.hasOAuth2);
  const hasAudienceSupport = audienceMembers.length > 0;
  const hasApiKeyAuth = configurations.some((c) => Boolean(c.apiKeyHeaderName));
  const hasCustomHttpAuth = configurations.some((c) =>
    Boolean(c.customHttpAuthHeaderName && c.customHttpAuthSharedKeyPrefix),
  );
  const hasCredentials = hasOAuth2 || hasApiKeyAuth || hasCustomHttpAuth;

  return {
    defaultConfiguration: catalog.defaultConfiguration,
    configurations,
    endpointMode,
    serviceConfigTypeName,
    knownAudienceEnumName: hasAudienceSupport ? `Known${modularClientName}Audience` : undefined,
    audienceMembers,
    hasCredentials,
    hasOAuth2,
    hasAudienceSupport,
    hasApiKeyAuth,
    hasCustomHttpAuth,
  };
}

function extractDefaultScopeAudience(scopes: string[]): string | undefined {
  if (scopes.length !== 1) {
    return undefined;
  }
  const scope = scopes[0]!;
  if (!scope.endsWith(DEFAULT_SCOPE_SUFFIX)) {
    return undefined;
  }
  const prefix = scope.slice(0, -DEFAULT_SCOPE_SUFFIX.length);
  return prefix.length > 0 ? prefix : undefined;
}

function resolveEndpointMode(
  configurations: ResolvedServiceConfigurationEntry[],
): ServiceConfigurationEndpointMode {
  if (configurations.every((c) => c.templateArguments.length === 0)) {
    return "fixed";
  }
  if (
    configurations.every((c) => {
      if (c.templateArguments.length !== 1) {
        return false;
      }
      const arg = c.templateArguments[0]!;
      const hasDefault = Boolean(
        arg.clientDefaultValue || arg.__raw?.defaultValue || arg.type?.kind === "constant",
      );
      return !hasDefault && c.serverUrl === `{${getTemplatePlaceholderName(arg)}}`;
    })
  ) {
    return "caller-supplied";
  }
  return "templated";
}

export function getTemplatePlaceholderName(arg: SdkPathParameter): string {
  if (arg.__raw && "name" in arg.__raw && typeof arg.__raw.name === "string" && arg.__raw.name) {
    return arg.__raw.name;
  }
  return arg.serializedName || arg.name;
}

export function isTemplateArgRequired(arg: SdkPathParameter): boolean {
  return !arg.optional && getTemplateArgDefault(arg) === undefined;
}

export interface ServiceConfigurationTemplateParam {
  paramName: string;
  typeExpression: string;
  optional: boolean;
  uniformDefault?: string | number | boolean;
  hasPerConfigDefaults: boolean;
  perConfigDefaults: Map<string, string | number | boolean | undefined>;
  requiredInConfigurations: Set<string>;
}

export function collectServiceConfigurationTemplateParams(
  dpgContext: SdkContext,
  resolved: ResolvedServiceConfigurations,
  getParamName: (param: SdkPathParameter) => string,
  getParamType: (context: SdkContext, param: SdkPathParameter) => string,
): ServiceConfigurationTemplateParam[] {
  const byParamName = new Map<
    string,
    {
      paramName: string;
      typeExpressions: string[];
      perConfigDefaults: Map<string, string | number | boolean | undefined>;
      requiredInConfigurations: Set<string>;
    }
  >();

  const defaultEntry =
    resolved.configurations.find((c) => c.name === resolved.defaultConfiguration) ??
    resolved.configurations[0]!;

  // Seed order from defaultConfiguration first so parameter ordering matches TCGC clientInitialization
  const orderedConfigs = [
    defaultEntry,
    ...resolved.configurations.filter((c) => c !== defaultEntry),
  ];

  for (const cfg of orderedConfigs) {
    for (const arg of cfg.templateArguments) {
      const paramName = getParamName(arg);
      let record = byParamName.get(paramName);
      if (!record) {
        record = {
          paramName,
          typeExpressions: [],
          perConfigDefaults: new Map(),
          requiredInConfigurations: new Set(),
        };
        byParamName.set(paramName, record);
      }
      record.typeExpressions.push(getParamType(dpgContext, arg));
      record.perConfigDefaults.set(cfg.name, getTemplateArgDefault(arg));
      if (isTemplateArgRequired(arg)) {
        record.requiredInConfigurations.add(cfg.name);
      }
    }
  }

  return [...byParamName.values()].map((record) => {
    const defaults = resolved.configurations.map((c) => record.perConfigDefaults.get(c.name));
    const definedDefaults = defaults.filter((d) => d !== undefined);
    const allEqual =
      definedDefaults.length === resolved.configurations.length &&
      definedDefaults.every((d) => d === definedDefaults[0]);
    return {
      paramName: record.paramName,
      typeExpression: mergeParameterTypeExpressions(record.typeExpressions),
      optional: !record.requiredInConfigurations.has(defaultEntry.name),
      uniformDefault: allEqual ? definedDefaults[0] : undefined,
      hasPerConfigDefaults: definedDefaults.length > 0 && !allEqual,
      perConfigDefaults: record.perConfigDefaults,
      requiredInConfigurations: record.requiredInConfigurations,
    };
  });
}

function mergeParameterTypeExpressions(types: string[]): string {
  const unique = [...new Set(types.map((t) => t.trim()).filter(Boolean))];
  const hasString = unique.includes("string");
  const hasNumber = unique.includes("number");
  const hasBoolean = unique.includes("boolean");
  const filtered = unique.filter((t) => {
    if (hasString && t !== "string" && /^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')$/.test(t)) {
      return false;
    }
    if (hasNumber && t !== "number" && /^-?\d+(?:\.\d+)?$/.test(t)) {
      return false;
    }
    if (hasBoolean && (t === "true" || t === "false")) {
      return false;
    }
    return true;
  });
  return filtered.join(" | ") || "string";
}

function escapeTemplateLiteralChunk(text: string): string {
  return text.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("${", "\\${");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildConfigurationEndpointExpression(
  cfg: ResolvedServiceConfigurationEntry,
  templateParamByName: Map<string, ServiceConfigurationTemplateParam>,
  getParamName: (param: SdkPathParameter) => string,
): string {
  const placeholderToParamName = new Map<string, string>();
  const usedParamNames: string[] = [];
  for (const arg of cfg.templateArguments) {
    const placeholder = getTemplatePlaceholderName(arg);
    if (!cfg.serverUrl.includes(`{${placeholder}}`)) {
      continue;
    }
    const paramName = getParamName(arg);
    placeholderToParamName.set(placeholder, paramName);
    if (!usedParamNames.includes(paramName)) {
      usedParamNames.push(paramName);
    }
  }

  if (usedParamNames.length === 0) {
    return `() => ${JSON.stringify(cfg.serverUrl)}`;
  }

  const placeholderPattern = [...placeholderToParamName.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const placeholderRegex = new RegExp(`\\{(${placeholderPattern})\\}`, "g");

  let templateBody = "";
  let lastIndex = 0;
  for (const match of cfg.serverUrl.matchAll(placeholderRegex)) {
    const index = match.index ?? 0;
    templateBody += escapeTemplateLiteralChunk(cfg.serverUrl.slice(lastIndex, index));
    const placeholder = match[1]!;
    const mappedParam = placeholderToParamName.get(placeholder)!;
    templateBody += `\${${mappedParam}}`;
    lastIndex = index + match[0].length;
  }
  templateBody += escapeTemplateLiteralChunk(cfg.serverUrl.slice(lastIndex));

  const requiredChecks: string[] = [];
  for (const paramName of usedParamNames) {
    const tp = templateParamByName.get(paramName);
    if (
      tp &&
      tp.requiredInConfigurations.has(cfg.name) &&
      tp.optional &&
      tp.uniformDefault === undefined &&
      tp.perConfigDefaults.get(cfg.name) === undefined
    ) {
      requiredChecks.push(
        `if (${paramName} === undefined) { throw new Error(${JSON.stringify(`Required parameter "${paramName}" must be provided in options for serviceConfiguration "${cfg.name}".`)}); }`,
      );
    }
  }

  if (requiredChecks.length === 0) {
    return `({ ${usedParamNames.join(", ")} }) => \`${templateBody}\``;
  }

  return `({ ${usedParamNames.join(", ")} }) => { ${requiredChecks.join(" ")} return \`${templateBody}\`; }`;
}

function getTemplateArgDefault(arg: SdkPathParameter): string | number | boolean | undefined {
  if (
    typeof arg.clientDefaultValue === "string" ||
    typeof arg.clientDefaultValue === "number" ||
    typeof arg.clientDefaultValue === "boolean"
  ) {
    return arg.clientDefaultValue;
  }
  if (
    arg.type?.kind === "constant" &&
    (typeof arg.type.value === "string" ||
      typeof arg.type.value === "number" ||
      typeof arg.type.value === "boolean")
  ) {
    return arg.type.value;
  }
  return undefined;
}
