import { getHttpOperationWithCache } from "@azure-tools/typespec-client-generator-core";
import { getDoc, NoTarget, Program } from "@typespec/compiler";
import { getAuthentication } from "@typespec/http";
import { EmitterOptions, reportDiagnostic } from "../lib.js";
import { getClientParameters } from "../modular/helpers/client-helpers.js";
import { getClients, listOperationsUnderClient } from "../utils/client-utils.js";
import { getSupportedHttpAuth } from "../utils/credential-utils.js";
import { SdkContext } from "../utils/interfaces.js";
import { getDefaultService } from "../utils/model-utils.js";
import { detectModelConflicts } from "../utils/namespace-utils.js";
import { getOperationName } from "../utils/operation-util.js";
import { NameType, normalizeName, pascalCase } from "../utils/name-utils.js";
import { PackageDetails, ClientOptions, ServiceInfo } from "../interfaces.js";

export function transformClientOptions(
  emitterOptions: EmitterOptions,
  dpgContext: SdkContext,
): ClientOptions {
  // Extract the options from emitter option
  const options = extractRLCOptions(
    dpgContext,
    emitterOptions,
    dpgContext.generationPathDetail?.rootDir ?? "",
  );
  const batch = getClients(dpgContext);
  options.batch = batch;
  return options;
}
function extractRLCOptions(
  dpgContext: SdkContext,
  emitterOptions: EmitterOptions,
  generationRootDir: string,
): ClientOptions {
  const program = dpgContext.program;
  const packageDetails = getPackageDetails(program, emitterOptions);
  const serviceInfo = getServiceInfo(program);
  const includeHeadersInResponse = emitterOptions["include-headers-in-response"] === true;
  const generateMetadata = getGenerateMetadata(emitterOptions);
  const generateTest = getGenerateTest(emitterOptions);
  const generateSample = getGenerateSample(dpgContext, emitterOptions);
  const credentialInfo = getCredentialInfo(program, emitterOptions);
  const azureOutputDirectory = getAzureOutputDirectory(generationRootDir);
  const enableOperationGroup = getEnableOperationGroup(dpgContext, emitterOptions);
  const enableModelNamespace = getEnableModelNamespace(dpgContext, emitterOptions);
  const hierarchyClient = getHierarchyClient(emitterOptions);
  const clearOutputFolder = getClearOutputFolder(emitterOptions);
  const isTypeSpecTest = emitterOptions["is-typespec-test"];
  const compatibilityMode = emitterOptions["compatibility-mode"];
  const compatibilityLro = emitterOptions["compatibility-lro"];
  const experimentalExtensibleEnums = emitterOptions["experimental-extensible-enums"];
  const ignorePropertyNameNormalize = emitterOptions["ignore-property-name-normalize"];
  const ignoreEnumMemberNameNormalize = emitterOptions["ignore-enum-member-name-normalize"];
  const compatibilityQueryMultiFormat = emitterOptions["compatibility-query-multi-format"];
  const enableStorageCompat = emitterOptions["enable-storage-compat"] === true;
  const treatUnknownAsRecord = emitterOptions["treat-unknown-as-record"] === true;
  const typespecTitleMap = emitterOptions["typespec-title-map"];
  const generateReactNativeTarget = emitterOptions["generate-react-native-target"] === true;
  const hasSubscriptionId = getSubscriptionId(dpgContext);
  const ignoreNullableOnOptional = getIgnoreNullableOnOptional(emitterOptions);
  const wrapNonModelReturn = getWrapNonModelReturn(emitterOptions);
  const isMultiService = (dpgContext.allServiceNamespaces?.length ?? 0) > 1;

  return {
    ...credentialInfo,
    includeHeadersInResponse,
    packageDetails,
    generateMetadata,
    generateTest,
    generateSample,
    serviceInfo,
    azureOutputDirectory,
    enableOperationGroup,
    enableModelNamespace,
    hierarchyClient,
    azureArm: dpgContext.arm,
    clearOutputFolder,
    isTypeSpecTest,
    compatibilityMode,
    compatibilityLro,
    experimentalExtensibleEnums,
    ignorePropertyNameNormalize,
    compatibilityQueryMultiFormat,
    typespecTitleMap,
    ignoreEnumMemberNameNormalize,
    hasSubscriptionId,
    ignoreNullableOnOptional,
    wrapNonModelReturn,
    isMultiService,
    enableStorageCompat,
    treatUnknownAsRecord,
    generateReactNativeTarget,
  };
}

