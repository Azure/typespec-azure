C# SDK names should use standard acronym casing. This initial rule covers `IP`, `DB`, and `OS`.

The rule checks the C#-resolved name and respects `@clientName` overrides.

#### ❌ Incorrect

```tsp
model IpAddress {
  value: string;
}

model CosmosDb {
  id: string;
}
```

#### ✅ Correct

```tsp
model IPAddress {
  value: string;
}

model CosmosDB {
  id: string;
}
```

Or using `@@clientName` in `client.tsp` to override just the C# name:

```tsp
// client.tsp
@@clientName(IpAddress, "IPAddress", "csharp");
```
