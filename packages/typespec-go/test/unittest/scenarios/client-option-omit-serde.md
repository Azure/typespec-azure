# `@@clientOption` omitSerdeMethods omits a model's (de)serialization methods

Without the option `Person` would get generated `MarshalJSON`/`UnmarshalJSON` methods
in `zz_models_serde.go`; with `omitSerdeMethods` set to `all` they are omitted, so no
serde file is generated for the only model in the service.

## TypeSpec

```tsp
@service(#{ title: "ClientOption" })
namespace ClientOption;

model Person {
  name: string;
  age: int32;
}

@get
@route("/get")
op get(): Person;

#suppress "@azure-tools/typespec-client-generator-core/client-option" "omit serde methods for this type"
@@clientOption(Person, "omitSerdeMethods", "all", "go");
```

## No serde file is generated

```go models_serde
// (file was not generated)
```
