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
3. If multiple services have nested namespaces or interfaces with the same name, TCGC will automatically merge them into a single operation group. The merged operation group will have empty `apiVersions` and a `string` type for the API version parameter, and will contain operations from all the services.
4. Operations directly under each service's namespace are placed under the root client. Operations under nested namespaces or interfaces are placed under the corresponding sub-clients.
5. Decorators such as `@clientLocation`, `@convenientAPI`, `@protocolAPI`, `@moveTo`, and `@scope` work as usual. When using `@clientLocation` to move operations from different services to a new operation group, the resulting operation group will have empty `apiVersions` and a `string` type for the API version parameter.
6. All other TCGC logic remains unchanged.
7. Since TCGC only merges operation groups with the same name, emitters must still handle conflicts for models, operations, or other types appropriately.

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

### Operation Group Merging for Name Conflicts

When multiple services have nested namespaces or interfaces with the same name, TCGC automatically merges them into a single operation group that behaves like a multi-service operation group:

- The `apiVersions` property will be empty
- The API version parameter type will be `string` instead of a service-specific enum
- The operation group will contain operations from all the services with that name

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

The generated client will have a single `Operations` operation group containing both `opA()` and `opB()` operations. The operation group will have empty `apiVersions` and a `string` type for the API version parameter.

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

## Extended Design: Advanced Client Hierarchy Customization

The first step design focuses on automatically merging multiple services into one client. However, users have requested more flexibility in how they organize clients from multiple services. This section extends the previous [client hierarchy design](./client.md) to provide three additional scenarios:

1. Define multiple clients, each belonging to one service
2. Do not auto-merge nested namespaces/interfaces into the root client, instead merge them as direct children of the root client
3. Fully customize how operations from different services are combined into different client hierarchies

### Scenario 1: Multiple Clients, Each Belonging to One Service

In some cases, users may want to generate separate clients for each service rather than combining them into one client. This is useful when services have different authentication, versioning, or other client-level settings.

#### Syntax Proposal

Define multiple `@client` decorators, each targeting one service:

```typespec title="main.tsp"
@service
@versioned(VersionsA)
namespace ServiceA {
  enum VersionsA { av1, av2 }

  interface Operations {
    opA(): void;
  }

  namespace SubNamespace {
    op subOpA(): void;
  }
}

@service
@versioned(VersionsB)
namespace ServiceB {
  enum VersionsB { bv1, bv2 }

  interface Operations {
    opB(): void;
  }

  namespace SubNamespace {
    op subOpB(): void;
  }
}
```

```typespec title="client.tsp"
import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@client({
  name: "ServiceAClient",
  service: ServiceA,
})
namespace ServiceAClient;

@client({
  name: "ServiceBClient",
  service: ServiceB,
})
namespace ServiceBClient;
```

#### TCGC Behavior

This creates two independent root clients, each with their own service hierarchy:

```yaml
clients:
  - kind: client
    name: ServiceAClient
    apiVersions: [av1, av2]
    subClients:
      - kind: client
        name: Operations
        # operations: [opA]
      - kind: client
        name: SubNamespace
        # operations: [subOpA]
  - kind: client
    name: ServiceBClient
    apiVersions: [bv1, bv2]
    subClients:
      - kind: client
        name: Operations
        # operations: [opB]
      - kind: client
        name: SubNamespace
        # operations: [subOpB]
```

### Scenario 2: Merging Services as Direct Children (No Deep Auto-Merge)

In the first step design, when combining multiple services, all nested namespaces/interfaces are auto-merged into the root client as sub-clients. Some users prefer to keep each service's namespace as a direct child of the root client without deep merging.

#### Syntax Proposal: The `autoMerge` Option

We introduce a new `autoMerge` option in the `@client` decorator to control whether the service's content should be automatically merged into the current client:

```typespec
@client({
  name: "CombineClient",
  service: [ServiceA, ServiceB],
  autoMerge: false, // NEW OPTION
})
namespace CombineClient;
```

