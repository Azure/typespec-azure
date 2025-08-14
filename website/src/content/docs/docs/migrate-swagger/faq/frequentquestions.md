---
title: Frequently Asked Questions
---

### Renaming the generated Swagger file

Rename the generated Swagger file by modifying the `output-file` option in your `tspconfig.yaml`:

```yaml
options:
  "@azure-tools/typespec-autorest":
    output-file: "your-meaningful-name.json"
```

### File Layout for ARM Services

For ARM services, we recommend the following file structure:

- **main.tsp**: Entry point for the TypeSpec specification containing service information
- **{resource-name}.tsp**: Resource-specific operations for each ARM resource type
- **routes.tsp**: All other operations that don't belong to specific resources
- **models.tsp**: All the model definitions used across operations
- **(optional) client.tsp**: Client-specific customizations and configurations
- **(optional) back-compatible.tsp**: Backward compatibility definitions and legacy support

This structure helps maintain clear separation of concerns and makes your TypeSpec specification easier to navigate and maintain.
