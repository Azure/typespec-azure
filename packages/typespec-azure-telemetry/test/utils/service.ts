import { createServer, IncomingMessage, Server } from "node:http";
import { AddressInfo } from "node:net";

export class MockTelemetryService {
  private server: Server;
  private userRequestListeners = new Map();

  constructor() {
    this.server = createServer();
    this.server.on("request", (_req, res) => {
      res.writeHead(200, "OK").end();
    });
  }

  async start() {
    return new Promise<AddressInfo>((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(() => {
        this.server.removeListener("error", reject);
        resolve(this.server.address() as AddressInfo);
      });
    });
  }

  get url(): string {
    const address = this.server.address();
    if (!address || typeof address === "string") throw new Error("Server is not listening");
    return `http://localhost:${address.port}`;
  }

  async stop() {
    return new Promise<void>((resolve) => {
      this.server.closeAllConnections?.();
      this.server.close(() => resolve());
      // remove any remaining listeners
      for (const [, wrappedCallback] of this.userRequestListeners) {
        this.server.off("request", wrappedCallback);
      }
      this.userRequestListeners.clear();
    });
  }

  on(event: "request", callback: (payload: string) => void) {
    if (event !== "request") return;

    const wrappedCallback = (req: IncomingMessage) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const payload = Buffer.concat(chunks).toString();
        callback(payload);
      });
    };

    this.userRequestListeners.set(callback, wrappedCallback);
    this.server.on("request", wrappedCallback);
  }

  off(event: "request", callback: (payload: string) => void) {
    if (event !== "request") return;

    const wrappedCallback = this.userRequestListeners.get(callback);
    if (wrappedCallback) {
      this.server.off("request", wrappedCallback);
      this.userRequestListeners.delete(callback);
    }
  }
}
