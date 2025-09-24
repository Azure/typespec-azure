import "../dist/src/tsp-index.js";
import "@typespec/openapi";
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";

import "./foundations/arm.foundations.tsp";
import "./legacy-types/arm.legacy.tsp";
import "./common-types/common-types.tsp";
import "./extension/extension.tsp";
import "./backcompat.tsp";
import "./private.decorators.tsp";
import "./models.tsp";
import "./operations.tsp";
import "./decorators.tsp";
import "./interfaces.tsp";
import "./responses.tsp";
import "./parameters.tsp";
import "./private-endpoints.tsp";

using Http;
using Rest;
using Versioning;
using OpenAPI;
using Azure.ResourceManager.Foundations;

namespace Azure.ResourceManager;
