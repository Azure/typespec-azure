---
title: Converting Existing Specs to Single Active Preview
llmstxt: true
---

Converting a spec with multiple preview versions into a spec with a single, latest preview version is complex because the changes that occur in any
preview version are carried over into the next version by default. This means that each versioning decorator referencing a preview version must be dealt with _in order_ to end with the correct decoration.

For each type decorated with a versioning decorator that references a preview version, follow these steps. If the type is decorated with _more than one instance_ of a versioning decorator referencing different preview versions, each of these must be processed _in version order (earliest version first)_

A conversion consists of the following steps, outlined in the sections below

- Normalizing version decoration (optional)
- Determining which versions should be removed: this should include all preview api-versions **except** the last version (if the last version is a preview, that version will **not** be removed.)
- Handling each versioning decorator application that references a deleted preview version (except the **first** version)
- Removing the first version (if it is a preview)
- Removing the deleted preview versions from the Versions enum
- If there is a remaining preview version, it should be the last version in the versions enum. Ensure it is decorated with the `@previewVersion` decorator.
- Cleaning up (optional)

In this document we use the notation `@<decorator>(T, u, [arg])` this indicates an instance of the decorator `<decorator>` decorating type `T` using version `u` in a set of monotonically increasing versions `1..n`

## Normalizing Version Decoration (optional)

Normalizing version decoration consists of removing redundant decorators and follows a few rules, described below. For these rules, consider an ordered set of versions `1...n`.

- Trim any sequence of `@removed` decorators without an `@added` between them: A decorator `@removed(T, c)` with type `T` and `c` in `1..n` may be safely removed if there is another decorator `@removed(T, a)` with `a` in `1..n` and `a < c` unless there is a decorator `@added(T, b)` with `b` in `1..n` and `a < b < c`.
- Trim any sequence of `@added` decorators without any `@removed` between them: A decorator `@added(T, c)` with type `T` and `c` in `1..n` may be safely removed if there is another decorator `@added(T,a)` with `a` in `1..n` and `a < c` unless there is a decorator `@removed(T,b)` with `b` in `1..n` and `a < b < c`.
- Any duplicated application of a versioning decorator to a type with the same parameters may be safely removed, that is:
  - `@added(T, a)` and `@added(T, a)` can be simplified to `@added(T, a)`
  - `@removed(T, a)` and `@removed(T, a)` can be simplified to `@removed(T, a)`
  - `@madeOptional(T, a)` and `@madeOptional(T, a)` can be simplified to `@madeOptional(T, a)`
  - `@renamedFrom(T, a, name)` and `@renamedFrom(T, a, name)` can be simplified to `@renamedFrom(T, a, name)`
  - `@typeChangedFrom(T, a, U)` and `@typeChangedFrom(T, a, U)` can be simplified to `@typeChangedFrom(T, a, U)`
  - `@returnTypeChangedFrom(T, a, U)` and `@returnTypeChangedFrom(T, a, U)` can be simplified to `@returnTypeChangedFrom(T, a, U)`
- If `@added(T, a)` and `@removed(T,a)` occur, `@added(T, a)` may be removed.
- If any versioning decorator with 3 arguments `@dec(T, v, a)` where `T` is a type, `v` is a version and `a` is a valid arg value occurs with another application of the same decorator `@dec(T, v, b)` and `b != a`, then the innermost of the two decorators can be removed.
- If any of the following decorators reference the first version, they may be removed:
  - `@added`
  - `@renamedFrom`
  - `@madeOptional`
  - `@typeChangedFrom`
  - `@returnTypeChangedFrom`
- if `@removed(T, 1)` occurs, where `T` is the decorated type and `1` is the first version:
  - If `T` occurs in any subsequent version (i.e. if there is any), this decorator should remain
  - Otherwise, the decorated type can simply be removed.

## Handling Each Versioning Decorator That References a Preview Version

## `@renamedFrom(T, u, name)` decorator

- Based on the version referenced in the decorator, determine the immediate successor version `u + 1`
- If version `u + 1` does not exist (the version argument is the last version) then this version will not be deleted
- If there is one or more `@renamedFrom(T, u + 1, anotherName)` decorators, remove them.
- Change `@renamedFrom(T, u, name)` to `@renamedFrom(T, u + 1, name)`

  ```diff lang=tsp
  - @renamedFrom(Versions.`2025-10-01-preview`, "oldName")
  + @renamedFrom(Versions.`2025-11-01`, "oldName")
    newName: string;
  ```

## `@typeChangedFrom(T, u, type)` decorator

- Based on the version referenced in the decorator, determine the immediate successor version `u + 1`
- If version `u + 1` does not exist (the version argument is the last version) then this version will not be deleted
- If there is one or more `@typeChangedFrom` decorators referencing the immediate successor version, remove them.
- Change `@typeChangedFrom(T, u, type)` to `@typeChangedFrom(T, u + 1, type)`

  ```diff lang=tsp
  - @typeChangedFrom(Versions.`2025-10-01-preview`, int32)
  + @typeChangedFrom(Versions.`2025-11-01`, int32)
    newType: string;
  ```

