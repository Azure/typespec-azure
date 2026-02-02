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

1. Create the root client for the combined client. If any service is versioned, the root client's initialization method will have an `apiVersion` parameter with no default value. For cross-service clients, the `apiVersions` property will be an empty array `[]`, and a new `apiVersionsMap` property will store a map of service namespace full qualified names to their API versions (e.g., `{"ServiceA": ["av1", "av2"], "ServiceB": ["bv1", "bv2"]}`). The root client's endpoint and credential parameters will be created based on the first sub-service, which means all sub-services must share the same endpoint and credential. If services have different `@server` or `@useAuth` definitions, TCGC will report a diagnostic error.
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
    apiVersions: [] # Empty for cross-service clients
    apiVersionsMap: # Map of service namespace to API versions
      ServiceA: [av1, av2]
      ServiceB: [bv1, bv2]
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
          apiVersionsMap:
            ServiceA: [av1, av2]
            ServiceB: [bv1, bv2]
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

The first step design focuses on explicitly merging multiple services into one client using `@client` with an array of services. This section extends the previous [client hierarchy design](./client.md) to clarify the behavior when no explicit `@client` is defined and to provide additional scenarios.

### Scenario 0: Multiple Services Without Explicit `@client` (Default Behavior)

When there are multiple `@service` namespaces and no explicit `@client` decorator is defined, TCGC will automatically create a separate root client for each `@service` namespace. This matches the single-service behavior where each `@service` namespace becomes its own client.

#### Syntax Proposal

No `client.tsp` file is needed. Each `@service` namespace automatically becomes a root client:

```typespec title="main.tsp"
@service
@versioned(VersionsA)
namespace ServiceA {
  enum VersionsA {
    av1,
    av2,
  }

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
  enum VersionsB {
    bv1,
    bv2,
  }

  interface Operations {
    opB(): void;
  }

  namespace SubNamespace {
    op subOpB(): void;
  }
}
```

#### TCGC Behavior

TCGC will automatically generate two independent root clients, each with their own API versions and children:

According to [client.md](./client.md), the default value of `initializedBy` for a root client is `InitializedBy.individually`, while for a sub client it is `InitializedBy.parent`.

```yaml
clients:
  - &a1
    kind: client
    name: ServiceAClient
    apiVersions: [av1, av2]
    clientInitialization:
      initializedBy: individually
    children:
      - kind: client
        name: Operations
        parent: *a1
        clientInitialization:
          initializedBy: parent
        methods:
          - kind: basic
            name: opA
      - kind: client
        name: SubNamespace
        parent: *a1
        clientInitialization:
          initializedBy: parent
        methods:
          - kind: basic
            name: subOpA
  - &a2
    kind: client
    name: ServiceBClient
    apiVersions: [bv1, bv2]
    clientInitialization:
      initializedBy: individually
    children:
      - kind: client
        name: Operations
        parent: *a2
        clientInitialization:
          initializedBy: parent
        methods:
          - kind: basic
            name: opB
      - kind: client
        name: SubNamespace
        parent: *a2
        clientInitialization:
          initializedBy: parent
        methods:
          - kind: basic
            name: subOpB
```

#### Python SDK Example

```python
# ServiceA client (auto-generated name)
client_a = ServiceAClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
client_a.operations.op_a()
client_a.sub_namespace.sub_op_a()

# ServiceB client (auto-generated name)
client_b = ServiceBClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
client_b.operations.op_b()
client_b.sub_namespace.sub_op_b()
```

### Explicit Client Definition Scenarios

When explicit `@client` decorators are used, TCGC follows the explicitly defined client hierarchy. The key design principle is:

- **If the `@client` namespace is empty**: TCGC auto-merges all services' nested namespaces/interfaces into the current client as children.
- **If the `@client` namespace contains nested `@client` decorators**: TCGC uses the explicitly defined client hierarchy instead of auto-merging.

### Scenario 1: Explicit Client Names for Multiple Services

Users may want to explicitly define clients for each service with custom names. Without explicit `@client`, TCGC would use the service namespace name with a `Client` suffix (e.g., `ServiceAClient`). With explicit `@client`, users can customize the client name.

#### Syntax Proposal

Define multiple `@client` decorators, each targeting one service with a custom name:

