import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
namespace Microsoft.TestService;

model OkBody<T> {
  @statusCode statusCode: 200;
  @body body: T;
}

model CreatedBody<T> {
  @statusCode statusCode: 201;
  @body body: T;
}

scalar CustomString extends string;

enum State {
  ready,
  done,
}

union Choice {
  text: string,
  count: int32,
}

@route("/anonymous-model")
@put
op anonymousModelBody(@query("api-version") apiVersion: string):
  | OkBody<{
      value: string;
    }>
  | CreatedBody<{
      value: string;
    }>;

@route("/string")
@put
op stringBody(@query("api-version") apiVersion: string): OkBody<string> | CreatedBody<string>;

@route("/literal")
@put
op literalBody(@query("api-version") apiVersion: string): OkBody<"ready"> | CreatedBody<"ready">;

@route("/scalar")
@put
op scalarBody(@query("api-version") apiVersion: string):
  | OkBody<CustomString>
  | CreatedBody<CustomString>;

@route("/enum")
@put
op enumBody(@query("api-version") apiVersion: string): OkBody<State> | CreatedBody<State>;

@route("/union")
@put
op unionBody(@query("api-version") apiVersion: string): OkBody<Choice> | CreatedBody<Choice>;

@route("/array")
@put
op arrayBody(@query("api-version") apiVersion: string): OkBody<string[]> | CreatedBody<string[]>;

@route("/tuple")
@put
op tupleBody(@query("api-version") apiVersion: string):
  | OkBody<[string, int32]>
  | CreatedBody<[string, int32]>;

@route("/unknown")
@put
op unknownBody(@query("api-version") apiVersion: string): OkBody<unknown> | CreatedBody<unknown>;
