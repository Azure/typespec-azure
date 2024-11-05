---
title: "auth-required"
---

```text title="Full name"
@azure-tools/typespec-azure-core/auth-required
```

Ensure Azure services define their authentication requirements. See https://azure.github.io/typespec-azure/docs/reference/azure-style-guide#security-definitions

#### ❌ Incorrect

```tsp
@service
namespace Azure.Service;
```

#### ✅ Correct

- OAuth2

```tsp
@useAuth(AADToken)
namespace Contoso.WidgetManager;

@doc("The Azure Active Directory OAuth2 Flow")
model AADToken
  is OAuth2Auth<[
    {
      type: OAuth2FlowType.authorizationCode;
      authorizationUrl: "https://api.example.com/oauth2/authorize";
      tokenUrl: "https://api.example.com/oauth2/token";
      scopes: ["https://management.azure.com/read", "https://management.azure.com/write"];
    }
  ]>;
```

- Api Key

```tsp
@useAuth(AzureKey)
namespace Contoso.WidgetManager;

@doc("The secret key for your Azure Cognitive Services subscription.")
model AzureKey is ApiKeyAuth<ApiKeyLocation.header, "Ocp-Apim-Subscription-Key">;
```
