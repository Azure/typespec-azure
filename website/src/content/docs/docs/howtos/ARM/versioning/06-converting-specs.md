---
title: Converting Existing Specs with Multiple Previews
---

Converting a spec with multiple preview versions into a spec with a single, latest preview version is complex because the changes that occur in any
preview version are carried over into the next version by default. This means that each versioning decorator referencing a preview version must be dealt with _in order_ to end with the correct decoration.

For each type decorated with a versioning decorator that references a preview version, follow these steps. If the type is decorated with _more than one instance_ of a versioning decorator referencing different preview versions, each of these must be processed _in version order (earliest version first)_

A conversion consists of the following steps, outlined in the sections below

- Normalizing version decoration (optional)
- Handling each versioning decorator application that references a preview version
- Removing the first version (if it is a preview)
- Cleaning up (optional)

## Normalizing Version Decoration (optional)

Normalizing version decoration consists of removing redundant decorators and follows a few rules, described below. For these rules, consider an ordered set of versions `1...n`.

- A decorator `@@removed(T, c)` with type `T` and `c` in `1..n` may be safely removed if there is another decorator `@@removed(T, a)` with `a` in `1..n` and `a < c` unless there is a decorator `@@added(T, b)` with `b` in `1..n` and `a < b < c`.
- A decorator `@@added(T, c)` with type `T` and `c` in `1..n` may be safely removed if there is another decorator `@@added(T,a)` with `a` in `1..n` and `a < c` unless there is a decorator `@@removed(T,b)` with `b` in `1..n` and `a < b < c`.
- Any duplicated application of a versioning decorator to a type with the same parameters may be safely removed, that is:
  - `@@added(T, a)` and `@@added(T, a)` can be simplified to `@@added(T, a)`
  - `@@removed(T, a)` and `@@removed(T, a)` can be simplified to `@@removed(T, a)`
  - `@@madeOptional(T, a)` and `@@madeOptional(T, a)` can be simplified to `@@madeOptional(T, a)`
  - `@@renamedFrom(T, a, name)` and `@@renamedFrom(T, a, name)` can be simplified to `@@renamedFrom(T, a, name)`
  - `@@typeChangedFrom(T, a, U)` and `@@typeChangedFrom(T, a, U)` can be simplified to `@@typeChangedFrom(T, a, U)`
  - `@@returnTypeChangedFrom(T, a, U)` and `@@returnTypeChangedFrom(T, a, U)` can be simplified to `@@returnTypeChangedFrom(T, a, U)`
- If `@added(T, a)` and `@removed(T,a)` occur, `@added(T, a)` may be removed.
- If any versioning decorator with 3 arguments `@@dec(T, v, a)` where `T` is a type, `v` is a version and `a` is a valid arg value occurs with another application of the same decorator `@@dec(T, v, b)` and `b != a`, then the innermost of the two decorators can be removed.

## Handling Each Versioning Decorator That References a Preview Version

## `@@renamedFrom(T, u, name)` decorator

- Based on the version referenced in the decorator, determine the immediate successor version `u + 1`
- If version `u + 1` does not exist (the version argument is the last version) then this version will not be deleted
- If there is one or more `@@renamedFrom(T, u + 1, anotherName)` decorators, remove them.
- Change `@@renamedFrom(T, u, name)` to `@@renamedFrom(T, u + 1, name)`

## `@typeChangedFrom(T, u, type)` decorator

- Based on the version referenced in the decorator, determine the immediate successor version `u + 1`
- If version `u + 1` does not exist (the version argument is the last version) then this version will not be deleted
- If there is one or more `@typeChangedFrom` decorators referencing the immediate successor version, remove them.
- Change the version argument in the decorator to match the successor version

## `@returnTypeChangedFrom(T, u, returnType)` decorator

- Based on the version referenced in the decorator, determine the immediate successor version `u + 1`
- If version `u + 1` does not exist (the version argument is the last version) then this version will not be deleted
- If there is one or more `@returnTypeChangedFrom` decorators referencing the immediate successor version, remove them.
- Change the version argument in the decorator to match the successor version

## `@madeOptional(T, u)` decorator

- Based on the version referenced in the decorator, determine the immediate successor version `u + 1`
- If version `u + 1` does not exist (the version argument is the last version) then this version will not be deleted
- If there is one or more `@madeOptional` decorators referencing the immediate successor version, remove them.
- Change the version argument in the decorator to match the successor version

## `@added(T, u)` decorator

- Based on the version referenced in the decorator, determine the immediate successor version `u + 1`
- If version `u + 1` does not exist (the version argument is the last version) then this version will not be deleted
- If there is one or more `@added(T, u+ 1)` decorators referencing the immediate successor version
  - Remove them.
  - Change the version argument in the decorator to match the successor version [ `@added(T, u) -> @added(T, u + 1)`]
- If there is an `@removed(T, u + 1)` decorator referencing the immediate successor version
  - If the type does not occur in any previous version `v < u`, remove the type altogether
  - If the type does occur in a previous version, remove the `@added(T, u)` decorator.

## `@removed(T, u)` decorator

- Based on the version referenced in the decorator, determine the immediate successor version `u + 1`
- If version `u + 1` does not exist (the version argument is the last version) then this version will not be deleted
- If there is one or more `@removed(T, u + 1)` decorators referencing the immediate successor version
  - Remove them.
  - Change the version argument in the decorator to match the successor version [`@removed(T, u) -> @removed(T, u + 1)`]
- if there is one or more `@added(T, u + 1)` decorators
  - Remove the `@removed(T, u)` decorator

## Removing the _First_ version in the Specification

TypeSpec specs require no versioning decoration for the first version of a spec, and all versioning decorators except `@removed` have no impact on the type graph for subsequent versions and can be safely removed. Any `@removed` decorator referencing the first version should be treated as follows:

- If the decorated type _does not occur_ in any subsequent versions, it can be removed
- If the decorated type _does occur_ in subsequent versions, the version referenced in the `@removed` decorator should be updated to its immediate successor

Note that the last version of a specification should _never_ be removed in a conversion, as if the last version is a preview, it will become the active preview.

## Cleaning Up (optional)

After removing the preview versions, repeat the [steps to normalize version decoration](#normalizing-version-decoration-optional) to remove redundant decoration.
