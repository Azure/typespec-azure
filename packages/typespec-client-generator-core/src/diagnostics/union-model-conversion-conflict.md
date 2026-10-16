An inline-discriminated union cannot be converted to a model hierarchy when its discriminator property or tag mappings conflict with another union or an existing model discriminator. TCGC preserves the union and reports this warning rather than overwriting the conflicting metadata.

Use consistent discriminator metadata for the shared hierarchy, or set `convertDiscriminatedUnionsToModels: false` in `createSdkContext` to retain discriminated unions.
