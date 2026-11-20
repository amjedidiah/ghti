// Preloaded by `bun test` (bunfig.toml): a DOM for React Testing Library.
// It must run before Testing Library loads (it binds `screen` to
// document.body on import), hence a preload. happy-dom also brings its own
// streams and fetch classes; server code under test (e.g. React Email
// rendering) needs Bun's, so those are kept. FormData, Blob and File stay
// happy-dom's, so `new FormData(form)` reads the rendered form.
// jest-dom and Testing Library load @testing-library/dom, so both are imported
// only after the DOM exists.
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, expect } from "bun:test";

const KEEP = [
  "ReadableStream",
  "WritableStream",
  "TransformStream",
  "TextEncoder",
  "TextDecoder",
  "fetch",
  "Request",
  "Response",
  "Headers",
  "URL",
  "URLSearchParams",
  "AbortController",
  "AbortSignal",
] as const;

const saved = Object.fromEntries(KEEP.map((name) => [name, globalThis[name]]));
GlobalRegistrator.register({ url: "http://localhost:3000/" });
Object.assign(globalThis, saved);

// The CommonJS build has no default export at runtime, while its types say otherwise.
const jestDom = await import("@testing-library/jest-dom/matchers");
expect.extend(
  ("default" in jestDom && jestDom.default ? jestDom.default : jestDom) as Parameters<
    typeof expect.extend
  >[0],
);

const { cleanup } = await import("@testing-library/react");
afterEach(() => cleanup());
