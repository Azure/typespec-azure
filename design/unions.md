## Design for support of unions in TypeSpec

### TypeSpec Unions

There are two ways to define a union in TypeSpec.

1. using the "|" symbol, e.g. `Cat | Dog`.
2. with a `union` statement, which (currently) requires that each variant of the union has a name. E.g.

```
union Pet { cat: Cat, dog: Dog }
```

#### typespec-autorest

In typespec-autorest, any union containing more than one non-null model is an error,
except as the return-type of an operation, where union variants can represent the body of different responses (status codes).

#### openapi3

openapi3 will emit "|" unions as an `anyOf`.

openapi3 will support a `@oneOf` decorator on the `union` statement which specifies that a union defined in a `union` statement should be emitted as a `oneOf`:

E .g.

```typespec
model Cat extends Pet {
  kind: "cat";
  meow: int32;
}

model Dog extends Pet {
  kind: "dog";
  bark: string;
}

@oneOf
union Pet {
  cat: Cat,
  dog: Dog,
}
```

will be rendered in openapi3 as:

```yaml
components:
  schemas:
    Pet:
      oneOf:
        - $ref: "#/components/schemas/Cat"
        - $ref: "#/components/schemas/Dog"

    Cat:
      properties:
        kind:
          type: string
          enum: ["cat"]
        meow:
          type: integer
      required: ["kind", "meow"]
    Dog:
      properties:
        kind:
          type: string
          enum: ["dog"]
        bark:
          type: string
      required: ["kind", "bark"]
```

In openapi3, a union defined with a `union` statement without an `@oneOf` decorator will be rendered as an `anyOf`

openapi3 will ignore the "names" for variants in named unions.

### Discriminated Unions

Both typespec-autorest and openapi3 will support the `@discriminator(propertyName)` decorator on a `model`.

E .g.

```typespec
@discriminator("kind")
model Pet {}

model Cat extends Pet {
  kind: "cat";
  meow: int32;
}

model Dog extends Pet {
  kind: "dog";
  bark: string;
}
```

Notes:

- Until the subtyping feature is implemented, this will implicitly define `propertyName` as a required string property of the model.
- When subtyping is implemented, `propertyName` should be defined in the model. It can be defined either as "string" -- "open" style, or as a union of string literals or as an enum -- a "closed" type.
- The model can have other properties besides the discriminator.
- When `@discriminator` is specified we should verify that "propertyName" is defined in each model that extends the discriminated model as a string property and required. We should also ensure that all constant values of the discriminator are unique.

#### typespec-autorest

In typespec-autorest, a model with the @discriminator decorator and all models that extend it will produce an "oas2 discriminated union" with autorest extensions, e.g.:

```yaml
definitions:
  Pet:
    discriminator: kind
    properties:
      kind:
        type: string
    required:
      - kind

  Cat:
    x-ms-discriminator-value: cat
    allOf:
      - "#/defintions/Pet"
    properties:
      kind:
        type: string
      meow:
        type: integer
    required: ["kind", "meow"]
  Dog:
    x-ms-discriminator-value: dog
    allOf:
      - "#/defintions/Pet"
    properties:
      kind:
        type: string
      bark:
        type: string
    required: ["kind", "bark"]
```

Notes:

- typespec-autorest will issue a warning if the discriminator property in a variant is not a string literal value.
- typespec-autorest suppresses the `enum` for the discriminator property since autorest does not allow it.
- The `x-ms-discriminator-value` extension is only produced if the discriminator property in the variant is a (single) string constant.

#### openapi3

In openapi3, a model with the @discriminator decorator and all models that extend it will produce an ["oas3 models with polymorphism pattern"](https://github.com/OAI/OpenAPI-Specification/blob/3.0.3/versions/3.0.3.md#models-with-polymorphism-support).

```yaml
components:
  schemas:
    Pet:
      discriminator:
        propertyName: kind
        mapping:
          cat: "#/components/schemas/Cat"
          dog: "#/components/schemas/Dog"

    Cat:
      allof:
        - $ref: "#/components/schemas/Pet"
      properties:
        kind:
          type: string
          enum: ["cat"]
        meow:
          type: integer
      required: ["kind", "meow"]
    Dog:
      allof:
        - $ref: "#/components/schemas/Pet"
      properties:
        kind:
          type: string
          enum: ["dog"]
        bark:
          type: string
      required: ["kind", "bark"]
```

Notes:

- oas3 allows but does not require the discriminator property to be defined in the parent model.
- The "mapping" part of the discriminator will reflect any variants with a discriminator property defined as a string literal. OpenAPI 3 does not require the mapping to be exhaustive.
- openapi3 will allow a variant to define its discriminator with more than one string literal. E.g. `kind: "cat" | "dog"`.

### Discriminated Unions with "fat" base models

As mentioned above, a model with the @discriminator decorator may contain properties other than discriminator.

E.g.

```typespec
@discriminator("kind")
model Pet {
  name: string;
  weight: float32;
}

model Cat extends Pet {
  kind: "cat";
  meow: int32;
}

model Dog extends Pet {
  kind: "dog";
  bark: string;
}
```

#### typespec-autorest

In typespec-autorest this is rendered as:

```yaml
definitions:
  Pet:
    discriminator: kind
    properties:
      kind:
        type: string
      name:
        type: string
      weight:
        type: number
        format: float
    required: ["kind", "name", "weight"]

  Cat:
    x-ms-discriminator-value: cat
    allOf:
      - "#/components/schemas/Pet"
    properties:
      kind:
        type: string
      meow:
        type: integer
      required: ["kind", "meow"]
  Dog:
    x-ms-discriminator-value: dog
    allOf:
      - "#/components/schemas/Pet"
    properties:
      kind:
        type: string
      bark:
        type: string
      required: ["kind", "bark"]
```

### openapi3

In openapi3 this is rendered as

```yaml
components:
  schemas:
    Pet:
      properties:
        name:
          type: string
        weight:
          type: number
          format: float
      required: ["name", "weight"]
      discriminator:
        propertyName: kind
        mapping:
          cat: "#/components/schemas/Cat"
          dog: "#/components/schemas/Dog"

    Cat:
      allOf:
        - $ref: "#/components/schemas/Pet"
      properties:
        kind:
          type: string
          enum: ["cat"]
        meow:
          type: integer
      required: ["kind", "meow"]
    Dog:
      allOf:
        - $ref: "#/components/schemas/Pet"
      properties:
        kind:
          type: string
          enum: ["dog"]
        bark:
          type: string
      required: ["kind", "bark"]
```
