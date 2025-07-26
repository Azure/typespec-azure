import { ModelProperty, Scalar, compilerAssert } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import { ParameterizedNextLinkConfigDecorator } from "../../../generated-defs/Azure.Core.Foundations.Private.js";
import { AzureCoreStateKeys } from "../../lib.js";

const [getParameterizedNextLinkArguments, markParameterizedNextLinkConfigTemplate] = useStateMap<
  Scalar,
  ModelProperty[]
>(AzureCoreStateKeys.parameterizedNextLinkConfig);

const parameterizedNextLinkConfigDecorator: ParameterizedNextLinkConfigDecorator = (
  context,
  target,
  parameters,
) => {
  // Workaround as it seems like decorators are called when missing template arguments
  if (parameters.kind === "Model") return;
  compilerAssert(
    parameters.kind === "Tuple",
    "Using the defined internal scalar parameterizedNextLink will result in a Tuple template argument type",
  );
  markParameterizedNextLinkConfigTemplate(context.program, target, parameters.values as any);
};

export { getParameterizedNextLinkArguments, parameterizedNextLinkConfigDecorator };
