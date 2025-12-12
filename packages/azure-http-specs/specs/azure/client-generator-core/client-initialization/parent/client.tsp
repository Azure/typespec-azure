import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/spector";
import "@typespec/http";

using Spector;
using Http;

@route("/azure/client-generator-core/client-initialization")
namespace _Specs_.Azure.ClientGenerator.Core.ClientInitialization;

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
  name: "ParentClient",
  service: Service,
})
namespace ParentClient {
  // Scenario 6: Default -> Parent initialization with path parameter
  @scenarioDoc("""
    Client for testing default -> parent nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client uses parent initialization behavior.
    
    Parameters elevated to client level:
    - resourceName: "test-resource" (path parameter)
    
    Expected client usage:
    ```ts
    // via ParentClient (parent initialization)
    const client = new ParentClient.getParentNestedWithPathClient({
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
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.parent,
  })
  @route("/nested-default-parent")
  interface ParentNestedWithPathClient {
    withQuery is Service.NestedDefaultParentWithPath.withQuery;
    getStandalone is Service.NestedDefaultParentWithPath.getStandalone;
    deleteStandalone is Service.NestedDefaultParentWithPath.deleteStandalone;
  }

  // Scenario 7: Default -> Parent initialization with query parameter
  @scenarioDoc("""
    Client for testing default -> parent nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client uses parent initialization behavior.
    
    Parameters elevated to client level:
    - blobName: "test-blob" (query parameter)
    
    Expected client usage:
    ```ts
    // via ParentClient (parent initialization)
    const client = new ParentClient.getParentNestedWithQueryClient({
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
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.parent,
  })
  @route("/nested-default-parent-query")
  interface ParentNestedWithQueryClient {
    withQuery is Service.NestedDefaultParentWithQuery.withQuery;
    getStandalone is Service.NestedDefaultParentWithQuery.getStandalone;
    deleteStandalone is Service.NestedDefaultParentWithQuery.deleteStandalone;
  }

  // Scenario 8: Default -> Parent initialization with Header parameter
  @scenarioDoc("""
    Client for testing default -> parent header parameter nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client moves header parameters to client level and uses parent initialization.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    
    Expected client usage:
    ```ts
    // via ParentClient (parent initialization)
    const client = new ParentClient.getParentNestedWithHeaderClient({
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
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.parent,
  })
  @route("/nested-default-parent-header")
  interface ParentNestedWithHeaderClient {
    withQuery is Service.NestedDefaultParentHeader.withQuery;
    getStandalone is Service.NestedDefaultParentHeader.getStandalone;
    deleteStandalone is Service.NestedDefaultParentHeader.deleteStandalone;
  }

  // Scenario 15: Default -> Parent Multiple parameters client
  @scenarioDoc("""
    Client for testing default -> parent multiple parameters nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client moves multiple parameters (header and query) to client level with parent initialization.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    - region: "us-west" (query parameter)
    
    Expected client usage:
    ```ts
    // via ParentClient (parent initialization)
    const client = new ParentClient.getParentNestedWithMultipleClient({
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
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.parent,
  })
  @route("/nested-default-parent-multiple")
  interface ParentNestedWithMultipleClient {
    withQuery is Service.NestedDefaultParentMultiple.withQuery;
    getStandalone is Service.NestedDefaultParentMultiple.getStandalone;
    deleteStandalone is Service.NestedDefaultParentMultiple.deleteStandalone;
  }

  // Scenario 16: Default -> Parent Mixed parameters client
  @scenarioDoc("""
    Client for testing default -> parent mixed parameters nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client moves some parameters to client level while keeping others at method level with parent initialization.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    
    Parameters remaining at method level:
    - region: "us-west" (query parameter)
    
    Expected client usage:
    ```ts
    // via ParentClient (parent initialization)
    const client = new ParentClient.getParentNestedWithMixedClient({
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
    initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.parent,
  })
  @route("/nested-default-parent-mixed")
  interface ParentNestedWithMixedClient {
    withQuery is Service.NestedDefaultParentMixed.withQuery;
    getStandalone is Service.NestedDefaultParentMixed.getStandalone;
    deleteStandalone is Service.NestedDefaultParentMixed.deleteStandalone;
  }
}
