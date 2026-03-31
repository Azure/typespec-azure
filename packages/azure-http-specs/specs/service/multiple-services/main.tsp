import "@typespec/versioning";
import "@typespec/http";
import "@typespec/spector";

using Versioning;
using Http;
using Spector;

namespace Service.MultipleServices;

/**
 * First service definition in a multiple-services package with versioning.
 * Without explicit @client, this should create a separate root client (ServiceAClient).
 */
@scenarioService("/service/multiple-services/service-a")
@versioned(VersionsA)
namespace ServiceA {
  enum VersionsA {
    av1,
    av2,
  }

  interface Operations {
    @scenario
    @scenarioDoc("""
        Test that multiple services without explicit @client create separate root clients.
        This operation should be accessible under ServiceA > Operations.
      
        Expected path: /service/multiple-services/service-a/aTest
        Expected query parameter: api-version=av2
        Expected 204 response.
      """)
    @route("/aTest")
    opA(@query("api-version") apiVersion: VersionsA): void;
  }

  namespace SubNamespace {
    @scenario
    @scenarioDoc("""
        Test that sub-namespaces are preserved per service when using multiple services.
        This operation should be accessible under ServiceA > SubNamespace.
      
        Expected path: /service/multiple-services/service-a/aSubTest
        Expected query parameter: api-version=av2
        Expected 204 response.
      """)
    @route("/aSubTest")
    op subOpA(@query("api-version") apiVersion: VersionsA): void;
  }
}

/**
 * Second service definition in a multiple-services package with versioning.
 * Without explicit @client, this should create a separate root client (ServiceBClient).
 */
@scenarioService("/service/multiple-services/service-b")
@versioned(VersionsB)
namespace ServiceB {
  enum VersionsB {
    bv1,
    bv2,
  }

  interface Operations {
    @scenario
    @scenarioDoc("""
        Test that multiple services without explicit @client create separate root clients.
        This operation should be accessible under ServiceB > Operations.
      
        Expected path: /service/multiple-services/service-b/bTest
        Expected query parameter: api-version=bv2
        Expected 204 response.
      """)
    @route("/bTest")
    opB(@query("api-version") apiVersion: VersionsB): void;
  }

  namespace SubNamespace {
    @scenario
    @scenarioDoc("""
        Test that sub-namespaces are preserved per service when using multiple services.
        This operation should be accessible under ServiceB > SubNamespace.
      
        Expected path: /service/multiple-services/service-b/bSubTest
        Expected query parameter: api-version=bv2
        Expected 204 response.
      """)
    @route("/bSubTest")
    op subOpB(@query("api-version") apiVersion: VersionsB): void;
  }
}
