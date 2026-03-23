import {
  getDoc,
  getLocationContext,
  getNamespaceFullName,
  getService,
  normalizePath,
  type Namespace,
  type Program,
} from "@typespec/compiler";
import { LanguagePackageMetadata, TypeSpecMetadata } from "./metadata.js";

const PACKAGE_NAME_KEYS = ["package-name", "packageName", "package"];
const NAMESPACE_KEYS = ["namespace", "namespace-name", "namespaceName"];

/**
 * Replace {var} placeholders in a string with values from the data object.
 * Recursively resolves nested placeholders.
 */
function fillVars(value: unknown, data: Record<string, unknown>): unknown {
  if (typeof value !== "string") {
    return value;
  }

  let prev: string | undefined;
  let current = value;

  while (prev !== current) {
    prev = current;
    current = current.replace(/\{([^{}]+)\}/g, (match, key) => {
      const replacement = data[key];
      return replacement !== undefined && replacement !== null ? String(replacement) : match;
    });
  }

  return current;
}

/**
 * Extract parameters from compiler options for variable substitution.
 */
function extractParameters(
  optionMap: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  // Check if parameters are defined at the root level
  for (const [key, value] of Object.entries(optionMap)) {
    if (key === "parameters" && typeof value === "object" && value !== null) {
      for (const [paramKey, paramValue] of Object.entries(value)) {
        if (typeof paramValue === "object" && paramValue !== null && "default" in paramValue) {
          params[paramKey] = (paramValue as any).default;
        } else {
          params[paramKey] = paramValue;
        }
      }
    }
  }

  return params;
}

interface EmitterRegistration {
  language: string;
  parser: LanguageParser;
}

/**
 * Known Azure Java namespace prefixes in order of specificity.
 * Used to strip and replace prefixes based on service type and flavor.
 */
const JAVA_AZURE_PREFIXES = [
  "com.azure.resourcemanager.v2.",
  "com.azure.v2.",
  "com.azure.resourcemanager.",
  "com.azure.",
] as const;

/**
 * Determines the correct Java namespace prefix based on service type and flavor.
 * - com.azure.            : current data plane
 * - com.azure.resourcemanager. : current ARM/management
 * - com.azure.v2.         : next-gen data plane (flavor: azurev2)
 * - com.azure.resourcemanager.v2. : next-gen ARM (flavor: azurev2)
 */
function getJavaNamespacePrefix(isManagement: boolean, isAzureV2: boolean): string {
  if (isManagement) {
    return isAzureV2 ? "com.azure.resourcemanager.v2." : "com.azure.resourcemanager.";
  }
  return isAzureV2 ? "com.azure.v2." : "com.azure.";
}

/**
 * Applies the correct Java namespace prefix based on service type and flavor.
 * If the namespace already has a known Azure prefix, it is replaced with the correct one.
 * If the namespace does not start with a known Azure prefix, the correct prefix is prepended.
 */
function applyJavaNamespacePrefix(
  namespace: string,
  isManagement: boolean,
  isAzureV2: boolean,
): string {
  const targetPrefix = getJavaNamespacePrefix(isManagement, isAzureV2);

  // If namespace already has the correct prefix, no change needed
  if (namespace.startsWith(targetPrefix)) {
    return namespace;
  }

  // Strip any existing Azure prefix and replace with the correct one
  for (const prefix of JAVA_AZURE_PREFIXES) {
    if (namespace.startsWith(prefix)) {
      return targetPrefix + namespace.substring(prefix.length);
    }
  }

  // No known Azure prefix found — prepend the correct prefix
  return targetPrefix + namespace;
}

