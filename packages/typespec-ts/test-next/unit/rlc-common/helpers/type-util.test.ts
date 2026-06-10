import { describe, expect, it } from "vitest";

import {
  TypeScriptType,
  getArrayObjectType,
  getNativeArrayType,
  getRecordType,
  getUnionType,
  isArray,
  isBoolLiteral,
  isConstant,
  isNumericLiteral,
  isRecord,
  isStringLiteral,
  isUnion,
  leaveBracket,
  leaveStringQuotes,
  toTypeScriptTypeFromName,
  toTypeScriptTypeFromSchema,
} from "../../../../src/rlc-common/helpers/type-util.js";

describe("#isStringLiteral", () => {
  it("should return true if the string is quoted", () => {
    expect(isStringLiteral(`''`)).toBe(true);
    expect(isStringLiteral(`""`)).toBe(true);
    expect(isStringLiteral(`"'xxx'"`)).toBe(true);
    expect(isStringLiteral(`"string"`)).toBe(true);
    expect(isStringLiteral(`"string|test|aaa "`)).toBe(true);
    expect(isStringLiteral(`'string'`)).toBe(true);
    expect(isStringLiteral(`'   string  ssss '`)).toBe(true);
    expect(
      isStringLiteral(
        `"啊齄丂狛狜隣郎隣兀﨩ˊ〞〡￤℡㈱‐ー﹡﹢﹫、〓ⅰⅹ⒈€㈠㈩ⅠⅫ！￣ぁんァヶΑ︴АЯаяāɡㄅㄩ─╋︵﹄︻︱︳︴ⅰⅹɑɡ〇〾⿻⺁䜣€"`,
      ),
    ).toBe(true);
  });

  it("should return false if the string is not quoted", () => {
    expect(isStringLiteral(`string`)).toBe(false);
    expect(isStringLiteral(`true`)).toBe(false);
    expect(isStringLiteral(`123`)).toBe(false);
    expect(isStringLiteral(`null`)).toBe(false);
    expect(isStringLiteral(`undefined`)).toBe(false);
    expect(isStringLiteral(`"application/json" | "application/octet-stream"`)).toBe(false);
  });
});

describe("#isNumericLiteral", () => {
  it("should return true if the string is numeric", () => {
    expect(isNumericLiteral(`123`)).toBe(true);
    expect(isNumericLiteral(`0.123`)).toBe(true);
  });

  it("should return false if the string is not numeric", () => {
    expect(isNumericLiteral(`string`)).toBe(false);
    expect(isNumericLiteral(`"123"`)).toBe(false);
  });
});

describe("#isBoolLiteral", () => {
  it("should return true if the string is boolean", () => {
    expect(isBoolLiteral(`true`)).toBe(true);
    expect(isBoolLiteral(`false`)).toBe(true);
  });

  it("should return false if the string is not boolean", () => {
    expect(isBoolLiteral(`unknown`)).toBe(false);
    expect(isBoolLiteral(`"true"`)).toBe(false);
    expect(isBoolLiteral(`"false"`)).toBe(false);
    expect(isBoolLiteral('"boolean"')).toBe(false);
  });
});

describe("#isConstant", () => {
  it("should return true if the string is constant", () => {
    expect(isConstant(`null`)).toBe(true);
  });

  it("should return false if the string is not constant", () => {
    expect(isConstant(`undefined`)).toBe(false);
  });
});

describe("#isRecord", () => {
  it("should return true if the string is record", () => {
    expect(isRecord(`Record<string, string>`)).toBe(true);
    expect(isRecord(`Record<string, string | "1">`)).toBe(true);
    expect(isRecord(`Record<string, Record<string, any>>`)).toBe(true);
    expect(isRecord(`Record<string, string[]>`)).toBe(true);
    expect(isRecord(`Record<string, Array<SimpleModel>>`)).toBe(true);
    expect(isRecord(`Record<string, SimpleModel>`)).toBe(true);
    expect(isRecord(`Record<string, "a" | "b">`)).toBe(true);
  });

  it("should return false if the string is not record", () => {
    expect(isRecord(`Record<string, string> | string`)).toBe(false);
  });
});

