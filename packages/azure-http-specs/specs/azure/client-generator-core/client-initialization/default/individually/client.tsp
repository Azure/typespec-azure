import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/spector";
import "@typespec/http";

using Spector;
using Http;

@route("/azure/client-generator-core/client-initialization")
namespace _Specs_.Azure.ClientGeneratorCore.ClientInitialization;

using Service;

// Reusable option types for client initialization
model PathParamClientOptions {
  @doc("The blob name to use for operations")
  blobName: string;
}

model DefaultQueryParamClientOptions {
  @doc("The blob name to use for operations")
  blobName: string;
}

model HeaderParamClientOptions {
  @doc("The name to use for operations")
  name: string;
}

model MultipleParamsClientOptions {
  @doc("The name to use for operations")
  name: string;

  @doc("The region to use for operations")
  region: string;
}

model MixedParamsClientOptions {
  @doc("The name to use for operations")
  name: string;
}

@global.Azure.ClientGenerator.Core.client({
  name: "DefaultParentClient",
  service: Service,
})
namespace DefaultParentClient {
  // Scenario 6: Default -> Individually initialization with path parameter
  @scenarioDoc("""
    Client for testing default -> individually nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client uses individually initialization behavior.
    
    Parameters elevated to client level:
    - resourceName: "test-resource" (path parameter)
    
    Expected client usage:
    ```ts
    // directly (individually initialized)
    const client = new DefaultNestedWithPathClient({
      resourceName: "test-resource"
    });
    
    // Operations don't need resourceName parameter
    client.withQuery(format: "text");
    client.getStandalone();
    client.deleteStandalone();
    ```
    """)
  @scenario
  @global.Azure.ClientGenerator.Core.operationGroup
  @global.Azure.ClientGenerator.Core.clientInitialization({
    parameters: PathParamClientOptions,
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually,
  })
  @route("/nested-default-individually")
  interface IndividuallyNestedWithPathClient {
    withQuery is Service.NestedDefaultIndividuallyWithPath.withQuery;
    getStandalone is Service.NestedDefaultIndividuallyWithPath.getStandalone;
    deleteStandalone is Service.NestedDefaultIndividuallyWithPath.deleteStandalone;
  }

  // Scenario 7: Default -> Individually initialization with query parameter
  @scenarioDoc("""
    Client for testing default -> individually nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client uses individually initialization behavior.
    
    Parameters elevated to client level:
    - blobName: "test-blob" (query parameter)
    
    Expected client usage:
    ```ts
    // directly (individually initialized)
    const client = new DefaultNestedWithQueryClient({
      blobName: "test-blob"
    });
    
    // Operations don't need blobName parameter
    client.withQuery();
    client.getStandalone();
    client.deleteStandalone();
    ```
    """)
  @scenario
  @global.Azure.ClientGenerator.Core.operationGroup
  @global.Azure.ClientGenerator.Core.clientInitialization({
    parameters: DefaultQueryParamClientOptions,
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually,
  })
  @route("/nested-default-individually-query")
  interface IndividuallyNestedWithQueryClient {
    withQuery is Service.NestedDefaultIndividuallyWithQuery.withQuery;
    getStandalone is Service.NestedDefaultIndividuallyWithQuery.getStandalone;
    deleteStandalone is Service.NestedDefaultIndividuallyWithQuery.deleteStandalone;
  }

  // Scenario 8: Default -> Individually initialization with Header parameter
  @scenarioDoc("""
    Client for testing default -> individually header parameter nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client moves header parameters to client level and uses individually initialization.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    
    Expected client usage:
    ```ts
    // directly (individually initialized)
    const client = new DefaultNestedWithHeaderClient({
      name: "test-name-value"
    });
    
    // Operations don't need name header parameter
    client.withQuery(format: "text");
    client.getStandalone();
    client.deleteStandalone();
    ```
    """)
  @scenario
  @global.Azure.ClientGenerator.Core.operationGroup
  @global.Azure.ClientGenerator.Core.clientInitialization({
    parameters: HeaderParamClientOptions,
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually,
  })
  @route("/nested-default-individually-header")
  interface IndividuallyNestedWithHeaderClient {
    withQuery is Service.NestedDefaultIndividuallyHeader.withQuery;
    getStandalone is Service.NestedDefaultIndividuallyHeader.getStandalone;
    deleteStandalone is Service.NestedDefaultIndividuallyHeader.deleteStandalone;
  }

  // Scenario 15: Default -> Individually Multiple parameters client
  @scenarioDoc("""
    Client for testing default -> individually multiple parameters nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client moves multiple parameters (header and query) to client level with individually initialization.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    - region: "us-west" (query parameter)
    
    Expected client usage:
    ```ts
    // directly (individually initialized)
    const client = new DefaultNestedWithMultipleClient({
      name: "test-name-value",
      region: "us-west"
    });
    
    // Operations don't need name or region parameters
    client.withQuery(format: "text");
    client.getStandalone();
    client.deleteStandalone();
    ```
    """)
  @scenario
  @global.Azure.ClientGenerator.Core.operationGroup
  @global.Azure.ClientGenerator.Core.clientInitialization({
    parameters: MultipleParamsClientOptions,
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually,
  })
  @route("/nested-default-individually-multiple")
  interface IndividuallyNestedWithMultipleClient {
    withQuery is Service.NestedDefaultIndividuallyMultiple.withQuery;
    getStandalone is Service.NestedDefaultIndividuallyMultiple.getStandalone;
    deleteStandalone is Service.NestedDefaultIndividuallyMultiple.deleteStandalone;
  }

  // Scenario 16: Default -> Individually Mixed parameters client
  @scenarioDoc("""
    Client for testing default -> individually mixed parameters nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client moves some parameters to client level while keeping others at method level with individually initialization.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    
    Parameters remaining at method level:
    - region: "us-west" (query parameter)
    
    Expected client usage:
    ```ts
    // directly (individually initialized)
    const client = new DefaultNestedWithMixedClient({
      name: "test-name-value"
    });
    
    // Operations still need region parameter
    client.withQuery(region: "us-west", format: "text");
    client.getStandalone(region: "us-west");
    client.deleteStandalone(region: "us-west");
    ```
    """)
  @scenario
  @global.Azure.ClientGenerator.Core.operationGroup
  @global.Azure.ClientGenerator.Core.clientInitialization({
    parameters: MixedParamsClientOptions,
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually,
  })
  @route("/nested-default-individually-mixed")
  interface IndividuallyNestedWithMixedClient {
    withQuery is Service.NestedDefaultIndividuallyMixed.withQuery;
    getStandalone is Service.NestedDefaultIndividuallyMixed.getStandalone;
    deleteStandalone is Service.NestedDefaultIndividuallyMixed.deleteStandalone;
  }
}
