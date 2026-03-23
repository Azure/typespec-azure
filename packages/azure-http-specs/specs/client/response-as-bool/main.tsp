import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Azure.ClientGenerator.Core;
using Spector;

/**
 * Describe using `@responseAsBool` to convert HEAD operations into boolean responses
 */
@scenarioService("/client/response-as-bool")
namespace Client.ResponseAsBool;

@scenario
@scenarioDoc("""
  Testing that a HEAD operation decorated with `@responseAsBool` returns `true` when the resource exists (2xx response).
  The generated SDK should return `true` for this operation.
  
  Expected response status: 200
  Expected SDK return value: true
  """)
@responseAsBool
@route("/exists")
@head
op exists(): void;

@scenario
@scenarioDoc("""
  Testing that a HEAD operation decorated with `@responseAsBool` returns `false` when the resource does not exist (404 response).
  The generated SDK should return `false` for this operation instead of raising an error.
  
  Expected response status: 404
  Expected SDK return value: false
  """)
@responseAsBool
@route("/not-exists")
@head
op notExists(): void;