function processAuth(program: Program) {
  const serviceNs = getDefaultService(program)?.type;
  if (!serviceNs) {
    return undefined;
  }
  const authorization = getAuthentication(program, serviceNs);
  if (!authorization || !authorization.options) {
    return undefined;
  }
  const securityInfo: ClientOptions = {};
  for (const auth of getSupportedHttpAuth(program, authorization)) {
    switch (auth.type) {
      case "http":
        securityInfo.addCredentials = true;
        securityInfo.customHttpAuthHeaderName = "Authorization";
        // If it is basic or bearer auth we should generate it as Basic or Bearer
        securityInfo.customHttpAuthSharedKeyPrefix = ["basic", "bearer"].includes(
          auth.scheme.toLowerCase(),
        )
          ? pascalCase(auth.scheme)
          : auth.scheme;
        break;
      case "apiKey":
        if (auth.in === "cookie") {
          return undefined;
        }
        securityInfo.addCredentials = true;
        securityInfo.credentialKeyHeaderName = auth.name;
        break;
      case "oauth2": {
        const flow = auth.flows[0];
        if (flow === undefined || !flow.scopes) {
          return undefined;
        }
        securityInfo.addCredentials = true;
        if (!securityInfo.credentialScopes) {
          securityInfo.credentialScopes = [];
        }
        if (flow.scopes.length === 0) {
          reportDiagnostic(program, {
            code: "no-credential-scopes",
            target: NoTarget,
          });
        }
        // ignore the user_impersonation scope
        if (
          flow.scopes.length === 1 &&
          flow.scopes[0] &&
          flow.scopes[0].value.toLowerCase() === "user_impersonation"
        ) {
          return securityInfo;
        }
        securityInfo.credentialScopes.push(
          ...flow.scopes.map((item) => {
            return item.value;
          }),
        );
        break;
      }
      default:
        break;
    }
  }
  return securityInfo;
}

function getEnableOperationGroup(dpgContext: SdkContext, emitterOptions: EmitterOptions) {
  if (
    emitterOptions["enable-operation-group"] === true ||
    emitterOptions["enable-operation-group"] === false
  ) {
    return emitterOptions["enable-operation-group"];
  }
  // Only detect if existing name conflicts if customers don't set hierarchyClient to true
  return detectIfNameConflicts(dpgContext);
}

function getEnableModelNamespace(dpgContext: SdkContext, emitterOptions: EmitterOptions) {
  if (
    emitterOptions["enable-model-namespace"] === true ||
    emitterOptions["enable-model-namespace"] === false
  ) {
    return emitterOptions["enable-model-namespace"];
  }
  // Detect if existing name conflicts if customers didn't set the option explicitly
  return detectModelConflicts(dpgContext);
}

function getHierarchyClient(emitterOptions: EmitterOptions) {
  if (emitterOptions["hierarchy-client"] === true || emitterOptions["hierarchy-client"] === false) {
    return emitterOptions["hierarchy-client"];
  }
  // enable hierarchy client by default if customers didn't set the option explicitly
  return true;
}

function getClearOutputFolder(emitterOptions: EmitterOptions) {
  return emitterOptions["clear-output-folder"] ? true : false;
}

function detectIfNameConflicts(dpgContext: SdkContext) {
  const clients = getClients(dpgContext);
  for (const client of clients) {
    // only consider it's conflict when there are conflicts in the same client
    const nameSet = new Set<string>();
    for (const op of listOperationsUnderClient(client)) {
      const route = getHttpOperationWithCache(dpgContext, op);
      const name = getOperationName(dpgContext, route.operation);
      if (nameSet.has(name)) {
        return true;
      } else {
        nameSet.add(name);
      }
    }
  }

  // No conflicts if we didn't detect any
  return false;
}

function getIgnoreNullableOnOptional(emitterOptions: EmitterOptions): boolean {
  // If explicitly set in options, use that value
  if (emitterOptions["ignore-nullable-on-optional"] !== undefined) {
    return Boolean(emitterOptions["ignore-nullable-on-optional"]);
  }
  // Default to true (same as HLC behavior)
  return true;
}

function getWrapNonModelReturn(emitterOptions: EmitterOptions): boolean {
  // If explicitly set in options, use that value
  if (emitterOptions["wrap-non-model-return"] !== undefined) {
    return Boolean(emitterOptions["wrap-non-model-return"]);
  }
  // Default to true to maintain HLC backward compatibility
  return true;
}

