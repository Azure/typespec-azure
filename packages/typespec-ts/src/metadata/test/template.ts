export const recordedClientContent = `

import {
  Recorder,
  RecorderStartOptions,
  VitestTestContext,
} from "@azure-tools/test-recorder";

const replaceableVariables: Record<string, string> = {
  SUBSCRIPTION_ID: "azure_subscription_id"
};

const recorderEnvSetup: RecorderStartOptions = {
  envSetupForPlayback: replaceableVariables,
};

/**
 * creates the recorder and reads the environment variables from the \`.env\` file.
 * Should be called first in the test suite to make sure environment variables are
 * read before they are being used.
 */
export async function createRecorder(context: VitestTestContext): Promise<Recorder> {
  const recorder = new Recorder(context);
  await recorder.start(recorderEnvSetup);
  return recorder;
}
`;

export const sampleTestContent = `
// import { Recorder } from "@azure-tools/test-recorder";
// import { createRecorder } from "./utils/recordedClient.js";
import { assert, 
         // beforeEach,
         // afterEach,
         it,
         describe
} from "vitest";

describe("My test", () => {
  // let recorder: Recorder;

  // beforeEach(async function(ctx) {
    // recorder = await createRecorder(ctx);
  // });

  // afterEach(async function() {
    // await recorder.stop();
  // });

  it("sample test", async function() {
    assert.equal(1, 1);
  });
});
`;

export const snippetsContent = `
import { {{ clientClassName }} } from "../src/index.js";
import { DefaultAzureCredential, InteractiveBrowserCredential } from "@azure/identity";
import { setLogLevel } from "@azure/logger";
import { describe, it } from "vitest";

describe("snippets", () => {
  it("ReadmeSampleCreateClient_Node", async () => {
    {{#if azureArm}}
    {{#if hasSubscriptionId}}
    const subscriptionId = "00000000-0000-0000-0000-000000000000";
    const client = new {{ clientClassName }}(new DefaultAzureCredential(), subscriptionId);
    {{else}}
    const client = new {{ clientClassName }}(new DefaultAzureCredential());
    {{/if}}
    {{else}}
    const client = new {{ clientClassName }}("<endpoint>", new DefaultAzureCredential());
    {{/if}}
  });

  it("ReadmeSampleCreateClient_Browser", async () => {
    {{#if azureArm}}
    const credential = new InteractiveBrowserCredential({
      tenantId: "<YOUR_TENANT_ID>",
      clientId: "<YOUR_CLIENT_ID>",
    });
    {{#if hasSubscriptionId}}
    const subscriptionId = "00000000-0000-0000-0000-000000000000";
    const client = new {{ clientClassName }}(credential, subscriptionId);
    {{else}}
    const client = new {{ clientClassName }}(credential);
    {{/if}}
    {{else}}
    const credential = new InteractiveBrowserCredential({
      tenantId: "<YOUR_TENANT_ID>",
      clientId: "<YOUR_CLIENT_ID>",
    });
    const client = new {{ clientClassName }}("<endpoint>", credential);
    {{/if}}
  });

  it("SetLogLevel", async () => {
    setLogLevel("info");
  });
});
`;
