This diagnostic is issued when services merged into the same client resolve different versions of a shared dependency namespace.

To fix this issue, align service versioning or `@useDependency` mappings so every merged service resolves the shared dependency to the same version.
