import {
  buildGetClientCredentialParam,
  buildGetClientEndpointParam,
  buildGetClientOptionsParam,
  getClientParameterName,
  getClientParameters,
  getClientParametersDeclaration,
  getClientParameterTypeExpression,
} from "./helpers/client-helpers.js";
import type { ModularEmitterOptions } from "./interfaces.js";

import type {
  SdkClientType,
  SdkCredentialParameter,
  SdkEndpointParameter,
  SdkHttpParameter,
  SdkMethodParameter,
  SdkServiceOperation,
} from "@azure-tools/typespec-client-generator-core";
import { NoTarget } from "@typespec/compiler";
import { SourceFile, VariableDeclarationKind } from "ts-morph";
import { useContext } from "../context-manager.js";
import { useDependencies } from "../framework/hooks/use-dependencies.js";
import { resolveReference } from "../framework/reference.js";
import { refkey } from "../framework/refkey.js";
import { reportDiagnostic } from "../lib.js";
import { getClientModuleInfo } from "../utils/client-utils.js";
import type { SdkContext } from "../utils/interfaces.js";
import { NameType, normalizeName } from "../utils/name-utils.js";
import { buildEnumTypes, getApiVersionEnum } from "./emit-models.js";
import { getDocsFromDescription } from "./helpers/docs-helpers.js";
import { getClassicalClientName, getClientName } from "./helpers/naming-helpers.js";
import {
  collectServiceConfigurationTemplateParams,
  getClientServiceConfigurations,
  type ResolvedServiceConfigurations,
} from "./helpers/service-configuration-helpers.js";
import { CloudSettingHelpers } from "./static-helpers-metadata.js";
import { getTypeExpression } from "./type-expressions/get-type-expression.js";

/**
 * This function gets the path of the file containing the modular client context
 */
export function getClientContextPath(
  clientMap: [string[], SdkClientType<SdkServiceOperation>],
  emitterOptions: ModularEmitterOptions,
): string {
  const [_, client] = clientMap;
  const { subfolder } = getClientModuleInfo(clientMap);
  const name = getClientName(client);
  const srcPath = emitterOptions.modularOptions.sourceRoot;
  const contentPath = `${srcPath}/${
    subfolder && subfolder !== "" ? subfolder + "/" : ""
  }api/${normalizeName(name, NameType.File)}Context.ts`;
  return contentPath;
}

/**
 * This function creates the file containing the modular client context
 */
