# TCGC client related type design
We have many client related types, decorators and concepts in TCGC and some of them are implicit, which makes author hard to know how to generate a needed client. This doc aims to revisit all client related things in TCGC and try to have a consolidated design output.

## User scenario
1. Single level client
```Python
client = TestClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
result = client.do_something()
```
2. Client with sub client and sub client could only get from parent client
- Sub client does not have additional parameter than parent client (ARM case)
```python
client = TestClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
sub_client = client.sub_client()
result = sub_client.do_something()
```
- Sub client has additional parameter than parent client
```python
client = TestClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
sub_client = client.sub_client(sub_name="sub")
result = sub_client.do_something()
```
3. Client with sub client and sub client could only be initialized separately
- Sub client does not have additional parameter than parent client (ARM case)
```python
client = TestClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
sub_client = TestSubClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
result = sub_client.do_something()
```
- Sub client has additional parameter than parent client
```python
client = TestClient(endpoint="endpoint", credential=AzureKeyCredential("key"))
sub_client = TestSubClient(endpoint="endpoint", credential=AzureKeyCredential("key"), sub_name="sub")
result = sub_client.do_something()
```
4. Combine 3 and 4. The sub client could either be get from parent client or be initialized separately.

**Questions: do we have such scenario? YES.**
> Confirmed YES. (DPG office hour in 12/12/2024)

**Also, will the initialization parameters be different for these two ways? NO.**
> Confirmed NO. (DPG office hour in 12/12/2024)

## Current implementation in TCGC
### Client structure
The entrance of TCGC is `SdkPackage` which represents a complete client package and includes clients, models, etc. The clients depend on the combination usage of namespace, interface, `@service`, `@client` and `@operationGroup`.

If there is no explicitly defined `@client` and `@operationGroup`, then every namespaces with `@service` will be a client. The nested namespaces and interfaces under that namespace will be a sub client with hierarchy.

For example:
```typespec
@service({
  title: "Pet Store"
})
namespace PetStore {
  @route("/dogs")
  interface Dogs {
    feed(): void;
    pet(): void;
  }

  @route("/cats")
  namespace Cats {
    op feed(): void;
    op pet(): void;
  }
}

@service({
  title: "Toy Store"
})
namespace ToyStore {
  @route("/dolls")
  interface Dolls {
    price(): void;
    buy(): void;
  }

  @route("/cars")
  namespace Cars {
    op price(): void;
    op buy(): void;
  }
}
```
The above tsp gets the two root clients: `PetStoreClient` and `ToyStoreClient` (naming logic is ensuring suffix with `Client`). The former has two child clients: `Dogs` and `Cats`. The later has two child clients: `Dolls` and `Cars`.

If there is any `@client` or `@operationGroup` definition, then each `@client` will be a client and each `@operationGroup` will be a sub client with hierarchy.

For example:
```typespec
@service({
  title: "Pet Store",
})
namespace PetStore {
  @route("/dogs")
  interface Dogs {
    feed(): void;
    pet(): void;
  }

  @route("/cats")
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
  @operationGroup
  interface Feed {
    feed is PetStore.Dogs.feed;
  }

  @operationGroup
  interface Pet {
    pet is PetStore.Dogs.pet;
  }
}

@client({
  name: "CatsClient",
  service: PetStore,
})
namespace CatsClient {
  @operationGroup
  interface Feed {
    feed is PetStore.Cats.feed;
  }

  @operationGroup
  interface Pet {
    pet is PetStore.Cats.pet;
  }
}
```
The above tsp gets the two root clients: `DogsClient` and `CatsClient`. All of them has two child clients: `Feed` and `Pet`.

### TCGC `SdkClient`, `SdkOperationGroup` and `SdkClientType` type
`SdkClient`, `SdkOperationGroup` are introduced to represent the client and sub client concept. 
These two types are the raw metadata type for `@client` and `@operationGroup` decorators. 
If language's emitter use the full TCGC code model, then it does not need to take care of these two.

