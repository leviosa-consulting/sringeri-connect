import assert from "node:assert/strict";
import { getPublicUrl, normalizePublicOrigin } from "../shared/public-origin";

const cases = [
  ["https://demo.replit.dev:5000", "https://demo.replit.dev"],
  ["https://demo.riker.replit.dev:5000", "https://demo.riker.replit.dev"],
  ["https://demo.replit.app:5000", "https://demo.replit.app"],
  ["http://localhost:5000", "http://localhost:5000"],
  ["http://127.0.0.1:5000", "http://127.0.0.1:5000"],
  ["https://www.sringeri.net:5000", "https://www.sringeri.net:5000"],
  ["https://demo.replit.dev:3001", "https://demo.replit.dev:3001"],
  ["https://demo.replit.dev", "https://demo.replit.dev"],
] as const;

for (const [origin, expected] of cases) {
  assert.equal(normalizePublicOrigin(origin), expected, origin);
}

console.log(`Public-origin checks passed (${cases.length} cases).`);

const urlCases = [
  ["https://demo.replit.dev:5000", "/knowledge/42", "https://demo.replit.dev/knowledge/42"],
  ["https://demo.replit.dev:5000", "/reset-password?oobCode=test-code", "https://demo.replit.dev/reset-password?oobCode=test-code"],
  ["https://demo.replit.dev:5000", "/api/paytm-callback", "https://demo.replit.dev/api/paytm-callback"],
  ["http://localhost:5000", "/knowledge/42", "http://localhost:5000/knowledge/42"],
] as const;

for (const [origin, path, expected] of urlCases) {
  assert.equal(getPublicUrl(origin, path), expected, `${origin}${path}`);
}

console.log(`Public URL checks passed (${urlCases.length} cases).`);