import {
  createRule,
  fileRef,
  getDoc,
  getDocDiagnosticTarget,
  getErrorsDoc,
  getReturnsDoc,
  type DiagnosticTarget,
  type Operation,
  type Type,
} from "@typespec/compiler";

const localizedDocLink = /https:\/\/docs\.microsoft\.com\/\w+-\w+\/azure\//;

export const noLocalizedDocLinksRule = createRule({
  name: "no-localized-doc-links",
  docs: fileRef.fromPackageRoot("src/rules/no-localized-doc-links.md"),
  description: "Documentation links must not force a locale.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-localized-doc-links",
  messages: {
    default: "Remove the locale from the Microsoft documentation link.",
  },
  create(context) {
    const reported = new Map<object, Set<object>>();

    function reportOnce(target: Type, diagnosticTarget: DiagnosticTarget = target) {
      const location = diagnosticTarget === target ? (target.node ?? target) : diagnosticTarget;
      const source = target.node ?? target;
      let sources = reported.get(location);
      if (!sources) {
        sources = new Set();
        reported.set(location, sources);
      }
      if (!sources.has(source)) {
        sources.add(source);
        context.reportDiagnostic({ target: diagnosticTarget });
      }
    }

    function checkDoc(
      target: Type,
      doc: string | undefined = getDoc(context.program, target),
      diagnosticTarget: DiagnosticTarget | undefined = getDocDiagnosticTarget(
        context.program,
        target,
      ),
    ) {
      if (!doc || !localizedDocLink.test(doc)) {
        return;
      }

      reportOnce(target, diagnosticTarget ?? target);
    }

    function checkOperation(operation: Operation) {
      const docs = [
        {
          doc: getDoc(context.program, operation),
          target: getDocDiagnosticTarget(context.program, operation),
        },
        {
          doc: getReturnsDoc(context.program, operation),
          target: getDocDiagnosticTarget(context.program, operation, "returns"),
        },
        {
          doc: getErrorsDoc(context.program, operation),
          target: getDocDiagnosticTarget(context.program, operation, "errors"),
        },
      ];
      const localizedDoc = docs.find(({ doc }) => doc !== undefined && localizedDocLink.test(doc));
      if (localizedDoc) {
        reportOnce(operation, localizedDoc.target ?? operation);
      }
    }

    return {
      namespace: checkDoc,
      interface: checkDoc,
      operation: checkOperation,
      model: checkDoc,
      modelProperty: checkDoc,
      scalar: checkDoc,
      enum: checkDoc,
      enumMember: checkDoc,
      union: checkDoc,
      unionVariant: checkDoc,
    };
  },
});
