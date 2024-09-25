import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { listSubClients } from "../src/public-utils.js";
import { SdkTestRunner, createSdkTestRunner } from "./test-host.js";

describe("typespec-client-generator-core: internal-utils", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  describe("parseEmitterName", () => {
    it("@azure-tools/typespec-{language}", async () => {
      const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
      await runner.compile("");
      strictEqual(runner.context.emitterName, "csharp");
    });

    it("@typespec/{protocol}-{client|server}-{language}-generator", async () => {
      const runner = await createSdkTestRunner({ emitterName: "@typespec/http-client-csharp" });
      await runner.compile("");
      strictEqual(runner.context.emitterName, "csharp");
    });
  });

  describe("listSubClients", () => {
    it("no sub clients", async () => {
      await runner.compile(`
        @service({})
        namespace MyClient;
      `);

      const rootClient = runner.context.sdkPackage.clients[0];
      ok(rootClient);
      strictEqual(listSubClients(rootClient).length, 0);
    });

    it("one sub client", async () => {
      await runner.compile(`
        @service({})
        namespace MyClient {
          namespace SubClient {}
        }
      `);

      const rootClient = runner.context.sdkPackage.clients[0];
      ok(rootClient);
      const subClients = listSubClients(rootClient);
      strictEqual(subClients.length, 1);
      strictEqual(subClients[0].name, "SubClient");
    });

    it("namespace and interface hierarchy", async () => {
      await runner.compile(`
        @service({})
        @route("/a")
        namespace A {
          @route("/o1") op a_o1(): void;
          @route("/o2") op a_o2(): void;

          @route("/g")
          interface AG {
            @route("/o1") a_g_o1(): void;
            @route("/o2") a_g_o2(): void;
          }

          @route("/a")
          namespace AA {
            @route("/o1") op aa_o1(): void;
            @route("/o2") op aa_o2(): void;

            @route("/g")
            interface AAG {
              @route("/o1") aa_g_o1(): void;
              @route("/o2") aa_g_o2(): void;
            }

            @route("/a")
            namespace AAA{};

            @route("/b")
            namespace AAB{
              @route("/o1") op aab_o1(): void;
              @route("/o2") op aab_o2(): void;

              @route("/g1")
              interface AABGroup1 {
                @route("/o1") aab_g1_o1(): void;
                @route("/o2") aab_g1_o2(): void;
              }

              @route("/g2")
              interface AABGroup2 {
              }
            };
          }
        };
      `);

      const rootClient = runner.context.sdkPackage.clients[0];
      ok(rootClient);
      let subClients = listSubClients(rootClient);
      strictEqual(subClients.length, 2);

      const agClient = subClients[1];
      strictEqual(agClient.name, "AG");

      const aaClient = subClients[0];
      strictEqual(aaClient.name, "AA");

      subClients = listSubClients(agClient);
      strictEqual(subClients.length, 0);

      subClients = listSubClients(aaClient);
      strictEqual(subClients.length, 3);

      const aagClient = subClients[2];
      strictEqual(aagClient.name, "AAG");

      const aaaClient = subClients[0];
      strictEqual(aaaClient.name, "AAA");

      const aabClient = subClients[1];
      strictEqual(aabClient.name, "AAB");

      subClients = listSubClients(aagClient);
      strictEqual(subClients.length, 0);

      subClients = listSubClients(aaaClient);
      strictEqual(subClients.length, 0);

      subClients = listSubClients(aabClient);
      strictEqual(subClients.length, 2);

      const aabGroup1Client = subClients[0];
      strictEqual(aabGroup1Client.name, "AABGroup1");

      const aabGroup2Client = subClients[1];
      strictEqual(aabGroup2Client.name, "AABGroup2");

      subClients = listSubClients(aabGroup1Client);
      strictEqual(subClients.length, 0);

      subClients = listSubClients(aabGroup2Client);
      strictEqual(subClients.length, 0);

      subClients = listSubClients(rootClient, true);
      strictEqual(subClients.length, 7);
      strictEqual(subClients[0].name, "AA");
      strictEqual(subClients[1].name, "AG");
      strictEqual(subClients[2].name, "AAA");
      strictEqual(subClients[3].name, "AAB");
      strictEqual(subClients[4].name, "AAG");
      strictEqual(subClients[5].name, "AABGroup1");
      strictEqual(subClients[6].name, "AABGroup2");
    });
  });
});
