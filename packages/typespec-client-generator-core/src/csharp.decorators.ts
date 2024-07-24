import { DecoratorContext, DecoratorFunction, Model } from "@typespec/compiler";
import { LanguageScopes } from "./interfaces.js";
import { setScopedDecoratorData } from "./internal-utils.js";
import { createStateSymbol } from "./lib.js";

export const namespace = "Azure.ClientGenerator.Core.CSharp";

const hasJSONConverterKey = createStateSymbol("hasJSONConverterKey");
export const $hasJSONConverter: DecoratorFunction = (
  context: DecoratorContext,
  entity: Model,
  scope?: LanguageScopes
) => {
  setScopedDecoratorData(context, $hasJSONConverter, hasJSONConverterKey, entity, true, scope);
};
