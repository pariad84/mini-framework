# mini-framework

A minimal, schema-driven CRUD framework, distilled from [devtool.simple](https://github.com/pariad84/devtool.simple)'s `fn.js` down to seven essentials:

1. `fn.element.create` -- the one DOM-builder primitive everything else is built from.
2. `fn.component.layout.set/get/create` -- a named-layout registry/dispatcher.
3. `fn.data.select/insert/update/delete` -- a CRUD abstraction (localStorage-backed here; swapping the storage layer only means rewriting these four functions).
4. Schema-driven `form`/`list` layouts -- a `resource: {key, columns}` shape plus `data`/`datas` mechanically drives a full CRUD UI, no per-resource UI code. `list` pages itself past `opt.pageSize` rows (default 10), paired with a `pagination` layout that finds its own `list` via `.closest('.__list')` rather than a caller-injected callback.
5. A `render` escape hatch -- a column can carry a JS source string instead of a fixed type, letting a resource definition (pure data) extend what a field/cell does without touching this file.
6. A resource-reference field (`column.form.resource: {key, label}`) -- a select whose options come from another resource's rows, auto-resolved to a label everywhere it's displayed.
7. The `opt` single-parameter convention, and self-contained components that find their own context via `.closest('.__popup')` / `.querySelector('.__form')` instead of caller-injected callbacks.

No build step, no dependencies. This repo's own `fn.js` (named the same as devtool.simple's, on
purpose -- it's the distilled version of it) is one of two plain `<script>` files the framework
loads in order: `fn.js` (the core -- essentials #1-3, #5) and `fn.component.layout.set.js` (the
`popup`/`close-btn`/`save-btn`/`form`/`list` layouts it registers, essentials #4, #6, #7). Both
attach to the same global `fn` object; there's nothing to import or bundle.

## Why this exists

`devtool.simple` is a single-file bookmarklet devtool built on exactly this pattern. This repo pulls the framework layer out on its own, on the theory that a framework should be validated on a *second*, unrelated app before you trust that it's actually reusable and not just convenient for the one thing it was built for.

## Design history

This framework's shape was validated against two throwaway example apps -- a floating-popup task tracker (Projects + Tasks) and a multi-page recipe site using hash routing (Categories + Recipes) -- before both were removed once they'd done their job. Three real gaps they surfaced are still reflected in the code today:

- The `form` layout had no `textarea` support at all (only text input, select, and the render escape hatch) -- fixed by adding the `textarea` form type.
- `list`'s row-click always opened its edit popup with `caller: e.target.closest('.__popup')`, so a list embedded directly in a page (not inside a popup) had no way to get refreshed after an edit -- fixed by letting an explicit `caller` passed to `list` win over the auto-detected one.
- Every popup's/page's own `.refresh()` had to hand-clear its container's children before recreating the list inside it, reaching past `fn.component.create` into raw DOM (`.children`, `.remove()`) -- fixed by adding `fn.component.refresh`, so `.refresh()` implementations only ever call back into the framework.
- `list` had no way to page through a resource with more than a handful of rows -- fixed by adding a `pagination` layout paired with `list` (list slices its own `datas` by `opt.pageSize` and keeps the current page on its own `.__list` wrapper; `pagination`'s Prev/Next buttons find that wrapper via `.closest('.__list')`, the same self-contained convention `close-btn`/`save-btn` already used, instead of `list` handing them a callback).

## Using it

Load `fn.js` then `fn.component.layout.set.js` as plain `<script>` tags, in that order, before your app's own script -- both attach to the same global `fn`, no build step needed.

## Examples

`index.html` at the repo root lists every example app, each in its own folder next to it. Open it (serve the directory, e.g. `npx serve .`) to browse them:

- `crm/` -- Contacts + Deals, mobile-oriented (bottom tab bar, full-width touch-sized buttons), with Deals referencing both a Contact and a Stage (Stage is itself a seeded resource, so a fixed set of choices needs no framework change). Its `mobile-layout.js` re-registers `popup`/`close-btn`/`save-btn`/`form` with mobile-appropriate styling (full-screen modal instead of a small fixed-position box, 16px inputs, bigger tap targets) -- registering the same layout names again through `fn.component.layout.set` overrides the framework's defaults entirely from within the example folder, no framework file touched. `list` pages itself once a list passes 10 rows.
- `windows-os/` -- a Folders + Files file manager (Files referencing a Folder), styled as a Windows-OS-style desktop: draggable/resizable/minimizable/maximizable windows, a taskbar with running-window buttons and a clock, and a Start menu, all in `desktop-chrome.js`. This is the same override technique `crm/mobile-layout.js` uses (re-registering `popup`/`close-btn`/`save-btn` plus new app-only layouts -- `desktop`, `taskbar`, `taskbar-windows`, `clock`, `start-menu`, `desktop-icon`, `minimize-btn`, `maximize-btn`), applied to exactly the UI chrome CLAUDE.md calls out of scope for the framework itself (popup dragging/resizing, z-index, cascading position).

## Known limitation: swapping to a real network backend isn't free

Essential #3 above claims that swapping the storage layer only means rewriting `fn.data.select/insert/update/delete`. Verified against a real local HTTP server, that claim holds *only* because those four functions can stay synchronous (using synchronous XHR to keep the exact same call-and-get-a-return-value shape localStorage has) -- no other file needed a single change.

A real production backend would use `fetch`/Promises instead, which means `fn.data.*` would have to become async -- and every place that currently does `var rows = fn.data.select(...)` and uses `rows` immediately (throughout `list`/`form`, and every app built on them) would need to change too. That ripple is real work, and deliberately not done speculatively: the right async shape (loading states, error handling, what a popup does mid-save) can only be designed against a real backend that needs it, not guessed at in the abstract. See "Adding to the framework" in CLAUDE.md -- this is the same principle, applied to a foundational shape instead of a single feature.

## Relationship to devtool.simple

This is a one-way extraction, not a shared dependency: `devtool.simple`'s `fn.js` stays fully self-contained (a single file is core to it being a bookmarklet), so it doesn't load anything from here. If a fix or improvement discovered here (like the `textarea` gap above) is worth having in `devtool.simple` too, it gets ported over by hand.
