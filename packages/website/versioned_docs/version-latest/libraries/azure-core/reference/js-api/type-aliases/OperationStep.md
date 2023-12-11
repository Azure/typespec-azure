---
jsApi: true
title: "[T] OperationStep"

---
```ts
type OperationStep: 
  | NextOperationLink
  | NextOperationReference
  | PollingOperationStep
  | FinalOperationLink
  | FinalOperationReference
  | PollingSuccessProperty;
```

Information on how to get to the StatusMonitor