```typespec title="main.tsp"
@service
@versioned(VersionsA)
namespace ServiceA {
  enum VersionsA {
    av1,
    av2,
  }

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
  enum VersionsB {
    bv1,
    bv2,
  }

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
  name: "MyServiceAClient",  // Custom name instead of default "ServiceAClient"
  service: ServiceA,
})
namespace MyServiceAClient;

@client({
  name: "MyServiceBClient",  // Custom name instead of default "ServiceBClient"
  service: ServiceB,
})
namespace MyServiceBClient;
```

#### TCGC Behavior

This creates two independent root clients with custom names, each with their own service hierarchy:

According to [client.md](./client.md), the default value of `initializedBy` for a root client is `InitializedBy.individually`, while for a sub client it is `InitializedBy.parent`.

```yaml
clients:
  - &a1
    kind: client
    name: MyServiceAClient
    apiVersions: [av1, av2]
    clientInitialization:
      initializedBy: individually
    children:
      - kind: client
        name: Operations
        parent: *a1
        clientInitialization:
          initializedBy: parent
        methods:
          - kind: basic
            name: opA
      - kind: client
        name: SubNamespace
        parent: *a1
        clientInitialization:
          initializedBy: parent
        methods:
          - kind: basic
            name: subOpA
  - &a2
    kind: client
    name: MyServiceBClient
    apiVersions: [bv1, bv2]
    clientInitialization:
      initializedBy: individually
    children:
      - kind: client
        name: Operations
        parent: *a2
        clientInitialization:
          initializedBy: parent
        methods:
          - kind: basic
            name: opB
      - kind: client
        name: SubNamespace
        parent: *a2
        clientInitialization:
          initializedBy: parent
        methods:
          - kind: basic
            name: subOpB
```

#### Python SDK Example

```python
# ServiceA client with custom name
client_a = MyServiceAClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
client_a.operations.op_a()
client_a.sub_namespace.sub_op_a()

# ServiceB client with custom name
client_b = MyServiceBClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
client_b.operations.op_b()
client_b.sub_namespace.sub_op_b()
```

### Scenario 1.5: Mixing Multi-Service and Single-Service Clients

Users may want to combine multiple services into one client while keeping another service as a separate client. This scenario shows how to mix multi-service clients with single-service clients.

#### Syntax Proposal

Define clients where one client targets multiple services and another targets a single service:

```typespec title="main.tsp"
@service
@versioned(VersionsA)
namespace ServiceA {
  enum VersionsA { av1, av2 }

  interface Operations {
    opA(): void;
  }
}

@service
@versioned(VersionsB)
namespace ServiceB {
  enum VersionsB { bv1, bv2 }

  interface Operations {
    opB(): void;
  }
}

@service
@versioned(VersionsC)
namespace ServiceC {
  enum VersionsC { cv1, cv2 }

  interface Operations {
    opC(): void;
  }
}
```

```typespec title="client.tsp"
import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

// Multi-service client combining ServiceA and ServiceB
@client({
  name: "CombinedABClient",
  service: [ServiceA, ServiceB],
})
namespace CombinedABClient;

// Single-service client for ServiceC
@client({
  name: "ServiceCClient",
  service: ServiceC,
})
namespace ServiceCClient;
```

#### TCGC Behavior

This creates two root clients:

1. `CombinedABClient`: A multi-service client that auto-merges ServiceA and ServiceB content (since the namespace is empty)
2. `ServiceCClient`: A single-service client for ServiceC

According to [client.md](./client.md), the default value of `initializedBy` for a root client is `InitializedBy.individually`, while for a sub client it is `InitializedBy.parent`.

```yaml
clients:
  - &combined
    kind: client
    name: CombinedABClient
    apiVersions: [] # Empty for cross-service clients
    apiVersionsMap:
      ServiceA: [av1, av2]
      ServiceB: [bv1, bv2]
    clientInitialization:
      initializedBy: individually
    children:
      - kind: client
        name: Operations # Merged from both ServiceA and ServiceB
        parent: *combined
        apiVersions: [] # Empty because operations come from different services
        apiVersionsMap:
          ServiceA: [av1, av2]
          ServiceB: [bv1, bv2]
        clientInitialization:
          initializedBy: parent
        methods:
          - kind: basic
            name: opA
          - kind: basic
            name: opB
  - &serviceC
    kind: client
    name: ServiceCClient
    apiVersions: [cv1, cv2]
    clientInitialization:
      initializedBy: individually
    children:
      - kind: client
        name: Operations
        parent: *serviceC
        clientInitialization:
          initializedBy: parent
        methods:
          - kind: basic
            name: opC
```

#### Python SDK Example