**Option Values:**

- `autoMerge: true` (default): Behaves like the first step design. All nested namespaces/interfaces from all services are merged into the root client as sub-clients.
- `autoMerge: false`: Each service's namespace becomes a direct sub-client of the root client. The nested namespaces/interfaces remain under their respective service sub-client.

#### Example

Given the same services from Scenario 1:

```typespec title="client.tsp"
import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@client({
  name: "CombineClient",
  service: [ServiceA, ServiceB],
  autoMerge: false,
})
@useDependency(ServiceA.VersionsA.av2, ServiceB.VersionsB.bv2)
namespace CombineClient;
```

#### TCGC Behavior with `autoMerge: false`

When `autoMerge` is `false`, TCGC will:

1. Create the root client for the combined client (same as first step design).
2. Create a sub-client for each service namespace. Each service sub-client contains all the nested namespaces/interfaces as its own sub-clients.
3. Operations directly under each service's namespace are placed under the service sub-client, not the root client.
4. No automatic merging of same-named namespaces/interfaces across services occurs.

```yaml
clients:
  - &root
    kind: client
    name: CombineClient
    apiVersions: []
    clientInitialization:
      initializedBy: individually
    subClients:
      - &svcA
        kind: client
        name: ServiceA
        parent: *root
        apiVersions: [av1, av2]
        clientInitialization:
          initializedBy: parent
        subClients:
          - kind: client
            name: Operations
            parent: *svcA
            # operations: [opA]
          - kind: client
            name: SubNamespace
            parent: *svcA
            # operations: [subOpA]
      - &svcB
        kind: client
        name: ServiceB
        parent: *root
        apiVersions: [bv1, bv2]
        clientInitialization:
          initializedBy: parent
        subClients:
          - kind: client
            name: Operations
            parent: *svcB
            # operations: [opB]
          - kind: client
            name: SubNamespace
            parent: *svcB
            # operations: [subOpB]
```

#### Python SDK Example

With `autoMerge: false`:

```python
client = CombineClient(endpoint="endpoint", credential=AzureKeyCredential("key"))

# Access ServiceA operations
client.service_a.operations.op_a()
client.service_a.sub_namespace.sub_op_a()

# Access ServiceB operations
client.service_b.operations.op_b()
client.service_b.sub_namespace.sub_op_b()
```

Compared to `autoMerge: true` (first step design):

```python
client = CombineClient(endpoint="endpoint", credential=AzureKeyCredential("key"))

# ServiceA and ServiceB namespaces are auto-merged
client.operations.op_a()  # Note: This would conflict with opB in same-named interface
client.operations.op_b()
client.sub_namespace.sub_op_a()
client.sub_namespace.sub_op_b()
```

### Scenario 3: Fully Customized Client Hierarchy

For maximum flexibility, users can fully customize how operations from different services are organized into client hierarchies. This extends the `@client` decorator to support explicit operation mapping across services.

#### Syntax Proposal

Use nested `@client` decorators with explicit operation references to create a custom client hierarchy:

```typespec title="client.tsp"
import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@client({
  name: "CustomClient",
  service: [ServiceA, ServiceB],
  autoMerge: false,
})
namespace CustomClient {
  // Custom sub-client combining operations from both services
  @client
  interface SharedOperations {
    opA is ServiceA.Operations.opA;
    opB is ServiceB.Operations.opB;
  }

  // Custom sub-client with operations from ServiceA only
  @client
  interface ServiceAOnly {
    subOpA is ServiceA.SubNamespace.subOpA;
  }

  // Custom sub-client with operations from ServiceB only
  @client
  interface ServiceBOnly {
    subOpB is ServiceB.SubNamespace.subOpB;
  }
}
```

#### TCGC Behavior

When explicit `@client` decorators are nested within the root client:

