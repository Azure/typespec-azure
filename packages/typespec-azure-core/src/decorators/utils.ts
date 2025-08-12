import { DecoratorFunction } from "@typespec/compiler";
import { useStateSet } from "@typespec/compiler/utils";

export function createMarkerDecorator<T extends DecoratorFunction>(
  key: symbol,
  validate?: (...args: Parameters<T>) => boolean,
) {
  const [isLink, markLink] = useStateSet<Parameters<T>[1]>(key);
  const decorator = (...args: Parameters<T>) => {
    if (validate && !validate(...args)) {
      return;
    }
    const [context, target] = args;
    markLink(context.program, target);
  };
  return [isLink, markLink, decorator as T] as const;
}
