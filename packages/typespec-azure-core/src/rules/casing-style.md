Validate names follow the [TypeSpec Style guide](https://typespec.io/docs/handbook/style-guide)

## Impact

- **Area:** API, SDK

On properties, inconsistent casing can hurt API usability; use the casing convention for
your API. On other declarations emitters substitute the correct casing for their language.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [DefinitionsPropertiesNamesCamelCase](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r3016) (partial - covers the serious property-casing violation).

The following examples use the default options.

#### ❌ Incorrect

```tsp
model pet {}
model pet_food {}
```

```tsp
model Pet {
  Name: string;
}
```

```tsp
op CreatePet(): void;
```

```tsp
interface petStores {}
```

#### ✅ Correct

```tsp
model Pet {}
model PetFood {}
```

```tsp
model Pet {
  name: string;
}
```

```tsp
op createPet(): void;
```

```tsp
interface PetStores {}
```

## Suppression

Suppression is acceptable on non-property declarations, where the effect is cosmetic.
Avoid suppressing on properties; use the configured API casing convention instead.

## Options

> **Note:** Do not use custom casing options for regular Azure services. Keep the default
> Azure casing conventions. Custom options are intended only for existing APIs that must
> preserve different naming conventions.

Enable this rule with `true` to keep the existing Azure casing conventions, or provide a flat
options object under `linter.enable` in `tspconfig.yaml`. Each category accepts `camelCase`,
`PascalCase`, `snake_case`, or `false` to disable checking that category. Omitted categories
use the defaults below. Unknown categories and other values are configuration errors.

| Option              | Declarations checked                           | Default      |
| ------------------- | ---------------------------------------------- | ------------ |
| `model`             | Named models                                   | `PascalCase` |
| `modelProperty`     | Model properties and operation parameters      | `camelCase`  |
| `operation`         | Concrete operations, including `op ... is ...` | `camelCase`  |
| `operationTemplate` | Operation templates                            | `PascalCase` |
| `interface`         | Interfaces                                     | `PascalCase` |
| `namespace`         | Each namespace segment                         | `PascalCase` |
| `union`             | Named unions                                   | `false`      |
| `unionVariant`      | Named union variants                           | `false`      |
| `enum`              | Enums                                          | `false`      |
| `enumMember`        | Enum members                                   | `false`      |
| `scalar`            | Scalars                                        | `false`      |

For example, an API using snake_case properties, parameters, and members can opt in while
keeping PascalCase declaration names and camelCase operations:

```yaml
linter:
  extends:
    - "@azure-tools/typespec-azure-core/all"
  enable:
    "@azure-tools/typespec-azure-core/casing-style":
      model: PascalCase
      modelProperty: snake_case
      operation: camelCase
      operationTemplate: PascalCase
      interface: PascalCase
      namespace: PascalCase
      union: PascalCase
      unionVariant: snake_case
      enum: PascalCase
      enumMember: snake_case
      scalar: PascalCase
```

```tsp
namespace Example.Service;

model Widget {
  display_name: string;
}

union WidgetKind {
  small_widget: "SmallWidget",
  large_widget: "large-widget",
}

enum WidgetState {
  in_progress: "InProgress",
  complete: "Complete",
}

scalar WidgetId extends string;

op ReadWidget<T>(widget_id: WidgetId): T;

interface Widgets {
  readWidget is ReadWidget<Widget>;
}
```

The options can also be supplied by a library's linter ruleset. A project's explicit
`enable` entry takes precedence over an inherited ruleset entry. Re-enabling the rule with
`true` restores its defaults; an explicit options object replaces the inherited options
object and fills omitted categories from the defaults above.

Only TypeSpec identifiers are checked, not string literal values, enum values, or names
set with `@encodedName`. Anonymous declarations and unnamed (symbol-named) union variants
are skipped. As with the existing rule, template declarations are checked when visited
by the compiler's linter navigation, such as when instantiated.

### Casing details

- `PascalCase` retains the accepted Azure acronyms `AI`, `VM`, `OS`, `IP`, `CPU`, `GPU`,
  and `LRO`, for example `OpenAI` and `ScaleSetVM`.
- `camelCase` retains the existing acronym restrictions and legacy prefix allowances
  (for example `_aRp` and `$aRp`). The model property name `_` remains exempt when
  `modelProperty` is `camelCase`.
- `snake_case` is strict ASCII lowercase: it starts with a letter, followed by lowercase
  letters or digits, with single underscores separating nonempty segments. Digits may
  follow the initial letter or an underscore (`utf8_value`, `version_2`, `v2_3_value`).
  Leading, trailing, or consecutive underscores, uppercase letters, punctuation, and
  a leading digit are not allowed. For example, `_name`, `name_`, `first__name`,
  `firstName`, and `2_names` are invalid. The legacy camelCase exemptions do not apply,
  so `_` and `$name` are also invalid.
