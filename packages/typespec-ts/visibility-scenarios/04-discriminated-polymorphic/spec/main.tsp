import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service(#{ title: "Discriminated Service" })
@server("{endpoint}", "Discriminated service endpoint.", {
  endpoint: url,
})
namespace DiscriminatedService;

@doc("""
Discriminated base model used as a POST body. It has a required read-only
`petId`, and its `Cat` subtype has its own read-only `livesLeft`. The
visibility-split pre-pass projects the whole discriminator hierarchy: the base
becomes `PetCreate` (drops `petId`) and each subtype is re-parented to it
(`CatCreate extends PetCreate` drops `livesLeft`; `DogCreate` re-parents even
though it adds no read-only props of its own), so `PetCreateUnion` is emitted
and no read-only property leaks into the write body.
""")
@discriminator("kind")
model Pet {
  @doc("Server-assigned identifier.")
  @visibility(Lifecycle.Read)
  petId: string;

  @doc("Common writable name.")
  name: string;
}

model Cat extends Pet {
  kind: "cat";

  @doc("Server-assigned lives-left counter (read-only).")
  @visibility(Lifecycle.Read)
  livesLeft: int32;

  @doc("Writable meow loudness.")
  meowVolume: int32;
}

model Dog extends Pet {
  kind: "dog";

  @doc("Writable bark loudness.")
  barkVolume: int32;
}

@doc("""
Create a cat directly (body is the `Cat` subtype, not the `Pet` base). This is
declared *before* `createPet` so the subtype is projected directly first: the
pre-pass must still route `Cat` through the whole `Pet` hierarchy and reuse the
single re-parented `CatCreate` clone, rather than emitting a duplicate.
""")
@route("/cats")
@post
op createCat(@body body: Cat): Cat;

@doc("Create a pet. POST -> Create; body should project to PetCreate.")
@route("/pets")
@post
op createPet(@body body: Pet): Pet;
