export const scenarioTiers = {
  default: "Core",
  tiers: {
    Core: [], // Since default is "core", this tier will be used for all scenarios that don't specify a different tier. Empty will catch all scenarios not explicitly categorized in other tiers.
    Backlog: [
      // Streaming JSONL — skipped by Go and JS; not a priority for Azure services yet
      "Streaming_Jsonl_Basic_send",
      "Streaming_Jsonl_Basic_receive",

      // Routes: Path Parameter Expansion (RFC 6570 advanced URI templating) — skipped by Go, Java, Python;
      // Go tracks in https://github.com/Azure/autorest.go/issues/1730; rarely used in Azure services
      "Routes_PathParameters_SimpleExpansion_Standard_primitive",
      "Routes_PathParameters_SimpleExpansion_Standard_array",
      "Routes_PathParameters_SimpleExpansion_Standard_record",
      "Routes_PathParameters_SimpleExpansion_Explode_primitive",
      "Routes_PathParameters_SimpleExpansion_Explode_array",
      "Routes_PathParameters_SimpleExpansion_Explode_record",
      "Routes_PathParameters_PathExpansion_Standard_primitive",
      "Routes_PathParameters_PathExpansion_Standard_array",
      "Routes_PathParameters_PathExpansion_Standard_record",
      "Routes_PathParameters_PathExpansion_Explode_primitive",
      "Routes_PathParameters_PathExpansion_Explode_array",
      "Routes_PathParameters_PathExpansion_Explode_record",
      "Routes_PathParameters_LabelExpansion_Standard_primitive",
      "Routes_PathParameters_LabelExpansion_Standard_array",
      "Routes_PathParameters_LabelExpansion_Standard_record",
      "Routes_PathParameters_LabelExpansion_Explode_primitive",
      "Routes_PathParameters_LabelExpansion_Explode_array",
      "Routes_PathParameters_LabelExpansion_Explode_record",
      "Routes_PathParameters_MatrixExpansion_Standard_primitive",
      "Routes_PathParameters_MatrixExpansion_Standard_array",
      "Routes_PathParameters_MatrixExpansion_Standard_record",
      "Routes_PathParameters_MatrixExpansion_Explode_primitive",
      "Routes_PathParameters_MatrixExpansion_Explode_array",
      "Routes_PathParameters_MatrixExpansion_Explode_record",

      // Routes: Query Parameter Expansion with record — skipped by Go, Java, Python;
      // advanced URI template expansion not required by current Azure services
      "Routes_QueryParameters_QueryExpansion_Standard_record",
      "Routes_QueryParameters_QueryExpansion_Explode_record",
      "Routes_QueryParameters_QueryContinuation_Standard_record",
      "Routes_QueryParameters_QueryContinuation_Explode_record",

      // Routes: Query Parameter Expansion with array — skipped by Go, Python;
      // part of the broader URI template expansion feature gap
      "Routes_QueryParameters_QueryExpansion_Standard_array",
      "Routes_QueryParameters_QueryExpansion_Explode_array",
      "Routes_QueryParameters_QueryContinuation_Standard_array",
      "Routes_QueryParameters_QueryContinuation_Explode_array",

      // Type Union Discriminated — skipped by Go, Java, Python;
      // advanced discriminated union patterns (envelope/no-envelope) not broadly needed yet;
      // Go requires full union support first
      "Type_Union_Discriminated_Envelope_Object_Default_get",
      "Type_Union_Discriminated_Envelope_Object_Default_put",
      "Type_Union_Discriminated_Envelope_Object_CustomProperties_get",
      "Type_Union_Discriminated_Envelope_Object_CustomProperties_put",
      "Type_Union_Discriminated_NoEnvelope_Default_get",
      "Type_Union_Discriminated_NoEnvelope_Default_put",
      "Type_Union_Discriminated_NoEnvelope_CustomDiscriminator_get",
      "Type_Union_Discriminated_NoEnvelope_CustomDiscriminator_put",

      // Pageable: ContinuationToken — skipped by Go, Java, JS (Python skips 1 of 6);
      // custom continuation-token pagination; no ask in Azure yet (JS);
      // Go tracks in https://github.com/Azure/autorest.go/issues/1494
      "Payload_Pageable_ServerDrivenPagination_ContinuationToken_requestHeaderNestedResponseBody",
      "Payload_Pageable_ServerDrivenPagination_ContinuationToken_requestHeaderResponseBody",
      "Payload_Pageable_ServerDrivenPagination_ContinuationToken_requestHeaderResponseHeader",
      "Payload_Pageable_ServerDrivenPagination_ContinuationToken_requestQueryNestedResponseBody",
      "Payload_Pageable_ServerDrivenPagination_ContinuationToken_requestQueryResponseBody",
      "Payload_Pageable_ServerDrivenPagination_ContinuationToken_requestQueryResponseHeader",

      // Pageable: AlternateInitialVerb — newly added (microsoft/typespec#9966);
      // POST-based initial pagination request; no language has implemented this yet;
      // fits the same pageable backlog pattern as ContinuationToken/link/PageSize
      "Payload_Pageable_ServerDrivenPagination_AlternateInitialVerb_post",

      // Azure AlternateType ExternalType — skipped by Go, Python, JS;
      // @alternateType decorator for external types; no ask in Azure yet (JS);
      // Go does not support external type mapping
      "Azure_ClientGenerator_Core_AlternateType_ExternalType_getModel",
      "Azure_ClientGenerator_Core_AlternateType_ExternalType_putModel",
      "Azure_ClientGenerator_Core_AlternateType_ExternalType_getProperty",
      "Azure_ClientGenerator_Core_AlternateType_ExternalType_putProperty",

      // Azure ClientDefaultValue — skipped by Go, Java;
      // @clientDefaultValue decorator not supported by either emitter
      "Azure_ClientGenerator_Core_ClientDefaultValue_getHeaderParameter",
      "Azure_ClientGenerator_Core_ClientDefaultValue_getOperationParameter",
      "Azure_ClientGenerator_Core_ClientDefaultValue_getPathParameter",
      "Azure_ClientGenerator_Core_ClientDefaultValue_putModelProperty",

      // Authentication Noauth Union — skipped by Go, JS;
      // union-based auth selection; requires union support (Go); no ask in Azure yet (JS)
      "Authentication_Noauth_Union_validNoAuth",
      "Authentication_Noauth_Union_validToken",

      // Pageable: Link-based pagination — skipped by Java, JS;
      // nextLink-based pagination patterns; no ask in Azure yet (JS)
      "Payload_Pageable_ServerDrivenPagination_link",
      "Payload_Pageable_ServerDrivenPagination_linkString",
      "Payload_Pageable_ServerDrivenPagination_nestedLink",

      // Pageable: PageSize — skipped by Java, JS;
      // page-size pagination; no ask in Azure yet (JS)
      "Payload_Pageable_PageSize_listWithPageSize",
      "Payload_Pageable_PageSize_listWithoutContinuation",

      // Pageable: XML Pagination — skipped by Go, Java;
      // XML-based pagination support incomplete in both emitters
      "Payload_Pageable_XmlPagination_listWithContinuation",
      "Payload_Pageable_XmlPagination_listWithNextLink",

      // Response StatusCodeRange — skipped by Go, JS;
      // status code range error handling; no ask in Azure yet (JS);
      // Go tracks in https://github.com/Azure/autorest.go/issues/1606
      "Response_StatusCodeRange_errorResponseStatusCodeInRange",
      "Response_StatusCodeRange_errorResponseStatusCode404",

      // Type File Body — skipped by Python, JS;
      // file upload/download with specific content types; no real case received (JS)
      "Type_File_Body_uploadFileSpecificContentType",
      "Type_File_Body_uploadFileJsonContentType",
      "Type_File_Body_downloadFileJsonContentType",
      "Type_File_Body_downloadFileSpecificContentType",
      "Type_File_Body_uploadFileMultipleContentTypes",
      "Type_File_Body_downloadFileMultipleContentTypes",
      "Type_File_Body_uploadFileDefaultContentType",
      "Type_File_Body_downloadFileDefaultContentType",

      // Encode Duration float*LargerUnit — skipped by Python, JS;
      // JS fundamentally cannot distinguish 1.0 from 1 (float vs int);
      // Python does not have urgent demand for these encoding variants
      "Encode_Duration_Query_floatSecondsLargerUnit",
      "Encode_Duration_Query_floatMillisecondsLargerUnit",
      "Encode_Duration_Header_floatSecondsLargerUnit",
      "Encode_Duration_Header_floatMillisecondsLargerUnit",

      // Payload XML with namespace — XML namespace support is not required for all languages
      "Payload_Xml_ModelWithNamespaceValue_*",
      "Payload_Xml_ModelWithNamespaceOnPropertiesValue_*",
    ],
  },
};
