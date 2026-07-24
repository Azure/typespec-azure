Operations that upload binary data (using content types like `application/octet-stream` or `multipart/form-data`) should use the Bring Your Own Storage (BYOS) pattern recommended for Azure Services.

See the [Azure REST API Guidelines - BYOS](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#bring-your-own-storage-byos) for more details.

## Impact

- **Area:** API

The API transfers large artifacts through the service (upload/download) instead of using a storage account, which scales poorly and diverges from Azure guidance.

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

:::note
Binary content types in responses (downloads) are not affected by this rule.
:::

```tsp
op download(): {
  data: bytes;
  @header contentType: "application/octet-stream";
};
```

## Suppression

Suppress when direct upload/download is appropriate for the API; otherwise use a storage account for large artifacts.
