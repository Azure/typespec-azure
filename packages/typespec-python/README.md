# @azure-tools/typespec-python

TypeSpec emitter for Python SDKs

## Install

```bash
npm install @azure-tools/typespec-python
```

## Emitter usage

1. Via the command line

```bash
tsp compile . --emit=@azure-tools/typespec-python
```

2. Via the config

```yaml
emit:
  - "@azure-tools/typespec-python"
```

The config can be extended with options as follows:

```yaml
emit:
  - "@azure-tools/typespec-python"
options:
  "@azure-tools/typespec-python":
    option: value
```

## Emitter options

### `emitter-output-dir`

**Type:** `absolutePath`

Defines the emitter output directory. Defaults to `{output-dir}/@azure-tools/typespec-python`
See [Configuring output directory for more info](https://typespec.io/docs/handbook/configuration/configuration/#configuring-output-directory)

### `examples-dir`

**Type:** `string`

Specifies the directory where the emitter will look for example files. If the flag isn’t set, the emitter defaults to using an `examples` directory located at the project root.

### `namespace`

**Type:** `string`

Specifies the namespace you want to override for namespaces set in the spec. With this config, all namespace for the spec types will default to it.

### `flavor`

**Type:** `string`

The flavor of the SDK.

### `models-mode`

**Type:** `"dpg" | "none" | "typeddict"`

What kind of models to generate. If you pass in `none`, we won't generate models. `dpg` models are the default models we generate. If you pass in `typeddict`, we will generate models as typed dictionaries.

### `generate-sample`

**Type:** `boolean`

Whether to generate sample files, for basic samples of your generated sdks. Defaults to `false`.

### `generate-test`

**Type:** `boolean`

Whether to generate test files, for basic testing of your generated sdks. Defaults to `false`.

### `api-version`

**Type:** `string | object`

Use this flag if you would like to generate the sdk only for a specific version. Default value is the latest version. Also accepts values `latest` and `all`. For multi-service packages, provide a map from each service namespace's full name to its desired version; services not listed default to their latest version.

**Options:**

- `string`
- `object`

### `license`

**Type:** `object { name, company, link, header, description }`

License information for the generated client code.

**Properties:**

| Name          | Type     | Default | Description                                                                                                                                                                                                                       |
| ------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | `string` |         | License name. The config is required. Predefined licenses are: MIT License, Apache License 2.0, BSD 3-Clause License, MPL 2.0, GPL-3.0, LGPL-3.0. For other license, you need to configure all the other license config manually. |
| `company`     | `string` |         | License company name. It will be used in copyright sentences.                                                                                                                                                                     |
| `link`        | `string` |         | License link.                                                                                                                                                                                                                     |
| `header`      | `string` |         | License header. It will be used in the header comment of generated client code.                                                                                                                                                   |
| `description` | `string` |         | License description. The full license text.                                                                                                                                                                                       |

### `package-version`

**Type:** `string`

The version of the package.

### `package-name`

**Type:** `string`

The name of the package.

### `generate-packaging-files`

**Type:** `boolean`

Whether to generate packaging files. Packaging files refer to the `setup.py`, `README`, and other files that are needed to package your code.

### `packaging-files-dir`

**Type:** `string`

If you are using a custom packaging files directory, you can specify it here. We won't generate with the default packaging files we have.

### `packaging-files-config`

**Type:** `object`

If you are using a custom packaging files directory, and have additional configuration parameters you want to pass in during generation, you can specify it here. Only applicable if `packaging-files-dir` is set.

### `package-pprint-name`

**Type:** `string`

The name of the package to be used in pretty-printing. Will be the name of the package in `README` and pprinting of `setup.py`.

### `head-as-boolean`

**Type:** `boolean`

Whether to return responses from HEAD requests as boolean. Defaults to `true`.

### `use-pyodide`

**Type:** `boolean`

Whether to generate using `pyodide` instead of `python`. If there is no python installed on your device, we will default to using pyodide to generate the code.

### `validate-versioning`

**Type:** `boolean`

Whether to validate the versioning of the package. Defaults to `true`. If set to `false`, we will not validate the versioning of the package.

### `generation-subdir`

**Type:** `string`

The subdirectory to generate the code in. If not specified, the code will be generated in the root folder. Note: if you're using this flag, you will need to add and maintain the versioning file yourself.

### `keep-setup-py`

**Type:** `boolean`

Whether to keep the existing `setup.py` when `generate-packaging-files` is `true`. If set to `false` and by default, `pyproject.toml` will be generated instead. To generate `setup.py`, use `basic-setup-py`.

### `keep-pyproject-fields`

**Type:** `object { authors, description, classifiers, urls }`

Which manually customized `[project]` fields to preserve in an existing `pyproject.toml` instead of overwriting them on regeneration. Set a field to `true` to keep it. By default no fields are preserved.

**Properties:**

| Name          | Type      | Default | Description                                                         |
| ------------- | --------- | ------- | ------------------------------------------------------------------- |
| `authors`     | `boolean` |         | Preserve the `authors` field (e.g. a custom author name and email). |
| `description` | `boolean` |         | Preserve the `description` field.                                   |
| `classifiers` | `boolean` |         | Preserve the `classifiers` field.                                   |
| `urls`        | `boolean` |         | Preserve the `[project.urls]` table.                                |

### `clear-output-folder`

**Type:** `boolean`

Whether to clear the output folder before generating the code. Defaults to `false`.

### `emit-yaml-only`

**Type:** `boolean`

Emit YAML code model only, without running Python generator. For batch processing.
