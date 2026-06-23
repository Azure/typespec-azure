// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { SdkClient } from "@azure-tools/typespec-client-generator-core";
import { getDoc, joinPaths } from "@typespec/compiler";
import { getServers } from "@typespec/http";
import {
  buildRuntimeImports,
  Imports,
  initInternalImports,
  NameType,
  normalizeName,
  OperationParameter,
  OperationResponse,
  PathParameter,
  Paths,
  RLCModel,
  RLCOptions,
  Schema,
  SchemaContext,
  UrlInfo,
} from "../rlc-common/index.js";
import { SdkContext } from "../utils/interfaces.js";
import {
  getDefaultService,
  getFormattedPropertyDoc,
  getImportedModelName,
  getSchemaForType,
  getTypeName,
  predictDefaultValue,
} from "../utils/model-utils.js";
import { getClientLroOverload } from "../utils/operation-util.js";
import { transformApiVersionInfo } from "./transform-api-version-info.js";
import { transformHelperFunctionDetails } from "./transform-helper-function-details.js";
import { transformToParameterTypes } from "./transform-parameters.js";
import { transformPaths } from "./transform-paths.js";
import { transformToResponseTypes } from "./transform-responses.js";
import { transformSchemas } from "./transform-schemas.js";
import { transformTelemetryInfo } from "./transform-telemetry-info.js";

export async function transformRLCModel(
  client: SdkClient,
  dpgContext: SdkContext,
): Promise<RLCModel> {
  const program = dpgContext.program;
  const options: RLCOptions = dpgContext.rlcOptions!;
  const rlcSourceDir = dpgContext.generationPathDetail?.rlcSourcesDir;
  const srcPath = joinPaths(
    dpgContext.generationPathDetail?.rlcSourcesDir ?? "",
    options.batch && options.batch.length > 1
      ? normalizeName(client.name.replace("Client", ""), NameType.File)
      : "",
  );
  const libraryName = normalizeName(
    options.batch
      ? client.name
      : (options?.title ?? client.name ?? getDefaultService(program)?.title ?? ""),
    NameType.Class,
  );
  const importSet = initInternalImports();
  const urlInfo = transformUrlInfo(client, dpgContext, importSet);
  const paths: Paths = transformPaths(client, dpgContext, importSet);
  const schemas: Schema[] = transformSchemas(client, dpgContext);
  const responses: OperationResponse[] = transformToResponseTypes(client, dpgContext, importSet);
  const parameters: OperationParameter[] = transformToParameterTypes(
    client,
    dpgContext,
    importSet,
    urlInfo?.apiVersionInfo,
  );
  const helperDetails = transformHelperFunctionDetails(client, dpgContext);
  // Enrich client-level annotation detail
  helperDetails.clientLroOverload = getClientLroOverload(paths);

  const telemetryOptions = transformTelemetryInfo(client, dpgContext);
  const model: RLCModel = {
    srcPath,
    libraryName,
    paths,
    options,
    schemas,
    responses,
    apiVersionInfo: urlInfo?.apiVersionInfo,
    parameters,
    helperDetails,
    urlInfo,
    telemetryOptions,
    importInfo: {
      internalImports: importSet,
      runtimeImports: buildRuntimeImports(),
    },
    rlcSourceDir,
  };
  // RLC sample generation has been removed; modular samples are emitted separately,
  // so the RLC model never carries sample groups.
  options.generateSample = false;
  return model;
}

export function transformUrlInfo(
  client: SdkClient,
  dpgContext: SdkContext,
  importDetails: Imports,
): UrlInfo | undefined {
  const importedModels = new Set<string>();
  const usage = [SchemaContext.Exception, SchemaContext.Input];
  const program = dpgContext.program;
  const serviceNs = client.services[0];
  let endpoint = undefined;
  const urlParameters: PathParameter[] = [];
  if (serviceNs) {
    const host = getServers(program, serviceNs);
    if (host?.[0]?.url) {
      endpoint = host[0].url;
    }
    if (host && host?.[0] && host?.[0]?.parameters) {
      // Currently we only support one parameter in the servers definition
      for (const key of host[0].parameters.keys()) {
        const property = host?.[0]?.parameters.get(key);
        const type = property?.type;

        if (!property || !type) {
          continue;
        }

        const schema = getSchemaForType(dpgContext, type, {
          usage: usage,
          needRef: false,
          relevantProperty: property,
        });
        getImportedModelName(schema, usage)?.forEach(importedModels.add, importedModels);
        const normName = normalizeName(key, NameType.Parameter, true);
        if (normName !== key && endpoint) {
          endpoint = endpoint.replace(`{${key}}`, `{${normName}}`);
        }
        urlParameters.push({
          oriName: key,
          name: normalizeName(key, NameType.Parameter, true),
          type: getTypeName(schema, usage),
          description:
            (getDoc(program, property) &&
              getFormattedPropertyDoc(program, property, schema, " ")) ??
            getFormattedPropertyDoc(program, type, schema, " " /* separator*/),
          value: predictDefaultValue(dpgContext, host?.[0]?.parameters.get(key)),
        });
      }
    }
  }
  if (importedModels.size > 0) {
    importDetails.rlcClientFactory.importsSet = importedModels;
  }
  if (endpoint && urlParameters.length > 0) {
    for (const param of urlParameters) {
      if (param.oriName === "apiVersion") {
        dpgContext.hasApiVersionInClient = true;
      }
      if (param.oriName) {
        const regexp = new RegExp(`{${param.oriName}}`, "g");
        endpoint = endpoint.replace(regexp, `{${param.name}}`);
      }
    }
  }
  // Set the default value if missing endpoint parameter
  if (endpoint === undefined && urlParameters.length === 0) {
    endpoint = "{endpointParam}";
    urlParameters.push({
      name: "endpointParam",
      type: "string",
    });
  }
  const apiVersionInfo = transformApiVersionInfo(client, dpgContext, {
    endpoint,
    urlParameters,
  });
  if (
    apiVersionInfo &&
    urlParameters &&
    apiVersionInfo?.definedPosition === "query" &&
    !apiVersionInfo.isCrossedVersion &&
    !apiVersionInfo.defaultValue
  ) {
    urlParameters.push({
      oriName: "api-version",
      name: "apiVersion",
      type: "string",
    });
  }
  return { endpoint, urlParameters, apiVersionInfo };
}
