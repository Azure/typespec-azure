import { deepStrictEqual } from "assert";
import { it } from "vitest";
import { openApiFor } from "./test-host.js";

it("part of type `bytes` produce `type: file`", async () => {
  const res = await openApiFor(
    `
    op upload(@header contentType: "multipart/form-data", profileImage: bytes): void;
    `
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

it("part of type `string` produce `type: string`", async () => {
  const res = await openApiFor(
    `
    op upload(@header contentType: "multipart/form-data", name: string): void;
    `
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

// https://github.com/Azure/typespec-azure/issues/3860
it("part of type `object` produce `type: string`", async () => {
  const res = await openApiFor(
    `
    #suppress "@azure-tools/typespec-autorest/unsupported-multipart-type" "For test"
    op upload(@header contentType: "multipart/form-data", address: {city: string, street: string}): void;
    `
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