const EMITTER_REGISTRY: Record<string, EmitterRegistration> = {
  "@azure-tools/typespec-csharp": { language: "csharp", parser: parseCSharp },
  "@azure-tools/typespec-java": { language: "java", parser: parseJava },
  "@azure-tools/typespec-python": { language: "python", parser: parsePython },
  "@azure-tools/typespec-ts": { language: "typescript", parser: parseTypeScript },
  "@azure-tools/typespec-go": { language: "go", parser: parseGo },
  "@azure-tools/typespec-rust": { language: "rust", parser: parseRust },
  "@azure-typespec/http-client-csharp": { language: "http-client-csharp", parser: parseCSharp },
  "@azure-typespec/http-client-csharp-mgmt": {
    language: "http-client-csharp-mgmt",
    parser: parseCSharp,
  },
};

interface LanguageParserResult {
  packageName?: string;
  namespace?: string;
}

type LanguageParser = (
  options: Record<string, unknown>,
  params: Record<string, unknown>,
  typespecType?: "data" | "management",
) => LanguageParserResult;

/**
 * Python-specific metadata parser.
 * Handles package-name and namespace, with fallback conversion between them.
 * Strips implementation-specific suffixes like ._generated from namespaces.
 */
function parsePython(
  options: Record<string, unknown>,
  params: Record<string, unknown>,
): LanguageParserResult {
  let packageName = options["package-name"] ?? options["package_name"];
  let namespace = options["namespace"];

  // Strip implementation-specific suffixes from namespace
  if (namespace) {
    namespace = String(namespace).replace(/\._generated$/, "");
  }

  // Fallback: derive namespace from package-name
  if (packageName && !namespace) {
    namespace = String(packageName).replace(/-/g, ".");
  } else if (namespace && !packageName) {
    packageName = String(namespace).replace(/\./g, "-");
  }

  return {
    packageName: packageName ? String(fillVars(packageName, params)) : undefined,
    namespace: namespace ? String(fillVars(namespace, params)) : undefined,
  };
}

/**
 * Java-specific metadata parser.
 * Applies the correct Azure Java namespace prefix based on service type and flavor:
 * - com.azure.            : current data plane
 * - com.azure.resourcemanager. : current ARM/management
 * - com.azure.v2.         : next-gen data plane (flavor: azurev2)
 * - com.azure.resourcemanager.v2. : next-gen ARM (flavor: azurev2)
 */
function parseJava(
  options: Record<string, unknown>,
  params: Record<string, unknown>,
  typespecType?: "data" | "management",
): LanguageParserResult {
  let packageName = options["package-name"] ?? options["package_name"];
  const rawNamespace = options["namespace"];

  const flavor = options["flavor"];
  const isAzureV2 = flavor === "azurev2";
  const isManagement = typespecType === "management";

  let namespace: string | undefined;
  if (rawNamespace) {
    namespace = applyJavaNamespacePrefix(String(rawNamespace), isManagement, isAzureV2);

    if (!packageName) {
      const stripped = namespace.startsWith("com.") ? namespace.substring(4) : namespace;
      packageName = stripped.replace(/\./g, "-");
    }
  }

  return {
    packageName: packageName ? String(fillVars(packageName, params)) : undefined,
    namespace: namespace ? String(fillVars(namespace, params)) : undefined,
  };
}

/**
 * C#-specific metadata parser.
 * Package name and namespace are typically identical.
 */
function parseCSharp(
  options: Record<string, unknown>,
  params: Record<string, unknown>,
): LanguageParserResult {
  let packageName = options["package-name"] ?? options["package_name"];
  let namespace = options["namespace"];

  if (packageName && !namespace) {
    namespace = packageName;
  } else if (namespace && !packageName) {
    packageName = namespace;
  }

  return {
    packageName: packageName ? String(fillVars(packageName, params)) : undefined,
    namespace: namespace ? String(fillVars(namespace, params)) : undefined,
  };
}

/**
 * TypeScript-specific metadata parser.
 * Extracts from package-details if available.
 */
