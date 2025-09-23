import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/spector";
import "@typespec/http";

using Spector;
using Http;

@route("/azure/client-generator-core/client-initialization")
namespace _Specs_.Azure.ClientGeneratorCore.ClientInitialization;

@@global.Azure.ClientGenerator.Core.clientNamespace(_Specs_.Azure.ClientGeneratorCore.ClientInitialization,
  "azure.clientgenerator.core.clientinitialization",
  "java"
);
@@global.Azure.ClientGenerator.Core.clientNamespace(Service,
  "azure.clientgenerator.core.clientinitialization",
  "java"
);

model HeaderParamClientOptions {
  @doc("The name of the client. This parameter is used as a header in all operations.")
  name: string;
}

model MultipleParamsClientOptions {
  @doc("The name of the client. This parameter is used as a header in all operations.")
  name: string;

  @doc("The region to use for all operations. This parameter is used as a query parameter.")
  region: string;
}

model MixedParamsClientOptions {
  @doc("The name of the client. This parameter is used as a header in all operations.")
  name: string;
}

model PathParamClientOptions {
  @doc("The name of the blob. This parameter is used as a path parameter in all operations.")
  blobName: string;
}

model ParamAliasClientOptions {
  @doc("Blob name for the client.")
  @global.Azure.ClientGenerator.Core.paramAlias("blob")
  blobName: string;
}

// Models for initialization scenarios
model DefaultQueryParamClientOptions {
  @doc("The name of the resource. This parameter is used as a path parameter in all operations.")
  blobName: string;
}

// Scenario 1: Header parameter moved to client level
@scenarioDoc("""
  Client for testing header parameter moved to client level.
  
  Parameters elevated to client level:
  - name: "test-name-value" (header parameter)
  
  Expected client usage:
  ```ts
  const client = new HeaderParamClient({
    name: "test-name-value"
  });
  
  client.withQuery(id: "test-id");  // No need to pass name here
  client.withBody({ name: "test-name" });  // No need to pass name here
  ```
  """)
@scenario
@doc("Client for testing header parameter moved to client level.")
@global.Azure.ClientGenerator.Core.client({
  name: "HeaderParamClient",
  service: Service,
})
@global.Azure.ClientGenerator.Core.clientInitialization(HeaderParamClientOptions)
@route("/header-param")
interface HeaderParam {
  withQuery is Service.HeaderParam.withQuery;
  withBody is Service.HeaderParam.withBody;
}

// Scenario 2: Multiple parameters (header and query) moved to client level
@scenarioDoc("""
  Client for testing multiple parameters (header and query) moved to client level.
  
  Parameters elevated to client level:
  - name: "test-name-value" (header parameter)
  - region: "us-west" (query parameter)
  
  Expected client usage:
  ```ts
  const client = new MultipleParamsClient({
    name: "test-name-value",
    region: "us-west"
  });
  
  client.withQuery(id: "test-id");  // No need to pass name or region here
  client.withBody({ name: "test-name" });  // No need to pass name or region here
  ```
  """)
@scenario
@global.Azure.ClientGenerator.Core.client({
  name: "MultipleParamsClient",
  service: Service,
})
@global.Azure.ClientGenerator.Core.clientInitialization(MultipleParamsClientOptions)
@route("/multiple-params")
interface MultipleParams {
  withQuery is Service.MultipleParams.withQuery;
  withBody is Service.MultipleParams.withBody;
}

// Scenario 3: Mix of client-level and method-level parameters
@scenarioDoc("""
    Client for testing a mix of client-level and method-level parameters.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    
    Parameters remaining at method level:
    - region: "us-west" (query parameter)
    
    Expected client usage:
    ```ts
    const client = new MixedParamsClient({
      name: "test-name-value"
    });
    
    client.withQuery(region: "us-west", id: "test-id");  // region stays as method param
    client.withBody( region: "us-west", body: { name: "test-name" });  // region stays as method param
    ```
  """)
@scenario
@global.Azure.ClientGenerator.Core.client({
  name: "MixedParamsClient",
  service: Service,
})
@global.Azure.ClientGenerator.Core.clientInitialization(MixedParamsClientOptions)
@route("/mixed-params")
interface MixedParams {
  withQuery is Service.MixedParams.withQuery;
  withBody is Service.MixedParams.withBody;
}

// Scenario 4: Path parameter moved to client level
@scenarioDoc("""
  Client for testing a path parameter (blobName) moved to client level.
  
  Parameters elevated to client level:
  - blobName: "sample-blob" (path parameter)
  
  Expected client usage:
  ```ts
  const client = new PathParamClient({
    blobName: "sample-blob"
  });
  
  // No need to pass blobName to any operations
  client.withQuery(format: "text");  
  client.getStandalone();
  client.deleteStandalone();
  ```
  """)
