import { createRequire } from "node:module";
import { posix } from "node:path";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";

const requireDependency = createRequire(import.meta.url);

export interface GeneratedRuntimeOptions {
  platform?: "node" | "browser" | "react-native";
}

/**
 * Executes real emitted TypeScript modules in memory, resolving external dependencies normally.
 * Platform modes select emitted browser or React Native variants where available.
 */
export function createGeneratedRuntime(
  sources: Iterable<readonly [string, string]>,
  options: GeneratedRuntimeOptions = {},
): { loadModule<T = Record<string, unknown>>(filePath: string): T } {
  const sourceMap = new Map(sources);
  const modules = new Map<string, { exports: Record<string, unknown> }>();

  function loadModule<T = Record<string, unknown>>(filePath: string, selectPlatform = true): T {
    const browserPath = filePath.replace(/\.ts$/, "-browser.mts");
    const reactNativePath = filePath.replace(/\.ts$/, "-react-native.mts");
    const sourcePath =
      selectPlatform && options.platform === "react-native" && sourceMap.has(reactNativePath)
        ? reactNativePath
        : selectPlatform &&
            (options.platform === "browser" || options.platform === "react-native") &&
            sourceMap.has(browserPath)
          ? browserPath
          : filePath;
    const cached = modules.get(sourcePath);
    if (cached) {
      return cached.exports as T;
    }
    const source = sourceMap.get(sourcePath);
    if (source === undefined) {
      throw new Error(`Generated runtime module was not emitted: ${sourcePath}`);
    }
    const module = { exports: {} };
    modules.set(sourcePath, module);
    const { outputText } = transpileModule(source, {
      compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
      fileName: sourcePath.replace(/\.mts$/, ".ts"),
    });
    const requireGenerated = (specifier: string) => {
      if (!specifier.startsWith(".")) {
        return requireDependency(specifier);
      }
      const resolved = posix.resolve(posix.dirname(sourcePath), specifier);
      const path = resolved.replace(/\.mjs$/, ".mts").replace(/\.js$/, ".ts");
      if (resolved.endsWith(".mjs") && !sourceMap.has(path)) {
        // Platform wrappers reexport the common implementation using the build's .mjs name.
        return loadModule(resolved.replace(/\.mjs$/, ".ts"), false);
      }
      return loadModule(path);
    };
    new Function("require", "module", "exports", outputText)(
      requireGenerated,
      module,
      module.exports,
    );
    return module.exports as T;
  }

  return { loadModule };
}
