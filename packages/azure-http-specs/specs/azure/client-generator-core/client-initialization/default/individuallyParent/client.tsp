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
  name: "IndividuallyParentClient",
  service: Service,
})
namespace IndividuallyParentClient {
  // Scenario 6: Default -> Individually and Parent initialization with path parameter
  @scenarioDoc("""
    Client for testing default -> individually and parent nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client uses both individually and parent initialization behavior.
    
    Parameters elevated to client level:
    - resourceName: "test-resource" (path parameter)
    
    Expected client usage:
    ```ts
    // via IndividuallyParentClient (individually | parent initialization)
    const client = new IndividuallyParentClient.getIndividuallyParentNestedWithPathClient({
      resourceName: "test-resource"
    });
    
    // directly (individually initialized)
    const client = new IndividuallyParentNestedWithPathClient({
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
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually | global.Azure.ClientGenerator.Core.InitializedBy.parent,
  })
  @route("/nested-default-individually-parent")
  interface IndividuallyParentNestedWithPathClient {
    withQuery is Service.NestedDefaultIndividuallyParentWithPath.withQuery;
    getStandalone is Service.NestedDefaultIndividuallyParentWithPath.getStandalone;
    deleteStandalone is Service.NestedDefaultIndividuallyParentWithPath.deleteStandalone;
  }

  // Scenario 7: Default -> Individually and Parent initialization with query parameter
  @scenarioDoc("""
    Client for testing default -> individually and parent nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client uses both individually and parent initialization behavior.
    
    Parameters elevated to client level:
    - blobName: "test-blob" (query parameter)
    
    Expected client usage:
    ```ts
    // via IndividuallyParentClient (individually | parent initialization)
    const client = new IndividuallyParentClient.getIndividuallyParentNestedWithQueryClient({
      blobName: "test-blob"
    });
    
    // directly (individually initialized)
    const client = new IndividuallyParentNestedWithQueryClient({
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
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually | global.Azure.ClientGenerator.Core.InitializedBy.parent,
  })
  @route("/nested-default-individually-parent-query")
  interface IndividuallyParentNestedWithQueryClient {
    withQuery is Service.NestedDefaultIndividuallyParentWithQuery.withQuery;
    getStandalone is Service.NestedDefaultIndividuallyParentWithQuery.getStandalone;
    deleteStandalone is Service.NestedDefaultIndividuallyParentWithQuery.deleteStandalone;
  }

  // Scenario 8: Default -> Individually and Parent initialization with Header parameter
  @scenarioDoc("""
    Client for testing default -> individually and parent header parameter nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client moves header parameters to client level and uses both individually and parent initialization.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    
    Expected client usage:
    ```ts
    // via IndividuallyParentClient (individually | parent initialization)
    const client = new IndividuallyParentClient.getIndividuallyParentNestedWithHeaderClient({
      name: "test-name-value"
    });
    
    // directly (individually initialized)
    const client = new IndividuallyParentNestedWithHeaderClient({
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
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually | global.Azure.ClientGenerator.Core.InitializedBy.parent,
  })
  @route("/nested-default-individually-parent-header")
  interface IndividuallyParentNestedWithHeaderClient {
    withQuery is Service.NestedDefaultIndividuallyParentHeader.withQuery;
    getStandalone is Service.NestedDefaultIndividuallyParentHeader.getStandalone;
    deleteStandalone is Service.NestedDefaultIndividuallyParentHeader.deleteStandalone;
  }

  // Scenario 15: Default -> Individually and Parent Multiple parameters client
  @scenarioDoc("""
    Client for testing default -> individually and parent multiple parameters nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client moves multiple parameters (header and query) to client level with both individually and parent initialization.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    - region: "us-west" (query parameter)
    
    Expected client usage:
    ```ts
    // via IndividuallyParentClient (individually | parent initialization)
    const client = new IndividuallyParentClient.getIndividuallyParentNestedWithMultipleClient({
      name: "test-name-value",
      region: "us-west"
    });
    
    // directly (individually initialized)
    const client = new IndividuallyParentNestedWithMultipleClient({
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
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually | global.Azure.ClientGenerator.Core.InitializedBy.parent,
  })
  @route("/nested-default-individually-parent-multiple")
  interface IndividuallyParentNestedWithMultipleClient {
    withQuery is Service.NestedDefaultIndividuallyParentMultiple.withQuery;
    getStandalone is Service.NestedDefaultIndividuallyParentMultiple.getStandalone;
    deleteStandalone is Service.NestedDefaultIndividuallyParentMultiple.deleteStandalone;
  }

  // Scenario 16: Default -> Individually and Parent Mixed parameters client
  @scenarioDoc("""
    Client for testing default -> individually and parent mixed parameters nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client moves some parameters to client level while keeping others at method level with both individually and parent initialization.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    
    Parameters remaining at method level:
    - region: "us-west" (query parameter)
    
    Expected client usage:
    ```ts
    // via IndividuallyParentClient (individually | parent initialization)
    const client = new IndividuallyParentClient.getIndividuallyParentNestedWithMixedClient({
      name: "test-name-value"
    });
    
    // directly (individually initialized)
    const client = new IndividuallyParentNestedWithMixedClient({
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
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually | global.Azure.ClientGenerator.Core.InitializedBy.parent,
  })
  @route("/nested-default-individually-parent-mixed")
  interface IndividuallyParentNestedWithMixedClient {
    withQuery is Service.NestedDefaultIndividuallyParentMixed.withQuery;
    getStandalone is Service.NestedDefaultIndividuallyParentMixed.getStandalone;
    deleteStandalone is Service.NestedDefaultIndividuallyParentMixed.deleteStandalone;
  }
}
