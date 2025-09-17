import { useEffect } from "react";

export function useEffectAsync(
  effect: () => Promise<void>,
  deps: React.DependencyList,
): void {
  useEffect(() => {
    effect().catch(console.error);
  }, deps);
}