let AutorestCanonicalOpenAPISchema: any;
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  AutorestCanonicalOpenAPISchema = (await import("../../schema/dist/schema.js")).default;
} catch {
  const name = "../schema/dist/schema.js";
  AutorestCanonicalOpenAPISchema = (await import(/* @vite-ignore */ name)).default;
}

export { AutorestCanonicalOpenAPISchema };
