import type { Model, Type } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { EmbeddingVectorDecorator } from "../../../generated-defs/Azure.Core.Foundations.Private.js";
import { AzureCoreStateKeys } from "../../lib.js";

export interface EmbeddingVectorMetadata {
  elementType: Type;
}

export const [
  /**
   * If the provided model is an embedding vector, returns the appropriate metadata; otherwise,
   * returns undefined.
   * @param model the model to query
   * @returns `EmbeddingVectorMetadata`, if applicable, or undefined.
   */
  getAsEmbeddingVector,
  setAsEmbeddingVector,
] = useStateMap<Model, EmbeddingVectorMetadata>(AzureCoreStateKeys.embeddingVector);

/** @internal */
export const $embeddingVector: EmbeddingVectorDecorator = (context, entity, elementType) => {
  const metadata: EmbeddingVectorMetadata = {
    elementType: elementType,
  };
  setAsEmbeddingVector(context.program, entity, metadata);
};
