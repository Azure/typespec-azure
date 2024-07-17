---
jsApi: true
title: "[F] getUnionAsEnum"

---
```ts
function getUnionAsEnum(union): [UnionEnum | undefined, readonly Diagnostic[]]
```

Tries to convert a union into an enum.
If the union only contains the same type of literal options with optionally
the base scalar to mark extensibility we can represent this union as an enum of that type.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `union` | `Union` | Union to try to convert |

## Returns

[[`UnionEnum`](../type-aliases/UnionEnum.md) \| `undefined`, readonly `Diagnostic`[]]

## Example

Simple closed string enum

```tsp
union PetKind { "cat", "dog" }
```

```ts
const [enum, diagnostics] = getUnionAsEnum(union);
enum.open === false
enum.open.members.get("cat") // { value: "cat", variant: ... }
enum.open.members.get("dog") // { value: "dog", variant: ... }
```

Simple open string enum

```tsp
union PetKind { Cat: "cat", Dog: "dog", string }
```

```ts
const [enum, diagnostics] = getUnionAsEnum(union);
enum.open === true
enum.open.members.get("Cat") // { value: "cat", variant: ... }
enum.open.members.get("Dog") // { value: "dog", variant: ... }
```

Invalid case

```tsp
union PetKind { Cat: "cat", Dog: 123, string }
```

```ts
const [enum, diagnostics] = getUnionAsEnum(union);
enum === undefined
diagnostics.length === 1
```
