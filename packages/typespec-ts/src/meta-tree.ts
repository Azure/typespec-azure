import { Type } from "@typespec/compiler";
import { Schema as RlcType } from "./interfaces.js";

export interface RlcTypeMetadata {
  rlcType: RlcType;
}

export type RlcMetaTree = Map<Type, RlcTypeMetadata>;
