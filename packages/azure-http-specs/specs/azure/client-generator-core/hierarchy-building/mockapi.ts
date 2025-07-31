import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Sample data for testing
const samplePet = {
  kind: "pet",
  name: "Buddy",
  trained: true,
};

const sampleDog = {
  kind: "dog",
  name: "Rex",
  trained: true,
  breed: "German Shepherd",
};

Scenarios.Azure_ClientGenerator_Core_HierarchyBuilding = passOnSuccess([
  {
    uri: "/azure/client-generator-core/hierarchy-building/animal/pet",
    method: "put",
    request: {
      body: json(samplePet),
    },
    response: {
      status: 200,
      body: json(samplePet), // Returns Pet data as Animal
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
      body: json(sampleDog), // Returns Dog data as Animal
    },
    kind: "MockApiDefinition",
  },
]);
