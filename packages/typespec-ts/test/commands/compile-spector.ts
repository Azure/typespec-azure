import {
  compile,
  logDiagnostics,
  NodeHost,
  normalizePath,
  resolveCompilerOptions,
} from "@typespec/compiler";

const entrypoint = normalizePath(process.argv[2]);
const fixtureConfig = normalizePath(process.argv[3]);
const cwd = process.cwd();

const [fixture, fixtureDiagnostics] = await resolveCompilerOptions(NodeHost, {
  entrypoint,
  configPath: fixtureConfig,
  cwd,
  env: process.env,
});
if (fixtureDiagnostics.length > 0) {
  logDiagnostics(fixtureDiagnostics, NodeHost.logSink);
  process.exit(1);
}

const [source, diagnostics] = await resolveCompilerOptions(NodeHost, {
  entrypoint,
  cwd,
  env: process.env,
});
if (diagnostics.length > 0) {
  logDiagnostics(diagnostics, NodeHost.logSink);
  process.exit(1);
}
// Keep the fixture options and inherited project features, but use the source config's project root.
const program = await compile(NodeHost, entrypoint, { ...fixture, config: source.config });
logDiagnostics(program.diagnostics, NodeHost.logSink);
if (program.hasError()) {
  process.exitCode = 1;
}
