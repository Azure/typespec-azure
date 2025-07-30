import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @hierarchyBuilding decorator.")
@scenarioService("/azure/client-generator-core/hierarchy-building")
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

interface AnimalOperations {
  @scenario
  @scenarioDoc("""
    Test operation that accepts Animal input and returns Animal output.
    This validates basic polymorphic behavior in the inheritance hierarchy.
    """)
  @doc("Update an animal as animal")
  @route("/animal/animal")
  @put
  updateAnimalAsAnimal(@body animal: Animal): Animal;

  @scenario
  @scenarioDoc("""
    Test operation that accepts Pet input and returns Animal output.
    This validates that a derived type can be passed where base type is expected.
    """)
  @doc("Update a pet as animal")
  @route("/animal/pet")
  @put
  updatePetAsAnimal(@body pet: Pet): Animal;

  @scenario
  @scenarioDoc("""
    Test operation that accepts Dog input and returns Animal output.
    This validates the @hierarchyBuilding decorator when Dog is used as Animal.
    Due to @hierarchyBuilding(Pet), Dog should inherit from Pet rather than Animal directly.
    """)
  @doc("Update a dog as animal")
  @route("/animal/dog")
  @put
  updateDogAsAnimal(@body dog: Dog): Animal;
}

interface PetOperations {
  @scenario
  @scenarioDoc("""
    Test operation that accepts Pet input and returns Pet output.
    This validates that Pet type works correctly in the inheritance hierarchy.
    """)
  @doc("Update a pet as pet")
  @route("/pet/pet")
  @put
  updatePetAsPet(@body pet: Pet): Pet;

  @scenario
  @scenarioDoc("""
    Test operation that accepts Dog input and returns Pet output.
    This validates the @hierarchyBuilding decorator when Dog is used as Pet.
    Due to @hierarchyBuilding(Pet), Dog should be compatible with Pet operations.
    """)
  @doc("Update a dog as pet")
  @route("/pet/dog")
  @put
  updateDogAsPet(@body dog: Dog): Pet;
}

interface DogOperations {
  @scenario
  @scenarioDoc("""
    Test operation that accepts Dog input and returns Dog output.
    This validates that Dog type works correctly with the @hierarchyBuilding decorator.
    The Dog model uses @hierarchyBuilding(Pet) to redirect its inheritance from Animal to Pet.
    """)
  @doc("Update a dog as dog")
  @route("/dog/dog")
  @put
  updateDogAsDog(@body dog: Dog): Dog;
}