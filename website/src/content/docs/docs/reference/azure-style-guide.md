---
title: Azure TypeSpec Style Guide
---

## History

| Date        | Notes            |
| ----------- | ---------------- |
| 2022-Oct-28 | Initial version. |

## Introduction

This document contains guidelines that complement and extend the
[Microsoft Azure REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) for describing an Azure API with a TypeSpec API design document.
The goal of these guidelines is to establish the requirements for complete and consistent API designs
that will ensure high quality in generated documentation and client libraries.

## Use the Azure.Core library

The [Azure.Core](azure.core/index.md) library enforces many of the requirements for complete and consistent API designs.
If your TypeSpec definition imports the Azure.Core library and compiles without linter errors, this ensures
compliance with the most important Azure API style guidelines.

```typespec
import "@azure-tools/typespec-azure-core";
```

## Use the Versioning library

All TypeSpec API designs for Azure must import the typespec-lang/versioning library, define their api-versions,
and the versions of all imported libraries.

```typespec
import "@typespec/versioning";

@versioned(Contoso.WidgetManager.Versions)
namespace Contoso.WidgetManager;

enum Versions {
  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  v2022_08_31: "2022-08-31",
}
```

## Decorators

Certain decorators from the TypeSpec standard library or common extension libaries must not be used
in Azure TypeSpec definitions.

- `@operationId` -- the operationId is derived from the operation name.
- `@format` -- not recommended for use in Azure specs because this is an open-ended string and the interpretation is open to each emitter.
  Instead, we recommend using supported scalars. Azure-specific scalars include: `eTag`, `ipV4Address`, `ipV6Address` and `uuid`. General
  TypeSpec scalars include: `bytes`, `numeric`, `integer`, `float`, `int64`, `int32`, `int16`, `int8`, `uint64`, `uint32`, `uint16`, `uint8`,
  `safeint`, `float64`, `float32`, `decimal`, `decimal128`, `string`, `plainDate`, `plainTime`, `utcDateTime`, `offsetDateTime`, `duration`,
  `boolean`, and `url`. For more information, see the document on [Types Relations](https://typespec.io/docs/language-basics/type-relations)

## Operation Groups

Operations should be grouped within an interface or namespace. The name of the interface or namespace
should be a plural noun, and for ARM apis it should match the resource type name in the path segment.
This name will be prepended to the operation name to form the operationId.

For example, the interface that groups the operations for the 'Microsoft.Compute/virtualMachines'
resource type should be named 'VirtualMachines'.

## Operation Names

Operation names should follow a consistent pattern

| operation template                    | name should contain    | notes |
| ------------------------------------- | ---------------------- | ----- |
| ResourceCreateOrUpdate                | "Create" and "Update"  |       |
| ResourceCreateOrReplace               | "Create" and "Replace" |       |
| ResourceCreateWithServiceProvidedName | "Create"               |       |
| ResourceRead                          | "Get"                  |       |
| ResourceDelete                        | "Delete"               |       |
| ResourceList                          | "List"                 |       |
| LongRunningResourceCreateOrReplace    | "Create" and "Replace" |       |
| LongRunningResourceDelete             | "Delete"               |       |

## Parameters

When a path parameter specifies the identifier of a resource being created, it should

- use the `@maxLength` decorator to specify the maximum length allowed for the identifier, and
- use the `@pattern` decorator to specify the characters that can be used in the identifier.

## Support for pagination

If the operation accepts a `top`, `skip`, `maxpagesize`, `filter`, `orderby`, `select`, or `expand` parameter,
use the appropriate parameter description in the Azure.Core library.

```typespec
interface Widgets {
  @doc("List Widget resources")
  listWidgets is ResourceList<
    Widget,
    {
      parameters: {
        ...TopQueryParameter;
        ...SkipQueryParameter;
        ...MaxPageSizeQueryParameter;
        ...FilterQueryParameter;
        ...OrderByQueryParameter;
        ...SelectQueryParameter;
        ...ExpandQueryParameter;
      };
    }
  >;
}
```

## Security Definitions

Every TypeSpec definition must define at least one valid security scheme.

Management plane services only need to import the Azure.ResourceManager library
to define the standard ARM security definitions.

Data plane services must explicitly define their security scheme(s) with the Azure.Core `@useAuth` decorator.

Each security scheme must have a `type` of "oauth2" or "apiKey" with `in` "header".

Each security scheme must have a `description` with a plain English explanation of the security scheme.

For "oauth2" security schemes, `scopes` must contain at least one entry.

The key of each entry in `scopes` must be of the form `<resource URI>/scope name`, where "scope name" is typically ".default" for Azure services.

### Examples

The following example shows how to define a security scheme for Azure Active Directory authentication:

```typespec
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

Note that the name "AADToken" has no significance, and "https://resource.azure.com/" is meant to signify the URI of the public cloud resource.

The "type" is not particularly relevant but the "implicit" oauth2 flow is now considered insecure so another choice like "authorizationCode" is preferable.

The following example defines an apikey security scheme:

```typespec
@useAuth(AzureKey)
namespace Contoso.WidgetManager;

@doc("The secret key for your Azure Cognitive Services subscription.")
model AzureKey is ApiKeyAuth<ApiKeyLocation.header, "Ocp-Apim-Subscription-Key">;
```

Here also, the name "AzureKey" has no significance.

All operations for the service should accept the security defined for the service.
