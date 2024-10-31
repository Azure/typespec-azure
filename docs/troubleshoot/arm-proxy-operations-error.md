---
title: Duplicate Body Error When Instantiating `ProxyResourceOperations`
---

When instantiating the `ProxyResourceOperations<TResource>` template with an incorrect second parameter, a "duplicate body" error like the following may result:

```javascript
error @typespec/http/duplicate-body
Operation has a @body and an unannotated parameter. There can only be one representing the body
```

## Symptoms

When instantiating the `ProxyResourceOperations<TResource>` template, it is easy to assume that the second parameter should contain the RP-specific properties of the resource, as with the `TrackedResourceOperations<TResource, TProperties>` template.

```typespec
// INCORRECT USAGE OF THE TEMPLATE
interface MyResourceOperations extends ProxyResourceOperations<MyResource, MyResourceProperties> {}
```

However, this usage is **incorrect**, the second parameter to `ProxyResourceOperations` is optional and, if provided, is expecting an entirely different TypeSpec type. If the resource properties are supplied instead, a "duplicate body" error like the following will result:

```javascript
error @typespec/http/duplicate-body
Operation has a @body and an unannotated parameter. There can only be one representing the body
```

## Cause

This error occurs because the second parameter is an optional override for the shared request parameters for the `read`, `createOrUpdate`, and `delete` operations for the proxy resource. When the rp-specific properties are provided instead, the operation request parameters clash with the request body parameter for `createOrUpdate`.

## Workaround

To fix this error, provide only one parameter to ProxyResourceOperations, the type of the resource that the operations apply to.

```typespec
// CORRECT
interface MyResourceOperations extends ProxyResourceOperations<MyResource> {}
```
