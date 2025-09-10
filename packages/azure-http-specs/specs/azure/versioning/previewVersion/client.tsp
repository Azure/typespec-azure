import "@azure-tools/typespec-client-generator-core";
import "./main.tsp";

using Azure.ClientGenerator.Core;

@@clientNamespace(Azure.Versioning.PreviewVersion, "azure.versioning.previewversion", "java");