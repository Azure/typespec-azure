import type {
  SdkClientType,
  SdkCredentialParameter,
  SdkEndpointParameter,
  SdkHttpParameter,
  SdkMethodParameter,
  SdkServiceOperation,
} from "@azure-tools/typespec-client-generator-core";
import {
  Node,
  type OptionalKind,
  type ParameterDeclarationStructure,
  StatementedNode,
} from "ts-morph";
import type { ModularEmitterOptions } from "../interfaces.js";

import { resolveReference } from "../../framework/reference.js";
import type { SdkContext } from "../../utils/interfaces.js";
import { NameType, normalizeSdkName } from "../../utils/name-utils.js";
import { CloudSettingHelpers } from "../static-helpers-metadata.js";
import { getTypeExpression } from "../type-expressions/get-type-expression.js";
import { getClassicalClientName } from "./naming-helpers.js";
import {
  collectServiceConfigurationTemplateParams,
  type ResolvedServiceConfigurations,
} from "./service-configuration-helpers.js";
import { isCredentialType } from "./type-helpers.js";

interface ClientParameterOptions {
  onClientOnly?: boolean;
  requiredOnly?: boolean;
  optionalOnly?: boolean;
  skipArmSpecific?: boolean;
  skipEndpointTemplate?: boolean;
  apiVersionAsRequired?: boolean;
}

type SdkParameter =
  SdkMethodParameter | SdkEndpointParameter | SdkCredentialParameter | SdkHttpParameter;

export function hasDefaultValue(p: SdkParameter) {
  if (p.clientDefaultValue || p.__raw?.defaultValue || p.type.kind === "constant") {
    return true;
  }

  // Special case for endpoint parameters with template arguments that have default values
  if (p.type.kind === "endpoint" && p.type.templateArguments[0]) {
    const templateArg = p.type.templateArguments[0];
    return !!(
      templateArg.clientDefaultValue ||
      templateArg.__raw?.defaultValue ||
      templateArg.type?.kind === "constant"
    );
  }

  return false;
}

export function getClientParameters(
  client: SdkClientType<SdkServiceOperation>,
  dpgContext: SdkContext,
  options: ClientParameterOptions = {
    requiredOnly: false,
    onClientOnly: false,
    optionalOnly: false,
    skipArmSpecific: false,
    skipEndpointTemplate: false,
    apiVersionAsRequired: true,
  },
) {
  const clientParams: SdkParameter[] = [];
  for (const property of client.clientInitialization.parameters) {
    if (property.type.kind === "union" && property.type.variantTypes[0]?.kind === "endpoint") {
      if (options.skipEndpointTemplate) {
        clientParams.push(property);
      } else {
        clientParams.push(...property.type.variantTypes[0].templateArguments);
      }
    } else if (property.type.kind === "endpoint") {
      clientParams.push(property);
    } else if (!clientParams.find((p) => p.name === property.name)) {
      clientParams.push(property);
    }
  }

  const isRequired = (p: SdkParameter) =>
    // Special case: when apiVersionAsRequired is true, apiVersion should always be considered required
    (options.apiVersionAsRequired && p.isApiVersionParam) || (!p.optional && !hasDefaultValue(p));
  const isOptional = (p: SdkParameter) =>
    p.optional || p.clientDefaultValue || p.__raw?.defaultValue || p.type.kind === "constant";
  const skipCredentials = (p: SdkParameter) => p.kind !== "credential";
  const skipMethodParam = (p: SdkParameter) => p.kind !== "method";
  const armSpecific = (p: SdkParameter) => !(p.kind === "endpoint" && dpgContext.arm);
  // Skip apiVersion parameter when it's multi-service (each service has its own default apiVersion)
  const skipApiVersionOnMultiService = (p: SdkParameter) =>
    !(dpgContext.emitterOptions?.isMultiService && p.isApiVersionParam);
  const filters = [
    options.requiredOnly ? isRequired : undefined,
    dpgContext.emitterOptions?.addCredentials === false ? skipCredentials : undefined,
    options.optionalOnly ? isOptional : undefined,
    options.onClientOnly ? skipMethodParam : undefined,
    options.skipArmSpecific ? undefined : armSpecific,
    skipApiVersionOnMultiService,
  ];
  const params = clientParams.filter((p) => filters.every((filter) => !filter || filter(p)));
  return params;
}

