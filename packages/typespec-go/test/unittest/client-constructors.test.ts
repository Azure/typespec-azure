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

  it("emits cloud-bound constructors and multi-cloud configuration for fixed service configurations", async () => {
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
    expect(client).toContain(
      "func NewTestClient(credential azcore.TokenCredential, options *TestClientOptions) (*TestClient, error)",
    );
    expect(client).not.toContain("NewTestClientWithNoCredential");
    expect(client).toContain('else if c.Endpoint == ""');
    expect(client).toContain("endpoint := c.Endpoint");

    const cloudConfig = files.get("zz_cloud_config.go")!;
    expect(cloudConfig).toContain(
      "cloud.AzureGovernment.Services[ServiceName] = cloud.ServiceConfiguration{",
    );
    expect(cloudConfig).toContain('Audience: "https://government.example.com"');
    expect(cloudConfig).toContain('Endpoint: "https://government.example.com"');
    expect(cloudConfig).toContain(
      "cloud.AzurePublic.Services[ServiceName] = cloud.ServiceConfiguration{",
    );
    expect(cloudConfig).toContain('Audience: "https://public.example.com"');
    expect(cloudConfig).toContain('Endpoint: "https://public.example.com"');
  });

  it("keeps explicit endpoint constructor parameter while registering multi-cloud audiences for caller-supplied endpoints", async () => {
    const files = await emitGoFor(`
      @service
      @azureServiceConfigurations(Configurations)
      namespace Test;

      ${credentials}
      model ChinaAuth is OAuth2Auth<[{
        type: OAuth2FlowType.clientCredentials;
        tokenUrl: "https://login.example.com/china/token";
        scopes: ["https://china.example.cn/.default"];
      }]>;

      const Configurations: Record<AzureServiceConfiguration> = #{
        public: #{
          endpoint: "{endpoint}",
          parameters: typeref({ endpoint: url }),
          authentication: typeref(PublicAuth),
        },
        government: #{
          endpoint: "{endpoint}",
          parameters: typeref({ endpoint: url }),
          authentication: typeref(GovernmentAuth),
        },
        china: #{
          endpoint: "{endpoint}",
          parameters: typeref({ endpoint: url }),
          authentication: typeref(ChinaAuth),
        },
      };

      @get op read(): void;
    `);

    const client = files.get("zz_test_client.go")!;
    expect(client).toContain(
      "func NewTestClient(endpoint string, credential azcore.TokenCredential, options *TestClientOptions) (*TestClient, error)",
    );
    expect(client).not.toContain("c.Endpoint");

    const cloudConfig = files.get("zz_cloud_config.go")!;
    expect(cloudConfig).toContain("cloud.AzureChina.Services[ServiceName]");
    expect(cloudConfig).toContain('Audience: "https://china.example.cn"');
    expect(cloudConfig).toContain("cloud.AzureGovernment.Services[ServiceName]");
    expect(cloudConfig).toContain('Audience: "https://government.example.com"');
    expect(cloudConfig).toContain("cloud.AzurePublic.Services[ServiceName]");
    expect(cloudConfig).toContain('Audience: "https://public.example.com"');
    expect(cloudConfig).not.toContain("Endpoint:");
  });

  it("substitutes cloud host template parameters and exports custom service configuration variables", async () => {
    const files = await emitGoFor(`
      @service
      @azureServiceConfigurations(Configurations)
      namespace Test;

      ${credentials}
      model SovereignAuth is OAuth2Auth<[{
        type: OAuth2FlowType.clientCredentials;
        tokenUrl: "https://login.example.com/sovereign/token";
        scopes: ["https://sovereign.example.org/.default"];
      }]>;

      const Configurations: Record<AzureServiceConfiguration> = #{
        public: #{
          endpoint: "https://{account}.{region}.public.example.com",
          parameters: typeref({ account: string, region?: string = "eastus" }),
          authentication: typeref(PublicAuth),
        },
        sovereign_cloud: #{
          endpoint: "https://{account}.{region}.sovereign.example.org",
          parameters: typeref({ account: string, region?: string = "eastus" }),
          authentication: typeref(SovereignAuth),
        },
      };

      @get op read(): void;
    `);

    const client = files.get("zz_test_client.go")!;
    expect(client).toContain(
      "func NewTestClient(account string, credential azcore.TokenCredential, options *TestClientOptions) (*TestClient, error)",
    );
    expect(client).toContain("Region *string");
    expect(client).toContain("region = *options.Region");
    expect(client).toContain('strings.ReplaceAll(endpoint, "{account}", account)');
    expect(client).toContain('strings.ReplaceAll(endpoint, "{region}", region)');

    const cloudConfig = files.get("zz_cloud_config.go")!;
    expect(cloudConfig).toContain("var CloudSovereignCloud = cloud.Configuration{");
    expect(cloudConfig).toContain('Audience: "https://sovereign.example.org"');
    expect(cloudConfig).toContain('Endpoint: "https://{account}.{region}.sovereign.example.org"');
  });

  it("propagates cloud-resolved endpoint to sub-clients and omits endpoint from generated examples", async () => {
    const files = await emitGoFor(
      `
        @service(#{ title: "Test" })
        @versioned(Versions)
        @azureServiceConfigurations(Configurations)
        namespace Test;

        enum Versions {
          v1: "2024-01-01",
        }

        ${credentials}

        const Configurations: Record<AzureServiceConfiguration> = #{
          public: #{
            endpoint: "https://public.example.com",
            authentication: typeref(PublicAuth),
          },
          government: #{
            endpoint: "https://government.example.com",
            authentication: typeref(GovernmentAuth),
          },
        };

        @get op read(): void;

        @route("/items")
        interface Items {
          @get op list(): void;
        }
      `,
      { "generate-samples": true },
      {
        "examples/2024-01-01/read.json": JSON.stringify({
          title: "Read example",
          operationId: "read",
          parameters: {},
          responses: { "204": {} },
        }),
      },
    );

    const rootClient = files.get("zz_test_client.go")!;
    expect(rootClient).toContain("func (client *TestClient) NewTestItemsClient() *TestItemsClient");
    expect(rootClient).toContain("endpoint: client.endpoint,");

    const exampleFile = [...files].find(([name]) => name.endsWith("_example_test.go"))?.[1];
    expect(exampleFile).toContain("testmodule.NewTestClient(cred, nil)");
  });

  it("rejects service configurations with mismatched OAuth2 scope suffixes", async () => {
    await expect(
      emitGoFor(`
        @service
        @azureServiceConfigurations(Configurations)
        namespace Test;

        model PublicCustomScope is OAuth2Auth<[{
          type: OAuth2FlowType.clientCredentials;
          tokenUrl: "https://login.example.com/public/token";
          scopes: ["https://public.example.com/.default"];
        }]>;
        model GovCustomScope is OAuth2Auth<[{
          type: OAuth2FlowType.clientCredentials;
          tokenUrl: "https://login.example.com/government/token";
          scopes: ["https://government.example.com/user_impersonation"];
        }]>;

        const Configurations: Record<AzureServiceConfiguration> = #{
          public: #{
            endpoint: "https://public.example.com",
            authentication: typeref(PublicCustomScope),
          },
          government: #{
            endpoint: "https://government.example.com",
            authentication: typeref(GovCustomScope),
          },
        };

        @get op read(): void;
      `),
    ).rejects.toThrow(/uniform OAuth2 scope suffix/);
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
