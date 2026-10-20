import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "./traits.tsp";

using Http;
using Rest;
using Versioning;
using Azure.Core.Traits;
using Azure.Core.Traits.Private;

namespace Azure.Core;

/** Shared service token-request profiles, independent of native SDK API shape. */
enum AzureTokenAuthenticationKind {
  /** Derive an Entra scope from the selected resource. */
  entraDefaultScope,

  /** Delegate challenge processing to a named SDK runtime contract. */
  challengeBased,
}

/** Shared service token-request semantics, independent of native SDK API shape. */
union AzureTokenAuthenticationOptions {
  /** Derive an Entra scope by appending `/.default` to the selected resource. */
  entraDefaultScope: {
    /** The token-request profile. */
    kind: AzureTokenAuthenticationKind.entraDefaultScope,

    /** The default member of the known-audience enum, which also identifies the catalog. */
    defaultAudience: TypeSpec.Reflection.EnumMember,
  },

  /** Delegate challenge processing to a named SDK runtime contract. */
  challengeBased: {
    /** The token-request profile. */
    kind: AzureTokenAuthenticationKind.challengeBased,

    /** The versioned runtime contract, for example `azure.keyVaultChallenge/v1`. */
    challengeContract: string,
  },
}

/** Shared cloud data binding an optional endpoint default to a declared audience resource. */
model AzureServiceEnvironment {
  /** A member of the authentication model's known-audience enum. */
  audience: TypeSpec.Reflection.EnumMember;

  /** An absolute HTTP or HTTPS endpoint default; an explicit client endpoint takes precedence. */
  defaultEndpoint?: string;
}

/**
 * Azure Active Directory (AAD) Token Authentication Flow
 * @template AuthUrl The authorization URL.
 * @template TokenUrl The token URL.
 * @template Scopes A list of scopes the token applies to.
 */
model AadTokenAuthFlow<Scopes extends string[], AuthUrl extends string, TokenUrl extends string>
  extends TypeSpec.Http.AuthorizationCodeFlow {
  /** The OAuth2 flow type, always the authorization code flow. */
  type: OAuth2FlowType.authorizationCode;

  /** The authorization URL used to obtain an authorization code. */
  authorizationUrl: AuthUrl;

  /** The token URL used to exchange the authorization code for a token. */
  tokenUrl: TokenUrl;

  /** The list of scopes the token applies to. */
  scopes: Scopes;
}

/**
 * Azure Active Directory OAuth2 Flow
 * @template AuthUrl The authorization URL.
 * @template TokenUrl The token URL.
 * @template Scopes A list of scopes the token applies to.
 */
@doc("The Azure Active Directory OAuth2 Flow")
model AadOauth2Auth<
  Scopes extends string[],
  AuthUrl extends string = "https://login.microsoftonline.com/common/oauth2/authorize",
  TokenUrl extends string = "https://login.microsoftonline.com/common/oauth2/token"
> is OAuth2Auth<[AadTokenAuthFlow<Scopes, AuthUrl, TokenUrl>]>;

/**
 * Azure API Key Authentication using the "Ocp-Apim-Subscription-Key" hea
 */
@doc("Azure API Key Authentication")
model AzureApiKeyAuthentication is TypeSpec.Http.ApiKeyAuth<
  ApiKeyLocation.header,
  "Ocp-Apim-Subscription-Key"
>;