export function getClientParametersDeclaration(
  client: SdkClientType<SdkServiceOperation>,
  dpgContext: SdkContext,
  options: ClientParameterOptions = {
    optionalOnly: false,
    requiredOnly: false,
    onClientOnly: false,
    skipArmSpecific: false,
    apiVersionAsRequired: false,
  },
): OptionalKind<ParameterDeclarationStructure>[] {
  const name = getClassicalClientName(client);
  const optionsParam = {
    name: "options",
    type: `${name}OptionalParams`,
    initializer: "{}",
  };

  const params: OptionalKind<ParameterDeclarationStructure>[] = [
    ...getClientParameters(client, dpgContext, options).map<
      OptionalKind<ParameterDeclarationStructure>
    >((p) => {
      const typeExpression = getClientParameterTypeExpression(dpgContext, p);
      const name = getClientParameterName(p);
      return {
        name,
        type: typeExpression,
      };
    }),
  ];
  params.push(optionsParam);

  return params;
}

export function getClientParameterTypeExpression(context: SdkContext, parameter: SdkParameter) {
  // Special handle to work around the fact that TCGC creates a union type for endpoint. The reason they do this
  // is to provide a way for users to either pass the value to fill in the template of the whole endpoint. Basically they are
  // inserting a variant with {endpoint}.
  // Our emitter allows this through the options.endpoint.
  if (parameter.type.kind === "union") {
    const endpointVariant = parameter.type.variantTypes.find((p) => p.kind === "endpoint");
    if (endpointVariant) {
      return getTypeExpression(context, endpointVariant);
    }
  }
  return getTypeExpression(context, parameter.type);
}

export function getClientParameterName(parameter: SdkParameter) {
  // We have been calling this endpointParam, so special handling this here to make sure there are no unexpected side effects
  if (
    !parameter.isExactName &&
    ((parameter.type.kind === "union" &&
      parameter.type.variantTypes.some((v) => v.kind === "endpoint")) ||
      ((parameter.kind === "endpoint" || parameter.kind === "path") &&
        parameter.name.toLowerCase() === "endpoint"))
  ) {
    return "endpointParam";
  }

  return normalizeSdkName(parameter, NameType.Parameter, { shouldGuard: true });
}

