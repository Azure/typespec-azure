namespace Azure.SearchService;

@doc("Base type for data change detection policies.")
model DataChangeDetectionPolicy {
  @doc("Identifies the concrete type of the data change detection policy.")
  `@odata.type`: string;
}

@doc("Base type for data deletion detection policies.")
model DataDeletionDetectionPolicy {
  @doc("Identifies the concrete type of the data deletion detection policy.")
  `@odata.type`: string;
}
