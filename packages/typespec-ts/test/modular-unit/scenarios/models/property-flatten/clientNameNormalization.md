# Should use normalized client property names in areAllPropsUndefined for optional flatten

Should keep the property names passed to `areAllPropsUndefined` consistent with the
client-side (normalized) property names. When `@clientName` renames a property,
the generated interface uses the normalized name (e.g. `Publisher` -> `publisher`),
while `$DO_NOT_NORMALIZE$` keeps the name as-is (e.g. `Product`). The
`areAllPropsUndefined` check must reference the same normalized names so that the
undefined check works correctly.

## TypeSpec

This is tsp definition.

```tsp
model DataProductProperties {
  publisher: string;
  product: string;
}

model DataProduct {
  result: string;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties?: DataProductProperties;
}

op foo(body: DataProduct): DataProduct;

@@clientName(DataProductProperties.publisher, "Publisher");
@@clientName(DataProductProperties.product, "$DO_NOT_NORMALIZE$Product");
```

Enable the raw content with TCGC dependency.

```yaml
needArmTemplate: true
withVersionedApiVersion: true
needTCGC: true
mustEmptyDiagnostic: false
```

## Models

Model generated.

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { areAllPropsUndefined } from "../static-helpers/serialization/check-prop-undefined.js";

/** model interface DataProduct */
export interface DataProduct {
  result: string;
  publisher?: string;
  Product?: string;
}

export function dataProductSerializer(item: DataProduct): any {
  return {
    result: item["result"],
    properties: areAllPropsUndefined(item, ["publisher", "Product"])
      ? undefined
      : _dataProductPropertiesSerializer(item),
  };
}

export function dataProductDeserializer(item: any): DataProduct {
  return {
    result: item["result"],
    ...(!item["properties"]
      ? item["properties"]
      : _dataProductPropertiesDeserializer(item["properties"])),
  };
}

/** model interface DataProductProperties */
export interface DataProductProperties {
  publisher: string;
  Product: string;
}

export function dataProductPropertiesSerializer(item: DataProductProperties): any {
  return { publisher: item["publisher"], product: item["Product"] };
}

export function dataProductPropertiesDeserializer(item: any): DataProductProperties {
  return {
    publisher: item["publisher"],
    Product: item["product"],
  };
}

/** Known values of {@link Versions} that the service accepts. */
export enum KnownVersions {
  /** 2022-05-15-preview */
  V20220515Preview = "2022-05-15-preview",
}

export function _dataProductPropertiesSerializer(item: DataProduct): any {
  return { publisher: item["publisher"], product: item["Product"] };
}

export function _dataProductPropertiesDeserializer(item: any) {
  return {
    publisher: item["publisher"],
    Product: item["product"],
  };
}
```
