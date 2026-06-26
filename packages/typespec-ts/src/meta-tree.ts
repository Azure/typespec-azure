import { Type } from "@typespec/compiler";
import { Schema as RlcType } from "./interfaces.js";

export interface ClientTypeMetadata {
  rlcType: RlcType;
}

export type ClientTypeMetaTree = Map<Type, ClientTypeMetadata>;
