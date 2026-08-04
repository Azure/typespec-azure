import { describe, expect, it } from "vitest";
import { emitGoFor } from "./scenario-runner.js";

describe("header canonicalization", () => {
  it("canonicalizes names passed to Header.Get and Header.Set only", async () => {
    const files = await emitGoFor(
      `
        @service(#{ title: "Headers" })
        namespace Headers;

        model HeaderResponse {
          @statusCode statusCode: 200;
          @header("x-response-header") responseHeader: string;
        }

        @get op read(
          @header("x-request-header") requestHeader: string,
        ): HeaderResponse;
      `,
      { "generate-fakes": true },
    );
    const generated = [...files.values()].join("\n");

    expect(generated).toContain('resp.Header.Get("X-Response-Header")');
    expect(generated).toContain('resp.Header.Set("X-Response-Header",');
    expect(generated).toContain('req.Raw().Header["x-request-header"]');
  });
});
