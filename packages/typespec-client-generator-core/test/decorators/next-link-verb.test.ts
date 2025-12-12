import { t } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { it } from "vitest";
import { createTCGCContext } from "../../src/context.js";
import { getNextLinkVerb } from "../../src/decorators.js";
import { SimpleTesterWithBuiltInService } from "../tester.js";

it("should store next link verb HTTP verb", async () => {
  const { listItems, program } = await SimpleTesterWithBuiltInService.compile(t.code`
    model ListTestResult {
      @pageItems
      tests: Test[];
      @nextLink
      next: string;
    }
    
    model Test {
      id: string;
    }
    
    @Legacy.nextLinkVerb("POST")
    @list
    @post
    op ${t.op("listItems")}(): ListTestResult;
  `);

  const tcgcContext = createTCGCContext(program);
  const verb = getNextLinkVerb(tcgcContext, listItems);
  strictEqual(verb, "POST");
});

it("should apply nextLinkVerb with language scope", async () => {
  const { listItems, program } = await SimpleTesterWithBuiltInService.compile(t.code`
    model ListTestResult {
      @pageItems
      tests: Test[];
      @nextLink
      next: string;
    }
    
    model Test {
      id: string;
    }

    @Legacy.nextLinkVerb("POST", "java")
    @list
    @post
    op ${t.op("listItems")}(): ListTestResult;
  `);

  const tcgcContext = createTCGCContext(program, "@azure-tools/typespec-java");
  const verb = getNextLinkVerb(tcgcContext, listItems);
  strictEqual(verb, "POST");
});

it("should return GET when decorator is not applied", async () => {
  const { listItems, program } = await SimpleTesterWithBuiltInService.compile(t.code`
    model ListTestResult {
      @pageItems
      tests: Test[];
      @nextLink
      next: string;
    }
    
    model Test {
      id: string;
    }
    
    @list
    @post
    op ${t.op("listItems")}(): ListTestResult;
  `);

  const tcgcContext = createTCGCContext(program);
  const verb = getNextLinkVerb(tcgcContext, listItems);
  strictEqual(verb, "GET");
});

it("should support POST and GET HTTP verbs", async () => {
  const { listWithGet, listWithPost, program } =
    await SimpleTesterWithBuiltInService.compile(t.code`
    model ListTestResult {
      @pageItems
      tests: Test[];
      @nextLink
      next: string;
    }
    
    model Test {
      id: string;
    }
    
    @Legacy.nextLinkVerb("GET")
    @list
    @route("/list-get")
    @post
    op ${t.op("listWithGet")}(): ListTestResult;

    @Legacy.nextLinkVerb("POST")
    @list
    @route("/list-post")
    @post
    op ${t.op("listWithPost")}(): ListTestResult;
  `);

  const tcgcContext = createTCGCContext(program);

  const getVerb = getNextLinkVerb(tcgcContext, listWithGet);
  strictEqual(getVerb, "GET");

  const postVerb = getNextLinkVerb(tcgcContext, listWithPost);
  strictEqual(postVerb, "POST");
});

it("should reject invalid HTTP verbs", async () => {
  const diagnostics = await SimpleTesterWithBuiltInService.diagnose(`
    model ListTestResult {
      @pageItems
      tests: Test[];
      @nextLink
      next: string;
    }
    
    model Test {
      id: string;
    }
    
    @Legacy.nextLinkVerb("PATCH")
    @list
    @post
    op listItems(): ListTestResult;
  `);

  strictEqual(diagnostics.length, 1);
  strictEqual(diagnostics[0].code, "invalid-argument");
});
