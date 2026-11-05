const generatorPackages = new Map([
  ["AzureClientGenerator", "@azure-typespec/http-client-csharp"],
  ["ManagementClientGenerator", "@azure-typespec/http-client-csharp-mgmt"],
  ["ProvisioningGenerator", "@azure-typespec/http-client-csharp-provisioning"],
]);
const storageUrl = "https://typespec.blob.core.windows.net/pkgs/";

declare const importShim: {
  addImportMap(map: {
    imports: Record<string, string>;
    scopes: Record<string, Record<string, string>>;
  }): void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

export async function loadCSharpEmitters(): Promise<string[]> {
  const catalog = await fetchJson("https://csharp-playground-server.azurewebsites.net/generators");
  if (!isRecord(catalog) || !Array.isArray(catalog.generators)) {
    throw new Error("Invalid Azure C# generator catalog.");
  }
  const entries: unknown[] = catalog.generators;
  const versions = new Map<string, string>();
  for (const entry of entries) {
    if (
      !isRecord(entry) ||
      typeof entry.generatorName !== "string" ||
      typeof entry.packageName !== "string" ||
      generatorPackages.get(entry.generatorName) !== entry.packageName ||
      typeof entry.packageVersion !== "string" ||
      !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(entry.packageVersion) ||
      versions.has(entry.packageName)
    ) {
      throw new Error("Invalid Azure C# generator catalog entry.");
    }
    versions.set(entry.packageName, entry.packageVersion);
  }
  if (versions.size !== generatorPackages.size) {
    throw new Error("The server has not configured all three Azure C# generators.");
  }

  const maps = await Promise.all(
    [...versions].map(async ([name, version]) => {
      const base = `${storageUrl}${name}/${version}/`;
      const map = await fetchJson(`${base}import-map.json`);
      if (!isRecord(map) || map.version !== version || !isRecord(map.imports)) {
        throw new Error(`Invalid browser import map for ${name}@${version}.`);
      }
      const imports: Record<string, string> = {};
      for (const [key, value] of Object.entries(map.imports)) {
        if (typeof value !== "string") {
          throw new Error(`Invalid browser import map entry for ${name}@${version}.`);
        }
        imports[key] = value;
      }
      if (!imports[name]?.startsWith(base)) {
        throw new Error(`Browser bundle does not match ${name}@${version}.`);
      }
      return { name, base, imports };
    }),
  );
  const imports: Record<string, string> = {};
  const scopes: Record<string, Record<string, string>> = {};
  for (const map of maps) {
    for (const [name, url] of Object.entries(map.imports)) {
      if (name === map.name || name.startsWith(`${map.name}/`)) {
        imports[name] = url;
      }
    }
    // Keep independently bundled peers scoped to their emitter's resolved version.
    scopes[map.base] = map.imports;
  }
  importShim.addImportMap({ imports, scopes });
  return [...versions.keys()];
}