export function buildClientContext(
  dpgContext: SdkContext,
  clientMap: [string[], SdkClientType<SdkServiceOperation>],
  emitterOptions: ModularEmitterOptions,
): SourceFile {
  const project = useContext("outputProject");
  const dependencies = useDependencies();
  const [hierarchy, client] = clientMap;
  const name = getClientName(client);
  const { clientName } = getClientModuleInfo(clientMap);
  const requiredParams = getClientParametersDeclaration(client, dpgContext, {
    onClientOnly: false,
    requiredOnly: true,
    apiVersionAsRequired: true,
  });
  const clientContextFile = project.createSourceFile(
    getClientContextPath(clientMap, emitterOptions),
  );

  // Get all client parameters (both required and optional) for the interface
  const requiredInterfaceProperties = getClientParameters(client, dpgContext, {
    onClientOnly: false,
    requiredOnly: true,
  })
    .filter((p) => {
      const clientParamName = getClientParameterName(p);
      return clientParamName !== "endpointParam" && clientParamName !== "credential";
    })
    .map((p) => {
      return {
        name: getClientParameterName(p),
        type: getTypeExpression(dpgContext, p.type),
        hasQuestionToken: false,
        docs: getDocsWithKnownVersion(dpgContext, p),
      };
    });

  // Collect names of required properties to avoid duplicates
  const requiredPropertyNames = new Set(requiredInterfaceProperties.map((p) => p.name));

  const optionalInterfaceProperties = getClientParameters(client, dpgContext, {
    onClientOnly: false,
    optionalOnly: true,
  })
    .filter((p) => {
      const clientParamName = getClientParameterName(p);
      return (
        clientParamName !== "endpointParam" &&
        clientParamName !== "credential" &&
        clientParamName !== "endpoint" &&
        !requiredPropertyNames.has(clientParamName) // Avoid duplicating required properties
      );
    })
    .map((p) => {
      return {
        name: getClientParameterName(p),
        type: getTypeExpression(dpgContext, p.type),
        hasQuestionToken: true,
        docs: getDocsWithKnownVersion(dpgContext, p),
      };
    });

  clientContextFile.addInterface({
    isExported: true,
    name: `${clientName}`,
    extends: [resolveReference(dependencies.Client)],
    docs: getDocsFromDescription(client.doc),
    properties: [...requiredInterfaceProperties, ...optionalInterfaceProperties],
  });

  const classicalClientName = getClassicalClientName(client);
  const serviceConfigs = getClientServiceConfigurations(client);
  const credentialsEnabled = emitterOptions.options.addCredentials !== false;
  if (serviceConfigs) {
    clientContextFile.addTypeAlias({
      isExported: true,
      name: serviceConfigs.serviceConfigTypeName,
      type: serviceConfigs.configurations.map((c) => JSON.stringify(c.name)).join(" | "),
      docs: [`Supported service configuration names for {@link ${classicalClientName}}.`],
    });
    if (serviceConfigs.knownAudienceEnumName && credentialsEnabled) {
      clientContextFile.addEnum({
        isExported: true,
        name: serviceConfigs.knownAudienceEnumName,
        docs: [`Known Microsoft Entra audiences for {@link ${classicalClientName}}.`],
        members: serviceConfigs.audienceMembers.map((member) => ({
          name: member.memberName,
          value: member.value,
          docs: [
            `Audience for the ${JSON.stringify(member.configurationName)} service configuration.`,
          ],
        })),
      });
    }
    emitServiceConfigurationsLookup(
      clientContextFile,
      dpgContext,
      serviceConfigs,
      credentialsEnabled,
    );
  }

  const propertiesInOptions = getClientParameters(client, dpgContext, {
    optionalOnly: true,
  })
    .filter(
      (p) =>
        getClientParameterName(p) !== "endpoint" &&
        !(
          serviceConfigs?.endpointMode === "fixed" && getClientParameterName(p) === "endpointParam"
        ),
    )
    .map((p) => {
      return {
        name: getClientParameterName(p),
        type:
          p.name.toLowerCase() === "apiversion" ? "string" : getTypeExpression(dpgContext, p.type),
        hasQuestionToken: true,
        docs: getDocsWithKnownVersion(dpgContext, p),
      };
    });
  if (dpgContext.arm) {
    propertiesInOptions.push({
      name: "cloudSetting",
      type: `${resolveReference(CloudSettingHelpers.AzureSupportedClouds)}`,
      hasQuestionToken: true,
      docs: [`Specifies the Azure cloud environment for the client.`],
    });
  }
  // check if we have duplication options
  const existingOptionNames = new Set<string>();
  for (const property of propertiesInOptions) {
    if (existingOptionNames.has(property.name)) {
      reportDiagnostic(dpgContext.program, {
        code: "parameter-name-conflict",
        format: { parameterName: property.name },
        target: NoTarget,
      });
    }
    existingOptionNames.add(property.name);
  }
  let hasServiceConfigurationOption = false;
  let hasAudienceOption = false;
  if (serviceConfigs) {
    if (serviceConfigs.endpointMode === "templated") {
      const templateParams = collectServiceConfigurationTemplateParams(
        dpgContext,
        serviceConfigs,
        getClientParameterName,
        getClientParameterTypeExpression,
      );
      for (const tp of templateParams) {
        if (
          tp.optional &&
          !existingOptionNames.has(tp.paramName) &&
          !requiredParams.some((rp) => rp.name === tp.paramName)
        ) {
          propertiesInOptions.push({
            name: tp.paramName,
            type: tp.typeExpression,
            hasQuestionToken: true,
            docs: [],
          });
          existingOptionNames.add(tp.paramName);
        }
      }
    }
    if (
      !existingOptionNames.has("serviceConfiguration") &&
      !requiredParams.some((rp) => rp.name === "serviceConfiguration")
    ) {
      propertiesInOptions.push({
        name: "serviceConfiguration",
        type: serviceConfigs.serviceConfigTypeName,
        hasQuestionToken: true,
        docs: [
          `Service configuration name to use for default endpoint and authentication settings. Defaults to ${JSON.stringify(serviceConfigs.defaultConfiguration)}.`,
        ],
      });
      existingOptionNames.add("serviceConfiguration");
      hasServiceConfigurationOption = true;
    }
    if (
      serviceConfigs.knownAudienceEnumName &&
      credentialsEnabled &&
      !existingOptionNames.has("audience") &&
      !requiredParams.some((rp) => rp.name === "audience")
    ) {
      propertiesInOptions.push({
        name: "audience",
        type: "string",
        hasQuestionToken: true,
        docs: [
          `The Microsoft Entra audience to use for authentication. {@link ${serviceConfigs.knownAudienceEnumName}} can be used interchangeably with audience.`,
        ],
      });
      existingOptionNames.add("audience");
      hasAudienceOption = true;
    }
  }
  clientContextFile.addInterface({
    name: `${classicalClientName}OptionalParams`,
    isExported: true,
    extends: [resolveReference(dependencies.ClientOptions)],
    properties: propertiesInOptions,
    docs: ["Optional parameters for the client."],
  });

  // TODO use binder here
  clientContextFile.addImportDeclaration({
    moduleSpecifier: "../".repeat(hierarchy.length + 1) + "logger.js",
    namedImports: ["logger"],
  });

  const factoryFunction = clientContextFile.addFunction({
    docs: getDocsFromDescription(client.doc),
    name: `create${name}`,
    returnType: `${clientName}`,
    parameters: getClientParametersDeclaration(client, dpgContext, {
      onClientOnly: false,
      requiredOnly: true,
    }),
    isExported: true,
  });

  if (serviceConfigs) {
    const configSelectorExpr = hasServiceConfigurationOption
      ? `options.serviceConfiguration ?? ${JSON.stringify(serviceConfigs.defaultConfiguration)}`
      : JSON.stringify(serviceConfigs.defaultConfiguration);
    factoryFunction.addStatements([
      `const selectedConfigurationName = ${configSelectorExpr};`,
      `const selectedConfiguration = serviceConfigurations[selectedConfigurationName];`,
      `if (!selectedConfiguration) {
        throw new Error(\`Unsupported serviceConfiguration "\${String(selectedConfigurationName)}".\`);
      }`,
    ]);
  }

  const { endpointParamName: endpointParam, assignedOptionalParams } = buildGetClientEndpointParam(
    factoryFunction,
    dpgContext,
    client,
    serviceConfigs,
  );
  const credentialParam = buildGetClientCredentialParam(client, emitterOptions, serviceConfigs);

  // Get api version param early so we can use its name when building options
  const apiVersionParam = getClientParameters(client, dpgContext).find((x) => x.isApiVersionParam);
  const apiVersionParamName = apiVersionParam ? getClientParameterName(apiVersionParam) : undefined;

  const optionsParam = buildGetClientOptionsParam(
    factoryFunction,
    emitterOptions,
    endpointParam,
    apiVersionParamName,
    serviceConfigs
      ? {
          serviceConfigs,
          hasServiceConfigurationOption,
          hasAudienceOption,
        }
      : undefined,
  );

  factoryFunction.addStatements(
    `const clientContext = ${resolveReference(
      dependencies.getClient,
    )}(${endpointParam}, ${credentialParam}, ${optionsParam});`,
  );

  const { customHttpAuthHeaderName, customHttpAuthSharedKeyPrefix } = emitterOptions.options;

  if (serviceConfigs && serviceConfigs.hasCustomHttpAuth && credentialsEnabled) {
    factoryFunction.addStatements(`
      if (
        selectedConfiguration.customHttpAuthHeaderName &&
        selectedConfiguration.customHttpAuthSharedKeyPrefix &&
        ${resolveReference(dependencies.isKeyCredential)}(credential)
      ) {
        const headerName = selectedConfiguration.customHttpAuthHeaderName;
        const keyPrefix = selectedConfiguration.customHttpAuthSharedKeyPrefix;
        clientContext.pipeline.addPolicy({
          name: "customKeyCredentialPolicy",
          sendRequest(request, next) {
            request.headers.set(headerName, keyPrefix + " " + credential.key);
            return next(request);
          }
        });
      }
      `);
  } else if (!serviceConfigs && customHttpAuthHeaderName && customHttpAuthSharedKeyPrefix) {
    factoryFunction.addStatements(`
      if(${resolveReference(dependencies.isKeyCredential)}(credential)) {
        clientContext.pipeline.addPolicy({ 
          name: "customKeyCredentialPolicy",
          sendRequest(request, next) {
            request.headers.set("${customHttpAuthHeaderName}", "${customHttpAuthSharedKeyPrefix} " + credential.key);
            return next(request);
          }
        });
      }
      `);
  }

  let apiVersionStatement = ``;
  const endpointParameter = getClientParameters(client, dpgContext, {
    onClientOnly: false,
    requiredOnly: true,
    skipEndpointTemplate: true,
  }).find((x) => x.kind === "endpoint");
  if (apiVersionParam) {
    const templateArguments =
      endpointParameter && endpointParameter.type.kind === "endpoint"
        ? endpointParameter.type.templateArguments
        : endpointParameter && endpointParameter.type.kind === "union"
          ? endpointParameter.type.variantTypes[0]?.templateArguments
          : [];
    const apiVersionInEndpoint =
      templateArguments && templateArguments.find((p) => p.isApiVersionParam);
    if (!apiVersionInEndpoint && apiVersionParam.clientDefaultValue) {
      apiVersionStatement += `const ${apiVersionParamName} = options.${apiVersionParamName};`;
    }
  } else {
    apiVersionStatement += `
        if (options.apiVersion) {
          logger.warning("This client does not support client api-version, please change it at the operation level");
        }`;
  }
  factoryFunction.addStatements(apiVersionStatement);

  const contextRequiredParam = requiredParams.filter(
    (p) => p.name !== "endpointParam" && p.name !== "credential" && p.name !== "options",
  );

  // Collect names of required parameters to avoid duplicates
  const requiredParamNames = new Set(contextRequiredParam.map((p) => p.name));

  // Also include optional parameters from clientInitialization that should be passed through
  const contextOptionalParams = getClientParameters(client, dpgContext, {
    optionalOnly: true,
    onClientOnly: false,
  }).filter((p) => {
    const clientParamName = getClientParameterName(p);
    return (
      clientParamName !== "endpointParam" &&
      clientParamName !== "credential" &&
      clientParamName !== "endpoint" &&
      !requiredParamNames.has(clientParamName) // Avoid duplicating required parameters
    );
  });

  // Build context params, checking if param was already assigned as a required param
  const allContextParams = [
    ...contextRequiredParam.map((p) => p.name),
    ...contextOptionalParams.map((p) => {
      const clientParamName = getClientParameterName(p);
      // If this param was already assigned (e.g., as a required param or in endpoint building), use the value directly
      // Otherwise, get it from options
      if (
        requiredParamNames.has(clientParamName) ||
        (assignedOptionalParams && assignedOptionalParams.has(clientParamName))
      ) {
        return clientParamName;
      }
      return `${clientParamName}: options.${clientParamName}`;
    }),
  ];

  if (allContextParams.length) {
    factoryFunction.addStatements(
      `return { ...clientContext, ${allContextParams.join(", ")}} as ${clientName};`,
    );
  } else {
    factoryFunction.addStatements(`return clientContext;`);
  }

  clientContextFile.fixMissingImports({}, { importModuleSpecifierEnding: "js" });

  clientContextFile.fixUnusedIdentifiers();
  return clientContextFile;
}

