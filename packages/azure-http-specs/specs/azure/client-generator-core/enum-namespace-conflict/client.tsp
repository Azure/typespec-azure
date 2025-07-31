import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";
import "./main.tsp";

using Http;
using Azure.ClientGenerator.Core;
using _Specs_.Azure.ClientGenerator.Core.EnumNamespaceConflict;
using Spector;

namespace Customizations;

// Rename the second namespace's Status enum to avoid conflicts with the first namespace's Status enum
@@clientName(SecondNamespace.Status, "SecondStatus");

// Set client namespace for better organization
@@clientNamespace(_Specs_.Azure.ClientGenerator.Core.EnumNamespaceConflict,
  "azure.clientgenerator.core.enumnamespacesconflict",
  "java"
);