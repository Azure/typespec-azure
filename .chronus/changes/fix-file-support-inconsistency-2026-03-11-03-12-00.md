---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix File type contentType/accept header handling: add a new branch in `createContentTypeOrAcceptHeader` for File type bodies to produce constant (single content type) or enum (multiple content types) for both contentType and accept params, and fix response contentType header serializedName fallback to "Content-Type" when `@header` is missing
