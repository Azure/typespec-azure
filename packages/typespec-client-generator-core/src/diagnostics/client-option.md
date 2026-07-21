This diagnostic is always issued when `@clientOption` is used, because client options are a temporary mechanism intended only for language emitters.

To fix this issue, double-check whether the client option reflects an intended language-emitter behavior. If it does, suppress this diagnostic; otherwise remove `@clientOption`.
