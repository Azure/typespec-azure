using TypeSpec.Reflection;

namespace Azure.Core.Legacy;

/**
 * Overrides the API-version wire value used for operations within a namespace or interface.
 *
 * The value is opaque and does not need to be declared by the service version enum. The override
 * is inherited by enclosed namespaces, interfaces, and operations, with the nearest override taking
 * precedence.
 *
 * This decorator is considered legacy functionality and should only be used to preserve
 * compatibility with an existing SDK.
 *
 * @param target The namespace or interface whose operations use the API-version override.
 * @param version The non-empty API-version wire value.
 *
 * @example Override an interface API version
 * ```typespec
 * @Azure.Core.Legacy.overrideApiVersion("2021-11-01")
 * interface Widgets {
 *   get(): void;
 * }
 * ```
 */
extern dec overrideApiVersion(target: Namespace | Interface, version: valueof string);

/**
 * A scalar type representing a next link that requires formatting with parameters to be used.
 *
 * @example
 * ```typespec
 * model ListCertificateOptions {
 *   includePending?: string;
 * }
 * model Certificate {
 *   name: string;
 * }
 * model Page {
 *   @pageItems items: Certificate[];
 *   @nextLink nextLink: Azure.Core.Legacy.parameterizedNextLink<[ListCertificateOptions.includePending]>;
 * }
 * ```
 *
 * @template ParameterizedParams The model properties whose values must be reapplied to the next link.
 */
@Azure.Core.Foundations.Private.parameterizedNextLinkConfig(ParameterizedParams)
scalar parameterizedNextLink<ParameterizedParams extends TypeSpec.Reflection.ModelProperty[]>
  extends url;
