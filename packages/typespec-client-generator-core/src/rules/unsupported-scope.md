Checks emitter scopes on TCGC decorators, including `@alternateType`, `@clientName`, and `@scope`. It validates legacy string arguments, `DecoratorOptions` values, and `scope` properties in `@client` and `@clientInitialization` options.

The supported scopes are:

| Scope        | SDK or emitter            |
| ------------ | ------------------------- |
| `csharp`     | C#                        |
| `java`       | Java                      |
| `python`     | Python                    |
| `javascript` | JavaScript and TypeScript |
| `go`         | Go                        |
| `rust`       | Rust                      |
| `cpp`        | C++                       |
| `autorest`   | AutoRest OpenAPI emitter  |

Scope names are case-sensitive. Use `javascript`, not `typescript`, for TypeScript SDKs, and `csharp`, not `dotnet`, for C# SDKs. Scopes may be comma-separated (`"java, python"`), individually negated (`"!java"`), or group-negated (`"!(java, python)"`). Omitting the scope applies the decorator to all emitters.

For `@clientInitialization`, only genuine options bags use `scope` to select an emitter. A `scope` property on a legacy client-parameters model remains a client parameter and is not checked as an emitter scope.

#### ❌ Incorrect

```typespec
@alternateType(string, "typescript")
scalar StorageTimestamp extends utcDateTime;
```

#### ✅ Correct

```typespec
@alternateType(string, "javascript")
scalar StorageTimestamp extends utcDateTime;
```

## Impact

- **Area:** SDK

Unsupported scopes silently prevent customizations from applying to the intended SDK. Fixing a scope after an SDK has shipped can change its public API and introduce a breaking change.

## Suppression

Correct unsupported scopes before releasing an SDK. Suppression is acceptable when preserving an already-shipped SDK API or intentionally targeting a custom, non-Azure emitter. This Azure rule does not restrict TCGC's ability to support custom emitters.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/unsupported-scope" "Preserve the already-shipped SDK API until the next breaking release."
@alternateType(string, "typescript")
scalar StorageTimestamp extends utcDateTime;
```
