import { deepStrictEqual } from "assert";
import { expect, it } from "vitest";
import { openApiFor } from "./test-host.js";

it("model properties are spread into individual parameters", async () => {
  const res = await openApiFor(
    `
    model Form { name: HttpPart<string>, profileImage: HttpPart<bytes> }
    op upload(@header contentType: "multipart/form-data", @multipartBody body: Form): void;
    `,
  );
  const op = res.paths["/"].post;
  deepStrictEqual(op.parameters, [
    {
      in: "formData",
      name: "name",
      required: true,
      type: "string",
    },
    {
      in: "formData",
      name: "profileImage",
      required: true,
      type: "file",
    },
  ]);
});

it("part of type `bytes` produce `type: file`", async () => {
  const res = await openApiFor(
    `
    op upload(@header contentType: "multipart/form-data", @multipartBody body: { profileImage: HttpPart<bytes> }): void;
    `,
  );
  const op = res.paths["/"].post;
  deepStrictEqual(op.parameters, [
    {
      in: "formData",
      name: "profileImage",
      required: true,
      type: "file",
    },
  ]);
});

it("part of type `bytes[]` produce `type: array, items: { type: string, format: binary }`", async () => {
  const res = await openApiFor(
    `
    op upload(@header contentType: "multipart/form-data", @multipartBody _: { profileImage: HttpPart<bytes>[]}): void;
    `,
  );
  const op = res.paths["/"].post;
  deepStrictEqual(op.parameters, [
    {
      in: "formData",
      name: "profileImage",
      required: true,
      type: "array",
      items: {
        type: "string",
        format: "binary",
      },
    },
  ]);
});

it("part of type `string` produce `type: string`", async () => {
  const res = await openApiFor(
    `
    op upload(@header contentType: "multipart/form-data", @multipartBody body: { name: HttpPart<string> }): void;
    `,
  );
  const op = res.paths["/"].post;
  deepStrictEqual(op.parameters, [
    {
      in: "formData",
      name: "name",
      required: true,
      type: "string",
    },
  ]);
});

it("doc of property is carried to the description field", async () => {
  const res = await openApiFor(
    `
  op upload(@header contentType: "multipart/form-data", @multipartBody _: { /** My doc */ name: HttpPart<string> }): void;
  `,
  );
  const param = res.paths["/"].post.parameters[0];
  expect(param.description).toEqual("My doc");
});

// https://github.com/Azure/typespec-azure/issues/3860
it("part of type `object` produce `type: string`", async () => {
  const res = await openApiFor(
    `
    #suppress "@azure-tools/typespec-autorest/unsupported-multipart-type" "For test"
    op upload(@header contentType: "multipart/form-data", @multipartBody _: { address: HttpPart<{city: string, street: string}>}): void;
    `,
  );
  const op = res.paths["/"].post;
  deepStrictEqual(op.parameters, [
    {
      in: "formData",
      name: "address",
      required: true,
      type: "string",
    },
  ]);
});
