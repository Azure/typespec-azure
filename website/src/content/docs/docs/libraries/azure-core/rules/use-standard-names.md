---
title: "use-standard-names"
---

```text title="Full name"
@azure-tools/typespec-azure-core/use-standard-names
```

Ensure Azure Service operations follow the naming recommendations.

| Operation type                       | Naming convention                                 |
| ------------------------------------ | ------------------------------------------------- |
| `GET` returning single object        | Start with `get`                                  |
| `GET` returning list of object       | Start with `list`                                 |
| `PUT` returning both `200` and `201` | Start with `createOrReplace`                      |
| `PUT` returning only `201`           | Start with `create` or `createOrReplace`          |
| `PUT` returning only `200`           | Start with `replace` or `createOrReplace`         |
| `PATCH` returning `201`              | Start with `create`, `update` or `createOrUpdate` |
| `DELETE`                             | Start with `delete`                               |

#### ❌ Incorrect

```tsp
op addPet is ResourceCreate<Pet>;
```

```tsp
op getPets is ResourceList<Pet>;
```

#### ✅ Correct

```tsp
op createPet is ResourceCreate<Pet>;
```

```tsp
op listPets is ResourceList<Pet>;
```
