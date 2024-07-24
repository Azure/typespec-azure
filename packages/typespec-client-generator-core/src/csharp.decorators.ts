import {DecoratorFunction, DecoratorContext, Model} from "@typespec/compiler";
import {createStateSymbol} from "./lib.js";
import {setScopedDecoratorData} from "./internal-utils.js";
import {LanguageScopes} from "./interfaces.js";

export const namespace = "Azure.ClientGenerator.Core.Csharp";

const hasJSONConverterKey = createStateSymbol("hasJSONConverterKey");
export const $hasJSONConverter: DecoratorFunction = (
  context: DecoratorContext,
  entity: Model,
  value?: boolean,
  scope?: LanguageScopes) => {
  setScopedDecoratorData(context, $hasJSONConverter, hasJSONConverterKey, entity, value, scope);
}
