/**
 * All detectable diff kinds produced by the diff engine.
 * These are context-neutral — the policy engine determines severity.
 *
 * Organized by the taxonomy in diff-taxonomy.md.
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
  | "RequestParameterRenamed"
  | "RequestParameterMadeRequired"
  | "RequestParameterMadeOptional"
  | "RequestParameterDefaultChanged"
  | "RequestParameterLocationChanged"
  // Request body properties
  | "RequestPropertyAdded"
  | "RequestPropertyRemoved"
  | "RequestPropertyRenamed"
  | "RequestPropertyTypeChanged"
  | "RequestPropertyTypeNarrowed"
  | "RequestPropertyTypeWidened"
  | "RequestPropertyMadeRequired"
  | "RequestPropertyMadeOptional"
  | "RequestPropertyDefaultChanged"
  // Request type/encoding/constraint
  | "RequestTypeChanged"
  | "RequestTypeNarrowed"
  | "RequestTypeWidened"
  | "RequestTypeKindChanged"
  | "RequestEncodingChanged"
  | "RequestConstraintStrengthened"
  | "RequestConstraintRelaxed"
  // Request content type
  | "RequestContentTypeAdded"
  | "RequestContentTypeRemoved"
  // Response properties
  | "ResponsePropertyAdded"
  | "ResponsePropertyRemoved"
  | "ResponsePropertyRenamed"
  | "ResponsePropertyTypeChanged"
  | "ResponsePropertyTypeNarrowed"
  | "ResponsePropertyTypeWidened"
  | "ResponsePropertyMadeRequired"
  | "ResponsePropertyMadeOptional"
  // Response type/encoding/constraint
  | "ResponseTypeChanged"
  | "ResponseTypeNarrowed"
  | "ResponseTypeWidened"
  | "ResponseTypeKindChanged"
  | "ResponseEncodingChanged"
  | "ResponseConstraintStrengthened"
  | "ResponseConstraintRelaxed"
  // Response structure
  | "ResponseStatusCodeAdded"
  | "ResponseStatusCodeRemoved"
  | "ResponseContentTypeAdded"
  | "ResponseContentTypeRemoved"
  | "ResponseHeaderAdded"
  | "ResponseHeaderRemoved"
  | "ErrorResponseAdded"
  | "ErrorResponseRemoved"
  // Model / type kind diffs
  | "TypeKindChanged"
  | "EnumerationMemberAdded"
  | "EnumerationMemberRemoved"
  | "EnumerationOpened"
  | "EnumerationClosed"
  | "DiscriminatorChanged"
  // Default values (generic, applies to params and properties)
  | "DefaultValueAdded"
  | "DefaultValueRemoved"
  | "DefaultValueChanged";