## `@returnTypeChangedFrom(T, u, returnType)` decorator

- Based on the version referenced in the decorator, determine the immediate successor version `u + 1`
- If version `u + 1` does not exist (the version argument is the last version) then this version will not be deleted
- If there is one or more `@returnTypeChangedFrom` decorators referencing the immediate successor version, remove them.
- Change `@returnTypeChangedFrom(T, u, returnType)` to `@returnTypeChangedFrom(T, u + 1, returnType)`

  ```diff lang=tsp
  - @returnTypeChangedFrom(Versions.`2025-10-01-preview`, void)
  + @returnTypeChangedFrom(Versions.`2025-11-01`, void)
    move is ArmResourceActionSync<Widget, MoveRequest, MoveResponse>;
  ```

## `@madeOptional(T, u)` decorator

- Based on the version referenced in the decorator, determine the immediate successor version `u + 1`
- If version `u + 1` does not exist (the version argument is the last version) then this version will not be deleted
- If there is one or more `@madeOptional` decorators referencing the immediate successor version, remove them.
- Change `@madeOption(T, u)` to `@madeOptional(T, u + 1)`

  ```diff lang=tsp
  - @madeOptional(Versions.`2025-10-01-preview`)
  + @madeOptional(Versions.`2025-11-01`)
    nowOptional?: string;
  ```

## `@added(T, u)` decorator

- Based on the version referenced in the decorator, determine the immediate successor version `u + 1`
- If version `u + 1` does not exist (the version argument is the last version) then this version will not be deleted
- If there is one or more `@added(T, u + 1)` decorators referencing the immediate successor version
  - Remove them.
  - Change the version argument in the decorator to match the successor version [ `@added(T, u) -> @added(T, u + 1)`]

    ```diff lang=tsp
    - @added(Versions.`2025-10-01-preview`)
    - @added(Versions.`2025-11-01`)
      @added(Versions.`2025-11-01`)
      newType: string;
    ```

- If there is an `@removed(T, u + 1)` decorator referencing the immediate successor version
  - If the type does not occur in any previous version `v < u`, delete the type altogether

    ```diff lang=tsp
    - @added(Versions.`2025-10-01-preview`)
    - @removed(Versions.`2025-11-01`)
    - goneType: string;
    ```

  - If the type does occur in a previous version, remove the `@added(T, u)` decorator.

    ```diff lang=tsp
      @added(Versions.`2025-06-01`)
    - @added(Versions.`2025-10-01-preview`)
      @removed(Versions.`2025-11-01`)
      remainType: string;
    ```

- If there are no `@added(T, u + 1)` or `@removed(T, u + 1)` decorators referencing the immediate successor version, change the version in the decorator to the immediate successor version: [`@added(T, u)` -> `@added(T, u + 1)`]

  ```diff lang=tsp
    - @added(Versions.`2025-10-01-preview`)
    + @added(Versions.`2025-11-01`)
      @removed(Versions.`2026-02-01`)
      remainType: string;
  ```

## `@removed(T, u)` decorator

- Based on the version referenced in the decorator, determine the immediate successor version `u + 1`
- If version `u + 1` does not exist (the version argument is the last version) then this version will not be deleted
- If there is one or more `@removed(T, u + 1)` decorators referencing the immediate successor version
  - Remove them.
  - Change the version argument in the decorator to match the successor version [`@removed(T, u) -> @removed(T, u + 1)`]

    ```diff lang=tsp
    - @removed(Versions.`2025-10-01-preview`)
    - @removed(Versions.`2025-11-01`)
      @removed(Versions.`2025-11-01`)
      remainType: string;
    ```

- if there is one or more `@added(T, u + 1)` decorators in the immediate successor version
  - Remove the `@removed(T, u)` decorator

    ```diff lang=tsp
    - @removed(Versions.`2025-10-01-preview`)
      @added(Versions.`2025-11-01`)
      remainType: string;
    ```

- If there are no `@removed(T, u + 1)` or `@removed(T, u + 1)` decorators referencing the immediate successor version, change the version in the decorator to the immediate successor version: [`@removed(T, u)` -> `@removed(T, u + 1)`]

  ```diff lang=tsp
    - @removed(Versions.`2025-10-01-preview`)
    + @removed(Versions.`2025-11-01`)
      remainType: string;
  ```

## Removing the _First_ version in the Specification

TypeSpec specs require no versioning decoration for the first version of a spec, and all versioning decorators except `@removed` have no impact on the type graph for subsequent versions and can be safely removed. Any `@removed` decorator referencing the first version should be treated as follows:

- If the decorated type _does not occur_ in any subsequent versions, it can be removed
- If the decorated type _does occur_ in subsequent versions, the version referenced in the `@removed` decorator should be updated to its immediate successor

Note that the last version of a specification should _never_ be removed in a conversion, as if the last version is a preview, it will become the active preview.

## Cleaning Up (optional)

After removing the preview versions, repeat the [steps to normalize version decoration](#normalizing-version-decoration-optional) to remove redundant decoration.
