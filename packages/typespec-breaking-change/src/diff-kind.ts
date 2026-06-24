/**
 * All detectable diff kinds produced by the diff engine.
 * These are context-neutral — the policy engine determines severity.
 */
export type DiffKind =
  // Service-level
  | "ApiVersionRemoved"
  | "ApiVersionAdded"
  | "AuthSchemeRemoved"
  | "AuthSchemeAdded"
  | "OAuthScopeAdded"
  | "OAuthScopeRemoved"
  // Operation-level
  | "OperationRemoved"
  | "OperationAdded"
  | "OperationRouteChanged"
  // Request parameters
  | "RequestPathParameterAdded"
  | "RequestPathParameterRemoved"
  | "RequestQueryParameterAdded"
  | "RequestQueryParameterRemoved"
  | "RequestHeaderAdded"
  | "RequestHeaderRemoved"
  // Request body
  | "RequestPropertyAdded"
  | "RequestPropertyRemoved"
  | "RequestPropertyTypeChanged"
  | "RequestPropertyTypeNarrowed"
  | "RequestPropertyTypeWidened"
  | "RequestPropertyMadeRequired"
  | "RequestPropertyMadeOptional"
  // Response
  | "ResponseStatusCodeAdded"
  | "ResponseStatusCodeRemoved"
  | "ResponseHeaderAdded"
  | "ResponseHeaderRemoved"
  | "ResponsePropertyAdded"
  | "ResponsePropertyRemoved"
  | "ResponsePropertyTypeChanged"
  | "ResponsePropertyTypeNarrowed"
  | "ResponsePropertyTypeWidened"
  | "ResponsePropertyMadeRequired"
  | "ResponsePropertyMadeOptional"
  // Content type
  | "RequestContentTypeAdded"
  | "RequestContentTypeRemoved"
  | "ResponseContentTypeAdded"
  | "ResponseContentTypeRemoved"
  // Type transitions (narrowing/widening)
  | "EnumMemberAdded"
  | "EnumMemberRemoved"
  | "UnionVariantAdded"
  | "UnionVariantRemoved"
  | "ClosedToOpen"
  | "OpenToClosed"
  // Format/encoding
  | "EncodingChanged"
  // Error responses
  | "ErrorResponseAdded"
  | "ErrorResponseRemoved"
  // Constraints
  | "RequestConstraintStrengthened"
  | "RequestConstraintRelaxed"
  | "ResponseConstraintStrengthened"
  | "ResponseConstraintRelaxed";
