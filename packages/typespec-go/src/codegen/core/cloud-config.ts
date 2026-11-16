/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import { CodegenError } from "./errors.js";
import * as helpers from "./helpers.js";

/**
 * generates the contents for the cloud_config.go file.
 * if cloud config info isn't required, the empty string is returned.
 *
 * @param module the module for which to generate the file
 * @param target the codegen target for the module
 * @returns the text for the file or the empty string
 */
export function generateCloudConfig(module: go.Module, target: go.CodeModelType): string {
  if (target === "azure-arm") {
    // this is handled in azcore
    return "";
  }

  // check if this SDK uses token auth or cloud-bound service configurations
  let tokenCred: go.TokenCredential | undefined;
  let hasCloudEndpoint = false;
  const wellKnownClouds = new Map<go.WellKnownCloudName, go.ServiceConfiguration>();
  const customClouds = new Map<string, go.ServiceConfiguration>();

  for (const client of module.clients) {
    if (client.instance?.kind !== "constructable") {
      continue;
    }
    if (client.instance.cloudEndpoint) {
      hasCloudEndpoint = true;
    }
    if (client.instance.serviceConfigurations) {
      for (const entry of client.instance.serviceConfigurations) {
        if (entry.target.kind === "wellKnown") {
          const existing = wellKnownClouds.get(entry.target.cloudName);
          if (
            existing &&
            (existing.audience !== entry.audience || existing.endpoint !== entry.endpoint)
          ) {
            throw new CodegenError(
              "UnsupportedTsp",
              `conflicting service configuration for cloud.${entry.target.cloudName} across clients in module ${module.identity}`,
            );
          }
          wellKnownClouds.set(entry.target.cloudName, entry);
        } else {
          const existing = customClouds.get(entry.target.exportedVarName);
          if (
            existing &&
            (existing.audience !== entry.audience || existing.endpoint !== entry.endpoint)
          ) {
            throw new CodegenError(
              "UnsupportedTsp",
              `conflicting service configuration for ${entry.target.exportedVarName} across clients in module ${module.identity}`,
            );
          }
          customClouds.set(entry.target.exportedVarName, entry);
        }
      }
    }
    for (const constructor of client.instance.constructors) {
      for (const param of constructor.parameters) {
        if (param.kind === "credentialParam" && param.type.kind === "tokenCredential") {
          tokenCred = param.type;
          break;
        }
      }
    }
  }

  if (!tokenCred && !hasCloudEndpoint) {
    // cloud config is only required for token auth or cloud-resolved endpoints
    return "";
  }

  let cloudConfig = helpers.contentPreamble(module);
  cloudConfig += 'import "github.com/Azure/azure-sdk-for-go/sdk/azcore/cloud"\n\n';

  cloudConfig +=
    "// ServiceName is the [cloud.ServiceName] for this module, used to identify the respective [cloud.ServiceConfiguration].\n";

  let serviceName = module.identity;
  const azureSdkPrefix = "github.com/Azure/azure-sdk-for-go/sdk/";
  if (serviceName.startsWith(azureSdkPrefix)) {
    serviceName = serviceName.substring(azureSdkPrefix.length);
  }
  cloudConfig += `const ServiceName cloud.ServiceName = "${serviceName}"\n\n`;

  const indent = new helpers.Indentation();
  if (wellKnownClouds.size === 0 && customClouds.size === 0) {
    // fallback for specs without serviceConfigurations: register AzurePublic audience only
    cloudConfig += `func init() {\n`;
    cloudConfig += `${indent.get()}cloud.AzurePublic.Services[ServiceName] = cloud.ServiceConfiguration{\n`;
    // we assume a single scope. this is enforced when adapting the data from tcgc
    cloudConfig += `${indent.push().get()}Audience: "${helpers.splitScope(tokenCred!.scopes[0]).audience}",\n`;
    cloudConfig += `${indent.pop().get()}}\n`;
    cloudConfig += `}\n\n`;

    return cloudConfig;
  }

  for (const [varName, entry] of [...customClouds.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    cloudConfig += `// ${varName} is the [cloud.Configuration] for the "${entry.name}" service configuration.\n`;
    cloudConfig += `var ${varName} = cloud.Configuration{\n`;
    cloudConfig += `${indent.get()}Services: map[cloud.ServiceName]cloud.ServiceConfiguration{\n`;
    cloudConfig += `${indent.push().get()}ServiceName: {\n`;
    cloudConfig += `${indent.push().get()}Audience: "${entry.audience}",\n`;
    if (entry.endpoint !== undefined) {
      cloudConfig += `${indent.get()}Endpoint: "${entry.endpoint}",\n`;
    }
    cloudConfig += `${indent.pop().get()}},\n`;
    cloudConfig += `${indent.pop().get()}},\n`;
    cloudConfig += `}\n\n`;
  }

  if (wellKnownClouds.size > 0) {
    cloudConfig += `func init() {\n`;
    for (const [cloudName, entry] of [...wellKnownClouds.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      cloudConfig += `${indent.get()}cloud.${cloudName}.Services[ServiceName] = cloud.ServiceConfiguration{\n`;
      cloudConfig += `${indent.push().get()}Audience: "${entry.audience}",\n`;
      if (entry.endpoint !== undefined) {
        cloudConfig += `${indent.get()}Endpoint: "${entry.endpoint}",\n`;
      }
      cloudConfig += `${indent.pop().get()}}\n`;
    }
    cloudConfig += `}\n\n`;
  }

  return cloudConfig;
}
