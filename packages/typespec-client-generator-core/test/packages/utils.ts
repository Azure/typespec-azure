import { strictEqual } from "assert";
import {
  SdkClientType,
  SdkHttpOperation,
  SdkPackage,
  SdkServiceMethod,
} from "../../src/interfaces.js";

export function getServiceWithDefaultApiVersion(op: string) {
  return `
  @server(
    "{endpoint}",
    "Testserver endpoint",
    {
      /**
       * Need to be set as 'http://localhost:3000' in client.
       */
      endpoint: url,
    }
  )
  @service({})
  @versioned(Versions)
  namespace Server.Versions.Versioned;

  /**
   * The version of the API.
   */
  enum Versions {
    /**
     * The version 2022-12-01-preview.
     */
    @useDependency(Azure.Core.Versions.v1_0_Preview_2)
    v2022_12_01_preview: "2022-12-01-preview",
  }

  ${op}
  `;
}

export function getServiceMethodOfClient(
  sdkPackage: SdkPackage<SdkHttpOperation>,
  numMethods: number = 1,
  methodIndex: number = 0,
): SdkServiceMethod<SdkHttpOperation> {
  let client = sdkPackage.clients[0];
  if (client.methods.some((x) => x.kind === "clientaccessor")) {
    client = client.methods.find((x) => x.kind === "clientaccessor")
      ?.response as SdkClientType<SdkHttpOperation>;
  }
  strictEqual(client.methods.length, numMethods);
  const method = client.methods[methodIndex];
  strictEqual(["basic", "paging", "lro", "lropaging"].includes(method.kind), true);
  return method as SdkServiceMethod<SdkHttpOperation>;
}
