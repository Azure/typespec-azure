# Design Document: Adding Support for Next Link Paging with Re-injected Query Parameters

## Overview

Currently, the client treats the `nextLink` in paging as opaque and does not inject query parameters that were part of the initial request when following the next link. This proposal aims to enhance the client by adding capability to reinject query parameters into next requests for paging operations.

## Problem

This is an existing issue in 1-2 brownfield Azure services: Keyvault and potentially AppConfig.

### Keyvault

KV only has one instance in `listCertificates`, there is an optional query parameter `includePending`, which dictates whether to include pending certificates in the returned list of certificates. The service does not automatically reinject the value of `includePending` into the next link, so for all subsequent calls during paging, you will have to reinject `includePending=True` if you would like to continue seeing pending certificates in subsequent pages.

### AppConfig

I can't get in touch with anyone on the client-side team working with AppConfig since they're all no longer with us.

The examples used throughout the rest of this doc will reference the `includePending` issue from KV.

## Requirements

1. Solves the issue for our 3 Azure services: KeyVault, Storage, AppConfig.
2. Open question of whether this support is required for 3p. For Azure services, requiring clients to reinject parameters is against guidelines. However, should we restrict 3p authors from describing this in their specs, even if it might not be best practice?
3. Work with templates

## Design Proposals

### Fixing `@nextPageOperation` in typespec-azure

```tsp
@get nextPage is Azure.Core.Foundations.Operation<{ nextLink: string, includePending?: string }, Azure.Core.Page<Certificate>>;

@nextPageOperation(
    nextPage,
    { nextLink: ResponseProperty<"nextLink">, includePending: RequestParameter<"includePending"> }
)
list is Azure.Core.ResourceList<Certificate>;
```

#### Pros

1. Definitely easiest path forward, since all of the code is pretty much here for us. All we have to do is fix [this](https://github.com/Azure/typespec-azure/issues/1880) issue
2. No new decorators or syntax introduced

#### Cons

1. Ugly definition
2. We are gradually moving away from paging from `azure-core`, and unclear if there would be a counterpart in unbranded paging, so this won't be a good idea for 3p support or non-brownfield service support
3. No 3p support

#### Todos

1. Fix [this](https://github.com/Azure/typespec-azure/issues/1880) github issue
2. Ensure support for `@nextPageOperation` in all language emitters

### Adding an incomplete next link scalar type

```tsp
scalar incompleteNextLink<ParametersToReinject[]> extends url;

model ListCertificateOptions {
    includePending?: string;
}

model Page {
    @pagedItems items: Certificate[];
    @nextLink nextLink: incompleteNextLink<[ListCertificateOptions.includePending]>;
}

op listCertificates(...ListCertificateOptions)
```

If we found more use cases, we could elevate the definition of this scalar into either the `Azure.Core` library, or even more generic.

#### Pros

1. Flexible level of support. We could start with the scalar just being a local definition, but if we found other services needing this, we could elevate it up further in the library-chain
2. Kind of fits in with the paging design that is currently in tsp.

#### Cons

1. Slightly more involved than getting `@nextPageOperation` to work, but not by much.

#### Todos

1. Have emitters recognize this definition. Look at the `armResourceIdentifier` decorator implementation from the ARM library.
2. Potentially move it into a higher-up library.

### The `@reinject` Decorator

```tsp
model Page<T> {
  @pageItems items: string[];
  @nextLink next: string;
}
op listCertificates(@reinject @query includePending?: string): Page<Certificate>;
```

`Azure.Core` paging example

```tsp
list is Azure.Core.ResourceOperations<ServiceTraits>.ResourceList<
    Certificate,
    {
        @reinject @query includePending?: string;
    },
>;
```

#### Details

- [ ] Can only be applied to optional parameters
- [ ] Generated clients. This will be consistent with current client-side handling of `api-version` reinjection into next links
- [ ] Usage with azure core templates? Usage with paging templates?

#### Pros

- Simple implementation, which is good considering our need to GA, and the fact that this definitely is more of a corner case.

#### Cons

- Adds another decorator
- Definition isn't the most clear
- Do we need to add a new decorator if we can polish up `@nextPageOperation` to work and persist that decorator?

#### Todos

1. Figure out where to put the `@reinject` decorator
2. Implement the `@reinject` decorator
3. Get emitters to understand the `@reinject` decorator

## Things to Decide

- [ ] design to choose
- [ ] Should this be for azure brownfield services only? Thoughts about this being 3p behavior?
- [ ] location of design change. Will we update code in generic TypeSpec, Azure Core, or TCGC. If we choose TCGC, will there be an eventual plan to move this higher?