export function buildGetClientEndpointParam(
  context: StatementedNode,
  dpgContext: SdkContext,
  client: SdkClientType<SdkServiceOperation>,
  serviceConfigs?: ResolvedServiceConfigurations,
): { endpointParamName: string; assignedOptionalParams?: Set<string> } {
  const assignedOptionalParams = new Set<string>();
  const cloudSettingSuffix = dpgContext.arm
    ? ` ?? ${resolveReference(CloudSettingHelpers.getArmEndpoint)}(options.cloudSetting)`
    : "";
  const coreEndpointParam = `options.endpoint${cloudSettingSuffix}`;

  if (serviceConfigs && serviceConfigs.endpointMode === "fixed") {
    context.addStatements(
      `const endpointUrl = ${coreEndpointParam} ?? selectedConfiguration.endpoint;`,
    );
    return { endpointParamName: "endpointUrl" };
  }

  if (serviceConfigs && serviceConfigs.endpointMode === "templated") {
    const templateParams = collectServiceConfigurationTemplateParams(
      dpgContext,
      serviceConfigs,
      getClientParameterName,
      getClientParameterTypeExpression,
    );
    for (const templateParam of templateParams) {
      if (!templateParam.optional) {
        continue;
      }
      if (templateParam.uniformDefault !== undefined) {
        context.addStatements(
          `const ${templateParam.paramName} = options.${templateParam.paramName} ?? ${JSON.stringify(templateParam.uniformDefault)};`,
        );
      } else if (templateParam.hasPerConfigDefaults) {
        context.addStatements(
          `const ${templateParam.paramName} = options.${templateParam.paramName} ?? selectedConfiguration.defaults.${templateParam.paramName};`,
        );
      } else {
        context.addStatements(
          `const ${templateParam.paramName} = options.${templateParam.paramName};`,
        );
      }
      assignedOptionalParams.add(templateParam.paramName);
    }
    const argNames = templateParams.map((p) => p.paramName).join(", ");
    context.addStatements(
      `const endpointUrl = ${coreEndpointParam} ?? selectedConfiguration.buildEndpoint({ ${argNames} });`,
    );
    return { endpointParamName: "endpointUrl", assignedOptionalParams };
  }

  // Special case: endpoint URL not defined
  const endpointParam = getClientParameters(client, dpgContext, {
    onClientOnly: true,
    skipEndpointTemplate: true,
    skipArmSpecific: true,
  }).find((x) => x.kind === "endpoint" || x.kind === "path");
  if (endpointParam) {
    if (
      endpointParam.type.kind === "union" &&
      endpointParam.type.variantTypes[0]?.kind === "endpoint"
    ) {
      const params = endpointParam.type.variantTypes[0].templateArguments;
      let parameterizedEndpointUrl = endpointParam.type.variantTypes[0].serverUrl;
      for (const templateParam of params) {
        const paramName = getClientParameterName(templateParam);
        if (templateParam.clientDefaultValue) {
          const defaultValue =
            typeof templateParam.clientDefaultValue === "string"
              ? `"${templateParam.clientDefaultValue}"`
              : templateParam.clientDefaultValue;
          context.addStatements(`const ${paramName} = options.${paramName} ?? ${defaultValue};`);
          assignedOptionalParams.add(paramName);
        } else if (templateParam.optional) {
          context.addStatements(`const ${paramName} = options.${paramName};`);
          assignedOptionalParams.add(paramName);
        }
        parameterizedEndpointUrl = parameterizedEndpointUrl.replace(
          `{${templateParam.name}}`,
          `\${${getClientParameterName(templateParam)}}`,
        );
      }
      const endpointUrl = `const endpointUrl = ${coreEndpointParam} ?? \`${parameterizedEndpointUrl}\`;`;
      context.addStatements(endpointUrl);
      return { endpointParamName: "endpointUrl", assignedOptionalParams };
    } else if (endpointParam.type.kind === "endpoint") {
      const clientDefaultValue = endpointParam.type.templateArguments[0]?.clientDefaultValue;
      const defaultValueStr =
        clientDefaultValue && typeof clientDefaultValue === "string"
          ? `"${clientDefaultValue}"`
          : clientDefaultValue
            ? clientDefaultValue
            : `String(${getClientParameterName(endpointParam)})`;
      const endpointUrl = `const endpointUrl = ${coreEndpointParam} ?? ${defaultValueStr};`;
      context.addStatements(endpointUrl);
      return { endpointParamName: "endpointUrl" };
    }
    const endpointUrl = `const endpointUrl = ${coreEndpointParam} ?? String(${getClientParameterName(endpointParam)});`;
    context.addStatements(endpointUrl);
    return { endpointParamName: "endpointUrl" };
  }

  return { endpointParamName: "endpointUrl" };
}

/**
 * Builds the options to be passed to getClient
 *
 * @param context - context in which the options are being passed; statements will be added to this context
 *                  to help build the options shape
 * @param apiVersionParamName - the name of the api version parameter in options (e.g., "apiVersion" or "version")
 * @returns - an expression representing the options to be passed in to getClient
 */
export interface BuildClientOptionsConfig {
  serviceConfigs?: ResolvedServiceConfigurations;
  hasServiceConfigurationOption?: boolean;
  hasAudienceOption?: boolean;
}

