# TCGC client related type design

We have many client related types, decorators and concepts in TCGC and some of them are implicit, which makes author hard to know how to generate a needed client. This doc aims to revisit all client related things in TCGC and try to have a consolidated design output.

## User scenario

1. Single client

```Python
client = SingleClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
client.do_something()
```

2. Client with sub client and sub client could be initialized by parent client

- Sub client has same initialization parameters with parent client

ARM services always follow this pattern.

```python
client = TestClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
client.do_something()

sub_client = client.sub_client()
sub_client.do_something()
```

- Sub client has additional initialization parameter than parent client

```python
client = TestClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
client.do_something()

sub_client = client.sub_client(sub_name="sub")
sub_client.do_something()
```

3. Client with sub client and sub client could be initialized both by parent and individually

Storage, container registry, etc., could fit this scenario.

- Sub client has same initialization parameters with parent client

```python
client = TestClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
client.do_something()

sub_client = client.sub_client()
sub_client.do_something()

sub_client = TestSubClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
sub_client.do_something()
```

- Sub client has additional initialization parameter than parent client

```python
client = TestClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
client.do_something()

sub_client = client.sub_client(sub_name="sub")
sub_client.do_something()

sub_client = TestSubClient(endpoint="endpoint", credential=AzureKeyCredential("key"), sub_name="sub")
sub_client.do_something()
```

## TCGC types and decorators for client concept

### Client structure

The entrance of TCGC is `SdkPackage` which represents a complete package and includes clients, models, etc. The clients depend on the combination usage of namespace, interface, `@service`, `@client`.

If there is no explicitly defined `@client`, then every namespaces with `@service` will be a client. The nested namespaces and interfaces under that namespace will be a sub client with hierarchy.

- Example 1:

```typespec
@service(#{ title: "Pet Store" })
namespace PetStore {
  interface Dogs {
    feed(): void;
    pet(): void;
  }

  namespace Cats {
    op feed(): void;
    op pet(): void;
  }
}

@service(#{ title: "Toy Store" })
namespace ToyStore {
  interface Dolls {
    price(): void;
    buy(): void;
  }

  namespace Cars {
    op price(): void;
    op buy(): void;
  }
}
```

The above tsp gets two root clients: `PetStoreClient` and `ToyStoreClient` (naming logic is ensuring suffix with `Client`). The former has two child clients: `Dogs` and `Cats`. The later has two child clients: `Dolls` and `Cars`.

If there is any `@client` definition, then each top level `@client` will be a client and each nested `@client` will be a sub client with hierarchy.

Example 2:

```typespec
@service(#{ title: "Pet Store" })
namespace PetStore {
  interface Dogs {
    feed(): void;
    pet(): void;
  }

  namespace Cats {
    op feed(): void;
    op pet(): void;
  }
}

@client({
  name: "DogsClient",
  service: PetStore,
})
namespace DogsClient {
  @client
  interface Feed {
    feed is PetStore.Dogs.feed;
  }

  @client
  interface Pet {
    pet is PetStore.Dogs.pet;
  }
}

@client({
  name: "CatsClient",
  service: PetStore,
})
namespace CatsClient {
  @client
  interface Feed {
    feed is PetStore.Cats.feed;
  }

  @client
  interface Pet {
    pet is PetStore.Cats.pet;
  }
}
```

The above tsp gets the two root clients: `DogsClient` and `CatsClient`. All of them has two child clients: `Feed` and `Pet`.

### TCGC client types and client initialization

TCGC client type (`SdkClientType`) has `subClients` and `parent` property to indicate the client hierarchy.
It also has `initialization` property of `SdkInitializationType` to indicate the initialization paramters and how to initialize the client.

TCGC always puts the following things in initialization parameters:

1. Endpoint parameter: it is converted from `@server` definition on the service the client belong to.
2. Credential parameter: it is converted from `@useAuth` definition on the service the client belong to.
3. API version parameter: if the service is versioned, then the API version parameter on method will be elevated to client.
4. Subscription ID parameter: if the service is an ARM service, then the subscription ID parameter on method will be elevated to client.

