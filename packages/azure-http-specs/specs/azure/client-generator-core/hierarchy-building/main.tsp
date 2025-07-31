import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @hierarchyBuilding decorator.")
@scenarioService("/azure/client-generator-core/hierarchy-building")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "specs.azure.clientgenerator.core.hierarchybuilding",
  "python"
)
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.hierarchybuilding",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.HierarchyBuilding;

@discriminator("kind")
model Animal {
  @doc("The kind of animal")
  kind: string;

  @doc("Name of the animal")
  name: string;
}

alias PetContent = {
  @doc("Whether the pet is trained")
  trained: boolean;
};

model Pet extends Animal {
  kind: "pet";
  ...PetContent;
}

alias DogContent = {
  @doc("The breed of the dog")
  breed: string;
};

@global.Azure.ClientGenerator.Core.Legacy.hierarchyBuilding(Pet)
model Dog extends Animal {
  kind: "dog";
  ...PetContent;
  ...DogContent;
}

@scenario
@scenarioDoc("""
  Test operation that accepts Animal input and returns Animal output.
  This operation expects Pet data and validates that Pet type works correctly with the @hierarchyBuilding decorator.
  Expected request body:
  ```json
  {
    "kind": "pet",
    "name": "Buddy",
    "trained": true
  }
  ```
  Expected response body:
  ```json
  {
    "kind": "pet",
    "name": "Buddy",
    "trained": true
  }
  ```
  """)
@doc("Update a pet")
@route("/animal/pet")
@put
op updatePet(@body animal: Animal): Animal;

@scenario
@scenarioDoc("""
  Test operation that accepts Animal input and returns Animal output.
  This operation expects Dog data and validates the @hierarchyBuilding decorator when Dog is used.
  Due to @hierarchyBuilding(Pet), Dog should inherit from Pet rather than Animal directly.
  Expected request body:
  ```json
  {
    "kind": "dog",
    "name": "Rex",
    "trained": true,
    "breed": "German Shepherd"
  }
  ```
  Expected response body:
  ```json
  {
    "kind": "dog",
    "name": "Rex",
    "trained": true,
    "breed": "German Shepherd"
  }
  ```
  """)
@doc("Update a dog")
@route("/animal/dog")
@put
op updateDog(@body animal: Animal): Animal;
