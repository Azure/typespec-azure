import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";

using global.Azure.ClientGenerator.Core;

#suppress "@azure-tools/typespec-client-generator-core/override-response-replacement" "The generated method intentionally ignores the response body."
@@override(
  _Specs_.Azure.ClientGenerator.Core.ResponseReplacement.voidResponse,
  replaceResponseWithVoid(_Specs_.Azure.ClientGenerator.Core.ResponseReplacement.voidResponse)
);

#suppress "@azure-tools/typespec-client-generator-core/override-response-replacement" "The generated method intentionally exposes the raw response bytes."
@@override(
  _Specs_.Azure.ClientGenerator.Core.ResponseReplacement.bytesResponse,
  replaceResponseWithBytes(_Specs_.Azure.ClientGenerator.Core.ResponseReplacement.bytesResponse)
);
