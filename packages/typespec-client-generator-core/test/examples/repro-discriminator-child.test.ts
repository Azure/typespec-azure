import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { SdkHttpOperation, SdkServiceMethod } from "../../src/interfaces.js";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

it("debug - discriminator value from child via intermediate model", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addTypeSpecFile(
    "./examples/updatePet.json",
    JSON.stringify({
      operationId: "updatePet",
      title: "updatePet",
      parameters: {
        pet: {
          kind: "dog",
          isTrained: true,
          breed: "labrador"
        }
      },
      responses: { "200": { body: { kind: "dog", isTrained: true, breed: "labrador" } } }
    })
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      @discriminator("kind")
      model Animal {
        kind: string;
        isTrained?: boolean;
      }

      model Pet extends Animal {
        kind: "pet";
      }

      @Legacy.hierarchyBuilding(Pet)
      model Dog extends Animal {
        kind: "dog";
        breed: string;
      }

      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Cat extends Animal {
        kind: "cat";
      }

      @route("/pets")
      @put
      op updatePet(@body pet: Pet): Pet;
    }
  `);
  const context = await createSdkContextForTester(program);

  // Inspect all models
  for (const model of context.sdkPackage.models) {
    console.log(`\nModel: ${model.name}`);
    console.log(`  discriminatorValue: ${model.discriminatorValue}`);
    console.log(`  discriminatorProperty: ${model.discriminatorProperty?.name}`);
    console.log(`  discriminatedSubtypes: ${model.discriminatedSubtypes ? Object.keys(model.discriminatedSubtypes) : "none"}`);
    console.log(`  baseModel: ${model.baseModel?.name}`);
    console.log(`  usage: ${model.usage}`);
    for (const prop of model.properties) {
      if (prop.kind === "property") {
        console.log(`  Property: ${prop.name}, type: ${prop.type.kind}${prop.type.kind === "constant" ? `(${prop.type.value})` : ""}, discriminator: ${prop.discriminator}`);
      }
    }
  }
});
