import { provideContext, useContext } from "../../context-manager.js";
import { DefaultCoreDependencies } from "../../modular/external-dependencies.js";
import { ExternalDependencies } from "../dependency.js";

export function provideDependencies(customDependencies: Partial<ExternalDependencies> = {}) {
  const dependencies = {
    ...DefaultCoreDependencies,
    ...customDependencies,
  } as ExternalDependencies;

  provideContext("dependencies", dependencies);
}

export function useDependencies(): ExternalDependencies {
  return useContext("dependencies");
}