export function buildGetClientOptionsParam(
  context: StatementedNode & Node,
  emitterOptions: ModularEmitterOptions,
  endpointParam: string,
  apiVersionParamName?: string,
  config?: BuildClientOptionsConfig,
): string {
  const userAgentOptions = buildUserAgentOptions(context, emitterOptions);
  const loggingOptions = buildLoggingOptions();
  const credentials = config?.serviceConfigs
    ? buildServiceConfigurationCredentials(
        emitterOptions,
        endpointParam,
        config.serviceConfigs,
        Boolean(config.hasAudienceOption),
      )
    : buildCredentials(emitterOptions, endpointParam);

  // Use the actual api version parameter name for destructuring, defaulting to "apiVersion"
  const apiVersionDestructure = apiVersionParamName ?? "apiVersion";
  const destructuredFields = [`${apiVersionDestructure}: _`];
  if (config?.hasServiceConfigurationOption && apiVersionDestructure !== "serviceConfiguration") {
    destructuredFields.push("serviceConfiguration: _serviceConfiguration");
  }
  if (config?.hasAudienceOption && apiVersionDestructure !== "audience") {
    destructuredFields.push("audience: _audience");
  }
  let expr = `const { ${destructuredFields.join(", ")}, ...updatedOptions } = {`;

  expr += "...options,";

  if (userAgentOptions) {
    expr += `userAgentOptions: ${userAgentOptions},`;
  }
  if (loggingOptions) {
    expr += `loggingOptions: ${loggingOptions},`;
  }
  if (credentials) {
    expr += `credentials: ${credentials},`;
  }

  expr += `};`;

  context.addStatements(expr);
  return "updatedOptions";
}

export function buildGetClientCredentialParam(
  client: SdkClientType<SdkServiceOperation>,
  emitterOptions: ModularEmitterOptions,
  serviceConfigs?: ResolvedServiceConfigurations,
): string {
  if (
    emitterOptions.options.addCredentials !== false &&
    serviceConfigs &&
    serviceConfigs.hasCredentials
  ) {
    return (
      client.clientInitialization.parameters.find((x) => isCredentialType(x))?.name ?? "undefined"
    );
  }
  if (
    emitterOptions.options.addCredentials &&
    (emitterOptions.options.credentialScopes || emitterOptions.options.credentialKeyHeaderName)
  ) {
    return (
      client.clientInitialization.parameters.find((x) => isCredentialType(x))?.name ?? "undefined"
    );
  } else {
    return "undefined";
  }
}

function buildServiceConfigurationCredentials(
  emitterOptions: ModularEmitterOptions,
  endpointParam: string,
  serviceConfigs: ResolvedServiceConfigurations,
  hasAudienceOption: boolean,
): string | undefined {
  if (emitterOptions.options.addCredentials === false) {
    return undefined;
  }

  const allHaveNonEmptyOAuth2Scopes =
    serviceConfigs.hasOAuth2 &&
    serviceConfigs.configurations.every((c) => c.hasOAuth2 && c.oauth2Scopes.length > 0);

  let scopes = "";
  if (serviceConfigs.hasOAuth2) {
    if (allHaveNonEmptyOAuth2Scopes) {
      const defaultScopesExpr = hasAudienceOption
        ? `(options.audience ? [\`\${options.audience.replace(/\\/+$/, "")}/.default\`] : selectedConfiguration.scopes)`
        : `selectedConfiguration.scopes`;
      scopes = `scopes: options.credentials?.scopes ?? ${defaultScopesExpr},`;
    } else {
      const selectedScopesExpr = `selectedConfiguration.hasOAuth2 ? (selectedConfiguration.scopes.length > 0 ? selectedConfiguration.scopes : [\`\${${endpointParam}}/.default\`]) : undefined`;
      const defaultScopesExpr = hasAudienceOption
        ? `(options.audience ? [\`\${options.audience.replace(/\\/+$/, "")}/.default\`] : ${selectedScopesExpr})`
        : `(${selectedScopesExpr})`;
      scopes = `scopes: options.credentials?.scopes ?? ${defaultScopesExpr},`;
    }
  }

  const apiKeyHeaderName = serviceConfigs.hasApiKeyAuth
    ? `apiKeyHeaderName: options.credentials?.apiKeyHeaderName ?? selectedConfiguration.apiKeyHeaderName,`
    : "";

  if (!scopes && !apiKeyHeaderName) {
    return undefined;
  }

  return `{ ${scopes}${apiKeyHeaderName} }`;
}