function buildPackageDetails(program: Program, emitterOptions: EmitterOptions): PackageDetails {
  const defaultDetail = {
    name: "@msinternal/unamedpackage",
    nameWithoutScope: "unamedpackage",
    version: "1.0.0-beta.1",
  };
  const isVersionUserProvided = Boolean(emitterOptions["package-details"]?.version);
  const packageDetails: PackageDetails = {
    ...emitterOptions["package-details"],
    name:
      emitterOptions["package-details"]?.name ??
      normalizeName(getDefaultService(program)?.title ?? "", NameType.Class),
    version: emitterOptions["package-details"]?.version ?? "1.0.0-beta.1",
    isVersionUserProvided,
  };
  if (emitterOptions["package-details"]?.name) {
    const nameParts = emitterOptions["package-details"]?.name.split("/");
    if (nameParts.length === 2) {
      packageDetails.nameWithoutScope = nameParts[1];
      packageDetails.scopeName = nameParts[0]?.replace("@", "");
    }
  }
  return packageDetails ?? defaultDetail;
}

function getPackageDetails(program: Program, emitterOptions: EmitterOptions): PackageDetails {
  return buildPackageDetails(program, emitterOptions);
}

function getServiceInfo(program: Program): ServiceInfo {
  const defaultService = getDefaultService(program);
  return {
    title: defaultService?.title,
    description: defaultService && getDoc(program, defaultService.type),
  };
}

function getGenerateMetadata(emitterOptions: EmitterOptions) {
  if (
    emitterOptions["generate-metadata"] === undefined ||
    emitterOptions["generate-metadata"] === null
  ) {
    return undefined;
  }
  return Boolean(emitterOptions["generate-metadata"]);
}

/**
 * In azure scope, by default we generate test.
 * @param emitterOptions
 * @returns
 */
function getGenerateTest(emitterOptions: EmitterOptions) {
  return emitterOptions["generate-test"];
}

/**
 * In azure scope, by default we generate test.
 * @param emitterOptions
 * @returns
 */
function getGenerateSample(dpgContext: SdkContext, emitterOptions: EmitterOptions) {
  if (dpgContext.arm && emitterOptions["generate-sample"] === undefined) {
    return true;
  }
  if (
    emitterOptions["generate-sample"] === undefined ||
    emitterOptions["generate-sample"] === null
  ) {
    return undefined;
  }
  return Boolean(emitterOptions["generate-sample"]);
}

export function getCredentialInfo(program: Program, emitterOptions: EmitterOptions) {
  const securityInfo = processAuth(program);
  const addCredentials =
    emitterOptions["add-credentials"] === false
      ? false
      : securityInfo
        ? securityInfo.addCredentials
        : emitterOptions["add-credentials"];
  const credentialScopes =
    securityInfo && securityInfo.credentialScopes
      ? securityInfo.credentialScopes
      : emitterOptions["credential-scopes"];
  const credentialKeyHeaderName =
    securityInfo && securityInfo.credentialKeyHeaderName
      ? securityInfo.credentialKeyHeaderName
      : emitterOptions["credential-key-header-name"];
  const customHttpAuthHeaderName =
    securityInfo && securityInfo.customHttpAuthHeaderName
      ? securityInfo.customHttpAuthHeaderName
      : emitterOptions["custom-http-auth-header-name"];
  const customHttpAuthSharedKeyPrefix =
    securityInfo && securityInfo.customHttpAuthSharedKeyPrefix
      ? securityInfo.customHttpAuthSharedKeyPrefix
      : emitterOptions["custom-http-auth-shared-key-prefix"];
  return {
    addCredentials,
    credentialScopes,
    credentialKeyHeaderName,
    customHttpAuthHeaderName,
    customHttpAuthSharedKeyPrefix,
  };
}

function getAzureOutputDirectory(emitterOutputDir: string): string | undefined {
  const sdkFolder = emitterOutputDir;
  const sdkReletivePath = sdkFolder?.replace(/\/$/, "").split("/").slice(-3).join("/");
  return sdkReletivePath?.substring(0, 3) === "sdk" ? sdkReletivePath : undefined;
}

export function getSubscriptionId(dpgContext: SdkContext) {
  for (const client of dpgContext.sdkPackage.clients) {
    if (
      getClientParameters(client, dpgContext)
        .map((item) => item.name)
        .includes("subscriptionId")
    ) {
      return true;
    }
  }
  return false;
}
