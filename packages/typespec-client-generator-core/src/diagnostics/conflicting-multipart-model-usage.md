This diagnostic is issued when the same model is used as both multipart/form-data input and regular body input such as JSON or XML. Those request bodies have different wire shapes and cannot safely share one SDK model.

To fix this issue, create a separate form-data model, such as `<ModelName>FormData`, and use each model only for its matching body kind.
