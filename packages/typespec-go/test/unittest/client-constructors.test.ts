// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { describe, expect, it } from "vitest";
import { emitGoFor } from "./scenario-runner.js";

describe("Client constructors", () => {
  const credentials = `
    model PublicAuth is OAuth2Auth<[{
      type: OAuth2FlowType.clientCredentials;
      tokenUrl: "https://login.example.com/public/token";
      scopes: ["https://public.example.com/.default"];
    }]>;
    model GovernmentAuth is OAuth2Auth<[{
      type: OAuth2FlowType.clientCredentials;
      tokenUrl: "https://login.example.com/government/token";
      scopes: ["https://government.example.com/.default"];
    }]>;
  `;

  it("emits one token credential constructor for multiple service configurations", async () => {
    const files = await emitGoFor(`
      @service
      @azureServiceConfigurations(Configurations)
      namespace Test;

      ${credentials}

      const Configurations: Record<AzureServiceConfiguration> = #{
        government: #{
          endpoint: "https://government.example.com",
          authentication: typeref(GovernmentAuth),
        },
        public: #{
          endpoint: "https://public.example.com",
          authentication: typeref(PublicAuth),
        },
      };

      @get op read(): void;
    `);

    const client = files.get("zz_test_client.go")!;
    expect(client.match(/func NewTestClient\(/g)).toHaveLength(1);
    expect(client).toContain("credential azcore.TokenCredential");
    expect(client).not.toContain("NewTestClientWithNoCredential");
    expect(files.get("zz_cloud_config.go")).toContain('Audience: "https://public.example.com"');
  });

  it("preserves the unauthenticated constructor alongside multiple OAuth2 variants", async () => {
    const files = await emitGoFor(`
      @service
      @useAuth(PublicAuth | GovernmentAuth | NoAuth)
      namespace Test;

      ${credentials}

      @get op read(): void;
    `);

    const client = files.get("zz_test_client.go")!;
    expect(client.match(/func NewTestClient\(/g)).toHaveLength(1);
    expect(client.match(/func NewTestClientWithNoCredential\(/g)).toHaveLength(1);
  });
});
