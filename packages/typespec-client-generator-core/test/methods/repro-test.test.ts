import { it, describe } from "vitest";
import { isErrorModel } from "@typespec/compiler";
import { SdkHttpOperation, SdkServiceMethod } from "../../src/interfaces.js";
import { ArmTester, createSdkContextForTester } from "../tester.js";

describe("ARM paging operation false alert repro", () => {
  it("debug intersection model and error detection", async () => {
    const { program } = await ArmTester.compile(`
      @armProviderNamespace
      @service(#{ title: "ContosoProviderHubClient" })
      @versioned(Versions)
      namespace Microsoft.ContosoProviderHub;

      enum Versions {
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        \`2021-10-01-preview\`,
      }

      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }

      model EmployeeProperties {
        age?: int32;
        city?: string;
      }

      @armResourceOperations
      interface Employees {
        @autoRoute
        @get
        @list
        @tag("UsageAggregates")
        @action("UsageAggregates")
        list is ArmProviderActionSync<
          Response = ResourceListResult<Employee> | (ArmAcceptedResponse &
            ErrorResponse),
          Scope = SubscriptionActionScope,
          Parameters = {},
          Error = ErrorResponse
        >;
      }
    `);

    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const client = sdkPackage.clients[0];
    const childClient = client.children![0];
    const method = childClient.methods[0] as SdkServiceMethod<SdkHttpOperation>;
    const httpOp = method.operation as SdkHttpOperation;

    for (const resp of httpOp.responses) {
      const raw = resp.__raw;
      console.log(`\nResponse ${resp.statusCodes}:`);
      console.log(`  raw.type kind: ${raw.type?.kind}, name: ${raw.type?.kind === 'Model' ? raw.type.name : 'N/A'}`);
      if (raw.type?.kind === 'Model') {
        console.log(`  isErrorModel(raw.type): ${isErrorModel(program, raw.type)}`);
        console.log(`  sourceModels:`, raw.type.sourceModels?.map(s => ({
          kind: s.model.kind,
          name: s.model.name,
          usage: s.usage,
          isError: isErrorModel(program, s.model)
        })));
        console.log(`  baseModel:`, raw.type.baseModel ? { name: raw.type.baseModel.name, isError: isErrorModel(program, raw.type.baseModel) } : 'none');
      }
      for (const inner of raw.responses) {
        if (inner.body) {
          const bodyType = inner.body.type;
          console.log(`  inner body: kind=${bodyType?.kind}, name=${bodyType?.kind === 'Model' ? bodyType.name : 'N/A'}`);
          if (bodyType?.kind === 'Model') {
            console.log(`    isErrorModel: ${isErrorModel(program, bodyType)}`);
            console.log(`    sourceModels:`, bodyType.sourceModels?.map(s => ({
              name: s.model.name,
              usage: s.usage,
              isError: isErrorModel(program, s.model)
            })));
          }
        }
      }
    }
  });
});
