using Http;
using OpenAPI;

namespace AppConfig;

@friendlyName("Paged{name}", Resource)
@doc("Paged collection of {name} items", Resource)
model Page<Resource extends {}> {
  @pageItems
  @doc("The {name} items on this page", Resource)
  items: Resource[];

  @nextLink
  @doc("The link to the next page of items")
  nextLink?: string;
}

model ETagHeader {
  @header eTag: string;
}

model ETagHeaders {
  @header ifMatch: string;
  @header ifNoneMatch: string;
}

model LastModifiedHeader {
  @header lastModified: plainDate;
}

model AcceptDatetimeHeader {
  @header acceptDatetime: plainDate;
}

model SyncTokenHeader {
  @doc("Used to guarantee real-time consistency between requests.")
  @header
  syncToken?: string;
}

model ApiVersion {
  @query apiVersion: string;
}

@doc("Azure App Configuration error object.")
@error
model Error {
  @header
  contentType: "application/problem+json";

  @doc("The type of the error")
  type: string;

  @doc("A brief summary of the error.")
  title: string;

  @doc("The name of the parameter that resulted in the error.")
  name: string;

  @doc("A detailed description of the error.")
  detail: string;

  @doc("The HTTP status code that the error maps to.")
  statusCode: int32;
}

model Label {
  name: string;
}

alias KeyValueHeaders = SyncTokenHeader & LastModifiedHeader & ETagHeader;

model Key {
  key: string;
}

model Value {
  label?: string;
  tags: Record<string>;
  locked: boolean;
}

model KeyValue {
  ...Key;
  ...Value;
}

union KeyField {
  "key",
  "label",
  "content_type",
  "value",
  "last_modified",
  "tags",
  string,
}

union LabelField {
  "name",
  string,
}
