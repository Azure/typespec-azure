This diagnostic is issued when a derived model in a discriminated hierarchy defines the discriminator property with a non-constant type. TCGC needs a fixed discriminator value to identify each subtype.

To fix this issue, change the derived model's discriminator property to a constant value, usually a string literal or string enum member.

### Example

Instead of:

```typespec
@discriminator("kind")
model Pet {
  kind: string;
}

model Cat extends Pet {
  kind: string;
}
```

Use:

```typespec
@discriminator("kind")
model Pet {
  kind: string;
}

model Cat extends Pet {
  kind: "cat";
}
```
