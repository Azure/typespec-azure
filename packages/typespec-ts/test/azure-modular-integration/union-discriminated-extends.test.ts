import { assert, beforeEach, describe, it } from "vitest";

import {
  CustomDiscriminatorCat,
  CustomDiscriminatorDog,
  EnumDiscriminatorCat,
  EnumDiscriminatorDog,
  ExplicitDiscriminatorDog,
  ExtendsClient,
  InjectedDiscriminatorCat,
  InjectedDiscriminatorDog,
  RecursiveCat,
} from "./generated/type/union/discriminated/extends/src/index.js";

describe("Discriminated union extends", () => {
  let client: ExtendsClient;

  beforeEach(() => {
    client = new ExtendsClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });
  });

  describe("ExplicitDiscriminator", () => {
    const dog: ExplicitDiscriminatorDog = { kind: "dog", name: "Rex", bark: false };

    it("getDog", async () => {
      assert.deepEqual(await client.explicitDiscriminator.operations.getDog(), dog);
    });

    it("putDog", async () => {
      assert.isUndefined(await client.explicitDiscriminator.operations.putDog(dog));
    });
  });

  describe("InjectedDiscriminator", () => {
    const cat: InjectedDiscriminatorCat = { kind: "cat", name: "Whiskers", meow: true };
    const dog: InjectedDiscriminatorDog = { kind: "dog", name: "Rex", bark: false };

    it("getCat", async () => {
      assert.deepEqual(await client.injectedDiscriminator.operations.getCat(), cat);
    });

    it("getDog", async () => {
      assert.deepEqual(await client.injectedDiscriminator.operations.getDog(), dog);
    });

    it("putCat", async () => {
      assert.isUndefined(await client.injectedDiscriminator.operations.putCat(cat));
    });

    it("putDog", async () => {
      assert.isUndefined(await client.injectedDiscriminator.operations.putDog(dog));
    });
  });

  describe("CustomDiscriminator", () => {
    const cat: CustomDiscriminatorCat = { petType: "feline", name: "Whiskers", meow: true };
    const dog: CustomDiscriminatorDog = { petType: "canine", name: "Rex", bark: false };

    it("getCat", async () => {
      assert.deepEqual(await client.customDiscriminator.operations.getCat(), cat);
    });

    it("getDog", async () => {
      assert.deepEqual(await client.customDiscriminator.operations.getDog(), dog);
    });

    it("putCat", async () => {
      assert.isUndefined(await client.customDiscriminator.operations.putCat(cat));
    });

    it("putDog", async () => {
      assert.isUndefined(await client.customDiscriminator.operations.putDog(dog));
    });
  });

  describe("EnumDiscriminator", () => {
    const cat: EnumDiscriminatorCat = { kind: "cat", name: "Whiskers", meow: true };
    const dog: EnumDiscriminatorDog = { kind: "dog", name: "Rex", bark: false };

    it("getCat", async () => {
      assert.deepEqual(await client.enumDiscriminator.operations.getCat(), cat);
    });

    it("getDog", async () => {
      assert.deepEqual(await client.enumDiscriminator.operations.getDog(), dog);
    });

    it("putCat", async () => {
      assert.isUndefined(await client.enumDiscriminator.operations.putCat(cat));
    });

    it("putDog", async () => {
      assert.isUndefined(await client.enumDiscriminator.operations.putDog(dog));
    });
  });

  describe("Recursive", () => {
    const cat: RecursiveCat = {
      kind: "cat",
      name: "Whiskers",
      meow: true,
      friend: {
        kind: "dog",
        name: "Rex",
        bark: false,
        friend: undefined,
        friends: undefined,
        lookup: undefined,
      },
      friends: [
        {
          kind: "cat",
          name: "Kitten",
          meow: false,
          friend: undefined,
          friends: undefined,
          lookup: undefined,
        },
      ],
      lookup: {
        best: {
          kind: "dog",
          name: "Rex",
          bark: false,
          friend: undefined,
          friends: undefined,
          lookup: undefined,
        },
      },
    };

    it("get", async () => {
      assert.deepEqual(await client.recursive.get(), cat);
    });

    it("put", async () => {
      assert.isUndefined(await client.recursive.put(cat));
    });
  });
});
