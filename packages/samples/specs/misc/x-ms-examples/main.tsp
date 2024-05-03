import "@typespec/http";

using Http;

@service
namespace XmsExamples;

model Pet {
  name: string;
  age: int32;
}

interface Pets {
  // This operation should automatically get the ./examples/read.json file connected in x-ms-examples
  read(): Pet;
  // This operation should automatically get the ./examples/write.json file connected in x-ms-examples
  write(@body pet: Pet): void;
}
