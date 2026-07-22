This diagnostic is issued when the same model is used as both multipart/form-data input and regular body input such as JSON or XML. Those request bodies have different wire shapes and cannot safely share one SDK model.

To fix this issue, create a separate form-data model, such as `<ModelName>FormData`, and use each model only for its matching body kind.

### Example

```typespec
using TypeSpec.Http;

@service(#{ title: "Test Service" })
namespace TestService;

model MultiPartRequest {
  id: HttpPart<string>;
  profileImage: HttpPart<bytes>;
}

@put
op jsonUse(@body multipartBody: MultiPartRequest): NoContentResponse;

@post
op multipartUse(
  @header contentType: "multipart/form-data",
  @multipartBody body: MultiPartRequest,
): NoContentResponse;
```

`MultiPartRequest` is used both as a regular JSON body and as a multipart body; split the multipart shape into a separate model.
