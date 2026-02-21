---
title: Customizing Long-Running Operations
description: How to customize LRO headers for ARM operations using standard templates
llmstxt: true
---

ARM long-running (asynchronous) operation templates allow you to customize the LRO headers returned
in the initial response, while retaining the correct `finalResult` value that matches the result of
the operation. This is done using the `LroHeaders` template parameter available on all async
operation templates. The headers appear in the `201 Created` response for PUT operations and in the
`202 Accepted` response for PATCH, DELETE, and POST operations.

## LRO Header Types

The `Azure.ResourceManager` library provides the following header models for long-running operations:

| Header Model              | Description                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| `ArmAsyncOperationHeader` | Provides the `Azure-AsyncOperation` header for polling                  |
| `ArmLroLocationHeader`    | Provides the `Location` header for polling                              |
| `ArmCombinedLroHeaders`   | Provides both `Azure-AsyncOperation` and `Location` headers for polling |

Each header model accepts a `FinalResult` parameter that indicates the type of the logical result
of the operation. It is important that this value matches what the operation actually returns.

## CreateOrUpdate (PUT)

The `ArmResourceCreateOrReplaceAsync` and `ArmResourceCreateOrUpdateAsync` templates use
`ArmAsyncOperationHeader` by default with the resource as the final result.

### Default

```typespec
op createOrUpdate is ArmResourceCreateOrReplaceAsync<MyResource>;
```

The default `LroHeaders` for PUT is:

```
ArmAsyncOperationHeader<FinalResult = MyResource> & Azure.Core.Foundations.RetryAfterHeader
```

### Customizing to use a Location header

To use a `Location` header instead of `Azure-AsyncOperation`, override the `LroHeaders` parameter.
Make sure `FinalResult` is set to the resource type so that the final polling result is correct:

```typespec
op createOrUpdate is ArmResourceCreateOrReplaceAsync<
  MyResource,
  LroHeaders = ArmLroLocationHeader<FinalResult = MyResource> &
    Azure.Core.Foundations.RetryAfterHeader
>;
```

### Customizing to use both headers

To return both `Azure-AsyncOperation` and `Location` headers, use `ArmCombinedLroHeaders`. Set
`FinalResult` to the resource type:

```typespec
op createOrUpdate is ArmResourceCreateOrReplaceAsync<
  MyResource,
  LroHeaders = ArmCombinedLroHeaders<FinalResult = MyResource> &
    Azure.Core.Foundations.RetryAfterHeader
>;
```

## Update (PATCH)

The `ArmResourcePatchAsync` and `ArmCustomPatchAsync` templates use `ArmLroLocationHeader` by
default with the resource as the final result.

### Default

```typespec
op update is ArmResourcePatchAsync<MyResource, MyResourceProperties>;
```

The default `LroHeaders` for PATCH is:

```
ArmLroLocationHeader<FinalResult = MyResource> & Azure.Core.Foundations.RetryAfterHeader
```

### Customizing to use an Azure-AsyncOperation header

To use an `Azure-AsyncOperation` header instead of `Location`, override the `LroHeaders` parameter.
Set `FinalResult` to the resource type:

```typespec
op update is ArmResourcePatchAsync<
  MyResource,
  MyResourceProperties,
  LroHeaders = ArmAsyncOperationHeader<FinalResult = MyResource> &
    Azure.Core.Foundations.RetryAfterHeader
>;
```

### Customizing to use both headers

To return both headers, use `ArmCombinedLroHeaders`. Set `FinalResult` to the resource type:

```typespec
op update is ArmResourcePatchAsync<
  MyResource,
  MyResourceProperties,
  LroHeaders = ArmCombinedLroHeaders<FinalResult = MyResource> &
    Azure.Core.Foundations.RetryAfterHeader
>;
```

## Delete (DELETE)

The `ArmResourceDeleteWithoutOkAsync` template uses `ArmLroLocationHeader` by default with `void`
as the final result, since delete operations do not return a resource body on completion.

### Default

```typespec
op delete is ArmResourceDeleteWithoutOkAsync<MyResource>;
```

The default `LroHeaders` for DELETE is:

```
ArmLroLocationHeader<FinalResult = void> & Azure.Core.Foundations.RetryAfterHeader
```

### Customizing to use an Azure-AsyncOperation header

To use an `Azure-AsyncOperation` header instead of `Location`, override the `LroHeaders` parameter.
Keep `FinalResult` as `void` because delete operations do not return a resource body:

```typespec
op delete is ArmResourceDeleteWithoutOkAsync<
  MyResource,
  LroHeaders = ArmAsyncOperationHeader<FinalResult = void> & Azure.Core.Foundations.RetryAfterHeader
>;
```

### Customizing to use both headers

To return both headers, use `ArmCombinedLroHeaders`. Keep `FinalResult` as `void`:

```typespec
op delete is ArmResourceDeleteWithoutOkAsync<
  MyResource,
  LroHeaders = ArmCombinedLroHeaders<FinalResult = void> & Azure.Core.Foundations.RetryAfterHeader
>;
```

## Resource Action (POST)

The `ArmResourceActionAsync` template uses `ArmLroLocationHeader` by default. The `FinalResult`
should match the response type of the action. For actions that return no content, use
`ArmResourceActionNoResponseContentAsync` where `FinalResult` defaults to `void`.

### Default action with response

```typespec
op startMigration is ArmResourceActionAsync<MyResource, MigrationRequest, MigrationResponse>;
```

The default `LroHeaders` for a POST action is:

```
ArmLroLocationHeader<FinalResult = MigrationResponse> & Azure.Core.Foundations.RetryAfterHeader
```

### Default action with no response content

```typespec
op restart is ArmResourceActionNoResponseContentAsync<MyResource, RestartRequest>;
```

The default `LroHeaders` for a no-content POST action is:

```
ArmLroLocationHeader<FinalResult = void> & Azure.Core.Foundations.RetryAfterHeader
```

### Customizing to use an Azure-AsyncOperation header

Override the `LroHeaders` parameter. Set `FinalResult` to match the response type of the action:

```typespec
op startMigration is ArmResourceActionAsync<
  MyResource,
  MigrationRequest,
  MigrationResponse,
  LroHeaders = ArmAsyncOperationHeader<FinalResult = MigrationResponse> &
    Azure.Core.Foundations.RetryAfterHeader
>;
```

For an action with no response content, set `FinalResult` to `void`:

```typespec
op restart is ArmResourceActionNoResponseContentAsync<
  MyResource,
  RestartRequest,
  LroHeaders = ArmAsyncOperationHeader<FinalResult = void> & Azure.Core.Foundations.RetryAfterHeader
>;
```

### Customizing to use both headers

To return both headers, use `ArmCombinedLroHeaders`. Set `FinalResult` to match the response type:

```typespec
op startMigration is ArmResourceActionAsync<
  MyResource,
  MigrationRequest,
  MigrationResponse,
  LroHeaders = ArmCombinedLroHeaders<FinalResult = MigrationResponse> &
    Azure.Core.Foundations.RetryAfterHeader
>;
```

For an action with no response content:

```typespec
op restart is ArmResourceActionNoResponseContentAsync<
  MyResource,
  RestartRequest,
  LroHeaders = ArmCombinedLroHeaders<FinalResult = void> & Azure.Core.Foundations.RetryAfterHeader
>;
```
