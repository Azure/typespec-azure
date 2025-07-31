import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";
import "./main.tsp";

using Http;
using Azure.ClientGenerator.Core;
using Client.Naming.EnumConflict;
using Spector;

namespace Customizations;

// Resolve enum naming conflict: Rename SecondNamespace.Status to SecondStatus
// Client should generate FirstNamespace.Status as `Status` and SecondNamespace.Status as `SecondStatus`.
@@clientName(SecondNamespace.Status, "SecondStatus");
