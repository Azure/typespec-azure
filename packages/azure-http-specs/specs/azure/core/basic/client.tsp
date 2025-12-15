import "@azure-tools/typespec-client-generator-core";
import "./main.tsp";

using Azure.ClientGenerator.Core;

@@convenientAPI(_Specs_.Azure.Core.Basic.createOrUpdate, false, "csharp");

@@clientNamespace(_Specs_.Azure.Core.Basic, "azure.core.basic", "java");
@@clientNamespace(_Specs_.Azure.Core.Basic, "specs.azure.core.basic", "python");