function parseTypeScript(
  options: Record<string, unknown>,
  params: Record<string, unknown>,
): LanguageParserResult {
  const packageDetails = options["package-details"];
  let packageName: unknown;
  let namespace: unknown;

  if (packageDetails && typeof packageDetails === "object") {
    const details = packageDetails as Record<string, unknown>;
    packageName = details["name"];
    namespace = details["namespace"];
  }

  if (packageName && !namespace) {
    namespace = packageName;
  } else if (namespace && !packageName) {
    packageName = namespace;
  }

  return {
    packageName: packageName ? String(fillVars(packageName, params)) : undefined,
    namespace: namespace ? String(fillVars(namespace, params)) : undefined,
  };
}

/**
 * Go-specific metadata parser.
 * Extracts from module path, looking for azure-sdk-for-go suffix.
 */
function parseGo(
  options: Record<string, unknown>,
  params: Record<string, unknown>,
): LanguageParserResult {
  let packageName = options["package-name"] ?? options["package_name"];
  let namespace = options["namespace"];
  const module = options["module"];

  if (module) {
    const modulePath = String(fillVars(module, params));
    const sdkIndex = modulePath.indexOf("azure-sdk-for-go/");
    const after =
      sdkIndex >= 0 ? modulePath.substring(sdkIndex + "azure-sdk-for-go/".length) : modulePath;

    if (!packageName) {
      packageName = after;
    }
    if (!namespace) {
      namespace = after;
    }
  }

  return {
    packageName: packageName ? String(fillVars(packageName, params)) : undefined,
    namespace: namespace ? String(fillVars(namespace, params)) : undefined,
  };
}

/**
 * Rust-specific metadata parser.
 * Uses crate-name as the primary identifier.
 */
function parseRust(
  options: Record<string, unknown>,
  params: Record<string, unknown>,
): LanguageParserResult {
  let packageName = options["crate-name"];
  let namespace = options["namespace"];

  if (packageName && !namespace) {
    namespace = packageName;
  } else if (namespace && !packageName) {
    packageName = namespace;
  }

  return {
    packageName: packageName ? String(fillVars(packageName, params)) : undefined,
    namespace: namespace ? String(fillVars(namespace, params)) : undefined,
  };
}

export interface LanguageCollectionResult {
  languages: Record<string, LanguagePackageMetadata>;
  sourceConfigPath?: string;
}

export async function collectLanguagePackages(
  program: Program,
  baseOutputDir: string,
  typespecType?: "data" | "management",
): Promise<LanguageCollectionResult> {
  const optionMap = program.compilerOptions.options ?? {};
  const params = extractParameters(optionMap);

  // Extract default service-dir from config file parameters
  let defaultServiceDir: string | undefined;
  const configFile = (program.compilerOptions as any).configFile;
  if (configFile?.parameters && "service-dir" in configFile.parameters) {
    const serviceDirParam = configFile.parameters["service-dir"];
    if (serviceDirParam && typeof serviceDirParam === "object" && "default" in serviceDirParam) {
      defaultServiceDir = String(serviceDirParam.default);
    }
  }

  return {
    languages: buildLanguageMetadata(optionMap, params, baseOutputDir, defaultServiceDir, typespecType),
    sourceConfigPath: program.compilerOptions.config,
  };
}

export function buildSpecMetadata(program: Program): TypeSpecMetadata {
  const globalNamespace = program.getGlobalNamespaceType();

  // Recursively collect all service namespaces
  const allServiceNamespaces = collectAllServiceNamespaces(program, globalNamespace);

  // Select the primary namespace (prefer @service decorated namespaces)
  const primaryNamespace = selectPrimaryNamespace(allServiceNamespaces, program) ?? globalNamespace;

  const namespaceName =
    trimOrUndefined(getNamespaceFullName(primaryNamespace)) ?? primaryNamespace.name ?? "(global)";
  const doc = trimOrUndefined(getDoc(program, primaryNamespace));

  // Determine if this is data plane or management plane
  // Check if namespace uses Azure.ResourceManager (management plane)
  const isManagementPlane = checkIfManagementPlane(program, primaryNamespace);

  return {
    namespace: namespaceName,
    documentation: doc,
    type: isManagementPlane ? "management" : "data",
  };
}