`SdkClientType` is the client type of TCGC level code model. 
It contains TCGC calculated info about client, such as initialization, methods, etc.

### Client accessor method
The client accessor method is the way to get the sub client from a parent client in TCGC code model 
and also it indicates the sub client could be get from this client.

Clients with child clients will have corresponding numbers of method of `SdkClientAccessor` type besides the normal methods. The response for that method is the sub client (`SdkClientType`).

For the above first example, `PetStoreClient` client has two `SdkClientAccessor` methods, one of them has `Dogs` client as response, while another has `Cats`.

All the methods in TCGC have access property. We currently always set the `SdkClientAccessor` method with `internal` access.

### Client initialization
Client initialization in TCGC code model is used to show how to initialize the client 
and also it indicates this client could be initialized with the specific parameters.

All clients and sub clients will have `initialization` property with `SdkInitializationType`, which is a `SdkModelType` with all initialization parameters as model properties.

TCGC always puts the following things in initialization:
1. Endpoint parameter: it is converted from `@server` definition on the service the client belong to.
2. Credential parameter: it is converted from `@useAuth` definition on the service the client belong to.
3. API version parameter: if the service is versioned, then the API version parameter on method will be elevated to client.
4. Subscription ID parameter: if the service is an ARM service, then the subscription ID parameter on method will be elevated to client.

The `SdkInitializationType` has `access` properties. Currently, the value for clients is `public` while the value for sub clients is `internal`.

### Customization for initialization/accessor parameters
TCGC has `@clientInitialization` and `@paramAlias` to do the customization for the client initialization/accessor parameters. Users could elevate any method's parameter to the clients.

For example:
```typespec
@service({
  title: "My Service",
})
namespace MyService {
  interface InnerGroup {
    op upload(@path blobName: string): void;
  }
}

namespace MyCustomizations {
  model InnerGroupClientOptions {
    blob: string;
  }

  @@clientInitialization(InnerGroup, InnerGroupClientOptions);
  @@paramAlias(InnerGroupClientOptions.blob, "blobName");
}
```
The above tsp gets client `MyServiceClient` and sub client `InnerGroup`. 
The `MyServiceClient` has a client accessor method. The method has a parameter named `blob`. 
The `InnerGroup`'s `initialization` model's properties contains a property named `blob`. 
The method `upload` no longer has `blobName` parameter, its corresponding operation's parameter `blobName` is mapped to the client `blob` parameter.

### Problem with current implementation
With current implementation, we could support user scenario 1 and 2.

1. Current implementation does not have a way to set whether we could initialize the sub client directly. 
The initialization for client is always `public`, while sub client `internal`. 
2. The client accessor method is always generated and set to `internal`.
There is no way to indicate that a sub client could not be initialized from the parent client.
3. `@operationGroup` is an Azure concept, which means a sub client that could not be initialized directly. 
It is better to consolidate `@client` and `@operationGroup`.

## New proposal

1. Change `@clientInitialization` decorator and add `clientInitialization` property to `SdkClientType`
- Change `@clientInitialization` decorator's `options` parameter to `ClientInitializationOptions` type to accept `access` and `accessorAccess` setting.
- Add `clientInitialization` property to `SdkClientType`. It indicate the initialization method's signature, including the parameter list and access.
- When `access` set to `Access.public`, it means this client could be initialized separately, while `Access.internal` could not. Default to `Access.public` for client and `Access.internal` for sub client.
- When `accessorAccess` set to `Access.public`, it means this client could be get from parent, while `Access.internal` could not. Default to `undefined` for client and `Access.public` for sub client.

For example:
```typespec
@service({
  title: "Pet Store",
})
namespace PetStore {
  @route("/dogs")
  interface Dogs {
    feed(): void;
    pet(): void;
  }

  @route("/cats")
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
The above tsp gets the two root clients: `DogsClient` and `CatsClient`. 
All of them has two client accessor method to get sub clients, and with `public` access.
All of them has two sub clients: `Feed` and `Pet`.
The initialization method of `Feed` and `Pet` is `internal`.

Another example with customization:
```typespec
@service({
  title: "My Service",
})
namespace MyService {
  interface InnerGroup {
    op upload(@path blobName: string): void;
  }
}

