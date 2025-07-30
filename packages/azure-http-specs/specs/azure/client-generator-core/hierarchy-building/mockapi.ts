import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Sample data for testing
const sampleAnimal = {
  kind: "animal",
  name: "Generic Animal"
};

const samplePet = {
  kind: "pet", 
  name: "Buddy",
  trained: true
};

const sampleDog = {
  kind: "dog",
  name: "Rex", 
  trained: true,
  breed: "German Shepherd"
};

Scenarios.Azure_ClientGenerator_Core_HierarchyBuilding_ThreeLevelInheritance = passOnSuccess([
  // AnimalService operations
  {
    uri: "/azure/client-generator-core/hierarchy-building/animal",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: json(sampleAnimal),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/animal/pet",
    method: "get", 
    request: {},
    response: {
      status: 200,
      body: json(samplePet),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/animal/dog",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: json(sampleDog),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/animal",
    method: "post",
    request: {
      body: json(sampleAnimal),
    },
    response: {
      status: 200,
      body: json(sampleAnimal),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/animal/pet",
    method: "put",
    request: {
      body: json(samplePet),
    },
    response: {
      status: 200,
      body: json(samplePet),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/animal/dog",
    method: "put",
    request: {
      body: json(sampleDog),
    },
    response: {
      status: 200,
      body: json(sampleDog),
    },
    kind: "MockApiDefinition",
  },

  // PetService operations
  {
    uri: "/azure/client-generator-core/hierarchy-building/pet",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: json(samplePet),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/pet/as-animal",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: json(samplePet),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/pet/dog",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: json(sampleDog),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/pet",
    method: "post",
    request: {
      body: json(samplePet),
    },
    response: {
      status: 200,
      body: json(samplePet),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/pet/from-animal",
    method: "put",
    request: {
      body: json(samplePet),
    },
    response: {
      status: 200,
      body: json(samplePet),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/pet/dog",
    method: "put",
    request: {
      body: json(sampleDog),
    },
    response: {
      status: 200,
      body: json(sampleDog),
    },
    kind: "MockApiDefinition",
  },

  // DogService operations
  {
    uri: "/azure/client-generator-core/hierarchy-building/dog",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: json(sampleDog),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/dog/as-animal",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: json(sampleDog),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/dog/as-pet",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: json(sampleDog),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/dog",
    method: "post",
    request: {
      body: json(sampleDog),
    },
    response: {
      status: 200,
      body: json(sampleDog),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/dog/from-animal",
    method: "put",
    request: {
      body: json(sampleDog),
    },
    response: {
      status: 200,
      body: json(sampleDog),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/hierarchy-building/dog/from-pet",
    method: "put",
    request: {
      body: json(sampleDog),
    },
    response: {
      status: 200,
      body: json(sampleDog),
    },
    kind: "MockApiDefinition",
  },
]);