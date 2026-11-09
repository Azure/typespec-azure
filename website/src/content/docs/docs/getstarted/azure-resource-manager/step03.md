---
title: 4. Defining Child Resource Types
description: Defining ARM child resources
llmstxt: true
---

You can create parent/child relationships between resource types by using the `@parentResource` decorator when defining a resource type.

For example, here's how you could create a new `Address` resource under the `User` defined above:

```typespec
/** An address resource belonging to a user resource */
@parentResource(User)
model Address is ProxyResource<AddressProperties> {
  ...ResourceNameParameter<Address>;
}

/** The properties of Address */
model AddressProperties {
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
  get is ArmResourceRead<Address>;
  create is ArmResourceCreateOrReplaceSync<Address>;
  update is ArmCustomPatchSync<
    Address,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<
      Address,
      AddressProperties
    >
  >;
  delete is ArmResourceDeleteSync<Address>;
  listByParent is ArmResourceListByParent<Address>;
}
```
