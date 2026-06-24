import "@typespec/versioning";
import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Versioning;
using Http;
using Spector;
using Azure.ClientGenerator.Core;

namespace Service.MultipleServices;

/**
 * First service definition in a multiple-services package with versioning.
 * Without explicit `@client`, this should create a separate root client (`ServiceAClient`).
 */
@scenarioService("/service/multiple-services/service-a")
@versioned(VersionsA)
namespace ServiceA {
  enum VersionsA {
    av1,
    av2,
  }

  @clientName("AOperations", "java,csharp")
  interface Operations {
    @scenario
    @scenarioDoc("""
        Test that multiple services without explicit `@client` create separate root clients.
        This operation should be accessible under `ServiceAClient` > `Operations`.
      
        Expected path: /service/multiple-services/service-a/a-test
        Expected query parameter: api-version=av2
        Expected 204 response.
      """)
    @route("a-test")
    opA(@query("api-version") apiVersion: VersionsA): void;
  }

  @clientName("ASubNamespace", "java,csharp")
  namespace SubNamespace {
    @scenario
    @scenarioDoc("""
        Test that sub-namespaces are preserved per service when using multiple services.
        This operation should be accessible under `ServiceAClient` > `SubNamespace`.
      
        Expected path: /service/multiple-services/service-a/a-sub-test
        Expected query parameter: api-version=av2
        Expected 204 response.
      """)
    @route("a-sub-test")
    op subOpA(@query("api-version") apiVersion: VersionsA): void;
  }
}

/**
 * Second service definition in a multiple-services package with versioning.
 * Without explicit `@client`, this should create a separate root client (`ServiceBClient`).
 */
@scenarioService("/service/multiple-services/service-b")
@versioned(VersionsB)
namespace ServiceB {
  enum VersionsB {
    bv1,
    bv2,
  }

  @clientName("BOperations", "java,csharp")
  interface Operations {
    @scenario
    @scenarioDoc("""
        Test that multiple services without explicit `@client` create separate root clients.
        This operation should be accessible under `ServiceBClient` > `Operations`.
      
        Expected path: /service/multiple-services/service-b/b-test
        Expected query parameter: api-version=bv2
        Expected 204 response.
      """)
    @route("b-test")
    opB(@query("api-version") apiVersion: VersionsB): void;
  }

  @clientName("BSubNamespace", "java,csharp")
  namespace SubNamespace {
    @scenario
    @scenarioDoc("""
        Test that sub-namespaces are preserved per service when using multiple services.
        This operation should be accessible under `ServiceBClient` > `SubNamespace`.
      
        Expected path: /service/multiple-services/service-b/b-sub-test
        Expected query parameter: api-version=bv2
        Expected 204 response.
      """)
    @route("b-sub-test")
    op subOpB(@query("api-version") apiVersion: VersionsB): void;
  }
}
