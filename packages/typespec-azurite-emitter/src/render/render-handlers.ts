import type { ServerModel } from "../model.js";
import { renderFileHeader } from "./type-ref.js";

/**
 * Renders the `handlers.ts` artifact: one handler interface aggregating every operation,
 * which a server implementor (Azurite) fills in with real emulator behavior. Modeled on
 * Azurite's existing generated handler interfaces (e.g.
 * `src/queue/generated/handlers/IQueueHandler.ts`), whose methods take the shape
 * `methodName(options: Models.XxxOptionalParams, context: Context): Promise<Models.XxxResponse>`
 * - i.e. a typed parameters object *and* a trailing per-request `context` object, not just the
 * parameters. We mirror that trailing-context shape here with a minimal placeholder `Context`
 * type (Azurite's real `Context` - see `src/queue/generated/Context.ts` - additionally exposes
 * the matched `operation`, the raw `request`/`response`, and dispatch bookkeeping; this pilot
 * only needs to prove the shape, not reproduce that behavior).
 */
export function renderHandlers(serverModel: ServerModel): string {
  const parts: string[] = [
    renderFileHeader(),
    `import type {`,
    ...serverModel.operations.map((op) => `  ${op.name}Parameters,`),
    ...serverModel.operations.map((op) => `  ${op.name}Response,`),
    `} from "./operations.js";`,
    "",
    `/**`,
    ` * Minimal placeholder for Azurite's real per-request \`Context\` object (see`,
    ` * \`src/queue/generated/Context.ts\` in Azure/Azurite). Handler implementations receive this`,
    ` * as their last argument alongside the typed operation parameters.`,
    ` */`,
    `export interface Context {`,
    `  readonly contextId: string;`,
    `}`,
    "",
    `export interface IServiceHandler {`,
  ];

  for (const op of serverModel.operations) {
    const methodName = op.name[0].toLowerCase() + op.name.slice(1);
    if (op.doc) {
      parts.push(`  /** ${op.doc} */`);
    }
    parts.push(
      `  ${methodName}(params: ${op.name}Parameters, context: Context): Promise<${op.name}Response>;`,
    );
  }

  parts.push(`}`, "");
  return parts.join("\n");
}
