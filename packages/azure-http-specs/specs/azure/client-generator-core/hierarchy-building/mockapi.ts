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

Scenarios.Azure_ClientGenerator_Core_HierarchyBuilding = passOnSuccess([
  // Update operations for the three levels of hierarchy
  {
    uri: "/azure/client-generator-core/hierarchy-building/animal",
    method: "put",
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
    uri: "/azure/client-generator-core/hierarchy-building/pet",
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
    uri: "/azure/client-generator-core/hierarchy-building/dog",
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