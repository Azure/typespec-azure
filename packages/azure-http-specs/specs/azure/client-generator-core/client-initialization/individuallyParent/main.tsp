import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for client initialization decorator - moving parameters from method to client level")
@scenarioService("/azure/client-generator-core/client-initialization/individually-parent")
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

model DefaultQueryParam {
  @query
  blobName: string;
}

// Nested layer services for first-layer default (no decorator)
@doc("Operations for nested default -> individually and parent")
@route("/nested-default-individually-parent")
interface NestedDefaultIndividuallyParentWithPath {
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
@doc("Operations for nested default -> individually and parent with query parameters")
@route("/nested-default-individually-parent-query")
interface NestedDefaultIndividuallyParentWithQuery {
  @route("/with-query")
  @get
  withQuery(...DefaultQueryParam, @query format?: string): void;

  @route("/get-standalone")
  @get
  getStandalone(...DefaultQueryParam): BlobProperties;

  @route("/delete-resource")
  @delete
  deleteStandalone(...DefaultQueryParam): void;
}

// Nested layer services for default -> header parameters
@doc("Operations for nested default -> individually and parent header parameters")
@route("/nested-default-individually-parent-header")
interface NestedDefaultIndividuallyParentHeader {
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
@doc("Operations for nested default -> individually and parent multiple parameters")
@route("/nested-default-individually-parent-multiple")
interface NestedDefaultIndividuallyParentMultiple {
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
@doc("Operations for nested default -> individually and parent mixed parameters")
@route("/nested-default-individually-parent-mixed")
interface NestedDefaultIndividuallyParentMixed {
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

// Nested layer services for param alias
@doc("Operations for nested default -> individually and parent param alias")
@route("/nested-default-individually-parent-param-alias")
interface NestedDefaultIndividuallyParentParamAlias {
  @route("/{blob}/with-aliased-name")
  @get
  withAliasedName(
    @path
    blob: string,
  ): void;

  @route("/{blobName}/with-original-name")
  @get
  withOriginalName(
    @path
    blobName: string,
  ): void;
}

@doc("Properties of a blob")
model BlobProperties {
  name: string;
  size: int64;
  contentType: string;
  createdOn: utcDateTime;
}
