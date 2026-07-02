---
name: Admin Corrections tool extension pattern
description: How to add a new record type (e.g. Seva) to the admin Corrections/Rectifications tool
---

The admin Corrections tool (`client/src/pages/admin-corrections.tsx` + `POST /api/admin/corrections/update` in `server/routes.ts`) follows a consistent per-record-type branch pattern: each record type (yatri, fastline, seva) gets its own `if/else if` branch on both frontend and backend with parallel `original*`/edit* state pairs, a dirty-check per field, and a payload builder that appends a human-readable summary line to `remarks` (or `donationDetails` for fastline) along with the admin's identity.

**Why:** Keeping each record type as an isolated branch (rather than a generic field-diffing abstraction) matches how the upstream Sringeri API's `updateRecordCorrection` endpoint expects differently-shaped payloads per record type, and made backend verification straightforward via `stringFieldDefs`/`booleanFieldDefs`/`idFieldDefs` arrays.

**How to apply:** When adding another record type, mirror the existing seva/fastline branches exactly — reuse shared fields like `devoteeName`/`isPrinted` across branches where the underlying data model overlaps, and use lookup-backed `<select>` dropdowns (fetched via `useQuery`) for any field that has a canonical ID+name relationship (e.g. Nakshatra/Rashi/Postage), following `client/src/pages/seva.tsx`'s pattern of filtering Rashi options by the selected Nakshatra's `rashiIds`.

Testing note: this admin page gates on `hasAdminRole("accounts")`, which comes from the `admin_roles` DB table or the `ANALYTICS_ADMIN_UIDS`/`QUIZ_ADMIN_UIDS` env-var fallback (grants `super_admin`). No dev/test admin account exists by default — without one, you cannot click through the actual save flow and must rely on TypeScript compilation + careful code review of the payload/field mapping.
