import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";

using global.Azure.ClientGenerator.Core;
using global.Azure.ClientGenerator.Core.Legacy;

@@protocolAPI(_Specs_.Azure.ClientGenerator.Core.ClientControl.ProtocolApi.get, false, "csharp");

#suppress "@azure-tools/typespec-client-generator-core/client-option" "Testing a model-reference emitter option"
@@clientOption(
  _Specs_.Azure.ClientGenerator.Core.ClientControl.ClientOptionModel,
  "modelReference",
  _Specs_.Azure.ClientGenerator.Core.ClientControl.CompositionBase,
  "csharp"
);

@@useSystemTextJsonConverter(
  _Specs_.Azure.ClientGenerator.Core.ClientControl.SerializerModel,
  "csharp"
);

@@scope(_Specs_.Azure.ClientGenerator.Core.ClientControl.ScopedModel.languageSpecific, "csharp");

@@scope(_Specs_.Azure.ClientGenerator.Core.ClientControl.OperationScope.get, "csharp");

@@disablePageable(_Specs_.Azure.ClientGenerator.Core.ClientControl.DisablePageable.list);