/**
 * Recursively collects all service namespaces from a given namespace.
 */
function collectAllServiceNamespaces(program: Program, ns: Namespace): Namespace[] {
  const result: Namespace[] = [];

  for (const childNs of ns.namespaces.values()) {
    if (isServiceNamespace(program, childNs)) {
      result.push(childNs);
      // Recursively collect from children
      result.push(...collectAllServiceNamespaces(program, childNs));
    }
  }

  return result;
}

/**
 * Determines if a namespace is a service namespace (not a framework/standard namespace).
 * Uses getLocationContext to check if the namespace was defined in the user's project.
 */
function isServiceNamespace(program: Program, ns: Namespace): boolean {
  const locationContext = getLocationContext(program, ns);
  // Only consider namespaces defined in the user's project as service namespaces
  return locationContext.type === "project";
}

/**
 * Selects the primary namespace from a list of service namespaces.
 * Prefers namespaces with @service decorator, then non-helper namespaces.
 */
function selectPrimaryNamespace(namespaces: Namespace[], program: Program): Namespace | undefined {
  if (namespaces.length === 0) {
    return undefined;
  }

  // Names that indicate helper/customization namespaces (lower priority)
  const helperNamePatterns = [
    "Customizations",
    "Customization",
    "Internal",
    "Private",
    "Helpers",
    "Traits",
    "Common",
  ];

  // First priority: namespaces with @service decorator
  const serviceNamespaces = namespaces.filter((ns) => {
    const service = getService(program, ns);
    return service !== undefined;
  });

  if (serviceNamespaces.length > 0) {
    // If there are multiple @service namespaces, prefer non-helper ones
    const nonHelperServices = serviceNamespaces.filter((ns) => {
      const name = ns.name;
      return !helperNamePatterns.some((pattern) =>
        name.toLowerCase().includes(pattern.toLowerCase()),
      );
    });
    return nonHelperServices.length > 0 ? nonHelperServices[0] : serviceNamespaces[0];
  }

  // Second priority: filter out helper namespaces
  const nonHelperNamespaces = namespaces.filter((ns) => {
    const name = ns.name;
    return !helperNamePatterns.some((pattern) =>
      name.toLowerCase().includes(pattern.toLowerCase()),
    );
  });

  const candidateNamespaces = nonHelperNamespaces.length > 0 ? nonHelperNamespaces : namespaces;

  // Among candidates, prefer the deepest namespace (most specific)
  // Depth is indicated by the number of dots in the full name
  let deepestNamespace = candidateNamespaces[0];
  let maxDepth = getNamespaceFullName(deepestNamespace).split(".").length;

  for (const ns of candidateNamespaces.slice(1)) {
    const fullName = getNamespaceFullName(ns);
    const depth = fullName.split(".").length;

    if (depth > maxDepth) {
      maxDepth = depth;
      deepestNamespace = ns;
    }
  }

  return deepestNamespace;
}

/**
 * Checks if a namespace represents a management plane service.
 * Management plane services typically use Azure.ResourceManager.
 */
function checkIfManagementPlane(program: Program, ns: Namespace): boolean {
  // Check if the namespace or any of its imports reference Azure.ResourceManager
  const globalNs = program.getGlobalNamespaceType();

  // Look for Azure.ResourceManager namespace
  if (globalNs.namespaces.has("Azure")) {
    const azureNs = globalNs.namespaces.get("Azure");
    if (azureNs?.namespaces.has("ResourceManager")) {
      // If Azure.ResourceManager exists in the program, it's likely management plane
      return true;
    }
  }

  // Default to data plane
  return false;
}

