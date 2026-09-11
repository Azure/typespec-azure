Use a plain model for every Azure Resource Manager request body.

## Impact

- **Area:** API, SDK

Plain model request bodies can evolve by adding optional properties without changing the top-level wire shape. Primitive, union, array, and record bodies cannot gain new fields without a breaking API and generated-SDK change.

A plain model is a TypeSpec model without an indexer. This rule evaluates the authored TypeSpec shape rather than reproducing emitter-specific Swagger schema behavior. Operations without a request body and multipart request bodies are allowed.

## Incorrect

```tsp
@post
op submit(@body body: string): void;

model ItemList is Array<string>;

@post
op submitItems(@body body: ItemList): void;

model Metadata is Record<string>;

@post
op submitMetadata(@body body: Metadata): void;
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
```

## Suppression

Suppress only when required to preserve an existing API; otherwise replace the request body with a model without an indexer.

## LintDiff Origin

This rule is the idiomatic TypeSpec equivalent of the Swagger validator rule [ParametersSchemaAsTypeObject](https://github.com/Azure/azure-openapi-validator/blob/main/docs/parameters-schema-as-type-object.md). It intentionally validates TypeSpec model semantics instead of simulating AutoRest's emitted Swagger schema details.
