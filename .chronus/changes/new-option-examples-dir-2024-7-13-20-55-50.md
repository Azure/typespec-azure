---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: deprecation
packages:
  - "@azure-tools/typespec-autorest"
---

Replace `examples-directory` with `examples-dir` which will validate an absolute path is provided

  Case 1: Examples are in `examples` directory next to `tspconfig.yaml`. In this case the option can just be removed
  ```diff
  - examples-directory: examples
  ```
  
  ```diff
  - examples-directory: {project-root}/examples
  ```
  
  Case 2: Examples are in a different directory
  ```diff
  - examples-directory: autorest-examples
  + examples-dir: {project-root}/autorest-examples
  ```
  
  ```diff
  - examples-directory: {project-root}/autorest-examples
  + examples-dir: {project-root}/autorest-examples
  ```