export function buildLanguageMetadata(
  optionMap: Record<string, Record<string, unknown>>,
  params: Record<string, unknown>,
  baseOutputDir: string,
  defaultServiceDir?: string,
  typespecType?: "data" | "management",
): Record<string, LanguagePackageMetadata> {
  const languagesDict: Record<string, LanguagePackageMetadata> = {};

  for (const [emitterName, emitterOptions] of Object.entries(optionMap)) {
    const metadata = createLanguageMetadata(
      emitterName,
      emitterOptions ?? {},
      params,
      baseOutputDir,
      defaultServiceDir,
      typespecType,
    );
    const language = inferLanguageFromEmitterName(emitterName);
    languagesDict[language] = metadata;
  }

  return languagesDict;
}

function createLanguageMetadata(
  emitterName: string,
  emitterOptions: Record<string, unknown>,
  params: Record<string, unknown>,
  baseOutputDir: string,
  defaultServiceDir?: string,
  typespecType?: "data" | "management",
): LanguagePackageMetadata {
  const normalizedOptions = normalizeOptionsObject(emitterOptions);

  // Extract common options
  const outputDirRaw =
    normalizedOptions["emitter-output-dir"] ?? normalizedOptions["emitterOutputDir"];
  const flavor = normalizedOptions["flavor"];
  const languageServiceDir = normalizedOptions["service-dir"];

  // Use language-specific service-dir if present, otherwise use default
  const serviceDir = languageServiceDir ? String(languageServiceDir) : defaultServiceDir;

  // Use language-specific parser if available
  let packageName: string | undefined;
  let namespace: string | undefined;

  const normalizedEmitterName = emitterName.toLowerCase();
  const registration = EMITTER_REGISTRY[normalizedEmitterName];

  if (registration) {
    const result = registration.parser(normalizedOptions, params, typespecType);
    packageName = result.packageName;
    namespace = result.namespace;
  } else {
    // Fallback to generic extraction
    packageName = extractOption(normalizedOptions, PACKAGE_NAME_KEYS);
    namespace = extractOption(normalizedOptions, NAMESPACE_KEYS);
  }

  // Convert outputDir to use {output-dir} placeholder
  let relativeOutputDir: string | undefined;
  if (outputDirRaw) {
    const absolutePath = String(outputDirRaw);
    const normalizedBase = normalizePath(baseOutputDir).replace(/\/$/, "");
    const normalizedPath = normalizePath(absolutePath);

    // Replace the base output directory with {output-dir} placeholder
    if (normalizedPath.startsWith(normalizedBase + "/")) {
      const relativePart = normalizedPath.substring(normalizedBase.length + 1);
      relativeOutputDir = `{output-dir}/${relativePart}`;
    } else if (normalizedPath === normalizedBase) {
      relativeOutputDir = "{output-dir}";
    } else {
      // If it doesn't start with base, keep as-is
      relativeOutputDir = absolutePath;
    }
  }

  // Resolve {namespace} placeholder in output directory
  if (relativeOutputDir && namespace) {
    relativeOutputDir = relativeOutputDir.replace(/\{namespace\}/g, namespace);
  }

  return {
    emitterName,
    packageName,
    namespace,
    outputDir: relativeOutputDir,
    flavor: flavor ? String(flavor) : undefined,
    serviceDir,
  };
}

function normalizeOptionsObject(
  options: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!options) {
    return {};
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(options)) {
    normalized[key] = value;
  }
  return normalized;
}

function extractOption(options: Record<string, unknown>, candidates: string[]): string | undefined {
  for (const [key, value] of Object.entries(options)) {
    const normalizedKey = normalizeKey(key);
    for (const candidate of candidates) {
      if (normalizedKey === normalizeKey(candidate)) {
        if (value === undefined || value === null) {
          continue;
        }
        return String(value);
      }
    }
  }
  return undefined;
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function inferLanguageFromEmitterName(emitterName: string): string {
  const normalized = emitterName.toLowerCase();
  const registration = EMITTER_REGISTRY[normalized];
  if (registration) {
    return registration.language;
  }

  return emitterName;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
