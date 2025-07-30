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

interface AnimalOperations {
  @doc("Update an animal as animal")
  @route("/animal/animal")
  @put
  updateAnimalAsAnimal(@body animal: Animal): Animal;

  @doc("Update a pet as animal")
  @route("/animal/pet")
  @put
  updatePetAsAnimal(@body pet: Pet): Animal;

  @doc("Update a dog as animal")
  @route("/animal/dog")
  @put
  updateDogAsAnimal(@body dog: Dog): Animal;
}

interface PetOperations {
  @doc("Update a pet as pet")
  @route("/pet/pet")
  @put
  updatePetAsPet(@body pet: Pet): Pet;

  @doc("Update a dog as pet")
  @route("/pet/dog")
  @put
  updateDogAsPet(@body dog: Dog): Pet;
}

interface DogOperations {
  @doc("Update a dog as dog")
  @route("/dog/dog")
  @put
  updateDogAsDog(@body dog: Dog): Dog;
}