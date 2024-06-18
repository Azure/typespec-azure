This doc is to design TCGC API of multipart for language emitters.

# multipart payload

Here is classic payload of multipart:
```
POST /upload HTTP/1.1
Content-Length: 428
Content-Type: multipart/form-data; boundary=abcde12345
--abcde12345
Content-Disposition: form-data; name="id"
Content-Type: text/plain

123e4567-e89b-12d3-a456-426655440000
--abcde12345
Content-Disposition: form-data; name="profileImage"; filename="image1.png"
Content-Type: image/png

{…file content…}
--abcde12345--
```
According to https://datatracker.ietf.org/doc/html/rfc7578, multipart request payload contains multi independent parts which could be divided into two kinds: one is non-file part which contains `required "name"/optional "Content-Type" / content`; the other one is file part which contains one more `optional "filename"`.

# Current TCGC API for multipart
Currently TCGC only has boolean flag [isMultipartFileInput](https://github.com/Azure/typespec-azure/blob/ab7a066d4ac0ae23a40f9ff8f4b6037559bda34c/packages/typespec-client-generator-core/src/interfaces.ts#L368) to distinguish file and non-file. After https://github.com/microsoft/typespec/issues/3046 complete, Typespec permit users to define more info explicitly(e.g. content-type) for each part so boolean flag is not enough.

# Multipart in Typespec
Typespec support two kinds of definition for multipart:

1. Model format

```
op upload(
  @header `content-type`: "multipart/form-data",
  @multipartBody body: {
    fullName: HttpPart<string>,
    headShots: HttpPart<Image>[]
  }
): void;
```

2. Tuple format

 ```
op upload(
  @header `content-type`: "multipart/form-data",
  @multipartBody body: [
    HttpPart<string, #{ name: "fullName" }>,
    HttpPart<Image, #{ name: "headShots" }>[]
  ]
): void;
```

# Proposal about new TCGC API for multipart
Since all language emitters emit multipart body as model format, TCGC will uniform the multipart body type as model, and each model property equals to property of model format or part of tuple format in Typespec.

```typescript
exprot interface multipartOptionsType {
  isNameDefined: boolean; // whether name is defined in Typespec. For multipart/mixed, name may not be defined for some parts
  isFilePart: boolean; // whether this part is for file
  multi: boolean; // whether this part is multi in request payload
  headers: HeaderProperty[]; // relates to custom header
  filename?: SdkModelPropertyTypeBase;
  contentType?: SdkModelPropertyTypeBase;
}

export interface SdkBodyModelPropertyType extends SdkModelPropertyTypeBase {
  kind: "property";
  discriminator: boolean;
  serializedName: string;
  isMultipartFileInput: boolean;  // deprecated
  multipartOptions?: multipartOptionsType; // new options for multipart
  visibility?: Visibility[];
  flatten: boolean;
}
```

notes:
- `isNameDefined`: Whether name is defined in Typespec. For multipart/mixed, name may not be defined for some parts.
- `isFilePart`: Same with `isMultipartFileInput` before
- `multi`: Mainly for explicity of `Type[]`. In old design for `Model[]`, Typespec can't declare it clearly that SDK shall
 (a) serialize array of model as single part or (b) serialize model as single part then send it multi times. With new design, if
 `HttpPart<Model[]>`, multi is false and SDK shall follow (a); if `HttpPart<Model>[]`, multi is true and follow (b)
- `headers`: Equals to custom headers in swagger https://swagger.io/docs/specification/describing-request-body/multipart-requests/  
- `filename`: When Typespec author use `httpFile` change requiredness for optional metadata properties "filename", this property has value; otherwise it is "undefined".
- `contentType`: When Typespec author use `httpFile` change requiredness for optional metadata properties "contentType", this property has value; otherwise it is "undefined".

# Examples

## Define "multipart/form-data" with "@body" (compatible for old scenario)
Typespec example:

```
model JSON {
  name: string;
}

op upload(
  @header `content-type`: "multipart/form-data",
  @body body: {
    basic: string,
    singleJson: JSON,
    singleBytes: bytes,
    multiJsonOnePart: JSON[],
    multiBytes: bytes[]
  }
): void;
```


TCGC API example:

```json

{
  "properties": [
    {
      "name": "basic",
      "type": { "kind": "string" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": false,
        "multi": false,
        "headers": []
      }
    },
    {
      "name": "singleJson",
      "type": { "kind": "model" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": false,
        "multi": false,
        "headers": []
      }
    },
    {
      "name": "singleBytes",
      "type": { "kind": "bytes" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": true,
        "multi": false,
        "headers": []
      }
    },
    {
      "name": "multiJsonOnePart",
      "type": { "kind": "array" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": true,
        "multi": false,
        "headers": []
      }
    },
    {
      "name": "multiBytes",
      "type": { "kind": "bytes" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": true,
        "multi": true,
        "headers": []
      }
    }
  ]
}

```

## Define "multipart/form-data" with "@multipartBody"
Typespec example:

```
// "File" is predefined model for user to declare requiredness of metadata properties in part of multipart payload: https://github.com/microsoft/typespec/blob/602fe73692dddf7897363b2ac5d98f5871954612/packages/http/lib/http.tsp#L109-L114

model RequiredFileMetadata is File {
  contentType: string;
  filename: string;
}

op upload(
  @header `content-type`: "multipart/form-data",
  @multipartBody body: [
    // single
    HttpPart<string, #{ name: "basic" }>,
    HttpPart<JSON, #{ name: "singleJson" }>,
    HttpPart<bytes, #{ name: "singleBytes" }>,
    HttpPart<File, #{ name: "singleFileWithOptionalMetadata" }>,
    HttpPart<RequiredFileMetadata, #{ name: "singleFileWithRequiredMetadata" }>,

    // multi
    HttpPart<JSON[], #{ name: "multiJsonOnePart" }>,
    HttpPart<bytes, #{ name: "multiBytes" }>[],
    HttpPart<JSON, #{ name: "multiJsonMultiParts" }>[],

    // custom header
    HttpPart<{ @header `x-ms-header`: "x-custom", @body image: File }>
  ]
): void;
```

TCGC API example:

```json

{
  "properties": [
    {
      "name": "basic",
      "type": { "kind": "string" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": false,
        "multi": false,
        "headers": []
      }
    },
    {
      "name": "singleJson",
      "type": { "kind": "model" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": false,
        "multi": false,
        "headers": []
      }
    },
    {
      "name": "singleBytes",
      "type": { "kind": "bytes" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": true,
        "multi": false,
        "headers": []
      }
    },
    {
      "name": "singleFileWithOptionalMetadata",
      "type": { "kind": "bytes" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": true,
        "multi": false,
        "headers": [],
        "fileName": { "optional": true },
        "contentType": { "optional": true }
      }
    },
    {
      "name": "singleFileWithRequiredMetadata",
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": true,
        "multi": false,
        "headers": [],
        "fileName": { "optional": false },
        "contentType": { "optional": false }
      }
    },
    {
      "name": "multiJsonOnePart",
      "type": { "kind": "array" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": true,
        "multi": false,
        "headers": []
      }
    },
    {
      "name": "multiBytes",
      "type": { "kind": "bytes" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": true,
        "multi": true,
        "headers": []
      }
    },
    {
      "name": "multiJsonMultiParts",
      "type": { "kind": "model" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": true,
        "multi": true,
        "headers": []
      }
    },
    {
      "name": "image",
      "type": { "kind": "bytes" },
      "multipartOptions": {
        "isNameDefined": true,
        "isFilePart": true,
        "multi": false,
        "headers": [{"kind": "header", "name": "x-ms-header"}]
      }
    }
  ]
}

```

## Define "multipart/mixed" with "@multipartBody"
Typespec example:

```
op upload(
  @header `content-type`: "multipart/mixed",
  @multipartBody body: [HttpPart<string>]): void;
```

TCGC API example:

```json
{
  "properties": [
    {
      "name": "",
      "type": { "kind": "string" },
      "multipartOptions": {
        "isNameDefined": false,
        "isFilePart": false,
        "multi": false,
        "headers": []
      }
    }
  ]
}
```

