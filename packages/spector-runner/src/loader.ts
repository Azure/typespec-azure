import { readFileSync } from "fs";
import { parse } from "yaml";
import {
  ResolvedSpec,
  SpecEntry,
  SpecEntryOptions,
  SpecOptions,
  SpecOptionValue,
  SpectorConfig,
  SpectorConfigError,
} from "./types.js";

function isOptionValue(value: unknown): value is SpecOptionValue {
  return (
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
  );
}

function validateOptions(rawOptions: unknown, specPath: string): SpecOptions {
  if (rawOptions === undefined) {
    return {};
  }
  if (typeof rawOptions !== "object" || rawOptions === null || Array.isArray(rawOptions)) {
    throw new SpectorConfigError(
      `Spec "${specPath}": "options" must be a map of option name to string/number/boolean.`,
    );
  }
  const options: SpecOptions = {};
  for (const [key, value] of Object.entries(rawOptions)) {
    if (!isOptionValue(value)) {
      throw new SpectorConfigError(
        `Spec "${specPath}": option "${key}" must be a string, number, or boolean.`,
      );
    }
    options[key] = value;
  }
  return options;
}

function validateOptionsObject(rawEntry: unknown, specPath: string): SpecEntryOptions {
  if (typeof rawEntry !== "object" || rawEntry === null || Array.isArray(rawEntry)) {
    throw new SpectorConfigError(
      `Spec "${specPath}": value must be true, false, an object with "options", or a list of such objects.`,
    );
  }
  const unknownKeys = Object.keys(rawEntry).filter((k) => k !== "options");
  if (unknownKeys.length > 0) {
    throw new SpectorConfigError(
      `Spec "${specPath}": unknown key(s) ${unknownKeys
        .map((k) => `"${k}"`)
        .join(", ")}. Only "options" is allowed.`,
    );
  }
  return { options: validateOptions((rawEntry as { options?: unknown }).options, specPath) };
}

function validateEntry(rawEntry: unknown, specPath: string): SpecEntry {
  if (typeof rawEntry === "boolean") {
    return rawEntry;
  }
  if (Array.isArray(rawEntry)) {
    if (rawEntry.length === 0) {
      throw new SpectorConfigError(
        `Spec "${specPath}": a list value must contain at least one option-set.`,
      );
    }
    return rawEntry.map((element) => validateOptionsObject(element, specPath));
  }
  return validateOptionsObject(rawEntry, specPath);
}

/**
 * Parse and validate a spector config from a YAML string.
 *
 * @param content YAML source.
 * @param source Optional label (e.g. file path) used in error messages.
 */
export function parseSpectorConfig(content: string, source = "<string>"): SpectorConfig {
  let parsed: unknown;
  try {
    parsed = parse(content);
  } catch (err) {
    throw new SpectorConfigError(`Failed to parse "${source}": ${String(err)}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new SpectorConfigError(`"${source}": root must be a map with a "specs" key.`);
  }

  const rawSpecs = (parsed as { specs?: unknown }).specs;
  if (typeof rawSpecs !== "object" || rawSpecs === null || Array.isArray(rawSpecs)) {
    throw new SpectorConfigError(`"${source}": "specs" must be a map of spec path to selection.`);
  }

  const specs: Record<string, SpecEntry> = {};
  for (const [specPath, rawEntry] of Object.entries(rawSpecs)) {
    specs[specPath] = validateEntry(rawEntry, specPath);
  }

  return { specs };
}

/**
 * Read, parse, and validate a `spector.config.yaml` from disk.
 */
export function loadSpectorConfig(filePath: string): SpectorConfig {
  const content = readFileSync(filePath, "utf-8");
  return parseSpectorConfig(content, filePath);
}

/**
 * Whether a spec is opted in (listed with a truthy value).
 */
export function isSpecEnabled(config: SpectorConfig, specPath: string): boolean {
  const entry = config.specs[specPath];
  if (entry === undefined || entry === false) {
    return false;
  }
  return true;
}

/**
 * Options for a spec, or `undefined` when the spec is not enabled. For a spec
 * with multiple option-sets (a list value), every set is returned.
 */
export function getSpecOptions(
  config: SpectorConfig,
  specPath: string,
): SpecOptions[] | undefined {
  const entry = config.specs[specPath];
  if (entry === undefined || entry === false) {
    return undefined;
  }
  if (entry === true) {
    return [{}];
  }
  if (Array.isArray(entry)) {
    return entry.map((element) => element.options ?? {});
  }
  return [entry.options ?? {}];
}

/**
 * All enabled specs with their options, sorted by path for stable output. A
 * spec with multiple option-sets yields one {@link ResolvedSpec} per set.
 */
export function resolveSpecs(config: SpectorConfig): ResolvedSpec[] {
  const resolved: ResolvedSpec[] = [];
  for (const path of Object.keys(config.specs).sort()) {
    const optionSets = getSpecOptions(config, path);
    if (optionSets === undefined) {
      continue;
    }
    for (const options of optionSets) {
      resolved.push({ path, options });
    }
  }
  return resolved;
}
