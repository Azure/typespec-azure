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
  The inheritance structure is Animal -> Pet -> Dog, where Pet inherits from Animal using 
  @hierarchyBuilding, and Dog inherits from Animal but is redirected to inherit from Pet
  using @hierarchyBuilding.
  
  The test includes three interfaces: AnimalService, PetService, and DogService.
  Each interface has operations that accept and return models at different levels of the hierarchy.
  """)
namespace ThreeLevelInheritance {
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

  @Legacy.hierarchyBuilding(Pet)
  model Dog extends Animal {
    kind: "dog";
    ...PetContent;
    ...DogContent;
  }

  @doc("Service interface for Animal operations")
  interface AnimalService {
    @doc("Get an animal by kind - returns base Animal type")
    @route("/animal")
    @get
    getAnimal(): Animal;

    @doc("Get a pet - returns Pet which inherits from Animal")
    @route("/animal/pet")
    @get
    getPetAsAnimal(): Animal;

    @doc("Get a dog - returns Dog which through @hierarchyBuilding inherits from Pet")
    @route("/animal/dog")
    @get
    getDogAsAnimal(): Animal;

    @doc("Create an animal")
    @route("/animal")
    @post
    createAnimal(@body animal: Animal): Animal;

    @doc("Update an animal with pet data")
    @route("/animal/pet")
    @put
    updatePetAsAnimal(@body pet: Animal): Animal;

    @doc("Update an animal with dog data")
    @route("/animal/dog")
    @put
    updateDogAsAnimal(@body dog: Animal): Animal;
  }

  @doc("Service interface for Pet operations")
  interface PetService {
    @doc("Get a pet as Pet type")
    @route("/pet")
    @get
    getPet(): Pet;

    @doc("Get a pet as Animal type (inherited)")
    @route("/pet/as-animal")
    @get
    getPetAsAnimal(): Animal;

    @doc("Get a dog as Pet type (through @hierarchyBuilding)")
    @route("/pet/dog")
    @get
    getDogAsPet(): Pet;

    @doc("Create a pet")
    @route("/pet")
    @post
    createPet(@body pet: Pet): Pet;

    @doc("Update a pet from Animal")
    @route("/pet/from-animal")
    @put
    updatePetFromAnimal(@body animal: Animal): Pet;

    @doc("Update a dog through Pet interface")
    @route("/pet/dog")
    @put
    updateDogAsPet(@body dog: Pet): Pet;
  }

  @doc("Service interface for Dog operations")
  interface DogService {
    @doc("Get a dog as Dog type")
    @route("/dog")
    @get
    getDog(): Dog;

    @doc("Get a dog as Animal type (through inheritance chain)")
    @route("/dog/as-animal")
    @get
    getDogAsAnimal(): Animal;

    @doc("Get a dog as Pet type (through @hierarchyBuilding)")
    @route("/dog/as-pet")
    @get
    getDogAsPet(): Pet;

    @doc("Create a dog")
    @route("/dog")
    @post
    createDog(@body dog: Dog): Dog;

    @doc("Update a dog from Animal")
    @route("/dog/from-animal")
    @put
    updateDogFromAnimal(@body animal: Animal): Dog;

    @doc("Update a dog from Pet")
    @route("/dog/from-pet")
    @put
    updateDogFromPet(@body pet: Pet): Dog;
  }
}