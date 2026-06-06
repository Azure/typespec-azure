namespace Azure.Core;

using TypeSpec.Reflection;

alias MergePatch<
  T extends Model,
  Rename extends valueof fn(name: valueof string) => valueof string
> = applySimplifiedMergePatch(T, Rename);

#suppress "experimental-feature"
internal extern fn applySimplifiedMergePatch(
  input: Reflection.Model,
  rename: valueof fn(name: valueof string) => valueof string
): Reflection.Model;

#suppress "experimental-feature"
extern fn mapRenamer(mapping: valueof Record<string>): valueof fn(
  name: valueof string
) => valueof string;

#suppress "experimental-feature"
extern fn templateRenamer(template: valueof string): valueof fn(
  name: valueof string
) => valueof string;
