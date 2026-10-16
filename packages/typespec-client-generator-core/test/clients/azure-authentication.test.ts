import { expect, it } from "vitest";
import { type SdkClientType, UsageFlags } from "../../src/interfaces.js";
import { AzureCoreTester, createSdkContextForTester } from "../tester.js";

const definitions = `
  union ResourceAudience {
    Government: "https://search.azure.us",
    Public: "https://search.azure.com",
    string,
  }
  @azureTokenAuthentication(#{kind: "entraDefaultScope", defaultAudience: "Public"}, ResourceAudience)
  model ResourceAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;
`;

function getCredential(client: SdkClientType) {
  const credential = client.clientInitialization.parameters.find(
    (parameter) => parameter.kind === "credential",
  );
  if (!credential) throw new Error("Missing credential parameter");
  return credential;
}

it.each(["python", "csharp", "java", "go", "ts"])(
  "projects typed audiences onto the exact OAuth alternative for %s",
  async (language) => {
    const { program } = await AzureCoreTester.compile(`
    ${definitions}
    @@clientName(ResourceAudience, "CloudAudience");
    @@clientName(ResourceAudience.Public, "AzurePublic");
    model OtherAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;
    @azureServiceEnvironments(ResourceAuth, #{
      Public: #{audience: "Public", defaultEndpoint: "https://instance.search.windows.net"},
      Government: #{audience: "Government"}
    }, "Public")
    @useAuth(ResourceAuth | OtherAuth | ApiKeyAuth<ApiKeyLocation.header, "api-key"> | NoAuth)
    @service namespace Search { @get op read(): void; }
  `);
    const context = await createSdkContextForTester(program, {
      emitterName: `@azure-tools/typespec-${language}`,
    });
    expect(context.diagnostics).toEqual([]);
    const client = context.sdkPackage.clients[0];
    const credential = getCredential(client);
    expect(credential.optional).toBe(false);
    if (credential.type.kind !== "union") throw new Error("Missing credential alternatives");
    const types = credential.type.variantTypes;
    expect(types.map((type) => type.scheme.type)).toEqual(["oauth2", "oauth2", "apiKey", "noAuth"]);
    const metadata = types[0].azureAuthentication;
    if (metadata?.profile.kind !== "entraDefaultScope") throw new Error("Missing Entra profile");
    expect(metadata.profile.audience).toMatchObject({
      defaultAudienceName: "Public",
      defaultAudience: "https://search.azure.com",
      allowCustomAudience: true,
    });
    expect(metadata.profile.defaultScopes).toEqual(["https://search.azure.com/.default"]);
    const audience = metadata.profile.audience.type;
    expect(audience.name).toBe("CloudAudience");
    expect(audience.values.map((value) => value.name)).toEqual(["Government", "AzurePublic"]);
    expect(audience.isFixed).toBe(false);
    expect(audience.usage & UsageFlags.Input).toBeTruthy();
    expect(context.sdkPackage.enums).toContain(audience);
    expect(metadata.environments).toEqual([
      {
        name: "Public",
        audienceName: "Public",
        audience: "https://search.azure.com",
        defaultEndpoint: "https://instance.search.windows.net",
      },
      {
        name: "Government",
        audienceName: "Government",
        audience: "https://search.azure.us",
      },
    ]);
    expect(metadata.defaultEnvironment).toBe("Public");
    expect(types.slice(1).every((type) => type.azureAuthentication === undefined)).toBe(true);
    expect(
      client.authentication?.options.map((option) => option.schemes.map((scheme) => scheme.type)),
    ).toEqual([["oauth2"], ["oauth2"], ["apiKey"], ["noAuth"]]);
  },
);