describe("#getRecordType", () => {
  it("should return the type of the record", () => {
    expect(getRecordType(`Record<string, string>`)).to.equal("string");
    expect(getRecordType(`Record<string, string | "1">`)).to.equal('string | "1"');
    expect(getRecordType(`Record<string, Record<string, any>>`)).to.equal("Record<string, any>");
    expect(getRecordType(`Record<string, string[]>`)).to.equal("string[]");
    expect(getRecordType(`Record<string, Array<SimpleModel>>`)).to.equal("Array<SimpleModel>");
    expect(getRecordType(`Record<string, SimpleModel>`)).to.equal("SimpleModel");
    expect(getRecordType(`Record<string, "a" | "b">`)).to.equal(`"a" | "b"`);
  });
});

describe("#isArray", () => {
  it("should return true if the string is array", () => {
    expect(isArray(`string[]`)).toBe(true);
    expect(isArray(`Array<Model>`)).toBe(true);
    expect(isArray(`Array<string | number>`)).toBe(true);
    expect(isArray(`Array<A>`)).toBe(true);
    expect(isArray(`true[]`)).toBe(true);
    expect(isArray(`false[]`)).toBe(true);
    expect(isArray(`null[]`)).toBe(true);
    expect(isArray(`undefined[]`)).toBe(true);
    expect(isArray(`"string"[]`)).toBe(true);
    expect(isArray(`123[]`)).toBe(true);
  });

  it("should return false if the string is not array", () => {
    expect(isArray(`Record<string, string[]>`)).toBe(false);
  });
});

describe("#getArrayObjectType", () => {
  it("should return the type of the array", () => {
    expect(getArrayObjectType(`Array<Model>`)).to.equal("Model");
    expect(getArrayObjectType(`Array<A>`)).to.equal("A");
    expect(getArrayObjectType(`Array<string | number>`)).to.equal("string | number");
  });
});

describe("#getNativeArrayType", () => {
  it("should return the type of the array", () => {
    expect(getNativeArrayType(`string[]`)).to.equal("string");
    expect(getNativeArrayType(`"t"[]`)).to.equal(`"t"`);
    expect(getNativeArrayType(`true[]`)).to.equal(`true`);
    expect(getNativeArrayType(`123[]`)).to.equal(`123`);
  });
});

describe("#isUnion", () => {
  it("should return true if the string is union", () => {
    expect(isUnion(`string | number`)).toBe(true);
    expect(isUnion(`string | "a"`)).toBe(true);
    expect(isUnion(`1 | "a"`)).toBe(true);
    expect(isUnion(`Record<string, string> | string`)).toBe(true);
    expect(isUnion(`string[] | string`)).toBe(true);
    expect(isUnion(`"application/json" | "application/octet-stream"`)).toBe(true);
    expect(isUnion(`true | 123 | "application/xml"`)).toBe(true);
  });

  it("should return false if the string is not union", () => {
    expect(isUnion(`Record<string, string | "sss">`)).toBe(false);
    expect(isUnion(`"sss | tt"`)).toBe(false);
    expect(isUnion(`"application/json | application/octet-stream"`)).toBe(false);
  });
});

describe("#getUnionType", () => {
  it("should return the type of the union", () => {
    expect(getUnionType(`string | number`)).to.equal("string");
  });
});

describe("#leaveBracket", () => {
  it("should return the string without bracket", () => {
    expect(leaveBracket(`(string)`)).to.equal("string");
  });

  it("should keep brackets that are inside a quoted string", () => {
    expect(leaveBracket(`" include (not in)"`)).to.equal(`" include (not in)"`);
  });
});

