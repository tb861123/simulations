// Browser Web Worker entry: thin wrapper around the shared request handler.
import { handle } from './worker-core.ts';
import type { Request } from './messages.ts';

self.onmessage = (e: MessageEvent<Request>) => {
  const { res, transfer } = handle(e.data);
  (self as unknown as Worker).postMessage(res, transfer);
};
