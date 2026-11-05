Azure services should not define anonymous models, union expressions, enum expressions, or scalar expressions inline. Instead, types must be defined as named declarations.

## Impact

- **Area:** SDK, API

Anonymous inline types - models, unions, enums, or scalars - cannot be represented directly by many target languages, forcing awkward or unusable SDK types.

## Rationale

Many target languages cannot represent inline union types or anonymous models directly and require them to be named types. By requiring named types in the specification, we ensure:

- **Consistent code generation**: Generated SDKs in languages like C#, Java, and Python can properly represent the type as a named type
- **Better documentation**: Named types provide clear type names that appear in generated documentation
- **Improved maintainability**: Named types are easier to reuse across multiple properties and operations

## Examples

#### ❌ Incorrect

Using inline union expressions:

```tsp
model Request {
  approvalStatus: "Approved" | "Rejected" | string;
}
```

Using anonymous inline models:

```tsp
model Outer {
  nested: {
    foo: string;
  };
}
```

Using an anonymous request body as a template argument:

```tsp
@post op Send<T>(@body body: T): void;
op send is Send<{
  name: string;
}>;
```

#### ✅ Correct

Define unions as named types:

```tsp
model Request {
  approvalStatus: RequestApprovalStatus;
}

union RequestApprovalStatus {
  Approved: "Approved",
  Rejected: "Rejected",
  string,
}
```

Define models as named types:

```tsp
model Nested {
  foo: string;
}

model Outer {
  nested: Nested;
}
```

Define a named request model before passing it to an operation template:

```tsp
model Request {
  name: string;
}

@post op Send<T>(@body body: T): void;
op send is Send<Request>;
```

:::note
Enums are also discouraged, see [no-enum rule](./no-enum.md) for more details.
:::

## Exceptions

The following patterns are **not** flagged:

- Nullable unions (e.g. `MyModel | null`)
- Status code unions (e.g. `@statusCode _: 200 | 400`)
- Content-type header unions (e.g. `@header contentType: "application/json" | "text/plain"`)
- HTTP response envelopes with explicit `@body`/`@bodyRoot`, or metadata without an anonymous implicit payload
- Anonymous models used as template arguments outside request bodies, such as OAuth2 flow configuration
- Types defined inside standard library namespaces (`TypeSpec.*`, `Azure.*`)
- Unions where all non-null variants are scalars (e.g. `string | int32`)

The template-argument exception does not apply to nonempty anonymous models used as
the actual request body through `@body` or `@bodyRoot`, including ARM action templates.
This includes unnamed models composed with intersections or model spreads; define a
named model for the composed request body.

## Implicit response bodies

The rule also checks anonymous implicit model response bodies, such as `@get op read(): { value: string };`.

### Incorrect

Adding a payload property outside a named model creates an anonymous response shape. These excerpts assume an ARM provider context with `Widget` already declared and the HTTP and ARM namespaces in scope:

```tsp
@armResourceOperations
interface Widgets {
  get is ArmResourceRead<
    Widget,
    Response = {
      @statusCode status: 200;
      ...Widget;
      etag: string;
    }
  >;
}
```

### Correct

When no custom response is needed, prefer `ArmResourceRead<Widget>` without a `Response` override:

```tsp
@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise define the type as a named declaration.

## LintDiff Equivalent

The request-body check partially covers
[AvoidAnonymousParameter](https://github.com/Azure/azure-openapi-validator/blob/main/docs/anonymous-body-parameter.md).
This rule checks native TypeSpec names, not emitted schema names. Named dictionary
types such as `Record<string>` remain valid even when an emitter inlines their schemas
and the Swagger validator reports them.

The implicit-response check partially covers
[AvoidAnonymousTypes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/avoid-anonymous-types.md).
It checks TypeSpec declarations, not emitted Swagger schemas. Named dictionaries and named models that an emitter inlines in `allOf` remain valid; Swagger schema overrides are not inspected.
