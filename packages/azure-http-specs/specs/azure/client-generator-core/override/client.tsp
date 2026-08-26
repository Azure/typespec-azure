import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/http";

using Http;
using global.Azure.ClientGenerator.Core;

@clientNamespace("azure.clientgenerator.core.methodoverride", "java")
namespace Customization;

@@clientNamespace(
  _Specs_.Azure.ClientGenerator.Core.Override,
  "azure.clientgenerator.core.methodoverride",
  "java"
);

#suppress "experimental-feature" "Testing the reorderParameters function"
@@override(
  _Specs_.Azure.ClientGenerator.Core.Override.ReorderParameters.reorder,
  reorderParameters(
    _Specs_.Azure.ClientGenerator.Core.Override.ReorderParameters.reorder,
    #["param1", "param2"]
  )
);

model GroupParametersOptions {
  @query param1: string;
  @query param2: string;
}

op groupCustomized(options: GroupParametersOptions): void;

@@override(_Specs_.Azure.ClientGenerator.Core.Override.GroupParameters.group, groupCustomized);

model RequiredParameters {
  @path param2: string;
}

#suppress "experimental-feature" "Testing the replaceParameter function"
@@override(
  _Specs_.Azure.ClientGenerator.Core.Override.RequireOptionalParameter.requireOptional,
  replaceParameter(
    _Specs_.Azure.ClientGenerator.Core.Override.RequireOptionalParameter.requireOptional,
    "param2",
    RequiredParameters.param2
  )
);

#suppress "experimental-feature" "Testing the removeParameter function"
@@override(
  _Specs_.Azure.ClientGenerator.Core.Override.RemoveOptionalParameter.removeOptional,
  removeParameter(
    removeParameter(
      _Specs_.Azure.ClientGenerator.Core.Override.RemoveOptionalParameter.removeOptional,
      "param3"
    ),
    "param4"
  )
);

model AddedParameters {
  traceId?: string;
}

#suppress "experimental-feature" "Testing the addParameter function"
@@override(
  _Specs_.Azure.ClientGenerator.Core.Override.AddParameter.add,
  addParameter(
    _Specs_.Azure.ClientGenerator.Core.Override.AddParameter.add,
    AddedParameters.traceId
  )
);
