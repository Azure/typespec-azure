import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";
import "./main.tsp";

using Http;
using Azure.ClientGenerator.Core;
using _Specs_.Azure.ClientGenerator.Core.EnumNameConflict;
using Spector;

namespace Customizations;

// Resolve enum naming conflict: Rename SecondNamespace.Status to SecondStatus
// This prevents SDK generation issues when both FirstNamespace.Status and SecondNamespace.Status
// would otherwise generate with the same name, causing conflicts in generated code
@@clientName(SecondNamespace.Status, "SecondStatus");

// Set client namespace for better organization
@@clientNamespace(_Specs_.Azure.ClientGenerator.Core.EnumNameConflict,
  "azure.clientgenerator.core.enumnameconflict",
  "java"
);