The `SdkInitializationType` has `initializedBy` property.
The value could be `InitializedBy.parent (1)` (the client could be initialized by parent client),
`InitializedBy.individually (2)` (the client could be initialized individually) or `InitializedBy.parent | InitializedBy.individually (3)` (both).

Default value of `initializedBy` for client is `InitializedBy.individually`, while `InitializedBy.parent` for sub client.

For above example 1, you will get TCGC types like this:

```yaml
clients:
  - &a1
    kind: client
    name: PetStoreClient
    initialization:
      kind: model
      properties:
        - kind: endpoint
          name: endpoint
          isGeneratedName: true
          onClient: true
      name: PetStoreClientOptions
      isGeneratedName: true
      initializedBy: individually
    subClients:
      - kind: client
        name: Cats
        parent: *a1
        subClients: []
        initialization:
          kind: model
          properties:
            - kind: endpoint
              name: endpoint
              isGeneratedName: true
              onClient: true
          name: CatsOptions
          isGeneratedName: true
          initializedBy: parent
      - kind: client
        name: Dogs
        parent: *a1
        subClients: []
        initialization:
          kind: model
          properties:
            - kind: endpoint
              name: endpoint
              isGeneratedName: true
              onClient: true
          name: DogsOptions
          isGeneratedName: true
          initializedBy: parent
  - &a2
    kind: client
    name: ToyStoreClient
    initialization:
      kind: model
      properties:
        - kind: endpoint
          name: endpoint
          isGeneratedName: true
          onClient: true
      name: ToyStoreClientOptions
      isGeneratedName: true
      initializedBy: individually
    subClients:
      - kind: client
        name: Cars
        parent: *a2
        subClients: []
        subClients: []
        initialization:
          kind: model
          properties:
            - kind: endpoint
              name: endpoint
              isGeneratedName: true
              onClient: true
          name: CarsOptions
          isGeneratedName: true
          initializedBy: parent
      - kind: client
        name: Dolls
        parent: *a2
        subClients: []
        subClients: []
        initialization:
          kind: model
          properties:
            - kind: endpoint
              name: endpoint
              isGeneratedName: true
              onClient: true
          name: DollsOptions
          isGeneratedName: true
          initializedBy: parent
```

For above example 2, you will get TCGC types like this:

```yaml
clients:
  - &a1
    kind: client
    name: DogsClient
    initialization:
      kind: model
      properties:
        - kind: endpoint
          name: endpoint
          isGeneratedName: true
          onClient: true
      name: DogsClientOptions
      isGeneratedName: true
      initializedBy: individually
    subClients:
      - kind: client
        name: Feed
        parent: *a1
        subClients: []
        initialization:
          kind: model
          properties:
            - kind: endpoint
              name: endpoint
              isGeneratedName: true
              onClient: true
          name: FeedOptions
          isGeneratedName: true
          initializedBy: parent
      - kind: client
        name: Pet
        parent: *a1
        subClients: []
        initialization:
          kind: model
          properties:
            - kind: endpoint
              name: endpoint
              isGeneratedName: true
              onClient: true
          name: PetOptions
          isGeneratedName: true
          initializedBy: parent
  - &a2
    kind: client
    name: CatsClient
    initialization:
      kind: model
      properties:
        - kind: endpoint
          name: endpoint
          isGeneratedName: true
          onClient: true
      name: CatsClientOptions
      isGeneratedName: true
      initializedBy: individually
    subClients:
      - kind: client
        name: Feed
        parent: *a2
        subClients: []
        subClients: []
        initialization:
          kind: model
          properties:
            - kind: endpoint
              name: endpoint
              isGeneratedName: true
              onClient: true
          name: FeedOptions
          isGeneratedName: true
          initializedBy: parent
      - kind: client
        name: Pet
        parent: *a2
        subClients: []
        subClients: []
        initialization:
          kind: model
          properties:
            - kind: endpoint
              name: endpoint
              isGeneratedName: true
              onClient: true
          name: PetOptions
          isGeneratedName: true
          initializedBy: parent
```

### Customization for client initialization

TCGC has `@clientInitialization` to do the customization for the client initialization parameters and initialization way.
Users could elevate any method's parameter to the clients, as well as change the way of how to initialize the client.

Example 3:

