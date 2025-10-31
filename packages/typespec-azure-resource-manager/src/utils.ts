import {
  getLifecycleVisibilityEnum,
  getVisibilityForClass,
  type ModelProperty,
  type Program,
} from "@typespec/compiler";

/**
 * Determines if a property is read-only, which is defined as having the
 * only the `Lifecycle.Read` modifier.
 *
 * If there is more than one Lifecycle visibility modifier active on the property,
 * then the property is not read-only. For example, `@visibility(Lifecycle.Read, Lifecycle.Update)`
 * does not designate a read-only property.
 */
export function isReadonlyProperty(program: Program, property: ModelProperty) {
  const Lifecycle = getLifecycleVisibilityEnum(program);
  const visibility = getVisibilityForClass(program, property, getLifecycleVisibilityEnum(program));
  // note: multiple visibilities that include read are not handled using
  // readonly: true, but using separate schemas.
  return visibility.size === 1 && visibility.has(Lifecycle.members.get("Read")!);
}
