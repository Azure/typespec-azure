import type { Type } from "@typespec/compiler";
import type { Schema } from "./interfaces.js";

export interface ClientTypeMetadata {
  clientType: Schema;
}

export type ClientTypeMetaTree = Map<Type, ClientTypeMetadata>;