function emitServiceConfigurationsLookup(
  clientContextFile: SourceFile,
  dpgContext: SdkContext,
  serviceConfigs: ResolvedServiceConfigurations,
  credentialsEnabled: boolean,
) {
  const typeFields: string[] = [];
  const templateParams =
    serviceConfigs.endpointMode === "templated"
      ? collectServiceConfigurationTemplateParams(
          dpgContext,
          serviceConfigs,
          getClientParameterName,
          getClientParameterTypeExpression,
        )
      : [];
  const perConfigDefaultParams = templateParams.filter((tp) => tp.hasPerConfigDefaults);

  if (serviceConfigs.endpointMode === "fixed") {
    typeFields.push("endpoint: string");
  } else if (serviceConfigs.endpointMode === "templated") {
    if (perConfigDefaultParams.length > 0) {
      typeFields.push(
        `defaults: { ${perConfigDefaultParams.map((tp) => `${tp.paramName}?: ${tp.typeExpression}`).join("; ")} }`,
      );
    }
    const paramTypeProps = templateParams
      .map(
        (tp) =>
          `${tp.paramName}: ${tp.typeExpression}${tp.optional && tp.uniformDefault === undefined ? " | undefined" : ""}`,
      )
      .join("; ");
    typeFields.push(`buildEndpoint: (params: { ${paramTypeProps} }) => string`);
  }

  const allHaveNonEmptyOAuth2Scopes =
    credentialsEnabled &&
    serviceConfigs.hasOAuth2 &&
    serviceConfigs.configurations.every((c) => c.hasOAuth2 && c.oauth2Scopes.length > 0);
  const allHaveApiKey =
    credentialsEnabled &&
    serviceConfigs.hasApiKeyAuth &&
    serviceConfigs.configurations.every((c) => Boolean(c.apiKeyHeaderName));

  if (credentialsEnabled && serviceConfigs.hasOAuth2) {
    if (!allHaveNonEmptyOAuth2Scopes) {
      typeFields.push("hasOAuth2: boolean");
    }
    typeFields.push("scopes: string[]");
  }
  if (credentialsEnabled && serviceConfigs.hasApiKeyAuth) {
    typeFields.push(`apiKeyHeaderName${allHaveApiKey ? "" : "?"}: string`);
  }
  if (credentialsEnabled && serviceConfigs.hasCustomHttpAuth) {
    typeFields.push("customHttpAuthHeaderName?: string");
    typeFields.push("customHttpAuthSharedKeyPrefix?: string");
  }

  const entryObjectTexts = serviceConfigs.configurations.map((cfg) => {
    const props: string[] = [];
    if (serviceConfigs.endpointMode === "fixed") {
      props.push(`endpoint: ${JSON.stringify(cfg.serverUrl)}`);
    } else if (serviceConfigs.endpointMode === "templated") {
      if (perConfigDefaultParams.length > 0) {
        const defaultProps = perConfigDefaultParams
          .map((tp) => {
            const val = tp.perConfigDefaults.get(cfg.name);
            return val !== undefined ? `${tp.paramName}: ${JSON.stringify(val)}` : undefined;
          })
          .filter((x): x is string => Boolean(x));
        props.push(`defaults: { ${defaultProps.join(", ")} }`);
      }
      const usedParams = templateParams.filter((tp) => cfg.serverUrl.includes(`{${tp.rawName}}`));
      if (usedParams.length === 0) {
        props.push(`buildEndpoint: () => ${JSON.stringify(cfg.serverUrl)}`);
      } else {
        let templateLiteral = cfg.serverUrl.replace(/`/g, "\\`");
        for (const tp of usedParams) {
          templateLiteral = templateLiteral.replaceAll(`{${tp.rawName}}`, `\${${tp.paramName}}`);
        }
        props.push(
          `buildEndpoint: ({ ${usedParams.map((tp) => tp.paramName).join(", ")} }) => \`${templateLiteral}\``,
        );
      }
    }

    if (credentialsEnabled && serviceConfigs.hasOAuth2) {
      if (!allHaveNonEmptyOAuth2Scopes) {
        props.push(`hasOAuth2: ${cfg.hasOAuth2}`);
      }
      props.push(`scopes: [${cfg.oauth2Scopes.map((s) => JSON.stringify(s)).join(", ")}]`);
    }
    if (credentialsEnabled && serviceConfigs.hasApiKeyAuth && cfg.apiKeyHeaderName) {
      props.push(`apiKeyHeaderName: ${JSON.stringify(cfg.apiKeyHeaderName)}`);
    }
    if (
      credentialsEnabled &&
      serviceConfigs.hasCustomHttpAuth &&
      cfg.customHttpAuthHeaderName &&
      cfg.customHttpAuthSharedKeyPrefix
    ) {
      props.push(`customHttpAuthHeaderName: ${JSON.stringify(cfg.customHttpAuthHeaderName)}`);
      props.push(
        `customHttpAuthSharedKeyPrefix: ${JSON.stringify(cfg.customHttpAuthSharedKeyPrefix)}`,
      );
    }

    const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(cfg.name) ? cfg.name : JSON.stringify(cfg.name);
    return `${key}: { ${props.join(", ")} }`;
  });

  clientContextFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "serviceConfigurations",
        type: `Record<${serviceConfigs.serviceConfigTypeName}, { ${typeFields.join("; ")} }>`,
        initializer: `{ ${entryObjectTexts.join(", ")} }`,
      },
    ],
  });
}

function getDocsWithKnownVersion(
  dpgContext: SdkContext,
  param: SdkMethodParameter | SdkEndpointParameter | SdkCredentialParameter | SdkHttpParameter,
) {
  const docs = getDocsFromDescription(param.doc);
  if (param.name.toLowerCase() !== "apiversion") {
    return docs;
  }
  const apiVersionEnum = getApiVersionEnum(dpgContext);
  if (apiVersionEnum) {
    const [_, knownValuesEnum] = buildEnumTypes(dpgContext, apiVersionEnum, true);
    docs.push(
      `Known values of {@link ${resolveReference(refkey(knownValuesEnum.name, "knownValues"))}} that the service accepts.`,
    );
  }
  return docs;
}
