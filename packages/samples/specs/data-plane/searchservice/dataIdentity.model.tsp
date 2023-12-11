namespace Azure.SearchService;

model SearchIndexerDataIdentity {
  @doc("Identifies the concrete type of the identity.")
  `@odata.type`: string;
}

model SearchIndexerDataNoneIdentity extends SearchIndexerDataIdentity {}
