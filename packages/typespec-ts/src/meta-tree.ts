import { Type } from "@typespec/compiler";
import { Schema } from "./interfaces.js";

export interface ClientTypeMetadata {
  clientType: Schema;
}

export type ClientTypeMetaTree = Map<Type, ClientTypeMetadata>;