```python
# Combined client for ServiceA and ServiceB
combined_client = CombinedABClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
combined_client.operations.op_a()  # From ServiceA
combined_client.operations.op_b()  # From ServiceB

# Separate client for ServiceC
service_c_client = ServiceCClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
service_c_client.operations.op_c()
```

### Scenario 2: Services as Direct Children (No Deep Auto-Merge)

In the first step design, when combining multiple services with an empty client namespace, all nested namespaces/interfaces from all services are auto-merged into the root client as children. Some users prefer to keep each service's namespace as a direct child of the root client without deep merging.

#### Endpoint and Credential Limitations

When combining multiple services into a single client, all services must share the same endpoint and credential configuration. The root client's endpoint and credential parameters are created based on the first service in the array. If services have different `@server` or `@useAuth` definitions, emitters should report a diagnostic error.

#### Syntax Proposal

Use nested `@client` decorators to explicitly define each service as a child client:

```typespec title="client.tsp"
import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@client({
  name: "CombineClient",
  service: [ServiceA, ServiceB],
})
namespace CombineClient {
  @client({
    name: "ComputeClient",
    service: ServiceA,
  })
  namespace Compute;

  @client({
    name: "DiskClient",
    service: ServiceB,
  })
  namespace Disk;
}
```

#### TCGC Behavior

When the client namespace has nested `@client` decorators, TCGC will use the explicitly defined client hierarchy:

1. Create the root client for the combined client.
2. Each nested `@client` becomes a child of the root client.
3. Since the nested client namespaces (`Compute` and `Disk`) are empty, TCGC auto-merges each service's content into its respective child client.
4. No automatic merging across services occurs at the root level.

```yaml
clients:
  - &root
    kind: client
    name: CombineClient
    apiVersions: [] # Empty for cross-service clients
    apiVersionsMap: # Map of service namespace to API versions
      ServiceA: [av1, av2]
      ServiceB: [bv1, bv2]
    clientInitialization:
      initializedBy: individually
    children:
      - &compute
        kind: client
        name: ComputeClient
        parent: *root
        apiVersions: [av1, av2]
        clientInitialization:
          initializedBy: parent
        children:
          - kind: client
            name: Operations
            parent: *compute
            clientInitialization:
              initializedBy: parent
            methods:
              - kind: basic
                name: opA
          - kind: client
            name: SubNamespace
            parent: *compute
            clientInitialization:
              initializedBy: parent
            methods:
              - kind: basic
                name: subOpA
      - &disk
        kind: client
        name: DiskClient
        parent: *root
        apiVersions: [bv1, bv2]
        clientInitialization:
          initializedBy: parent
        children:
          - kind: client
            name: Operations
            parent: *disk
            clientInitialization:
              initializedBy: parent
            methods:
              - kind: basic
                name: opB
          - kind: client
            name: SubNamespace
            parent: *disk
            clientInitialization:
              initializedBy: parent
            methods:
              - kind: basic
                name: subOpB
```

#### Python SDK Example

```python
client = CombineClient(endpoint="endpoint", credential=AzureKeyCredential("key"))

# Access ServiceA operations via ComputeClient
client.compute.operations.op_a()
client.compute.sub_namespace.sub_op_a()

# Access ServiceB operations via DiskClient
client.disk.operations.op_b()
client.disk.sub_namespace.sub_op_b()
```

### Scenario 3: Fully Customized Client Hierarchy

For maximum flexibility, users can fully customize how operations from different services are organized into client hierarchies. This uses nested `@client` decorators with explicit operation mapping.

#### Endpoint and Credential Limitations

Same as Scenario 2: when combining multiple services into a single client, all services must share the same endpoint and credential configuration. The root client's endpoint and credential parameters are created based on the first service in the array.

#### Syntax Proposal

Use nested `@client` decorators with explicit operation references to create a custom client hierarchy:

```typespec title="client.tsp"
import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@client({
  name: "CustomClient",
  service: [ServiceA, ServiceB],
})
namespace CustomClient {
  // Custom child client combining operations from both services
  @client
  interface SharedOperations {
    opA is ServiceA.Operations.opA;
    opB is ServiceB.Operations.opB;
  }

  // Custom child client with operations from ServiceA only
  @client
  interface ServiceAOnly {
    subOpA is ServiceA.SubNamespace.subOpA;
  }

  // Custom child client with operations from ServiceB only
  @client
  interface ServiceBOnly {
    subOpB is ServiceB.SubNamespace.subOpB;
  }
}
```

#### TCGC Behavior

