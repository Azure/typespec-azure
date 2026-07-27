C# SDK model names should use these recommended suffixes:

- Use `Config` instead of `Options`, except for client options.
- Use `Content` instead of `Request`, except when a direct PATCH body requires `Patch`.
- Use `Result` instead of `Response`.
- Use `Patch` instead of `Parameter`, `Parameters`, or `Request` for a direct PATCH body.
- Use `Content` instead of `Parameter`, `Parameters`, or `Request` for a direct PUT/POST
  body or a model nested in a PATCH/PUT/POST request body.

The rule checks the C#-resolved model name and respects `@clientName` overrides.
It does not report models with conflicting roles, such as a model shared by PATCH and PUT
operations or by a request and response.
For nested request content, it checks only immediate properties of the body. It unwraps
structural containers such as arrays, records, tuples, unions, and anonymous models, then
stops at the first named model rather than inspecting that model's properties.

#### ❌ Incorrect

```tsp
model SearchOptions {
  filter: string;
}

model CreateWidgetRequest {
  name: string;
}

model CreateWidgetResponse {
  id: string;
}

model WidgetUpdateParameters {
  name: string;
}

@route("/widgets/{id}")
@patch
op updateWidget(@path id: string, @body body: WidgetUpdateParameters): void;
```

#### ✅ Correct

```tsp
model SearchConfig {
  filter: string;
}

model CreateWidgetContent {
  name: string;
}

model CreateWidgetResult {
  id: string;
}

model WidgetPatch {
  name: string;
}

@route("/widgets/{id}")
@patch
op updateWidget(@path id: string, @body body: WidgetPatch): void;
```

Or using `@@clientName` in `client.tsp` to override just the C# name:

```tsp
// client.tsp
@@clientName(SearchOptions, "SearchConfig", "csharp");
@@clientName(CreateWidgetRequest, "CreateWidgetContent", "csharp");
@@clientName(CreateWidgetResponse, "CreateWidgetResult", "csharp");
@@clientName(WidgetUpdateParameters, "WidgetPatch", "csharp");
```

For nested request models, use `Content` rather than `Patch`:

```tsp
model WidgetPatch {
  details: WidgetDetailsContent;
}

model WidgetDetailsContent {
  enabled: boolean;
}
```
