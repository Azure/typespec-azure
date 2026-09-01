Use an object model for every Azure Resource Manager request body that has an explicit schema type.

## Impact

- **Area:** API, SDK

Object request bodies can evolve by adding optional properties without changing the top-level wire shape. Primitive and array bodies cannot gain new fields without a breaking API and generated-SDK change.

Schemas without an explicit type, such as `unknown` and unsupported model unions, are outside this rule's scope. Nullable and singleton unions use their effective emitted schema type, while unions emitted as string or number enums are rejected. Operations without a request body are also allowed.

## Incorrect

```tsp
@post
op submit(@body body: string): void;

model ItemList is Array<string>;

@post
op submitItems(@body body: ItemList): void;

union ActionMode {
  "fast",
  "safe",
}

@post
op runAction(@body body: ActionMode): void;
```

## Correct

```tsp
model SubmitRequest {
  value: string;
}

@post
op submit(@body body: SubmitRequest): void;

model SubmitItemsRequest {
  items: string[];
}

@post
op submitItems(@body body: SubmitItemsRequest): void;

@post
op submitNullable(@body body: SubmitRequest | null): void;
```

## LintDiff Equivalent

This rule corresponds to the Swagger validator rule [ParametersSchemaAsTypeObject](https://github.com/Azure/azure-openapi-validator/blob/main/docs/parameters-schema-as-type-object.md).
