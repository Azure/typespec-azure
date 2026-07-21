This diagnostic is issued when a derived model's discriminator value is constant but not a string. TCGC expects discriminator values to be strings for generated SDK models.

To fix this issue, change the discriminator value to a string literal or string-valued enum member.

### Example

Instead of:

```typespec
@discriminator("kind")
model Pet {
  kind: string;
}

model Cat extends Pet {
  kind: 1;
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
