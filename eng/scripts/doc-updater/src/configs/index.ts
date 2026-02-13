import type { DocUpdateConfig } from "../config.js";
import { tcgcConfig } from "./tcgc.js";

/**
 * Registry of all doc-update configurations.
 *
 * To add a new package, create a new config file in this directory
 * and add it to the `configs` map below.
 */
export const configs: Record<string, DocUpdateConfig> = {
  [tcgcConfig.name]: tcgcConfig,
};
