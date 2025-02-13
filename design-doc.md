# Design Document: Adding Support for Next Link Paging with Re-injected Query Parameters

## Overview

Currently, we treat the `nextLink` in paging as opaque and does not inject query parameters that were part of the initial request when following the next link. This proposal aims to enhance our `nextLink` handling by adding capability to reinject query parameters into next requests for paging operations.

## Problem

This is an existing issue in 3 brownfield Azure services: Keyvault, Storage and AppConfig.

### Keyvault

KV only has one instance in `listCertificates`, there is an optional query parameter `includePending`, which dictates whether to include pending certificates in the returned list of certificates. The service does not automatically reinject the value of `includePending` into the next link, so for all subsequent calls during paging, you will have to reinject `includePending=True` if you would like to continue seeing pending certificates in subsequent pages.

### Storage

Storage does a combination of continuation token paging and needing to reinject optional query parameters into the next GET calls. For example, `listBlobsInContainer` has the following paging process

1. GET `<storage-container-url>/?comp=list`
2. extract value of `NextMarker` from HTTP response body
3. if `NextMarker` value is empty BREAK
4. GET `<storage-container-url>/?comp=list;marker=<next-marker-value>`
5. if `maxresults` was passed by the user, reinject this value into the GET call
6. GOTO 2

The examples used throughout the rest of this doc will reference the `includePending` issue from KV.

## Requirements

1. Solves the issue for our 3 Azure services: KeyVault, Storage, AppConfig.
2. Open question of whether this support is required for 3p. For Azure services, requiring clients to reinject parameters is against guidelines. However, should we restrict 3p authors from describing this in their specs, even if it might not be best practice?
3. Work with templates

## Design Proposals

### Fixing `@nextPageOperation` in typespec-azure

```tsp
@get nextPage is Azure.Core.Foundations.Operation<{ nextLink: string, includePending?: string }, Azure.Core.Page<Certificate>>;

@Azure.Core.nextPageOperation(
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
2. TCGC abstracts support for `@nextPageOperation`
3. Language emitters will need to make sure that they can support next link url reformatting with specfic query params

### Adding an incomplete next link scalar type

```tsp
scalar nextLinkWithAdditionalParams<ParametersToReinject[]> extends url;

model ListCertificateOptions {
    includePending?: string;
}

model Page {
    @pagedItems items: Certificate[];
    @nextLink nextLink: nextLinkWithAdditionalParams<[ListCertificateOptions.includePending]>;
}

op listCertificates(...ListCertificateOptions)
```

If we found more use cases, we could elevate the definition of this scalar into either the `Azure.Core` library, or even more generic.

#### Pros

1. Flexible level of support. We could start with the scalar just being a local definition, but if we found other services needing this, we could elevate it up further in the library-chain
2. Kind of fits in with the paging design that is currently in tsp.

#### Cons

1. Slightly more involved than getting `@nextPageOperation` to work, but not by much.
2. Discoverability of the scalar option is a challenge, especially if we start off by limiting it to individual spec-level definitions

#### Todos

1. TCGC will abstract this information
2. Language emitters will need to make sure that they can support next link url reformatting with specfic query params
3. Potentially move it into a higher-up library.

### The `@reinject` Decorator

>NOTE: @srnagar has a suggestion to rename it as `@nextLinkQuery` for clarity

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

My thinking is we can start out with support for this decorator in tcgc, and depending on eventual usage scenarios, we can move it further up the library chain.

#### Details

- [ ] Can only be applied to optional parameters
- [ ] Generated clients. This will be consistent with current client-side handling of `api-version` reinjection into next links
- [ ] Usage with azure core templates? Usage with paging templates?

#### Pros

- Simple implementation, which is good considering our need to GA, and the fact that this definitely is more of a corner case.

#### Cons

- Adds another decorator
- Definition isn't the most clear
- Do we need to add a new decorator if we can polish up `@nextPageOperation` to work and persist that decorator and move it to TypeSpec core?

#### Todos

1. Figure out where to put the `@reinject` decorator
2. Implement the `@reinject` decorator
3. Get emitters to understand the `@reinject` decorator

## Things to Decide

- [ ] design to choose
- [ ] Should this be for azure brownfield services only? Thoughts about this being 3p behavior?
- [ ] location of design change. Will we update code in generic TypeSpec, Azure Core, or TCGC. If we choose TCGC, will there be an eventual plan to move this higher?
- [ ] Do we want to consider next link paging with header parameter reinjection?
