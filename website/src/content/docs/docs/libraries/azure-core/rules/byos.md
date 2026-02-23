---
title: "byos"
---

```text title="Full name"
@azure-tools/typespec-azure-core/byos
```

Operations that upload binary data (using content types like `application/octet-stream` or `multipart/form-data`) should use the Bring Your Own Storage (BYOS) pattern recommended for Azure Services.

See the [Azure REST API Guidelines - BYOS](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#bring-your-own-storage-byos) for more details.

#### ❌ Incorrect

Uploading binary data with `application/octet-stream`:

```tsp
op uploadFile(data: bytes, @header contentType: "application/octet-stream"): void;
```

Uploading with `multipart/form-data`:

```tsp
op uploadFile(
  @multipartBody data: {
    data: HttpPart<bytes>;
  },
  @header contentType: "multipart/form-data",
): void;
```

#### ✅ Correct

Use the BYOS pattern where the client provides a storage location, instead of directly accepting binary data in the request body.

Binary content types in responses (downloads) are allowed:

```tsp
op download(): {
  data: bytes;
  @header contentType: "application/octet-stream";
};
```
