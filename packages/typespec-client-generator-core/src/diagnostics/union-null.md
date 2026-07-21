This diagnostic is issued when TCGC converts a union whose only possible value is `null`. A union with no non-null alternatives cannot produce a useful SDK type.

To fix this issue, add at least one non-null variant to the union or remove the union from the generated client surface.
