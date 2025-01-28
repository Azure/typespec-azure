import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";
import "./main.tsp";

using TypeSpec.Http;
using global.Azure.ClientGenerator.Core;
using _Specs_.Azure.ClientGenerator.Core.ApiVersion.Header;
using Spector;

namespace Customizations;

@@apiVersion(HeaderApiVersionParam.version);
