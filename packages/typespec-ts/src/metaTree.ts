import { Type } from "@typespec/compiler";
import { Schema as RlcType } from "./rlc-common/index.js";

export interface RlcTypeMetadata {
  rlcType: RlcType;
}

export type RlcMetaTree = Map<Type, RlcTypeMetadata>;
