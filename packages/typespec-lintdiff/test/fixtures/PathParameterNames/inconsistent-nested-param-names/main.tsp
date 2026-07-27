// Test: inconsistent-nested-param-names
// Violation: The same nested segment uses different parameter names.

import "@typespec/http";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.Core;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("A book resource.")
model Book {
  @doc("The displayed title.")
  title: string;
}

interface Books {
  @route("/libraries/{libraryId}/books/{bookName}")
  @doc("Get a library book.")
  @get
  op getLibraryBook(
    @path @doc("The library identifier.") libraryId: string,
    @path @doc("The book name.") bookName: string,
    @query("api-version") @doc("The API version.") apiVersion: string,
  ): Book;

  @route("/authors/{authorId}/books/{bookId}")
  @doc("Get an author's book.")
  @get
  op getAuthorBook(
    @path @doc("The author identifier.") authorId: string,
    @path @doc("The book identifier.") bookId: string,
    @query("api-version") @doc("The API version.") apiVersion: string,
  ): Book;
}
