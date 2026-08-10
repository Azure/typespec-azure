using TypeSpec.Reflection;

namespace Azure.Core.Legacy;

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
