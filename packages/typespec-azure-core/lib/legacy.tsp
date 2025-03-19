using TypeSpec.Reflection;

namespace Azure.Core.Legacy;

/**
 * A scalar type representing a next link that requires formatting with parameters to be used.
 */
@Azure.Core.Foundations.Private.parameterizedNextLinkConfig(TypeSpec.Reflection.ModelProperty[])
scalar parameterizedNextLink<ParameterizedParams extends TypeSpec.Reflection.ModelProperty[]>
  extends url;
