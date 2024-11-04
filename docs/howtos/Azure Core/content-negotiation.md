---
title: Content Type Negotiation
---

See [Http documentation on content type negotiation](https://typespec.io/docs/next/libraries/http/content-types#content-type-negotiation) for the general concept

## Usage with Azure.Core operations

Content negotiation in `Azure.Core` is done in the same way as in Http operations. This means each operation must have the `@sharedRoute` decorator added as well as an `Accept` header in the operation parameters (`TParams`).

For example, consider an api that lets you download the avatar of the `User` resource as a `png` or `jpeg` depending on which Accept header is sent.

```tsp
using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.Core;

@resource("users")
model User {
  @key id: string;
}

model PngImage {
  @header contentType: "image/png";
  @body image: bytes;
}

model JpegImage {
  @header contentType: "image/jpeg";
  @body image: bytes;
}

@sharedRoute
@action("avatar")
op getAvatarAsPng is StandardResourceOperations.ResourceAction<
  User,
  {
    @header accept: "image/png";
  },
  PngImage
>;

@sharedRoute
@action("avatar")
op getAvatarAsJpeg is StandardResourceOperations.ResourceAction<
  User,
  {
    @header accept: "image/jpeg";
  },
  JpegImage
>;
```
