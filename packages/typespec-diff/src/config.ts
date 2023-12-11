import { NodeHost } from "@typespec/compiler";
import Ajv, { JSONSchemaType } from "ajv";
import jsyaml from "js-yaml";
import { SeverityConfig } from "./rules.js";

/**
 * Represent the configuration that can be provided in a config file.
 */
export interface TypeSpecDiffRawConfig {
  rules: Record<string, "on" | "off" | SeverityConfig>;
}

export function ValidateConfig(config: TypeSpecDiffRawConfig): boolean {
  const ajv = new (Ajv as any)({
    strict: true,
  });
  const validate = ajv.compile(TypeSpecDiffConfigJsonSchema);
  const valid = validate(config);
  if (!valid) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(validate.errors));
    throw new Error(`Failed to validate typespec diff config.`);
  }
  return valid;
}
export const TypeSpecDiffConfigJsonSchema: JSONSchemaType<TypeSpecDiffRawConfig> = {
  type: "object",
  additionalProperties: false,
  properties: {
    rules: {
      type: "object",
      additionalProperties: {
        oneOf: [
          { type: "string", enum: ["on", "off"] },
          {
            type: "object",
            properties: {
              severityForSingleVersionDiff: {
                type: "string",
                enum: ["error", "warn", "info"],
              },
              severityForCrossVersionDiff: {
                type: "string",
                enum: ["error", "warn", "info"],
              },
            },
            required: ["severityForSingleVersionDiff", "severityForCrossVersionDiff"],
          },
        ],
      },
      required: [],
    },
  },
  required: ["rules"],
};

export async function loadConfigFile(filePath: string): Promise<TypeSpecDiffRawConfig> {
  const host = { ...NodeHost };
  const config = jsyaml.load((await host.readFile(filePath)).text) as TypeSpecDiffRawConfig;
  return ValidateConfig(config) ? config : { rules: {} };
}
