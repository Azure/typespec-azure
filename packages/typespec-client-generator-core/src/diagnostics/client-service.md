This diagnostic is issued when a client declared with `@client` is not inside a namespace decorated with `@service`, so TCGC cannot associate the client with a service.

To fix this issue, move the client inside the service namespace, or pass the service explicitly with `@client({ service: MyServiceNS })`.