describe("#leaveStringQuotes", () => {
  it("should return the string without quotes", () => {
    expect(leaveStringQuotes(`"string"`)).to.equal("string");
    expect(leaveStringQuotes(`'string'`)).to.equal("string");
  });

  it("should keep quotes when the string is not fully quoted", () => {
    expect(leaveStringQuotes(`"s" | "b"`)).to.equal(`"s" | "b"`);
    expect(leaveStringQuotes(`'s' | 'b'`)).to.equal(`'s' | 'b'`);
    expect(leaveStringQuotes(`"s" | 'b'`)).to.equal(`"s" | 'b'`);
    expect(leaveStringQuotes(`true`)).to.equal(`true`);
    expect(leaveStringQuotes(`'sss"`)).to.equal(`'sss"`);
  });
});

describe("#toTypeScriptTypeFromName", () => {
  it("should return the typeScriptType from the type name", () => {
    expect(toTypeScriptTypeFromName("string")).to.equal(TypeScriptType.string);
    expect(toTypeScriptTypeFromName("number")).to.equal(TypeScriptType.number);
    expect(toTypeScriptTypeFromName("boolean")).to.equal(TypeScriptType.boolean);
    expect(toTypeScriptTypeFromName("Date")).to.equal(TypeScriptType.date);
    expect(toTypeScriptTypeFromName("string[]")).to.equal(TypeScriptType.array);
    expect(toTypeScriptTypeFromName("Record<string, string>")).to.equal(TypeScriptType.record);
    expect(toTypeScriptTypeFromName("Date | string")).to.equal(TypeScriptType.union);
    expect(toTypeScriptTypeFromName(`"constant"`)).to.equal(TypeScriptType.constant);
    expect(toTypeScriptTypeFromName("unknown")).to.equal(TypeScriptType.unknown);
  });

  it("should return undefined if the type name is not supported", () => {
    expect(toTypeScriptTypeFromName("unknownType")).toBeUndefined();
  });
});

describe("#toTypeScriptTypeFromSchema", () => {
  it("should return the typeScriptType from the schema", () => {
    expect(toTypeScriptTypeFromSchema({ type: "string", name: "foo" })).to.equal(
      TypeScriptType.string,
    );
    expect(toTypeScriptTypeFromSchema({ type: "number", name: "foo" })).to.equal(
      TypeScriptType.number,
    );
    expect(toTypeScriptTypeFromSchema({ type: "boolean", name: "foo" })).to.equal(
      TypeScriptType.boolean,
    );
    expect(
      toTypeScriptTypeFromSchema({
        type: "string",
        name: "string",
        typeName: "Date | string",
        outputTypeName: "string",
      }),
    ).to.equal(TypeScriptType.date);
    expect(toTypeScriptTypeFromSchema({ type: "object", name: "foo" })).to.equal(
      TypeScriptType.object,
    );
    expect(toTypeScriptTypeFromSchema({ type: "array", name: "foo" })).to.equal(
      TypeScriptType.array,
    );
    expect(toTypeScriptTypeFromSchema({ type: "dictionary", name: "foo" })).to.equal(
      TypeScriptType.record,
    );
    expect(
      toTypeScriptTypeFromSchema({
        type: "union",
        name: "foo",
        enum: [{ type: "number", format: "int32" }],
      }),
    ).to.equal(TypeScriptType.union);
    expect(
      toTypeScriptTypeFromSchema({
        type: "string",
        enum: ["val1", "val2"],
        name: "foo",
      }),
    ).to.equal(TypeScriptType.enum);
    expect(
      toTypeScriptTypeFromSchema({
        isConstant: true,
        name: "foo",
        type: `"test"`,
      }),
    ).to.equal(TypeScriptType.constant);
    expect(toTypeScriptTypeFromSchema({ type: "unknown", name: "foo" })).to.equal(
      TypeScriptType.unknown,
    );
  });
  it("should return undefined if the schema is not supported", () => {
    expect(toTypeScriptTypeFromSchema({ type: "unknownType", name: "foo" })).toBeUndefined();
  });
});