namespace MyCustomizations {
  model InnerGroupClientOptions {
    blobName: string;
  }

  @@clientInitialization(InnerGroup, {parameters: InnerGroupClientOptions, access: Access.public, accessorAccess: Access.internal});
}
```
The above tsp gets client `MyServiceClient` and sub client `InnerGroup`. 
The `MyServiceClient` has a client accessor method whose response is `InnerGroup`. The method has a parameter named `blobName`. The method is `internal`.
The `InnerGroup`'s `initialization` model's properties contains a property named `blobName`. The method is `public`.
The method `upload` no longer has `blobName` parameter, its corresponding operation's parameter `blobName` is mapped to the `blobName` property of `InnerGroup`'s `initialization` model.

2. Move client accessor method out of the normal methods list of client and add a new `clientAccessor` property to put it.
- The idea is from the feedback that the client access way is too complicated.

3. Consolidate `@client` and `@operationGroup`
- Deprecate decorator `@operationGroup` and `SdkOperationGroup` type.
- Current explicitly `@operationGroup` could be migrated to `@client`. If `@client` is nested, then it is a sub-client, will follow previous operation group default logic.
- Add `subClients`, `clientPath` properties to the `SdkClient` type to keep backward compatible for metadata type.
- Add `getClientPath` helper to provide similar function for TCGC `SdkClientType` type.

~~4. If we think client initialization and client accessor could have different parameters, then:~~
> Confirmed this is not a valid scenario but we could switch to way 2 in the future if more customization is needed. (DPG office hour in 12/12/2024)

- Two ways to accomplish this:
  1. Add `@clientAccessor` decorator and it accepts an option to set `access` and `parameters` of the accessor. 
  Add `accessorAccess` property to the `SdkClient` type. Default to `Access.public`.
  When it set to `Access.public`, it means this client could be get from parent, while `Access.internal` could not. 
  2. Let user explicitly define a method to return the namespace/interface to represent the client accessor directly. 
  The parameters is explicitly defined in the method. The access setting could use existed `@access`.
- With the new settings, `@clientInitialization` will not impact the client accessor's parameters. 

Example for way 1:
```typespec
@service({
  title: "My Service",
})
namespace MyService {
  interface InnerGroup {
    op upload(@path blobName: string): void;
  }
}

namespace MyCustomizations {
  model InnerGroupClientOptions {
    blobName: string;
  }

  @@clientAccessor(InnerGroup, {parameters: InnerGroupClientOptions});
}
```
Example for way 2:
```typespec
@service({
  title: "My Service",
})
namespace MyService {
  interface InnerGroup {
    op upload(@path blobName: string): void;
  }
}

@client({
  name: "MyServiceClient",
  service: MyService,
})
namespace MyServiceClient {
  @client({access: Access.Private})
  interface InnerGroupClient {
    op upload is MyService.InnerGroup.upload;
  }

  model InnerGroupClientOptions {
    blobName: string;
  }

  op getInnerGroupClient(...InnerGroupClientOptions): InnerGroupClient;
}
```
The above two tsp all gets client `MyServiceClient` and sub client `InnerGroup`. 
The `MyServiceClient` has a client accessor method. The method has a parameter named `blobName`. The method is `public`.
The `InnerGroup`'s `initialization` model's properties DOES not contain `blobName` property. The method is `internal`.
The method `upload` no longer has `blobName` parameter, its corresponding operation's parameter `blobName` is mapped to the client accessor's `blobName` parameter.

## Decision
1. Do we have scenario that a client could both be initialized directly and be get from parent client?
YES. (DPG office hour in 12/12/2024)
2. Could the above two ways have different parameter list?
NO. (DPG office hour in 12/12/2024)
3. Shall we put client accessor method to be a separated property in client?
Wait for further discussion. Currently keep not change.
