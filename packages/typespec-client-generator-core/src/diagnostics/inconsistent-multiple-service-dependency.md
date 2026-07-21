This diagnostic is issued when services merged into the same client resolve different versions of a shared dependency namespace.

To fix this issue, align service versioning or `@useDependency` mappings so every merged service resolves the shared dependency to the same version.

### Example

Two services merged into one client pin a shared library to different versions:

```typespec
using Azure.ClientGenerator.Core;

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
    @useDependency(SharedLib.LibVersions.v2)
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

`ServiceA` pins `SharedLib` to `v1` while `ServiceB` pins it to `v2`; align them to the same version.
