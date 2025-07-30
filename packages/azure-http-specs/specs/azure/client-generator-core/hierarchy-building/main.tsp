import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @hierarchyBuilding decorator.")
@scenarioService("/azure/client-generator-core/hierarchy-building")
namespace _Specs_.Azure.ClientGenerator.Core.HierarchyBuilding;

@scenario
@scenarioDoc("""
  This scenario tests the @hierarchyBuilding decorator with a three-level inheritance chain.
  The inheritance structure is Animal -> Pet -> Dog, where Dog inherits from Animal but
  is redirected to inherit from Pet using @hierarchyBuilding(Pet).
  
  The test includes three update operations that accept and return models at different levels of the hierarchy.
  This validates that the @hierarchyBuilding decorator correctly modifies inheritance relationships
  for polymorphic HTTP API scenarios.
  """)
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

@doc("Update an animal")
@route("/animal")
@put
updateAnimal(@body animal: Animal): Animal;

@doc("Update a pet")
@route("/pet")
@put
updatePet(@body pet: Pet): Pet;

@doc("Update a dog")
@route("/dog")
@put
updateDog(@body dog: Dog): Dog;