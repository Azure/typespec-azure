This diagnostic is issued when one operation has multiple distinct response body types across its successful responses. Some emitters cannot expose all of those response shapes in a single method return type.

To fix this issue, prefer a single response body model or redesign the responses so all successful response bodies share one SDK shape.
