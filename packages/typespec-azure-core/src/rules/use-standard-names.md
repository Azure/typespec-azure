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

## Impact

- **Area:** API, SDK

Non-standard operation names reduce consistency across Azure APIs and their SDKs.

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

## Suppression

Suppress only when required to match an existing API; otherwise follow the standard naming conventions.
