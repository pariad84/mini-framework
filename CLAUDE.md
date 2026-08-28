# mini-framework

A minimal, schema-driven CRUD framework distilled from devtool.simple's `fn.js` down to seven
essentials (see README.md for the list). The framework is two files at the repo root, loaded as
plain `<script>` tags in this order: this repo's own `fn.js` -- named the same on purpose, it's
the distilled core primitives (`fn.element.create`, the layout registry, `fn.data.*`, `render`)
-- and `fn.component.layout.set.js` (the `popup`/`close-btn`/`save-btn`/`form`/`list` layouts it
registers on top of that core).
Together they know nothing about any specific app, the way `frameworkCore`/`frameworkLayouts`
sit under `devtoolExampleApp` in devtool.simple. The split is a hard rule: the framework files
must never reference anything app-specific (a resource key, a field name, a UI label), and any
app built on top must never reach past `fn.component.create`/`fn.data.*`/`fn.element.create` to
touch the DOM or storage directly. Example apps live in their own folders at the repo root,
listed from `index.html` -- currently `crm/`, `windows-os/`, and `android-phone/`.

## The three things that matter most

1. **Structural consistency.** Before adding or changing something, look at how the existing,
   similar pieces do it and match that shape. Don't let two things that do conceptually the
   same job drift into different implementations — extract a shared helper instead.
2. **Terminology.** Names should agree with each other end to end — the option key, the
   layout name, and the visible label should all describe the same concept the same way.
3. **Stay minimal.** This project's entire point is to be small enough to read in one sitting.
   A feature only belongs in `fn.js`/`fn.component.layout.set.js` if it's needed to keep the
   seven essentials genuinely usable — UI chrome (popup dragging/resizing, z-index
   auto-detection, scale/opacity settings, cascading popup position off a caller) is explicitly
   out of scope; devtool.simple already proved those are "the example app," not "the
   framework." When in doubt, build it in a throwaway app first — only promote something into
   the framework once a second real use needs it too (see "Adding to the framework" below).

## Conventions

- **Parameter naming**: every function takes a single options object named `opt`
  (`function(opt = {})`), read as `opt.thing`. No positional params for anything with more
  than one input.
- **Self-contained components**: a component should not need a caller-injected callback to do
  its job. A button finds its own context via `e.target.closest('.__popup')` /
  `.querySelector('.__form')` and acts on it directly, rather than the creator wiring up an
  `onClick`.
- **`caller`**: the popup (or any element with a `.refresh()`) responsible for opening another
  popup — used so `save-btn` can refresh whatever should show the new/changed row afterward.
  `list`'s row-click auto-detects it via `.closest('.__popup')`, but a caller can also be passed
  explicitly (`fn.component.create({ name: 'list', ..., caller: someEl })`) when the list isn't
  inside a popup at all, e.g. a plain page section — the explicit value always wins.
- **No CSS.** Everything is inline via `fn.element.create`'s `style` option. Don't introduce a
  `<style>` block or CSS classes for styling.
- **No comments.** If a name needs a comment to explain it, rename it instead. The exception is
  a comment marking which of the seven essentials a piece of code is (see the numbered
  comments already in `fn.js`/`fn.component.layout.set.js`) — keep those in sync if you
  reorder or rename things.
- **English only** for UI text, titles, and labels.
- **CRUD verbs**: `fn.data.select/insert/update/delete` follow SQL naming, matching
  devtool.simple. Don't introduce a different verb set (`get`/`fetch`/`remove`/etc.) for the
  same concept.
- **File order**: most foundational first, most composed last. Within `fn.js`: primitives
  (`fn.element.create`, the layout registry, `fn.data.*`) before the escape hatch (`render`).
  Within `fn.component.layout.set.js`: `popup` first (everything else's layouts reference its
  `.__popup` convention) before `close-btn`/`save-btn` before `form`/`list`.
- **Example folder structure**: `index.html` + `app.js` (the domain -- resources, seed data,
  launch code) always; add `layout.js` (loaded after `fn.component.layout.set.js`, before
  `app.js`) only if the example re-registers `popup`/`close-btn`/`save-btn`/etc. for its own
  visual theme (see `crm/`, `windows-os/`, `android-phone/`). Always name that file `layout.js`
  — not `mobile-layout.js`/`desktop-chrome.js`/etc. — so every example's chrome override lives
  in a file with the same name.

## Adding to the framework

Don't add a capability to the framework files because a hypothetical app might need it — add it
because a real app built on this actually needed it and the framework was missing it (see
README.md's "Design history" for the model cases this already produced). If none of the example
apps under the repo root actually exercise the gap you're worried about, build a throwaway app
that does (or extend an existing one) before touching the framework — fix the framework once
that app hits a real gap, then use the fix from that app, and note what real need drove it in
the commit message, not just what the diff does.

## Workflow for changes

1. Implement the change (in `fn.js`/`fn.component.layout.set.js` if it's the framework, or in
   whatever app you're building on top of it if it's app-specific).
2. `node --check` on every file you touched, to catch syntax errors.
3. Verify in an actual browser (Playwright) — load the relevant example's HTML file (e.g.
   `crm/index.html`), or build a scratch page loading `fn.js` then `fn.component.layout.set.js`
   if no example covers it, and drive it with Playwright — check the result (DOM state,
   localStorage). This project has no committed test suite, so this is the only real
   verification available before committing.
4. Commit and push.
