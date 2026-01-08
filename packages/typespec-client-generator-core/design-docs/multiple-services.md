# Multiple Service Support in TypeSpec Client Generator Core

## Background

Previously, TCGC [client](./client.md) only supported generating a client from a single service. However, in real-world scenarios, a single package often contains multiple services. TCGC must support multiple services within one package to address these needs.

## User Scenario

1. Merging multiple services' namespaces into one client

This scenario is common in Azure management services. For example, the compute team maintains several services: `Compute`, `Disk`, `Gallery`, and `Sku`. These services share the same endpoint and credential but have different versioning. When migrating these services into TypeSpec, services team wants to follow the existing way to generate SDK: geneate one SDK with a single client that could manage all these services with different versioning, instead of generate multiple SDKs for these multiple services. Therefore, TCGC must support auto-merging operations and nested namespaces/interfaces from multiple services with different versioning into one client.

For example, given two services `Disk` and `Gallery`, with Python SDK, the generated client code should look like:

```python
client = ComputeManagementClient(credential=DefaultAzureCredential(), subscription_id="{subscription-id}")
client.disks.list_by_resource_group(resource_group_name="myResourceGroup") # this operation will use API version defined in Disk service
client.galleries.list(location="eastus") # this operation will use API version defined in Gallery service
```

## First Step Design

The initial design focuses on the scenario of auto-merging multiple services into a single client. For other scenarios, such as redefining client hierarchy for multiple services, we will consider them in future iterations.

### Syntax Proposal

Previously, the `service` property of the `@client` option only supported a single service. We propose extending it to accept an array of services.

For example, given two services, the original service specs are:

```typespec title="ServiceA/main.tsp"
@service
@versioned(VersionsA)
namespace ServiceA;

enum VersionsA {
  av1,
  av2,
}
interface AI {
  @route("/aTest")
  aTest(@query("api-version") apiVersion: VersionsA): void;
}
```

```typespec title="ServiceB/main.tsp"
@service
@versioned(VersionsB)
namespace ServiceB;

enum VersionsB {
  bv1,
  bv2,
}
interface BI {
  @route("/bTest")
  bTest(@query("api-version") apiVersion: VersionsB): void;
}
```

To define a combined client:

```typespec title="client.tsp"
import "./ServiceA/main.tsp";
import "./ServiceB/main.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@client({
  name: "CombineClient",
  service: [ServiceA, ServiceB],
})
@useDependency(ServiceA.VersionsA.av2, ServiceB.VersionsB.bv2) // optional
namespace CombineClient;
```

**Explanation:**

- `@client` with the `service` property as an array indicates a combined client.
- `@useDependency` specifies the version for each service:
  - If all services are unversioned, `@useDependency` can be omitted.
  - If any service is versioned and `@useDependency` is not set, TCGC will use the latest version for each service by default.
- Only one `@client` with multiple services can be defined per package. Defining multiple such clients or mixing with `@operationGroup` is not supported.

### TCGC Behavior

When TCGC detects multiple services in one client, it will:

1. Create the root client for the combined client. If any service is versioned, the root client's initialization method will have an `apiVersion` parameter with no default value. The `apiVersions` property and the `apiVersion` parameter for the root client will be empty (since multiple services' API versions cannot be combined). The root client's endpoint and credential parameters will be created based on the first sub-service, which means all sub-services must share the same endpoint and credential.
2. Create sub-clients for each service's nested namespaces or interfaces. Each sub-client will have its own `apiVersion` property and initialization method if the service is versioned.
3. If multiple services have nested namespaces or interfaces with the same name, TCGC will automatically resolve the conflict by appending the service name as a suffix (e.g., `Operations_ServiceA`, `Operations_ServiceB`).
4. Operations directly under each service's namespace are placed under the root client. Operations under nested namespaces or interfaces are placed under the corresponding sub-clients.
5. Decorators such as `@clientLocation`, `@convenientAPI`, `@protocolAPI`, `@moveTo`, and `@scope` work as usual. When using `@clientLocation` to move operations from different services to a new operation group, the resulting operation group will have empty `apiVersions` and a `string` type for the API version parameter.
6. All other TCGC logic remains unchanged.
7. Since TCGC only resolves operation group name conflicts, emitters must still handle conflicts for models, operations, or other types appropriately.

For the example above, TCGC will generate types like:

```yaml
clients:
  - &a1
    kind: client
    name: CombineClient
    apiVersions: []
    clientInitialization:
      kind: clientinitialization
      parameters:
        - kind: endpoint
          name: endpoint
          isGeneratedName: true
          onClient: true
        - kind: method
          name: apiVersion
          apiVersions: []
          clientDefaultValue: undefined
          isGeneratedName: false
          onClient: true
      name: CombineClientOptions
      isGeneratedName: true
      initializedBy: individually
    children:
      - kind: client
        name: AI
        parent: *a1
        apiVersions:
          - av1
          - av2
        initialization:
          kind: clientinitialization
          parameters:
            - kind: endpoint
              name: endpoint
              isGeneratedName: true
              onClient: true
            - kind: method
              name: apiVersion
              apiVersions:
                - av1
                - av2
              clientDefaultValue: av2
              isGeneratedName: false
              onClient: true
          name: AIOptions
          isGeneratedName: true
          initializedBy: parent
        methods:
          - kind: basic
            name: aTest
      - kind: client
        name: BI
        parent: *a1
        apiVersions:
          - bv1
          - bv2
        initialization:
          kind: clientinitialization
          parameters:
            - kind: endpoint
              name: endpoint
              isGeneratedName: true
              onClient: true
            - kind: method
              name: apiVersion
              apiVersions:
                - bv1
                - bv2
              clientDefaultValue: bv2
              isGeneratedName: false
              onClient: true
          name: BIOptions
          isGeneratedName: true
          initializedBy: parent
        methods:
          - kind: basic
            name: bTest
```

### Name Conflict Resolution

When multiple services have nested namespaces or interfaces with the same name, TCGC automatically resolves the conflict by appending the service name as a suffix.

For example:

```typespec
@service
namespace ServiceA {
  interface Operations {
    opA(): void;
  }
}

@service
namespace ServiceB {
  interface Operations {
    opB(): void;
  }
}

@client({
  name: "CombineClient",
  service: [ServiceA, ServiceB],
})
namespace CombineClient;
```

The generated operation groups will be named `Operations_ServiceA` and `Operations_ServiceB` to avoid the conflict.

### Using `@clientLocation` with Multiple Services

When using `@clientLocation` to move operations from different services to the same operation group (whether it's a new operation group name or an existing one), the resulting operation group will behave like a multi-service root client:

- The `apiVersions` property will be empty
- The API version parameter type will be `string` instead of a service-specific enum
- The operation group can contain operations with different API versions from different services

For example:

```typespec
@service
@versioned(VersionsA)
namespace ServiceA {
  enum VersionsA { av1, av2 }
  op opA(@query("api-version") apiVersion: VersionsA): void;
}

@service
@versioned(VersionsB)
namespace ServiceB {
  enum VersionsB { bv1, bv2 }
  op opB(@query("api-version") apiVersion: VersionsB): void;
}

@client({
  name: "CombineClient",
  service: [ServiceA, ServiceB],
})
namespace CombineClient;

@@clientLocation(ServiceA.opA, "SharedGroup");
@@clientLocation(ServiceB.opB, "SharedGroup");
```

The resulting `SharedGroup` operation group will have:
- `apiVersions: []`
- API version parameter with `type.kind === "string"`
- Operations from both ServiceA and ServiceB
```
