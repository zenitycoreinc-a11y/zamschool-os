import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const adminUsersSource = readFileSync(
  new URL("./app/app/admin/users/page.tsx", import.meta.url),
  "utf8"
);
const bulkImportSource = readFileSync(
  new URL("./components/BulkImport.tsx", import.meta.url),
  "utf8"
);

assert.match(
  adminUsersSource,
  /className="w-full max-w-5xl max-h-\[92vh\] min-h-0 overflow-hidden rounded-\[32px\] bg-white border border-slate-200 shadow-2xl shadow-slate-900\/10 flex flex-col"/,
  "The create-user modal should use a flex column shell so the footer stays reachable while the body scrolls."
);

assert.match(
  adminUsersSource,
  /className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-4"/,
  "The create-user modal body should own scrolling instead of relying on a hard-coded max-height."
);

assert.match(
  bulkImportSource,
  /aria-controls="bulk-import-file-input"/,
  "The bulk import trigger should expose which file input it controls."
);

assert.match(
  bulkImportSource,
  /id="bulk-import-file-input"/,
  "The bulk import file input should have a stable id for accessible wiring."
);

assert.match(
  bulkImportSource,
  /className="sr-only"/,
  "The bulk import file input should remain available to assistive technology instead of being fully hidden."
);

console.log("ui-regression.test.mjs passed");