function buildCredentials(
  emitterOptions: ModularEmitterOptions,
  endpointParam: string,
): string | undefined {
  if (!emitterOptions.options.addCredentials) {
    return undefined;
  }

  const { credentialScopes, credentialKeyHeaderName } = emitterOptions.options;

  const scopesString = credentialScopes
    ? credentialScopes.map((cs) => `"${cs}"`).join(", ") || `\`\${${endpointParam}}/.default\``
    : "";
  const scopes = scopesString ? `scopes: options.credentials?.scopes ?? [${scopesString}],` : "";

  const apiKeyHeaderName = credentialKeyHeaderName
    ? `apiKeyHeaderName: options.credentials?.apiKeyHeaderName ?? "${credentialKeyHeaderName}",`
    : "";

  if (!scopes && !apiKeyHeaderName) {
    return undefined;
  }

  return `{ ${scopes}${apiKeyHeaderName} }`;
}

function buildLoggingOptions(): string | undefined {
  return `{ ...options.loggingOptions, logger: options.loggingOptions?.logger ?? logger.info }`;
}

/**
 * Builds the `userAgentOptions` for the generated client, producing a telemetry
 * prefix of the form `[<application_id> ]azsdk-js-<package>/<version>` per the Azure
 * Core telemetry policy: https://azure.github.io/azure-sdk/general_azurecore.html#telemetry-policy
 */
export function buildUserAgentOptions(
  context: StatementedNode & Node,
  emitterOptions: ModularEmitterOptions,
): string {
  const userAgentStatements = [];
  const prefixFromOptions = "const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;";
  userAgentStatements.push(prefixFromOptions);

  const packageName = emitterOptions.options.packageDetails?.name;
  const clientPackageName =
    emitterOptions.options.packageDetails?.nameWithoutScope ?? packageName ?? "";

  // The version is read from the generated package.json at runtime rather than
  // hardcoded here: once the package is generated, its version is owned by
  // package.json. We import it via the package's own "./package.json" export so
  // the specifier is identical in `src` and the built `dist` output.
  let userAgentInfoStatement = "";
  if (clientPackageName && packageName) {
    const packageJsonModule = `${packageName}/package.json`;
    const sourceFile = context.getSourceFile();
    const hasPackageJsonImport = sourceFile
      .getImportDeclarations()
      .some((declaration) => declaration.getModuleSpecifierValue() === packageJsonModule);
    if (!hasPackageJsonImport) {
      sourceFile.addImportDeclaration({
        defaultImport: "pkgJson",
        moduleSpecifier: packageJsonModule,
        attributes: [{ name: "type", value: "json" }],
      });
    }
    userAgentInfoStatement =
      "const userAgentInfo = `azsdk-js-" + clientPackageName + "/${pkgJson.version}`;";
  }

  if (!userAgentInfoStatement) {
    // Without package name/version we cannot build a meaningful telemetry token,
    // so we leave the user agent untouched (the caller's userAgentOptions still flow
    // through `...options`) and let core-rest-pipeline defaults apply.
    return "";
  }

  userAgentStatements.push(userAgentInfoStatement);
  const userAgentPrefix =
    "const userAgentPrefix = prefixFromOptions ? `${prefixFromOptions} ${userAgentInfo}` : `${userAgentInfo}`;";
  userAgentStatements.push(userAgentPrefix);

  context.addStatements(userAgentStatements.join("\n"));

  return `{ userAgentPrefix }`;
}
