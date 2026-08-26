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

op reorderParametersCustomization(@path param2: string, @path param1: string): void;

#suppress "experimental-feature" "Testing the reorderParameters function"
@@override(
  _Specs_.Azure.ClientGenerator.Core.Override.ReorderParameters.reorder,
  reorderParameters(reorderParametersCustomization, #["param1", "param2"])
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

op requireOptionalCustomization(@path param1: string, @path param2?: string): void;

#suppress "experimental-feature" "Testing the replaceParameter function"
@@override(
  _Specs_.Azure.ClientGenerator.Core.Override.RequireOptionalParameter.requireOptional,
  replaceParameter(requireOptionalCustomization, "param2", RequiredParameters.param2)
);

op removeOptionalCustomization(
  @path param1: string,
  @query param2?: string,
  @query param3?: string,
  @header param4?: string,
): void;

#suppress "experimental-feature" "Testing the removeParameter function"
@@override(
  _Specs_.Azure.ClientGenerator.Core.Override.RemoveOptionalParameter.removeOptional,
  removeParameter(removeParameter(removeOptionalCustomization, "param3"), "param4")
);

model AddedParameters {
  @header("trace-id")
  traceId?: string;
}

op addParameterCustomization(): void;

#suppress "experimental-feature" "Testing the addParameter function"
@@override(
  _Specs_.Azure.ClientGenerator.Core.Override.AddParameter.add,
  addParameter(addParameterCustomization, AddedParameters.traceId)
);
