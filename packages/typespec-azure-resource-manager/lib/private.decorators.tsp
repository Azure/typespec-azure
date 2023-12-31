import "../dist/src/private.decorators.js";

namespace Azure.ResourceManager.Private;

using TypeSpec.Reflection;

/**
 * Update the ARM provider namespace for a given entity.
 */
extern dec armUpdateProviderNamespace(target: Reflection.Operation);

/**
 * @param resource Resource model
 */
extern dec assignProviderNameValue(target: ModelProperty, resource: Model);

/**
 * Describes the shape of model literals accepted by the `version` parameter of
 * the `armCommonDefinition` and `armCommonParameter` decorators.
 */
alias ArmCommonTypeVersionSpec = {
  version: string | EnumMember;
  isDefault: boolean;
};

/**
 * @param definitionName Definition name
 * @param version Arm Version
 * @param referenceFile Reference file
 */
extern dec armCommonDefinition(
  target: Model,
  definitionName?: valueof string,
  version?: EnumMember | ArmCommonTypeVersionSpec | (valueof string),
  referenceFile?: valueof string
);

/**
 * @param definitionName Definition name
 * @param version Arm Version
 * @param referenceFile Reference file
 */
extern dec armCommonParameter(
  target: ModelProperty,
  definitionName?: valueof string,
  version?: EnumMember | ArmCommonTypeVersionSpec | (valueof string),
  referenceFile?: valueof string
);

/**
 * This decorator is used to identify ARM resource types and extract their
 * metadata.  It is *not* meant to be used directly by a spec author, it instead
 * gets implicitly applied when the spec author defines a model type in this form:
 *
 *   `model Server is TrackedResource<ServerProperties>;`
 *
 * The `TrackedResource<T>` type (and other associated base types) use the `@armResource`
 * decorator, so it also gets applied to the type which absorbs the `TrackedResource<T>`
 * definition by using the `is` keyword.
 *
 * @param properties Arm resource properties
 */
extern dec armResourceInternal(target: Model, properties: Model);

/**
 * Omit a property in the target model.
 * @internal
 * @param propertyName Name of the property to omit
 */
extern dec omitIfEmpty(target: Model, propertyName: valueof string);

/**
 * @param propertyName Name of the property to omit
 */
extern dec resourceBaseParametersOf(target: Model, propertyName: Model);
/**
 * @param values Values
 */
extern dec resourceParameterBaseFor(target: ModelProperty, values: unknown[]);

/**
 * Marks an enum as representing the valid `common-types` versions.
 */
extern dec armCommonTypesVersions(target: Enum);
