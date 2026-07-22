This diagnostic is issued when the same model is used as both multipart/form-data input and regular body input such as JSON or XML. Those request bodies have different wire shapes and cannot safely share one SDK model.

## Impact

- **Area:** Request body model generation. Blocks safe SDK input-model generation because one model would need incompatible multipart and regular-body serialization behavior.
- **Not affected:** The individual TypeSpec operations still describe their request body content types.

#### ❌ Incorrect Usage

```typespec
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

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Model 'MultiPartRequest' cannot be used as both multipart/form-data input and regular body input. You can create a separate model with name 'model MultiPartRequestFormData' extends MultiPartRequest {}
```

#### ✅ How to Fix

Create a separate form-data model, such as `<ModelName>FormData`, and use each model only for its matching body kind.
