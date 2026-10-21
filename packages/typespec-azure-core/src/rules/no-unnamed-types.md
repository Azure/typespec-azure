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

The rule also checks anonymous implicit model response bodies, such as
`@get op read(): { value: string };`. Anonymous aliases and intersections are checked,
as is each model alternative in a response union, including nested unions.
Diagnostics target the original model expressions, not synthesized HTTP payloads.
A shared model is reported once across properties, request bodies, operations and
response status codes, including declarations imported from another project file.

Named responses and complete spreads of a named payload remain valid, including
when headers or status codes are declared inside the named model, outside its
spread, or in both places. Adding payload properties outside the named model
creates a new anonymous response shape and is reported. Empty, metadata-only,
scalar, array and dictionary responses are not reported by the implicit-response check.
Library operations and generic operation/interface templates are excluded from
that check.

Explicit `@body` and `@bodyRoot` properties continue to use the existing
property-type checks and template-argument exceptions.

### Incorrect

For an ARM resource read, use `ArmResourceRead` and customize its `Response` only
when needed. Adding a payload property outside a named model creates an anonymous
response shape. These excerpts assume an ARM provider context with `Widget` already
declared and the HTTP and ARM namespaces in scope:

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

Define the complete payload as a named model and spread it into the customized response:

```tsp
model WidgetResponse extends Widget {
  etag: string;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<
    Widget,
    Response = {
      @statusCode status: 200;
      ...WidgetResponse;
    }
  >;
}
```

When no custom response is needed, prefer `ArmResourceRead<Widget>` without a
`Response` override. Its default response uses an explicit `@bodyRoot`. Concrete
operations declared with `is ArmResourceRead<...>` are still checked when their
customized responses have implicit payloads.

The response check uses the existing `no-unnamed-types` rule's enablement. Both the
data-plane and resource-manager rulesets enable this rule, so existing services
can receive additional warnings. Use the existing rule ID for configuration and
suppression; there is no separate response rule to enable.

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
The Swagger rule checks emitted schema occurrences, whereas this rule reports
original TypeSpec declarations once. Dictionary inlining, composition and
emitter-specific naming can produce different findings; this is not exact
Swagger diagnostic parity.
