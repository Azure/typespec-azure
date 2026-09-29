An operation group's name should not collide with a service schema type used in an HTTP request
or response body. A generated client and a schema with the same name may force client generators
to rename one of them, producing an unexpected SDK API. Prefer plural operation-group names such
as `Widgets` when the service has a `Widget` schema.

The rule checks effective AutoRest-scoped client names, including `@clientName` and
`@clientLocation` overrides. A type used only as a header or query parameter, an unused type,
or a type declared in another namespace is not a conflicting service schema. ARM common types
are not local schema names, but locally declared types reachable through them are checked.
Direct operations without a named group are checked only when an underscored operation name or
an explicit client location supplies a group.

## Impact

- **Area:** SDK generation. Conflicting client and schema names can require generated API names
  that differ from the authored names.
- **Compatibility:** Changing an operation group's name after an SDK ships can break client code.

## Examples

### Incorrect

```tsp
using TypeSpec.Http;

@service
namespace Example;

model Widget {
  id: string;
}

namespace Operations {
  interface Widget {
    @get
    @route("/widgets")
    read(): Example.Widget;
  }
}
```

### Correct

```tsp
using TypeSpec.Http;

@service
namespace Example;

model Widget {
  id: string;
}

namespace Operations {
  interface Widgets {
    @get
    @route("/widgets")
    read(): Example.Widget;
  }
}
```

## Suppression

Suppress the warning only if the group name is already used by a shipped SDK and changing it
would break client compatibility. Include the compatibility reason:

```tsp
#suppress "@azure-tools/typespec-client-generator-core/no-operation-id-model-name-conflict" "Preserve the shipped SDK group name."
interface Widget {
  @get
  @route("/widgets")
  read(): Example.Widget;
}
```

## LintDiff Equivalent

This rule promotes
[`OperationIdNounConflictingModelNames`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/operation-id-noun-conflicting-model-names.md)
from the local LintDiff rule `operation-id-noun-conflicting-model-names`. The native rule
intentionally checks supported TypeSpec authoring rather than explicit OpenAPI operation-ID
overrides; see the source rule's migration evidence for the limits of equivalence.
The ARM common-type exclusion reads the same public decorator metadata as the source rule
without requiring ARM as a runtime dependency of TCGC for data-plane SDKs.
