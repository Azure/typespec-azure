---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add support for @previewVersion decorator in API version filtering. TCGC now checks for the @previewVersion decorator on enum members in addition to the existing regex-based preview version filtering, providing more precise control over preview version handling while maintaining full backward compatibility.