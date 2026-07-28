Ensures that `@friendlyName` is used as intended. The `@friendlyName` decorator should only be applied to template declarations and should reference template parameter properties in the friendly name string.

## Impact

- **Area:** API

`@friendlyName` is an unscoped way to rename a type for every emitter; it should be replaced by targeted client naming.

#### ❌ Incorrect

Using `@friendlyName` on a non-template type:

```tsp
@friendlyName("FriendlyModel")
model TestModel {}
```

```tsp
@friendlyName("FriendlyEnum")
enum TestEnum {
  Foo,
  Bar,
}
```

Using `@friendlyName` on a template without referencing template parameters:

```tsp
@friendlyName("FriendlyUpdate")
op updateTemplate<T>(body: T): T;
```

#### ✅ Correct

Using `@friendlyName` on a template with template parameter references:

```tsp
@friendlyName("{name}Page", T)
model Page<T> {
  size: int32;
  item: T[];
}
```

```tsp
@friendlyName("List{name}", T)
op listTemplate<T>(): Page<T>;
```

## Suppression

Do not suppress. Use `@clientName` instead.
