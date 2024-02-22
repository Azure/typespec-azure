---
title: delete-operation-response-codes
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/delete-operation-response-codes
```

## Synchronous

Synchronous delete operations must have 200, 204, and default responses. They must not have any other responses. 

## Asynchronous

Long-running (LRO) delete operations must have 202, 204, and default responses. They must not have any other responses.
