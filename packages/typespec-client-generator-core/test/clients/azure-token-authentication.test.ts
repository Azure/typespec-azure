import { expectDiagnostics } from "@typespec/compiler/testing";
import { expect, it } from "vitest";
import { type SdkClientType, UsageFlags } from "../../src/interfaces.js";
import { AzureCoreTester, createSdkContextForTester } from "../tester.js";

const definitions = `
  enum ResourceAudience {
    Government: "https://search.azure.us",
    Public: "https://search.azure.com",
    China: "https://search.azure.cn",
  }
  @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: ResourceAudience.Public})
  model ResourceAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;
`;

function getCredential(client: SdkClientType) {
  const credential = client.clientInitialization.parameters.find(
    (parameter) => parameter.kind === "credential",
  );
  if (!credential) throw new Error("Missing credential parameter");
  return credential;
}

it.each([false, true])(
  "validates non-default audience resources across merged services: conflict=%s",
  async (conflict) => {
    const [{ program }, diagnostics] = await AzureCoreTester.compileAndDiagnose(`
      @service @useAuth(First.ResourceAuth)
      namespace First {
        ${definitions}
        @get @route("/first") op readFirst(): void;
      }
      @service @useAuth(Second.ResourceAuth)
      namespace Second {
        ${conflict ? definitions.replace("https://search.azure.us", "https://other.example.com") : definitions}
        @get @route("/second") op readSecond(): void;
      }
      @client({service: [First, Second], autoMergeService: true})
      namespace Combined {}
    `);
    expectDiagnostics(
      diagnostics,
      conflict
        ? [{ code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service" }]
        : [],
    );
    if (!conflict) {
      const context = await createSdkContextForTester(program);
      expect(context.diagnostics).toEqual([]);
      expect(context.sdkPackage.clients).toHaveLength(1);
      expect(getCredential(context.sdkPackage.clients[0]).type).toMatchObject({
        kind: "credential",
        azureAuthentication: {
          profile: { audience: { knownAudiences: { Government: "https://search.azure.us" } } },
        },
      });
    }
  },
);

it.each(["python", "csharp", "java", "go", "ts"])(
  "projects one shared known-audience enum onto the exact OAuth alternative for %s",
  async (language) => {
    const { program } = await AzureCoreTester.compile(`
      ${definitions}
      @@clientName(ResourceAudience, "CloudAudience");
      @@clientName(ResourceAudience.Public, "AzurePublic");
      model OtherAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;
      @server("{endpoint}", "Service instance endpoint", {endpoint: url})
      @useAuth(ResourceAuth | OtherAuth | ApiKeyAuth<ApiKeyLocation.header, "api-key"> | NoAuth)
      @service namespace Search { @get op read(): void; }
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: `@azure-tools/typespec-${language}`,
    });
    expect(context.diagnostics).toEqual([]);
    const client = context.sdkPackage.clients[0];
    expect(client.clientInitialization).not.toHaveProperty("serviceConfigurations");
    const credential = getCredential(client);
    expect(credential.optional).toBe(false);
    if (credential.type.kind !== "union") throw new Error("Missing credential alternatives");
    const types = credential.type.variantTypes;
    expect(types.map((type) => type.scheme.type)).toEqual(["oauth2", "oauth2", "apiKey", "noAuth"]);
    const profile = types[0].azureAuthentication?.profile;
    if (!profile) throw new Error("Missing Entra profile");
    expect(profile.audience).toMatchObject({
      defaultAudienceName: "Public",
      defaultAudience: "https://search.azure.com",
      knownAudiences: {
        Government: "https://search.azure.us",
        Public: "https://search.azure.com",
        China: "https://search.azure.cn",
      },
    });
    expect(profile.defaultScopes).toEqual(["https://search.azure.com/.default"]);
    const audience = profile.audience.type;
    expect(audience.name).toBe("CloudAudience");
    expect(audience.values.map((value) => value.name)).toEqual([
      "Government",
      "AzurePublic",
      "China",
    ]);
    expect(audience.isFixed).toBe(true);
    expect(profile.audience).not.toHaveProperty("allowCustomAudience");
    expect(audience.usage & UsageFlags.Input).toBeTruthy();
    expect(context.sdkPackage.enums).toContain(audience);
    expect(types.slice(1).every((type) => type.azureAuthentication === undefined)).toBe(true);
    expect(
      client.authentication?.options.map((option) => option.schemes.map((scheme) => scheme.type)),
    ).toEqual([["oauth2"], ["oauth2"], ["apiKey"], ["noAuth"]]);
  },
);

it("keeps ordinary multi-flow scopes unchanged without Azure annotations", async () => {
  const { program } = await AzureCoreTester.compile(`
    model ExplicitAuth is OAuth2Auth<[
      {
        type: OAuth2FlowType.implicit;
        authorizationUrl: "https://login.microsoftonline.com/common/oauth2/authorize";
        scopes: ["read"];
      },
      {
        type: OAuth2FlowType.clientCredentials;
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/token";
        scopes: ["write", "read"];
      }
    ]>;
    @useAuth(ExplicitAuth)
    @service namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const credential = getCredential(context.sdkPackage.clients[0]);
  if (credential.type.kind !== "credential" || credential.type.scheme.type !== "oauth2") {
    throw new Error("Missing OAuth credential");
  }
  expect(credential.type.azureAuthentication).toBeUndefined();
  expect(
    credential.type.scheme.flows.map((flow) => flow.scopes.map((scope) => scope.value)),
  ).toEqual([["read"], ["write", "read"]]);
});

it("preserves OR-of-AND requirements, legacy credentials, and initialization order", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    @server("{endpoint}", "Service endpoint", {endpoint: url})
    @useAuth([ResourceAuth, ApiKeyAuth<ApiKeyLocation.header, "api-key">] | NoAuth)
    @service namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  expect(client.clientInitialization.parameters.map((parameter) => parameter.kind)).toEqual([
    "endpoint",
    "credential",
  ]);
  expect(
    client.authentication?.options.map((option) => option.schemes.map((scheme) => scheme.type)),
  ).toEqual([["oauth2", "apiKey"], ["noAuth"]]);
  const credential = getCredential(client);
  expect(credential.optional).toBe(false);
  if (credential.type.kind !== "union") throw new Error("Missing legacy credential union");
  expect(credential.type.variantTypes.map((type) => type.scheme.type)).toEqual([
    "oauth2",
    "apiKey",
    "noAuth",
  ]);
});

it("projects audience resources without normalizing trailing slashes", async () => {
  const { program } = await AzureCoreTester.compile(`
    enum ResourceAudience { Public: "https://monitor.azure.com/" }
    @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: ResourceAudience.Public})
    model ResourceAuth is AadOauth2Auth<["https://monitor.azure.com//.default"]>;
    @useAuth(ResourceAuth)
    @service namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const credential = getCredential(context.sdkPackage.clients[0]);
  if (credential.type.kind !== "credential") throw new Error("Missing credential type");
  expect(credential.type.azureAuthentication?.profile).toMatchObject({
    audience: { defaultAudience: "https://monitor.azure.com/" },
    defaultScopes: ["https://monitor.azure.com//.default"],
  });
});

it("reports unsupported audience projection instead of silently dropping metadata", async () => {
  const { program } = await AzureCoreTester.compile(`
    enum ResourceAudience { Public: "https://search.azure.com" }
    @@alternateType(ResourceAudience, string);
    @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: ResourceAudience.Public})
    model ResourceAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;
    @useAuth(ResourceAuth)
    @service namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([
    expect.objectContaining({
      code: "@azure-tools/typespec-client-generator-core/azure-authentication-invalid",
      message:
        "Cannot project Azure authentication: The known-audience enum must project to an SDK enum.",
    }),
  ]);
});

it.each(["1", "2"])(
  "projects version-specific audience members for version %s",
  async (version) => {
    const { program } = await AzureCoreTester.compile(`
    @versioned(AuthDefinitions.Versions)
    namespace AuthDefinitions {
      enum Versions { v1: "1", v2: "2" }
      enum ResourceAudience {
        @added(Versions.v2)
        Government: "https://search.azure.us",
        Public: "https://search.azure.com",
      }
      @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: ResourceAudience.Public})
      model ResourceAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;
    }
    @service @versioned(Service.Versions) @useAuth(AuthDefinitions.ResourceAuth)
    namespace Service {
      enum Versions {
        @useDependency(AuthDefinitions.Versions.v1) v1: "1",
        @useDependency(AuthDefinitions.Versions.v2) v2: "2",
      }
      @get op read(): void;
    }
  `);
    const context = await createSdkContextForTester(program, { "api-version": version });
    expect(context.diagnostics).toEqual([]);
    const credential = getCredential(context.sdkPackage.clients[0]);
    if (credential.type.kind !== "credential") throw new Error("Missing credential type");
    const profile = credential.type.azureAuthentication?.profile;
    if (!profile) throw new Error("Missing Entra profile");
    expect(context.sdkPackage.enums).toContain(profile.audience.type);
    const values = profile.audience.type.values.map((value) => value.value);
    expect(values).toEqual(
      version === "1"
        ? ["https://search.azure.com"]
        : ["https://search.azure.us", "https://search.azure.com"],
    );
    expect(Object.values(profile.audience.knownAudiences)).toEqual(values);
  },
);
