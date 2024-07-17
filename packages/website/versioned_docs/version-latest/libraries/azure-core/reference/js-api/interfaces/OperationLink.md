---
jsApi: true
title: "[I] OperationLink"

---
Custom polling
Represents a property or header that provides a Uri linking to another operation

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| `kind` | `"link"` | - |
| `location` | `"ResponseBody"` \| `"ResponseHeader"` \| `"Self"` | Indicates whether the link is in the response header or response body |
| `property` | `ModelProperty` | The property that contains the link |