@scenario
@global.Azure.ClientGenerator.Core.client({
  name: "PathParamClient",
  service: Service,
})
@global.Azure.ClientGenerator.Core.clientInitialization(PathParamClientOptions)
@route("/path")
interface PathParam {
  withQuery is Service.PathParam.withQuery;
  getStandalone is Service.PathParam.getStandalone;
  deleteStandalone is Service.PathParam.deleteStandalone;
}

// Scenario 5: Parameter aliases for better client API names
@scenarioDoc("""
  Client for testing the @paramAlias decorator for renaming parameters in client code.
  
  Parameters elevated to client level:
  - blobName: "sample-blob" (path parameter)
  
  Expected client usage:
  ```ts
  // Elevated to client level via alias
  client.withAliasedName();
  
  // Elevated to client level via original name
  client.withOriginalName();
  ```
  """)
@scenario
@global.Azure.ClientGenerator.Core.clientInitialization(ParamAliasClientOptions)
@global.Azure.ClientGenerator.Core.client({
  name: "ParamAliasClient",
  service: Service,
})
@route("/param-alias")
interface ParamAlias {
  withAliasedName is Service.ParamAlias.withAliasedName;
  withOriginalName is Service.ParamAlias.withOriginalName;
}

@global.Azure.ClientGenerator.Core.client({
  name: "DefaultParentClient",
  service: Service,
})
namespace DefaultParentClient {
  // Scenario 6: Default -> Default initialization with path parameter
  @scenarioDoc("""
    Client for testing default -> default nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client also uses default initialization behavior.
    
    Parameters elevated to client level:
    - resourceName: "test-resource" (path parameter)
    
    Expected client usage:
    ```ts
    // via DefaultParentClient
    const client = new DefaultParentClient.getDefaultNestedClient({
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
  })
  @route("/nested-default-default")
  interface DefaultNestedWithPathClient {
    withQuery is Service.NestedDefaultDefaultWithPath.withQuery;
    getStandalone is Service.NestedDefaultDefaultWithPath.getStandalone;
    deleteStandalone is Service.NestedDefaultDefaultWithPath.deleteStandalone;
  }

  // Scenario 7: Default -> Default initialization with query parameter
  @scenarioDoc("""
    Client for testing default -> default nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client also uses default initialization behavior.
    
    Parameters elevated to client level:
    - resourceName: "test-resource" (path parameter)
    
    Expected client usage:
    ```ts
    // via DefaultParentClient
    const client = new DefaultParentClient.getDefaultNestedClient({
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
    parameters: DefaultQueryParamClientOptions,
  })
  @route("/nested-default-default")
  interface DefaultNestedWithQueryClient {
    withQuery is Service.NestedDefaultDefaultWithQuery.withQuery;
    getStandalone is Service.NestedDefaultDefaultWithQuery.getStandalone;
    deleteStandalone is Service.NestedDefaultDefaultWithQuery.deleteStandalone;
  }

  // Scenario 8: Default -> Default initialization with Header parameter
  @scenarioDoc("""
    Client for testing default -> header parameter nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client moves header parameters to client level.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    
    Expected client usage:
    ```ts
    // via DefaultParentClient
    const client = new DefaultParentClient.getHeaderNestedClient({
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
  })
  @route("/nested-default-header")
  interface DefaultNestedWithHeaderClient {
    withQuery is Service.NestedDefaultHeader.withQuery;
    getStandalone is Service.NestedDefaultHeader.getStandalone;
    deleteStandalone is Service.NestedDefaultHeader.deleteStandalone;
  }

  // Scenario 15: Default -> Multiple parameters client
  @scenarioDoc("""
    Client for testing default -> multiple parameters nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client moves multiple parameters (header and query) to client level.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    - region: "us-west" (query parameter)
    
    Expected client usage:
    ```ts
    // via DefaultParentClient
    const client = new DefaultParentClient.getMultipleNestedClient({
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
  })
  @route("/nested-default-multiple")
  interface DefaultNestedWithMultipleClient {
    withQuery is Service.NestedDefaultMultiple.withQuery;
    getStandalone is Service.NestedDefaultMultiple.getStandalone;
    deleteStandalone is Service.NestedDefaultMultiple.deleteStandalone;
  }

  // Scenario 16: Default -> Mixed parameters client
  @scenarioDoc("""
    Client for testing default -> mixed parameters nested initialization.
    
    The parent client uses default initialization behavior,
    and the child client moves some parameters to client level while keeping others at method level.
    
    Parameters elevated to client level:
    - name: "test-name-value" (header parameter)
    
    Parameters remaining at method level:
    - region: "us-west" (query parameter)
    
    Expected client usage:
    ```ts
    // via DefaultParentClient
    const client = new DefaultParentClient.getMixedNestedClient({
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
  })
  @route("/nested-default-mixed")
  interface DefaultNestedWithMixedClient {
    withQuery is Service.NestedDefaultMixed.withQuery;
    getStandalone is Service.NestedDefaultMixed.getStandalone;
    deleteStandalone is Service.NestedDefaultMixed.deleteStandalone;
  }
}
