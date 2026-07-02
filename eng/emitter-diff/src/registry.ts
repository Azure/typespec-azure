/** Adapter registry. New languages register here; the core is otherwise agnostic. */
import { pythonAdapter } from "./adapters/python.ts";
import { rustAdapter } from "./adapters/rust.ts";
import { typescriptAdapter } from "./adapters/typescript.ts";
import type { EmitterAdapter } from "./types.ts";

const adapters: Record<string, EmitterAdapter> = {
  [pythonAdapter.name]: pythonAdapter,
  [typescriptAdapter.name]: typescriptAdapter,
  [rustAdapter.name]: rustAdapter,
  // Future: java, go ... each wraps its own generate/test command.
};

export function getAdapter(name: string): EmitterAdapter {
  const adapter = adapters[name];
  if (!adapter) {
    throw new Error(`Unknown emitter '${name}'. Available: ${Object.keys(adapters).join(", ")}`);
  }
  return adapter;
}

export function listAdapters(): string[] {
  return Object.keys(adapters);
}
