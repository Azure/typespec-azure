import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using global.Azure.ClientGenerator.Core;
using Spector;

@doc("Test decorator @paramAlias.")
@scenarioService("/azure/client-generator-core/param-alias")
@global.Azure.ClientGenerator.Core.clientNamespace("azure.clientgenerator.core.paramalias", "java")
namespace _Specs_.Azure.ClientGenerator.Core.ParamAlias {
  @scenario
  @scenarioDoc("""
    This scenario tests the @paramAlias decorator with @clientInitialization.
    The 'blob' operation parameter should be elevated to client initialization with the alias 'blobName'.
    Expected path parameter blob="sample"
    Expected response: 200 with body "hello"
    """)
  @route("/download/{blob}")
  @get
  op download(@path blob: string): {
    @statusCode statusCode: 200;
    @body body: bytes;
  };

  namespace Customizations {
    model ClientInitialization {
      @paramAlias("blob")
      blobName: string;
    }
  }

  @@clientInitialization(_Specs_.Azure.ClientGenerator.Core.ParamAlias,
    {
      parameters: Customizations.ClientInitialization,
    }
  );
}
