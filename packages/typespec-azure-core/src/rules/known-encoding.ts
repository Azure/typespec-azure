import { ModelProperty, Scalar, createRule, getEncode, paramMessage } from "@typespec/compiler";

const knownEncodings = new Set([
  // utcDateTime and offsetDateTime
  "rfc3339",
  "rfc7231",
  "unixTimestamp",
  // duration
  "ISO8601",
  "seconds",
  // bytes
  "base64",
  "base64url",
]);
export const knownEncodingRule = createRule({
  name: "known-encoding",
  description: "Check for supported encodings.",
  severity: "warning",
  messages: {
    default: paramMessage`Encoding "${"encoding"}" is not supported for Azure Services. Known encodings are: ${"knownEncodings"}`,
  },
  create(context) {
    function checkEncoding(type: ModelProperty | Scalar) {
      const encode = getEncode(context.program, type);
      if (encode && encode.encoding) {
        if (!knownEncodings.has(encode.encoding)) {
          context.reportDiagnostic({
            format: {
              encoding: encode.encoding,
              knownEncodings: [...knownEncodings].join(","),
            },
            target: type,
          });
        }
      }
    }

    return {
      modelProperty: (property: ModelProperty) => checkEncoding(property),
      scalar: (scalar: Scalar) => checkEncoding(scalar),
    };
  },
});