it("keeps environment data client-local when services share an authentication model", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    @azureServiceEnvironments(ResourceAuth, #{Public: #{audience: "Public", defaultEndpoint: "https://one.example.com"}}, "Public")
    @useAuth(ResourceAuth)
    @service namespace One { @get op read(): void; }
    @azureServiceEnvironments(ResourceAuth, #{Public: #{audience: "Public", defaultEndpoint: "https://two.example.com"}}, "Public")
    @useAuth(ResourceAuth)
    @service namespace Two { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const endpoints = context.sdkPackage.clients.map((client) => {
    const credential = getCredential(client);
    if (credential.type.kind !== "credential") throw new Error("Missing credential type");
    return credential.type.azureAuthentication?.environments[0].defaultEndpoint;
  });
  expect(endpoints).toEqual(["https://one.example.com", "https://two.example.com"]);
});

it("inherits environments and supports an interface-local override", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    @azureServiceEnvironments(ResourceAuth, #{Public: #{audience: "Public", defaultEndpoint: "https://parent.example.com"}}, "Public")
    @useAuth(ResourceAuth)
    @service namespace Service {
      @get op read(): void;
      @azureServiceEnvironments(ResourceAuth, #{Private: #{audience: "Public", defaultEndpoint: "https://private.example.com"}})
      interface Operations { @get @route("/child") read(): void; }
    }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  const child = client.children?.[0];
  if (!child) throw new Error("Missing sub-client");
  const credential = getCredential(child);
  if (credential.type.kind !== "credential") throw new Error("Missing credential type");
  expect(credential.type.azureAuthentication).toMatchObject({
    environments: [
      {
        name: "Private",
        defaultEndpoint: "https://private.example.com",
      },
    ],
  });
  expect(credential.type.azureAuthentication?.defaultEnvironment).toBeUndefined();
});

it("keeps ordinary multi-flow scopes unchanged and carries only the named challenge contract", async () => {
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
    @azureTokenAuthentication(#{kind: "challengeBased", challengeContract: "azure.keyVaultChallenge/v1"})
    model ChallengeAuth is AadOauth2Auth<[]>;
    @useAuth(ExplicitAuth | ChallengeAuth)
    @service namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const credential = getCredential(context.sdkPackage.clients[0]);
  if (credential.type.kind !== "union") throw new Error("Missing credential alternatives");
  const [explicit, challenge] = credential.type.variantTypes;
  expect(explicit.azureAuthentication).toBeUndefined();
  if (explicit.scheme.type !== "oauth2") throw new Error("Missing OAuth scheme");
  expect(explicit.scheme.flows.map((flow) => flow.scopes.map((scope) => scope.value))).toEqual([
    ["read"],
    ["write", "read"],
  ]);
  expect(challenge.azureAuthentication).toEqual({
    profile: { kind: "challengeBased", challengeContract: "azure.keyVaultChallenge/v1" },
    environments: [],
  });
});

it("projects closed audience enums without normalizing resource slashes", async () => {
  const { program } = await AzureCoreTester.compile(`
    enum ResourceAudience { Public: "https://monitor.azure.com/" }
    @azureTokenAuthentication(#{kind: "entraDefaultScope", defaultAudience: "Public"}, ResourceAudience)
    model ResourceAuth is AadOauth2Auth<["https://monitor.azure.com//.default"]>;
    @useAuth(ResourceAuth)
    @service namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const credential = getCredential(context.sdkPackage.clients[0]);
  if (credential.type.kind !== "credential") throw new Error("Missing credential type");
  const profile = credential.type.azureAuthentication?.profile;
  if (profile?.kind !== "entraDefaultScope") throw new Error("Missing Entra profile");
  expect(profile.audience.allowCustomAudience).toBe(false);
  expect(profile.audience.type.isFixed).toBe(true);
  expect(profile.audience.type.values.map((value) => value.value)).toEqual([
    "https://monitor.azure.com/",
  ]);
  expect(profile.defaultScopes).toEqual(["https://monitor.azure.com//.default"]);
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
  expect(credential.type.variantTypes[0].azureAuthentication?.profile.kind).toBe(
    "entraDefaultScope",
  );
});

it("finds service environments for a customized client outside the service namespace", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    @azureServiceEnvironments(ResourceAuth, #{Public: #{audience: "Public", defaultEndpoint: "https://service.example.com"}}, "Public")
    @useAuth(ResourceAuth)
    @service namespace Service { @get op read(): void; }
    @client({name: "Customized", service: Service})
    namespace Clients.Customized { op read is Service.read; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  expect(client.name).toBe("Customized");
  const credential = getCredential(client);
  if (credential.type.kind !== "credential") throw new Error("Missing credential type");
  expect(credential.type.azureAuthentication).toMatchObject({
    defaultEnvironment: "Public",
    environments: [{ defaultEndpoint: "https://service.example.com" }],
  });
});

it.each([
  ["virtual", false],
  ["virtual", true],
  ["auto-merged", false],
  ["auto-merged", true],
])(
  "inherits customized environments for %s children with service defaults: %s",
  async (kind, serviceDefaults) => {
    const { program } = await AzureCoreTester.compile(`
      ${definitions}
      ${
        serviceDefaults
          ? '@azureServiceEnvironments(ResourceAuth, #{Public: #{audience: "Public", defaultEndpoint: "https://service.example.com"}}, "Public")'
          : ""
      }
      @useAuth(ResourceAuth)
      @service namespace Service {
        interface Operations { @get @route("/child") read(): void; }
      }
      @azureServiceEnvironments(ResourceAuth, #{Private: #{audience: "Public", defaultEndpoint: "https://custom.example.com"}}, "Private")
      @client({name: "Customized", service: Service, autoMergeService: true})
      namespace Clients.Customized {}
      ${kind === "virtual" ? '@@clientLocation(Service.Operations.read, "Moved");' : ""}
    `);
    const context = await createSdkContextForTester(program);
    expect(context.diagnostics).toEqual([]);
    const client = context.sdkPackage.clients[0];
    const child = client.children?.find(
      (candidate) => candidate.name === (kind === "virtual" ? "Moved" : "Operations"),
    );
    if (!child) throw new Error("Missing sub-client");
    expect(child.__raw.type?.kind).toBe(kind === "virtual" ? undefined : "Interface");
    const credential = getCredential(child);
    if (credential.type.kind !== "credential") throw new Error("Missing credential type");
    expect(credential.type.azureAuthentication).toMatchObject({
      defaultEnvironment: "Private",
      environments: [{ name: "Private", defaultEndpoint: "https://custom.example.com" }],
    });
  },
);

it("preserves child-local environments over a customized SDK parent", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    @azureServiceEnvironments(ResourceAuth, #{Public: #{audience: "Public", defaultEndpoint: "https://service.example.com"}}, "Public")
    @useAuth(ResourceAuth)
    @service namespace Service {
      @azureServiceEnvironments(ResourceAuth, #{Local: #{audience: "Government", defaultEndpoint: "https://child.example.com"}})
      interface Operations { @get op read(): void; }
    }
    @azureServiceEnvironments(ResourceAuth, #{Private: #{audience: "Public", defaultEndpoint: "https://custom.example.com"}}, "Private")
    @client({name: "Customized", service: Service, autoMergeService: true})
    namespace Clients.Customized {}
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([]);
  const client = context.sdkPackage.clients[0];
  const child = client.children?.[0];
  if (!child) throw new Error("Missing sub-client");
  const credential = getCredential(child);
  if (credential.type.kind !== "credential") throw new Error("Missing credential type");
  expect(credential.type.azureAuthentication?.environments).toEqual([
    {
      name: "Local",
      audienceName: "Government",
      audience: "https://search.azure.us",
      defaultEndpoint: "https://child.example.com",
    },
  ]);
  expect(credential.type.azureAuthentication?.defaultEnvironment).toBeUndefined();
});

it("diagnoses environments referencing an authentication alternative the client does not use", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    model OtherAuth is AadOauth2Auth<["other.read"]>;
    @azureServiceEnvironments(ResourceAuth, #{Public: #{audience: "Public"}}, "Public")
    @useAuth(OtherAuth)
    @service namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([
    expect.objectContaining({
      code: "@azure-tools/typespec-client-generator-core/azure-authentication-invalid",
      message:
        "Cannot project Azure authentication: Service environments reference 'ResourceAuth', which is not an authentication alternative of this client.",
    }),
  ]);
});

it("validates environment associations on sub-clients", async () => {
  const { program } = await AzureCoreTester.compile(`
    ${definitions}
    @azureTokenAuthentication(#{kind: "entraDefaultScope", defaultAudience: "Public"}, ResourceAudience)
    model OtherAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;
    @useAuth(ResourceAuth)
    @service namespace Service {
      @azureServiceEnvironments(OtherAuth, #{Public: #{audience: "Public"}})
      interface Operations { @get op read(): void; }
    }
  `);
  const context = await createSdkContextForTester(program);
  expect(context.diagnostics).toEqual([
    expect.objectContaining({
      code: "@azure-tools/typespec-client-generator-core/azure-authentication-invalid",
      message:
        "Cannot project Azure authentication: Service environments reference 'OtherAuth', which is not an authentication alternative of this client.",
    }),
  ]);
});

it("reports unsupported audience projection instead of silently dropping its metadata", async () => {
  const { program } = await AzureCoreTester.compile(`
    union BaseAudience { Public: "https://search.azure.com" }
    union ResourceAudience { BaseAudience, string }
    @azureTokenAuthentication(#{kind: "entraDefaultScope", defaultAudience: "Public"}, ResourceAudience)
    model ResourceAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;
    @useAuth(ResourceAuth)
    @service namespace Service { @get op read(): void; }
  `);
  const context = await createSdkContextForTester(program, {}, { flattenUnionAsEnum: false });
  expect(context.diagnostics).toEqual([
    expect.objectContaining({
      code: "@azure-tools/typespec-client-generator-core/azure-authentication-invalid",
      message:
        "Cannot project Azure authentication: The audience family must project to an SDK enum; nested audience unions require union-as-enum flattening.",
    }),
  ]);
});

it.each(["1", "2"])(
  "projects version-specific audience members and environments for version %s",
  async (version) => {
    const { program } = await AzureCoreTester.compile(`
    @versioned(AuthDefinitions.Versions)
    namespace AuthDefinitions {
      enum Versions { v1: "1", v2: "2" }
      union ResourceAudience {
        @added(Versions.v2)
        Government: "https://search.azure.us",
        Public: "https://search.azure.com",
        string,
      }
      @azureTokenAuthentication(#{kind: "entraDefaultScope", defaultAudience: "Public"}, ResourceAudience)
      model ResourceAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;
    }
    @service
    @versioned(Service.Versions)
    @useAuth(AuthDefinitions.ResourceAuth)
    @azureServiceEnvironments(AuthDefinitions.ResourceAuth, #{Public: #{audience: "Public"}}, "Public")
    namespace Service {
      enum Versions {
        @useDependency(AuthDefinitions.Versions.v1)
        v1: "1",
        @useDependency(AuthDefinitions.Versions.v2)
        v2: "2",
      }
      @get op read(): void;
    }
  `);
    const context = await createSdkContextForTester(program, { "api-version": version });
    expect(context.diagnostics).toEqual([]);
    const credential = getCredential(context.sdkPackage.clients[0]);
    if (credential.type.kind !== "credential") throw new Error("Missing credential type");
    const metadata = credential.type.azureAuthentication;
    if (metadata?.profile.kind !== "entraDefaultScope") throw new Error("Missing Entra profile");
    expect(metadata.defaultEnvironment).toBe("Public");
    expect(context.sdkPackage.enums).toContain(metadata.profile.audience.type);
    const values = metadata.profile.audience.type.values.map((value) => value.value);
    expect(values).toEqual(
      version === "1"
        ? ["https://search.azure.com"]
        : ["https://search.azure.us", "https://search.azure.com"],
    );
    expect(Object.values(metadata.profile.audience.knownAudiences)).toEqual(values);
  },
);
