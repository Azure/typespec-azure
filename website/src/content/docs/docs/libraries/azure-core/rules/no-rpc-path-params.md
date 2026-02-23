---
title: "no-rpc-path-params"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-rpc-path-params
```

Operations defined using `RpcOperation` or `LongRunningRpcOperation` should not have path parameters. If path parameters are needed, consider using `ResourceAction` or `ResourceCollectionAction` instead.

#### ❌ Incorrect

`@path` parameter in an `RpcOperation`:

```tsp
@route("/one")
op testOne is RpcOperation<
  {
    @path bar: string;
  },
  {}
>;
```

`@path` parameter in a custom operation extending `RpcOperation`:

```tsp
op customOp<TFoo extends TypeSpec.Reflection.Model> is RpcOperation<
  {
    @path bar: string;
  },
  TFoo
>;

@route("/two")
op testTwo is customOp<{}>;
```

`@path` parameter in a `LongRunningRpcOperation`:

```tsp
@pollingOperation(getStatus)
@route("/lrRpcOp")
op lrRpcOp is Azure.Core.LongRunningRpcOperation<
  {
    @path foo: string;
  },
  {},
  PollingStatus,
  StatusError
>;
```

#### ✅ Correct

`RpcOperation` without path parameters:

```tsp
@route("/analyze")
op analyze is RpcOperation<
  {
    @body request: AnalysisRequest;
  },
  AnalysisResult
>;
```

Use `ResourceAction` or `ResourceCollectionAction` when path parameters are needed:

```tsp
op analyze is ResourceAction<MyResource, AnalysisRequest, AnalysisResult>;
```
