interface JavaWorker {
  TeaVM: {
    wasmGC: {
      load(url: string): Promise<{ exports: { main(args: string[]): void } }>;
    };
  };
  generateJava(model: unknown, options: string): Record<string, string>;
  onmessage: (event: MessageEvent<{ model: { arm?: boolean }; options: string }>) => Promise<void>;
  postMessage(message: { files?: Record<string, string>; error?: string }): void;
}

const scope = globalThis as unknown as JavaWorker;
scope.onmessage = async ({ data }) => {
  try {
    await import(new URL("./runtime.js", import.meta.url).href);
    const runtime = await scope.TeaVM.wasmGC.load(
      new URL(data.model.arm ? "./arm.wasm" : "./generator.wasm", import.meta.url).href,
    );
    await runtime.exports.main([]);
    scope.postMessage({ files: scope.generateJava(data.model, data.options) });
  } catch (error) {
    scope.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
