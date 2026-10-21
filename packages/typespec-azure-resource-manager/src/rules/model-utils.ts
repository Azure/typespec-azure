import {
  isNullType,
  resolveEncodedName,
  walkPropertiesInherited,
  type Model,
  type ModelProperty,
  type Program,
  type Type,
  type Union,
} from "@typespec/compiler";

export function getSingleNonNullMember(union: Union): Type | undefined {
  let member: Type | undefined;
  for (const variant of union.variants.values()) {
    if (isNullType(variant.type)) continue;
    if (member !== undefined) return undefined;
    member = variant.type;
  }
  return member;
}

export function* walkJsonProperties(
  program: Program,
  model: Model,
): Iterable<[string, ModelProperty]> {
  for (const property of walkPropertiesInherited(model)) {
    yield [resolveEncodedName(program, property, "application/json"), property];
  }
}
