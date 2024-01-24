---
jsApi: true
title: "[I] LroMetadata"

---
Information about long-running operations
For standard Lro Patterns, only the 'logicalResult' and 'finalStateVia' will be used.

## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `envelopeResult` | `Model` | The TypeSpec type of the object that contains the final result |
| `finalEnvelopeResult?` | `Model` \| `"void"` | The TypeSpec type of the object that contains the 'finalResult'. |
| `finalResult?` | `Model` \| `"void"` | The model representing important data returned on a success - clients will want to return this model. If undefined,<br /> then clients would want to return nothing. |
| `finalResultPath?` | `string` | The path to the field in the 'finalEnvelopeResult' that contains the 'finalResult'. |
| `finalStateVia` | [`FinalStateValue`](../enumerations/FinalStateValue.md) | An enumeration summarizing how a poller should reach a terminal state |
| `finalStep?` | [`FinalOperationStep`](../type-aliases/FinalOperationStep.md) | If another operation call is required after polling ends to get the results of the operation, a link to that 'final' operation |
| `logicalPath?` | `string` | The path to the field in the status monitor that contains results.  If undefined, then there is no results field in the status monitor |
| `logicalResult` | `Model` | The model representing important data returned on a success - clients will want to return this model |
| `operation` | `Operation` | The operation that was processed |
| `pollingInfo` | [`PollingOperationStep`](PollingOperationStep.md) | Specific information about how to process the status monitor, including the location of status, success, and error fields, and the terminal states for polling |
| `statusMonitorStep?` | [`NextOperationLink`](NextOperationLink.md) \| [`NextOperationReference`](NextOperationReference.md) | Specific information on how to reach the StatusMonitor, this is either instructions for constructing a call to the status monitor operation {NextOperationReference} ,<br />or the response property containing the url that points to the Statue Monitor {NextOperationLink} |
