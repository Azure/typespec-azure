# TypeSpec diff

A standalone tool for comparing two typespec specs based on certain rules which is configurable.
Note: each typespec spec may contains multiple versions, for example:

- Spec A (older)
  - v1
  - v2
- Spec B (newer)
  - v1
  - v2
  - v3

## Usage

### compare two specs

typespec-diff -n \<new\>/main.tsp -o \<old\>/main.tsp -c typespec-diff.config

### compare two versions

typespec-diff -c typespec-diff.config -n \<new\>/main.tsp -o \<old\>/main.tsp --new-version=v2 --old-version=v1

## Output message

```yaml
- code: AddedEnumValue
  severity: error
  message: "The enum 'Foo' added a new value 'Bar'."
  old: "old/main.tsp:1:1"
  new: "new/main.tsp:1:1"
  versions: { oldVersion:'v1', newVersion:'v2' }
```

## Configuration

a json/yaml file to modify the default rule config (by default each rule will have a default configuration)

### format

```yaml
rules:
  AddedEnumValue: off
  RemovedEnumValue: error
  AddedResponseCode:
    severity:
      - warn   // the first severity is for the case that version is not bumped
      - error   // the second severity is for the case that version is bumped
```

## Comparison Mechanism

### how to handle the version change of tsp compiler and library

- for minor or patch version change, we can have below options:

  1.  use the compiler and libs in the newer package.json to load both specs
  2.  always use the latest compiler and libs, this needs the compiler and libs must have the compatibility with older version.
  3.  load older and newer spec by using their own compiler version, but it seems hard to accomplish, as one nodejs process can only load one version of compiler, we can only do the comparison across the process.

- don't support compare two specs which contains major compiler version change ?

### compare nodes by order :

```yaml
- versions:
    namespaces:
      interfaces:
        operations:
      operations:
        parameters:
        responses:
      models:
      enums:
      unions:
```

## Breaking change rules

refer to https://github.com/Azure/openapi-diff/tree/main/docs and https://aka.ms/AzBreakingChangesPolicy

### Version

- NoVersionChange
- AddedVersion
- RemovedVersion
- ProtocolNoLongerSupported

### Import

N/A

### Template

N/A

### Namespace

- AddedNameSpace
- RemovedNameSpace

### Interface

- AddedInterface
- RemovedInterface

### Operation

#### generic

- AddedOperation
- RemovedOperation
- ModifiedOperationId
- ChangedPath
- RemovedRequiredParameter
- AddedRequiredParameters
- RemovedOptionalParameter
- AddedOptionalParameters

### openapi specifc

- RemovedBodyContentType
- AddedBodyContentType
- AddedResponseCode
- RemovedResponseCode
- AddedResponseHeader
- RemovedResponseHeader
- ChangedParameterOrder
- AddedLongrunningOperationSupport
- RemovedLongrunningOperationSupport
- AddedPaginationSupport
- RemovedPaginationSupport

### Model

#### generic

- RemovedModel
- AddedModel
- ChangedModelType
- RemovedProperty
- ChangedPropertyType
- AddedOptionalProperty
- AddedRequiredProperty
- ChangedArrayItemType
- DifferentExtends

#### openapi specific

- ChangedFormat
- DifferentDiscriminator
- ConstantStatusHasChanged
- ParameterInHasCHanged
- ArrayCollectionFormatChanged
- VisibilityChanged
- ConstraintChanged

### Enum

- AddedEnumType
- RemovedEnumType
- AddedEnumValue
- RemovedEnumValue

### Union

- AddedUnion
- RemovedUnion
- AddedVariant
- RemovedVariant

### decorators

- ChangedDecoratorArguments
- AddedDecorator
- RemovedDecorator
