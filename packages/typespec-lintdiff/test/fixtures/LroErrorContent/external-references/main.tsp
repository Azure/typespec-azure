import "../../lib/imports.tsp";
using TypeSpec.Http;
using TypeSpec.OpenAPI;
using Azure.ResourceManager;
using Autorest;

@armProviderNamespace
@service
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.ExternalReferences;

@useRef("../../../../../common-types/resource-management/v1/types.json#/definitions/ErrorResponse")
model OldError {
  code?: string;
}
@useRef("../../../../../common-types/resource-management/v5/types.json#/definitions/ErrorResponse")
model StandardReference {
  code?: string;
}
@useRef("../../../../../common-types/resource-management/v5/types.json#/definitions/ErrorDetail")
model WrongDefinition {
  code?: string;
}
@Azure.ResourceManager.Legacy.externalTypeRef("../../../../../common-types/resource-management/v5/types.json#/definitions/ErrorResponse")
model LegacyStandard {
  code?: string;
}
@useRef("#/definitions/LocalError")
model LocalReference {
  code?: string;
}
model LocalError {
  code?: string;
}

model Failure<T> {
  @statusCode statusCode: 400;
  @body body: T;
}
@extension("x-ms-long-running-operation", true)
@post
op Lro<T>(@path name: string): AcceptedResponse | Failure<T>;
@route("/old/{name}")
op old is Lro<OldError>;
@route("/standard/{name}")
op standard is Lro<StandardReference>;
@route("/wrong/{name}")
op wrong is Lro<WrongDefinition>;
@route("/legacy/{name}")
op legacy is Lro<LegacyStandard>;
@route("/local/{name}")
op localError is Lro<LocalReference>;