When explicit `@client` decorators are nested within the root client:

1. TCGC uses the explicitly defined client hierarchy instead of auto-generating from service structure.
2. Each nested `@client` becomes a child of the root client.
3. Operations referenced via `is` keyword are mapped to their original service operations.
4. Since the root client namespace contains nested `@client` decorators, no auto-discovery from service namespaces occurs.

```yaml
clients:
  - &root
    kind: client
    name: CustomClient
    apiVersions: [] # Empty for cross-service clients
    apiVersionsMap: # Map of service namespace to API versions
      ServiceA: [av1, av2]
      ServiceB: [bv1, bv2]
    clientInitialization:
      initializedBy: individually
    children:
      - kind: client
        name: SharedOperations
        parent: *root
        apiVersions: [] # Empty because operations come from different services
        apiVersionsMap: # Map because operations come from different services
          ServiceA: [av1, av2]
          ServiceB: [bv1, bv2]
        clientInitialization:
          initializedBy: parent
        methods:
          - kind: basic
            name: opA
          - kind: basic
            name: opB
      - kind: client
        name: ServiceAOnly
        parent: *root
        apiVersions: [av1, av2]
        clientInitialization:
          initializedBy: parent
        methods:
          - kind: basic
            name: subOpA
      - kind: client
        name: ServiceBOnly
        parent: *root
        apiVersions: [bv1, bv2]
        clientInitialization:
          initializedBy: parent
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

### Summary of Client Hierarchy Behavior

| Scenario             | Client Namespace Content            | Result                                                           |
| -------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| First step design    | Empty                               | All services' nested items auto-merged as root client's children |
| Services as children | Nested `@client` (empty namespaces) | Each nested client auto-merges its service's content             |
| Fully customized     | Nested `@client` with explicit ops  | Only explicitly defined clients and operations are used          |

### Interaction with Existing Decorators

The nested `@client` approach works alongside existing customization decorators:

- **`@clientInitialization`**: Still controls how each client is initialized. Can be applied to both auto-merged and explicitly defined clients.
- **`@clientLocation`**: Can move operations between clients regardless of namespace content.
- **`@operationGroup`** (deprecated): The same functionality can be achieved using nested `@client`. Migration path: convert `@operationGroup` to nested `@client`.

### Validation Rules

1. When the root client namespace is empty:
   - Only services listed in the `service` array of the `@client` decorator are included in the client
   - Content from these listed services is auto-merged into the root client
   - Same-named namespaces/interfaces across the listed services are merged together

2. When the root client namespace has nested `@client` decorators:
   - Only explicitly defined clients are created at the root level
   - Each nested `@client` with an empty namespace auto-merges its service's content
   - Each nested `@client` with explicit operations uses only those operations
   - Operations not referenced by any explicit client are omitted from the SDK

### Changes Needed

1. **Update `interfaces.ts`**:
   - Add new `apiVersionsMap` property to `SdkClientType` with type `Record<string, string[]>` (key is service namespace full qualified name, value is API versions array)
   - Keep existing `apiVersions` property as `string[]` for backward compatibility
   - For cross-service clients, `apiVersions` will be empty `[]` and `apiVersionsMap` will contain the mapping

2. **Update `cache.ts` logic**:
   - In `getOrCreateClients`: When no explicit `@client` is defined, create a separate root client for each `@service` namespace (not just the first one)
   - In `prepareClientAndOperationCache`: Check if the client namespace has nested `@client` decorators before auto-merging
   - When nested `@client` decorators exist, use the explicitly defined hierarchy
   - When the namespace is empty, auto-merge services' content (existing behavior for explicit multi-service clients)

3. **Update `internal-utils.ts`**:
   - Modify `hasExplicitClientOrOperationGroup` to properly detect nested `@client` decorators within multi-service client namespaces
   - Currently it returns `false` when a client has multiple services, but should return `true` if the namespace contains nested `@client` decorators

4. **Update `clients.ts`**:
   - Update `createSdkClientType` to populate `apiVersionsMap` when the client spans multiple services
   - Keep `apiVersions` as empty array for cross-service clients
   - Update endpoint and credential parameter creation to validate that all services share the same `@server` and `@useAuth` definitions

5. **Update `decorators.ts`**:
   - Add validation in `@client` decorator to ensure services combined into a single client have compatible endpoint and credential configurations

6. **Add validation diagnostics**:
   - Add diagnostic when services combined into a client have different `@server` definitions
   - Add diagnostic when services combined into a client have different `@useAuth` definitions