1. TCGC uses the explicitly defined client hierarchy instead of auto-generating from service structure.
2. Each nested `@client` becomes a sub-client of the root client.
3. Operations referenced via `is` keyword are mapped to their original service operations.
4. The `autoMerge: false` option ensures that only explicitly defined operations are included; no auto-discovery from service namespaces occurs.

```yaml
clients:
  - &root
    kind: client
    name: CustomClient
    apiVersions: []
    subClients:
      - kind: client
        name: SharedOperations
        parent: *root
        apiVersions: [] # Mixed from multiple services
        methods:
          - kind: basic
            name: opA
            # service: ServiceA
          - kind: basic
            name: opB
            # service: ServiceB
      - kind: client
        name: ServiceAOnly
        parent: *root
        apiVersions: [av1, av2]
        methods:
          - kind: basic
            name: subOpA
      - kind: client
        name: ServiceBOnly
        parent: *root
        apiVersions: [bv1, bv2]
        methods:
          - kind: basic
            name: subOpB
```

#### Python SDK Example

```python
client = CustomClient(endpoint="endpoint", credential=AzureKeyCredential("key"))

# Access shared operations from both services
client.shared_operations.op_a()  # Uses ServiceA's API version
client.shared_operations.op_b()  # Uses ServiceB's API version

# Access ServiceA-only operations
client.service_a_only.sub_op_a()

# Access ServiceB-only operations
client.service_b_only.sub_op_b()
```

### Summary of `autoMerge` Behavior

| Scenario             | `autoMerge`      | Explicit `@client` | Result                                                                 |
| -------------------- | ---------------- | ------------------ | ---------------------------------------------------------------------- |
| First step design    | `true` (default) | No                 | All services' nested items merged as root client's sub-clients         |
| Services as children | `false`          | No                 | Each service namespace becomes a sub-client, keeping its own hierarchy |
| Fully customized     | `false`          | Yes                | Only explicitly defined clients and operations are used                |
| Partially customized | `true`           | Yes                | Explicit clients used, plus remaining service content auto-merged      |

### Interaction with Existing Decorators

The `autoMerge` option works alongside existing customization decorators:

- **`@clientInitialization`**: Still controls how each client is initialized. Can be applied to both auto-merged and explicitly defined clients.
- **`@clientLocation`**: Can move operations between clients regardless of `autoMerge` setting.
- **`@operationGroup`** (deprecated): The same functionality can be achieved using nested `@client`. Migration path: convert `@operationGroup` to nested `@client`, optionally combined with `autoMerge: false` for multi-service scenarios where you want to prevent deep merging.

### Validation Rules

1. When `autoMerge: false` is used without explicit nested `@client` decorators:
   - Each service namespace becomes a sub-client automatically
   - No deep merging of same-named namespaces/interfaces occurs

2. When `autoMerge: false` is used with explicit nested `@client` decorators:
   - Only explicitly defined clients are created
   - Operations not referenced by any explicit client are omitted from the SDK
   - A diagnostic warning is issued for unreferenced operations

3. When `autoMerge: true` (default) is used with explicit nested `@client` decorators:
   - Explicit clients take precedence
   - Remaining operations from services are auto-merged into additional sub-clients

4. The `autoMerge` option is only meaningful when `service` is an array with multiple services:
   - For single-service clients, `autoMerge` is ignored (there's nothing to merge from multiple services)

### Changes Needed

1. **Update `@client` decorator options**:
   - Add `autoMerge?: boolean` property to `ClientOptions` type
   - Default value is `true` to maintain backward compatibility

2. **Update `cache.ts` logic**:
   - Check `autoMerge` option when processing multiple services
   - When `false`, create service-level sub-clients instead of merging
   - Handle explicit nested `@client` decorators within multi-service clients

3. **Update client types**:
   - Add `autoMerge` property to `SdkClient` to track the configuration
   - Ensure `subClients` structure reflects the chosen merge strategy

4. **Add validation**:
   - Emit diagnostic if `autoMerge: false` with explicit clients has unreferenced operations
