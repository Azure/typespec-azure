---
title: 4. Defining Child Resource Types
---

You can create parent/child relationships between resource types by using the `@parentResource` decorator when defining a resource type.

For example, here's how you could create a new `AddressResource` resource under the `User` defined above:

```typespec
/** An address resource belonging to a user resource */
@parentResource(User)
model AddressResource is ProxyResource<AddressResourceProperties> {
  @key("addressName")
  @segment("addresses")
  name: string;
}

/** The properties of AddressResource */
model AddressResourceProperties {
  /** The street address */
  streetAddress: string;

  /** The city of the address */
  city: string;

  /** The state of the address */
  state: string;

  /** The zip code of the address */
  zip: int32;
}

@armResourceOperations
interface Addresses {
  get is ArmResourceRead<AddressResource>;
  create is ArmResourceCreateOrReplaceSync<AddressResource>;
  update is ArmResourcePatchSync<AddressResource, AddressResourceProperties>;
  delete is ArmResourceDeleteSync<AddressResource>;
  listByParent is ArmResourceListByParent<AddressResource>;
}
```
