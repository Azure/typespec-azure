// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { execFileSync } from "child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { emitGoFor } from "./scenario-runner.js";

describe("Recursive type adaptation", () => {
  it.each([
    { type: "Pet[]", helper: "Array" },
    { type: "Record<Pet>", helper: "Map" },
    { type: "Record<Pet[]>", helper: "ArrayMap" },
    {
      type: "Pet[]",
      helper: "Array",
      models:
        '@discriminator("kind") model Pet { kind: string; } model Cat extends Pet { kind: "cat"; name: string; }',
    },
  ])(
    "decodes a fake $type request using discriminator helpers",
    async ({ type, helper, models }) => {
      const files = await emitGoFor(
        `
      @service namespace Test;
      ${models ?? "model Cat { name: string; } @discriminated union Pet { cat: Cat }"}
      @route("/pets") @post op put(@body body: ${type}): void;
    `,
        { "generate-fakes": true },
      );
      const server = files.get("fake/zz_test_server.go")!;
      expect(server).toContain("raw, err := readRequestBody(req)");
      expect(server).toContain(`body, err := unmarshalPetClassification${helper}(raw)`);
      const helpers = files.get("fake/zz_polymorphic_helpers.go")!;
      expect(helpers).toContain(`func unmarshalPetClassification${helper}(`);
      expect(helpers).toContain("func unmarshalPetClassification(");
    },
  );

  it.each([
    { type: "Pet[]", declaration: "PetArray []PetClassification", helper: "Array" },
    { type: "Record<Pet>", declaration: "Value map[string]PetClassification", helper: "Map" },
  ])(
    "decodes a top-level $type response using discriminator helpers",
    async ({ type, declaration, helper }) => {
      const files = await emitGoFor(`
      @service namespace Test;
      model Cat { name: string; }
      @discriminated union Pet { cat: Cat }
      @route("/pets") @get op list(): ${type};
    `);
      expect(files.get("zz_responses.go")).toContain(declaration);
      const client = [...files].find(([name]) => name.endsWith("_client.go"))?.[1];
      expect(client).toContain("body, err := runtime.Payload(resp)");
      expect(client).toContain(`, err = unmarshalPetClassification${helper}(body)`);
      const helpers = files.get("zz_polymorphic_helpers.go")!;
      expect(helpers).toContain(`func unmarshalPetClassification${helper}(`);
      expect(helpers).toContain("func unmarshalPetClassification(");
    },
  );

  it.each([
    { type: "Pet[][]", helper: "ArrayArray", inner: "Array" },
    { type: "Record<Pet[]>", helper: "ArrayMap", inner: "Array" },
    { type: "Record<Pet>[]", helper: "MapArray", inner: "Map" },
    { type: "Record<Record<Pet>>", helper: "MapMap", inner: "Map" },
  ])("decodes a nested $type response", async ({ type, helper, inner }) => {
    const files = await emitGoFor(`
      @service namespace Test;
      model Cat { name: string; }
      @discriminated union Pet { cat: Cat }
      @route("/pets") @get op list(): ${type};
    `);
    const client = files.get("zz_test_client.go")!;
    expect(client).toContain(`, err = unmarshalPetClassification${helper}(body)`);
    const helpers = files.get("zz_polymorphic_helpers.go")!;
    expect(helpers).toContain(`func unmarshalPetClassification${helper}(`);
    expect(helpers).toContain(`f, err := unmarshalPetClassification${inner}(rawMessage)`);
    expect(helpers).toContain(`func unmarshalPetClassification${inner}(`);
    expect(helpers).toContain("func unmarshalPetClassification(");
  });

  it.each([
    { modelName: "PetCat", unionFirst: false, kind: "variant type" },
    { modelName: "PetCat", unionFirst: true, kind: "variant type" },
    { modelName: "PetClassification", unionFirst: false, kind: "interface" },
    { modelName: "PetClassification", unionFirst: true, kind: "interface" },
  ])(
    "rejects a model named $modelName colliding with a discriminated union (union first: $unionFirst)",
    async ({ modelName, unionFirst, kind }) => {
      const modelOperation = `@route("/model") @get op getModel(): ${modelName};`;
      const unionOperation = '@route("/pet") @get op getPet(): Pet;';
      await expect(
        emitGoFor(`
          @service namespace Test;
          model Cat { meow: boolean; }
          model ${modelName} { value: string; }
          @discriminated union Pet { cat: Cat }
          ${unionFirst ? unionOperation + modelOperation : modelOperation + unionOperation}
        `),
      ).rejects.toThrow(`duplicate discriminated union ${kind} name ${modelName}`);
    },
  );

  it("retains fields on mutually recursive models and union variants", async () => {
    const files = await emitGoFor(`
      @service namespace Test;
      model First { second?: Second; }
      model Second { first?: First; value?: Value; }
      union Value { First, string }
      @route("/value") @post op roundTrip(@body body: First): First;
    `);
    const models = files.get("zz_models.go")!;
    expect(models).toContain("Second *Second");
    expect(models).toContain("First *First");
    expect(models).toContain("Value *Value");
    const unions = files.get("zz_unions.go")!;
    expect(unions).toContain("First *First");
    expect(unions).toContain("String *string");
    expect(files.get("zz_models_serde.go")).toContain('populate(objectMap, "value", s.Value)');
    expect(files.get("zz_unions_serde.go")).toContain("json.Unmarshal(data, &v.First)");
  });

  it.each(["Owner", "Pet", "Cat"])(
    "completes mutually recursive discriminator hierarchies reached through %s",
    async (response) => {
      const files = await emitGoFor(`
        @service namespace Test;
        @discriminator("kind")
        model Pet { kind: string; owner?: Owner; related?: Pet; }
        @discriminator("species")
        model Mammal { species: string; pet?: Pet; }
        model Cat extends Pet { kind: "cat"; }
        model Dog extends Mammal { species: "dog"; }
        model Owner { pet?: Pet; favorite?: Mammal; }
        @route("/pets") @get op getPet(): ${response};
      `);
      const interfaces = files.get("zz_interfaces.go")!;
      expect(interfaces).toContain("type PetClassification interface");
      expect(interfaces).toContain("type MammalClassification interface");
      expect(interfaces).toContain("GetPet() *Pet");
      expect(interfaces).toContain("GetMammal() *Mammal");
      const models = files.get("zz_models.go")!;
      expect(models).toContain("Owner *Owner");
      expect(models).toContain("Related PetClassification");
      expect(models).toContain("Favorite MammalClassification");
      const polymorphics = files.get("zz_polymorphic_helpers.go")!;
      expect(polymorphics).toContain('case "dog":');
      expect(polymorphics).toContain('case "cat":');
    },
  );

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

  it("rejects caller-supplied endpoint service configurations with mismatched templates across clouds", async () => {
    await expect(
      emitGoFor(`
        @service
        @azureServiceConfigurations(Configurations)
        namespace Test;

        model PublicAuth is OAuth2Auth<[{
          type: OAuth2FlowType.clientCredentials;
          tokenUrl: "https://login.example.com/public/token";
          scopes: ["https://public.example.com/.default"];
        }]>;
        model GovAuth is OAuth2Auth<[{
          type: OAuth2FlowType.clientCredentials;
          tokenUrl: "https://login.example.com/government/token";
          scopes: ["https://government.example.com/.default"];
        }]>;

        const Configurations: Record<AzureServiceConfiguration> = #{
          public: #{
            endpoint: "{endpoint}",
            parameters: typeref({ endpoint: url }),
            authentication: typeref(PublicAuth),
          },
          government: #{
            endpoint: "{endpoint}/v2",
            parameters: typeref({ endpoint: url }),
            authentication: typeref(GovAuth),
          },
        };

        @get op read(): void;
      `),
    ).rejects.toThrow(
      /caller-supplied endpoint service configurations must use an identical endpoint template and parameters across clouds/,
    );
  });

  it("rejects cloud endpoint template parameters with conflicting wire types across clouds", async () => {
    await expect(
      emitGoFor(`
        @service
        @azureServiceConfigurations(Configurations)
        namespace Test;

        model PublicAuth is OAuth2Auth<[{
          type: OAuth2FlowType.clientCredentials;
          tokenUrl: "https://login.example.com/public/token";
          scopes: ["https://public.example.com/.default"];
        }]>;
        model GovAuth is OAuth2Auth<[{
          type: OAuth2FlowType.clientCredentials;
          tokenUrl: "https://login.example.com/government/token";
          scopes: ["https://government.example.com/.default"];
        }]>;

        const Configurations: Record<AzureServiceConfiguration> = #{
          public: #{
            endpoint: "https://{port}.public.example.com",
            parameters: typeref({ port: string }),
            authentication: typeref(PublicAuth),
          },
          government: #{
            endpoint: "https://{port}.government.example.us",
            parameters: typeref({ port: int32 }),
            authentication: typeref(GovAuth),
          },
        };

        @get op read(): void;
      `),
    ).rejects.toThrow(/cloud endpoint parameter "port" has conflicting definitions/);
  });

  it("compiles and executes generated Go clients for colliding template names, per-cloud defaults, cloud-only placeholders, and token supplemental endpoints", async () => {
    const templateModDir = path.resolve(import.meta.dirname, "../local/containingmod");
    const goMod = readFileSync(path.join(templateModDir, "go.mod"), "utf8")
      .replace(/^module\s+\S+/m, "module testmodule")
      .replace(/^\s*github\.com\/stretchr\/testify\s+\S+\r?\n/m, "");
    const goSum = readFileSync(path.join(templateModDir, "go.sum"), "utf8");

    const runGoTest = (files: Map<string, string>, testSource: string): void => {
      const tmpDir = mkdtempSync(path.join(os.tmpdir(), "tsp-go-svccfg-"));
      try {
        writeFileSync(path.join(tmpDir, "go.mod"), goMod, "utf8");
        writeFileSync(path.join(tmpDir, "go.sum"), goSum, "utf8");
        for (const [relPath, content] of files) {
          const fullPath = path.join(tmpDir, relPath);
          mkdirSync(path.dirname(fullPath), { recursive: true });
          writeFileSync(fullPath, content, "utf8");
        }
        writeFileSync(path.join(tmpDir, "client_compile_test.go"), testSource, "utf8");
        execFileSync("go", ["test", "-mod=mod", "./..."], {
          cwd: tmpDir,
          encoding: "utf8",
          stdio: "pipe",
        });
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    };

    const cloudFiles = await emitGoFor(`
      @service
      @azureServiceConfigurations(Configurations)
      namespace Test;

      model PublicAuth is OAuth2Auth<[{
        type: OAuth2FlowType.clientCredentials;
        tokenUrl: "https://login.example.com/public/token";
        scopes: ["https://public.example.com/.default"];
      }]>;
      model SovereignAuth is OAuth2Auth<[{
        type: OAuth2FlowType.clientCredentials;
        tokenUrl: "https://login.example.com/sovereign/token";
        scopes: ["https://sovereign.example.org/.default"];
      }]>;
      model GovernmentAuth is OAuth2Auth<[{
        type: OAuth2FlowType.clientCredentials;
        tokenUrl: "https://login.example.com/government/token";
        scopes: ["https://government.example.us/.default"];
      }]>;

      const Configurations: Record<AzureServiceConfiguration> = #{
        public: #{
          endpoint: "https://{endpoint}.{hostEndpoint}.{region}.public.example.com",
          parameters: typeref({
            endpoint: string,
            hostEndpoint: string,
            region?: string = "eastus",
          }),
          authentication: typeref(PublicAuth),
        },
        sovereign_cloud: #{
          endpoint: "https://{endpoint}.{hostEndpoint}.{region}.sovereign.example.org",
          parameters: typeref({
            endpoint: string,
            hostEndpoint: string,
            region?: string = "sovereigneast",
          }),
          authentication: typeref(SovereignAuth),
        },
        government: #{
          endpoint: "https://{endpoint}.{hostEndpoint}.{govInstance}.government.example.us",
          parameters: typeref({
            endpoint: string,
            hostEndpoint: string,
            govInstance: string,
          }),
          authentication: typeref(GovernmentAuth),
        },
      };

      @route("/ping")
      @get op ping(): void;
    `);

    runGoTest(
      cloudFiles,
      `package testmodule_test

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"testmodule"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/cloud"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
)

type captureCred struct {
	scopes []string
}

func (c *captureCred) GetToken(_ context.Context, opts policy.TokenRequestOptions) (azcore.AccessToken, error) {
	c.scopes = append([]string(nil), opts.Scopes...)
	return azcore.AccessToken{Token: "tok", ExpiresOn: time.Now().Add(time.Hour)}, nil
}

type captureTransport struct {
	lastURL string
}

func (t *captureTransport) Do(req *http.Request) (*http.Response, error) {
	t.lastURL = req.URL.String()
	return &http.Response{
		StatusCode: http.StatusNoContent,
		Body:       http.NoBody,
		Request:    req,
	}, nil
}

func TestCloudConfigurationsEndpointResolution(t *testing.T) {
	cred := &captureCred{}
	tr := &captureTransport{}

	pubClient, err := testmodule.NewTestClient("acct", "edge", cred, &testmodule.TestClientOptions{
		ClientOptions: azcore.ClientOptions{Transport: tr},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, err = pubClient.Ping(context.Background(), nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tr.lastURL != "https://acct.edge.eastus.public.example.com/ping" {
		t.Fatalf("got URL %q", tr.lastURL)
	}
	if len(cred.scopes) != 1 || cred.scopes[0] != "https://public.example.com/.default" {
		t.Fatalf("got scopes %v", cred.scopes)
	}

	sovClient, err := testmodule.NewTestClient("acct", "edge", cred, &testmodule.TestClientOptions{
		ClientOptions: azcore.ClientOptions{
			Cloud:     testmodule.CloudSovereignCloud,
			Transport: tr,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, err = sovClient.Ping(context.Background(), nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tr.lastURL != "https://acct.edge.sovereigneast.sovereign.example.org/ping" {
		t.Fatalf("got URL %q", tr.lastURL)
	}
	if len(cred.scopes) != 1 || cred.scopes[0] != "https://sovereign.example.org/.default" {
		t.Fatalf("got scopes %v", cred.scopes)
	}

	_, err = testmodule.NewTestClient("acct", "edge", cred, &testmodule.TestClientOptions{
		ClientOptions: azcore.ClientOptions{
			Cloud:     cloud.AzureGovernment,
			Transport: tr,
		},
	})
	if err == nil || !strings.Contains(err.Error(), "options.GovInstance is required") {
		t.Fatalf("expected missing GovInstance error, got %v", err)
	}

	govClient, err := testmodule.NewTestClient("acct", "edge", cred, &testmodule.TestClientOptions{
		ClientOptions: azcore.ClientOptions{
			Cloud:     cloud.AzureGovernment,
			Transport: tr,
		},
		GovInstance: to.Ptr("dod"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, err = govClient.Ping(context.Background(), nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tr.lastURL != "https://acct.edge.dod.government.example.us/ping" {
		t.Fatalf("got URL %q", tr.lastURL)
	}
	if len(cred.scopes) != 1 || cred.scopes[0] != "https://government.example.us/.default" {
		t.Fatalf("got scopes %v", cred.scopes)
	}
}
`,
    );

    const supplementalTokenFiles = await emitGoFor(`
      @service
      @server("{endpoint}/v1", "Versioned endpoint", { endpoint: url })
      @useAuth(OAuth2Auth<[{
        type: OAuth2FlowType.clientCredentials;
        tokenUrl: "https://login.example.com/token";
        scopes: ["https://api.example.com/.default"];
      }]>)
      namespace Test;

      @route("/items")
      @get op list(): void;
    `);

    runGoTest(
      supplementalTokenFiles,
      `package testmodule_test

import (
	"context"
	"net/http"
	"testing"
	"testmodule"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
)

type staticCred struct{}

func (staticCred) GetToken(_ context.Context, _ policy.TokenRequestOptions) (azcore.AccessToken, error) {
	return azcore.AccessToken{Token: "tok", ExpiresOn: time.Now().Add(time.Hour)}, nil
}

type recordTransport struct {
	lastURL string
}

func (t *recordTransport) Do(req *http.Request) (*http.Response, error) {
	t.lastURL = req.URL.String()
	return &http.Response{
		StatusCode: http.StatusNoContent,
		Body:       http.NoBody,
		Request:    req,
	}, nil
}

func TestSupplementalEndpointWithTokenAuth(t *testing.T) {
	tr := &recordTransport{}
	client, err := testmodule.NewTestClient("https://custom.example.com", staticCred{}, &testmodule.TestClientOptions{
		ClientOptions: azcore.ClientOptions{Transport: tr},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, err = client.List(context.Background(), nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tr.lastURL != "https://custom.example.com/v1/items" {
		t.Fatalf("got URL %q", tr.lastURL)
	}
}
`,
    );
  });
});
