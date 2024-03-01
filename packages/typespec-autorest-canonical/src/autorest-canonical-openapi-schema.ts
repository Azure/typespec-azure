let AutorestcanonicalOpenAPISchema: any;
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  AutorestcanonicalOpenAPISchema = (await import("../../schema/dist/schema.js")).default;
} catch {
  const name = "../schema/dist/schema.js";
  AutorestcanonicalOpenAPISchema = (await import(/* @vite-ignore */ name)).default;
}

export { AutorestcanonicalOpenAPISchema };
