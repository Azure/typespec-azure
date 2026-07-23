This diagnostic is issued when services merged into the same client resolve different versions of a shared dependency namespace.

## Impact

- **Area:** Multi-service dependency versioning. Blocks merging services into one client when their shared versioned dependencies would generate incompatible or duplicated SDK models.
- **Not affected:** Each service can still be generated separately with its own dependency resolution.

#### ❌ Incorrect Usage

```typespec
@versioned(LibVersions)
namespace SharedLib {
  enum LibVersions {
    v1,
    v2,
  }
}

@service
@versioned(VersionsA)
namespace ServiceA {
  enum VersionsA {
    @useDependency(SharedLib.LibVersions.v1)
    av1,
  }
}

@service
@versioned(VersionsB)
namespace ServiceB {
  enum VersionsB {
    @useDependency(SharedLib.LibVersions.v2) // differs from ServiceA's dependency on `v1`
    bv1,
  }
}

@client({
  name: "CombineClient",
  service: [ServiceA, ServiceB],
  autoMergeService: true,
})
namespace CombineClient {

}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Services merged into client "CombineClient" depend on different versions of "SharedLib": "v1", "v2".
```

#### ✅ How to Fix

Align service versioning or `@useDependency` mappings so every merged service resolves the shared dependency to the same version.
