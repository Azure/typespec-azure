import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for client initialization decorator - moving parameters from method to client level")
@scenarioService("/azure/client-generator-core/client-initialization")
namespace Service;

// Common parameter types and models

model NameHeaderParam {
  @header("name")
  name: string;
}

model RegionQueryParam {
  @query
  region: string;
}

model Input {
  name: string;
}

model DefaultnQueryParam {
  @query
  blobName: string;
}

// Nested layer services for first-layer default (no decorator)
@doc("Operations for nested default -> individually")
@route("/nested-default-individually")
interface NestedDefaultIndividuallyWithPath {
  @route("/{blobName}/with-query")
  @get
  withQuery(@path blobName: string, @query format?: string): void;

  @route("/{blobName}/get-standalone")
  @get
  getStandalone(@path blobName: string): BlobProperties;

  @route("/{blobName}")
  @delete
  deleteStandalone(@path blobName: string): void;
}

// Nested layer services for first-layer default (no decorator) - Query variant
@doc("Operations for nested default -> individually with query parameters")
@route("/nested-default-individually-query")
interface NestedDefaultIndividuallyWithQuery {
  @route("/with-query")
  @get
  withQuery(...DefaultnQueryParam): void;

  @route("/get-standalone")
  @get
  getStandalone(...DefaultnQueryParam): BlobProperties;

  @route("/delete-resource")
  @delete
  deleteStandalone(...DefaultnQueryParam): void;
}

// Nested layer services for default -> header parameters
@doc("Operations for nested default -> individually header parameters")
@route("/nested-default-individually-header")
interface NestedDefaultIndividuallyHeader {
  @route("/with-query")
  @get
  withQuery(...NameHeaderParam, @query format?: string): void;

  @route("/get-standalone")
  @get
  getStandalone(...NameHeaderParam): void;

  @route("/delete-standalone")
  @delete
  deleteStandalone(...NameHeaderParam): void;
}

// Nested layer services for default -> multiple parameters
@doc("Operations for nested default -> individually multiple parameters")
@route("/nested-default-individually-multiple")
interface NestedDefaultIndividuallyMultiple {
  @route("/with-query")
  @get
  withQuery(...NameHeaderParam, ...RegionQueryParam, @query format?: string): void;

  @route("/get-standalone")
  @get
  getStandalone(...NameHeaderParam, ...RegionQueryParam): void;

  @route("/delete-standalone")
  @delete
  deleteStandalone(...NameHeaderParam, ...RegionQueryParam): void;
}

// Nested layer services for default -> mixed parameters
@doc("Operations for nested default -> individually mixed parameters")
@route("/nested-default-individually-mixed")
interface NestedDefaultIndividuallyMixed {
  @route("/with-query")
  @get
  withQuery(...NameHeaderParam, ...RegionQueryParam, @query format?: string): void;

  @route("/get-standalone")
  @get
  getStandalone(...NameHeaderParam, ...RegionQueryParam): void;

  @route("/delete-standalone")
  @delete
  deleteStandalone(...NameHeaderParam, ...RegionQueryParam): void;
}

@doc("Properties of a blob")
model BlobProperties {
  name: string;
  size: int64;
  contentType: string;
  createdOn: utcDateTime;
}
