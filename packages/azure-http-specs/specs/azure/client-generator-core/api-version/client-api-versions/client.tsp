import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";
import "./main.tsp";

using Http;
using Azure.ClientGenerator.Core;
using Client.AlternateApiVersion.Service.ClientApiVersions;
using Spector;

namespace Customizations;

// Extend the client api version enum with an older version not present in the service versions.
// The client enum includes "2022-10-01" in addition to all service versions.
enum ClientApiVersions {
  v2022_10_01: "2022-10-01",
  ...ServiceApiVersions,
}

@@clientApiVersions(Client.AlternateApiVersion.Service.ClientApiVersions, ClientApiVersions);

@@clientNamespace(
  Client.AlternateApiVersion.Service.ClientApiVersions,
  "azure.clientgenerator.core.apiversion.clientapiversions",
  "java"
);