```typespec
@service(#{ title: "My Service" })
namespace MyService {
  interface InnerGroup {
    upload(@path blobName: string): void;
  }
}

namespace MyCustomizations {
  model InnerGroupClientOptions {
    blobName: string;
  }

  @@clientInitialization(MyService.InnerGroup,
    {
      parameters: InnerGroupClientOptions,
      initializedBy: InitializedBy.parent | InitializedBy.individually,
    }
  );
}
```

The above tsp gets client `MyServiceClient` and sub client `InnerGroup`.
The `InnerGroup`'s `initialization` model's properties contains a property named `blob`.
The method `upload` no longer has `blobName` parameter, its corresponding operation's parameter `blobName` is mapped to the client `blob` parameter.
The `InnerGroup` client could be initialized both by parent or individually.

You will get TCGC types like this:

```yaml
clients:
  - &a3
    kind: client
    name: MyServiceClient
    subClients:
      - kind: client
        name: InnerGroup
        methods:
          - kind: basic
            name: upload
            parameters: []
        initialization:
          kind: model
          name: InnerGroupClientOptions
          isGeneratedName: false
          properties:
            - kind: method
              name: blobName
              isGeneratedName: false
              onClient: true
            - kind: endpoint
              name: endpoint
              isGeneratedName: true
              onClient: true
          initializedBy: parent | individually
        parent: *a3
    initialization:
      kind: model
      properties:
        - kind: endpoint
          name: endpoint
          isGeneratedName: true
          onClient: true
      name: MyServiceClientOptions
      initializedBy: individually
```

## Usage for all scenarios

1. Single client

```typespec
@service(#{ title: "Scenario1" })
namespace SingleClient {
  op do_something(): void;
}
```

2. Client with sub client and sub client could be initialized by parent client

- Sub client has same initialization parameters with parent client

```typespec
@service(#{ title: "Scenario2" })
namespace TestClient {
  op do_something(): void;

  interface SubClient {
    do_something(): void;
  }
}
```

- Sub client has additional initialization parameter than parent client

```typespec
@service(#{ title: "Scenario2" })
namespace TestClient {
  op do_something(): void;

  interface SubClient {
    do_something(subName: string): void;
  }
}

model SubClientOptions {
  subName: string;
}

@@clientInitialization(TestClient.SubClient,
  {
    parameters: SubClientOptions,
  }
);
```

3. Client with sub client and sub client could be initialized both by parent and individually

- Sub client has same initialization parameters with parent client

```typespec
@service(#{ title: "Scenario4" })
namespace TestClient {
  op do_something(): void;

  interface SubClient {
    do_something(): void;
  }
}

@@clientInitialization(TestClient.SubClient,
  {
    intializedBy: InitializedBy.individually | InitializedBy.parent,
  }
);
```

- Sub client has additional initialization parameter than parent client

```typespec
@service(#{ title: "Scenario4" })
namespace TestClient {
  op do_something(): void;

  interface SubClient {
    do_something(subName: string): void;
  }
}

model SubClientOptions {
  subName: string;
}

@@clientInitialization(TestClient.SubClient,
  {
    parameters: SubClientOptions,
    intializedBy: InitializedBy.individually | InitializedBy.parent,
  }
);
```

## Changes needed with above design

1. Change `@clientInitialization` decorator and add `initializedBy` property to `SdkInitializationType`

- Change `@clientInitialization` decorator's `options` parameter to `ClientInitializationOptions` type to accept `initializedBy` setting.
- Add `clientInitialization` property to `SdkInitializationType`.
- Add check for `initializedBy`, root clients could only have `individually` value.

2. Deprecate client accessor method. Add `subClients` property to `SdkClientType` and put all sub clients in this list.

3. Consolidate `@client` and `@operationGroup`

- Deprecate decorator `@operationGroup` and `SdkOperationGroup` type.
- Current explicitly `@operationGroup` could be migrated to `@client`. If `@client` is nested, then it is a sub client, will follow previous operation group default logic.
- Add `subClients`, `clientPath` properties to the `SdkClient` type to keep backward compatible for metadata type.
- Add `getClientPath` helper to provide similar function for TCGC `SdkClientType` type.
