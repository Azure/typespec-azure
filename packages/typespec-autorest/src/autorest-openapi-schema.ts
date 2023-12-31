let AutorestOpenAPISchema: any;
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  AutorestOpenAPISchema = (await import("../../schema/dist/schema.js")).default;
} catch {
  const name = "../schema/dist/schema.js";
  AutorestOpenAPISchema = (await import(/* @vite-ignore */ name)).default;
}

export { AutorestOpenAPISchema };
