# mini-framework

A minimal, schema-driven CRUD framework built around seven essentials (see README.md for the
list). The framework is one file at the repo root: `fn.js` (the core primitives --
`fn.element.create`, the layout registry, `fn.data.*`, `render`). It knows nothing about any
specific app. The split is a hard rule: `fn.js` must never reference anything app-specific (a
resource key, a field name, a UI label), and any app built on top must never reach past
`fn.component.create`/`fn.data.*`/`fn.element.create` to touch the DOM or storage directly.
`fn.js` alone doesn't give you `popup`/`form`/`list`/etc. -- those are conventions each app
implements itself in its own `layout.js` (see "Example folder structure" below).
`fn.component.layout.js`, also at the repo root, is a reference implementation of those
conventions -- not a framework file and not a dependency any example currently loads, kept here
for later use. `fn.util.js`, also at the repo root, is different: `fn.util.selectFlat`/
`fn.util.newButton`/`fn.util.saveForm` are plain CRUD/UI-wiring logic with no reason to vary by
example the way a layout's look does, so every example does load it. Example apps live in their
own folders at the repo root, listed from `index.html` -- currently `crm/`, `windows-os/`,
`android-phone/`, `team-chat/`, `idle-hunter/`, and `signal-lost/`.

## The three things that matter most

1. **Structural consistency.** Before adding or changing something, look at how the existing,
   similar pieces do it and match that shape. Don't let two things that do conceptually the
   same job drift into different implementations — extract a shared helper instead.
2. **Terminology.** Names should agree with each other end to end — the option key, the
   layout name, and the visible label should all describe the same concept the same way.
3. **Stay minimal.** This project's entire point is to be small enough to read in one sitting.
   A feature only belongs in `fn.js` if it's needed to keep the seven essentials genuinely
   usable — UI chrome (popup dragging/resizing, z-index
   auto-detection, scale/opacity settings, cascading popup position off a caller) is explicitly
   out of scope: that's app-level polish, not framework behavior, as `crm/`, `windows-os/`, and
   `android-phone/` all demonstrate. When in doubt, build it in a throwaway app first — only
   promote something into the framework once a second real use needs it too (see "Adding to the
   framework" below).

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
  comments already in `fn.js` and `fn.component.layout.js`) — keep those in sync if you
  reorder or rename things.
- **English only** for UI text, titles, and labels.
- **CRUD verbs**: `fn.data.select/insert/update/delete` follow SQL naming. Don't introduce a
  different verb set (`get`/`fetch`/`remove`/etc.) for the same concept.
- **File order**: most foundational first, most composed last. Within `fn.js`: primitives
  (`fn.element.create`, the layout registry, `fn.data.*`) before the escape hatch (`render`).
  Within `fn.component.layout.js` and every example's `layout.js`: `popup` first (everything
  else's layouts reference its `.__popup` convention) before `close-btn`/`save-btn` before
  `form`/`list`/`pagination`.
- **Example folder structure**: `index.html` + `layout.js` + `app.js`, always, loaded in that
  order after `fn.js` and `fn.util.js`. `fn.js` alone doesn't register any layouts, so
  `layout.js` must define every one the app needs -- at minimum
  `popup`/`close-btn`/`save-btn`/`form` (plus `list`, and `pagination` if a list can grow past
  `pageSize`, for any resource the app browses as a list -- `team-chat/` has none, since it
  browses channels through its own `sidebar`/`channel-item` instead); copy from
  `fn.component.layout.js` as a starting point and re-theme only what the example's look needs
  to change (see `crm/`, `windows-os/`, `android-phone/`, `team-chat/`, `idle-hunter/`, `signal-lost/`). Always
  name that file `layout.js` — not `mobile-layout.js`/`desktop-chrome.js`/etc. — so every example's
  layouts live in a file with the same name. `form` must define `.save()` (insert-or-update
  against `fn.data`, using the form's own `el._.resource`/`el._.data` -- this is the form's
  business, not save-btn's or `fn.util.js`'s, since a real backend might need it to differ per
  resource) alongside the existing `.getData()`. Use `fn.util.js`'s helpers
  (`fn.util.selectFlat`/`fn.util.newButton`/`fn.util.saveForm`) instead of re-typing the same
  CRUD wiring into `app.js`/`layout.js` — `save-btn` should only decide how its popup/window/
  screen closes and pass that as `fn.util.saveForm`'s `onSaved`, not re-implement the
  call-form.save()-then-refresh part.
- **When to add to `fn.util.js`**: unlike `fn.js` (see "Adding to the framework" below), this
  doesn't need a second real use first — the current examples already are that. Add
  something here only when it's logic with no reason to differ between examples (compare
  `fn.util.saveForm`, which stays identical everywhere and only takes an `onSaved` callback, to
  `popup`'s styling, which is supposed to differ — that difference is exactly why `layout.js`
  stays per-example while `fn.util.js` is shared).

## Adding to the framework

Don't add a capability to `fn.js` because a hypothetical app might need it — add it because a
real app built on this actually needed it and the framework was missing it (see
README.md's "Design history" for the model cases this already produced). If none of the example
apps under the repo root actually exercise the gap you're worried about, build a throwaway app
that does (or extend an existing one) before touching the framework — fix the framework once
that app hits a real gap, then use the fix from that app, and note what real need drove it in
the commit message, not just what the diff does.

## Workflow for changes

1. Implement the change (in `fn.js` if it's the framework, in `fn.component.layout.js` if it's
   the reference layout implementation, in `fn.util.js` if it's shared CRUD/UI-wiring logic, or
   in whatever app you're building on top of it if it's app-specific).
2. `node --check` on every file you touched, to catch syntax errors.
3. Verify in an actual browser (Playwright) — load the relevant example's HTML file (e.g.
   `crm/index.html`), or build a scratch page loading `fn.js`, `fn.util.js`, then
   `fn.component.layout.js` (or a scratch `layout.js` of your own) if no example covers it, and
   drive it with Playwright — check the result (DOM state, localStorage). This project has no
   committed test suite, so this is the only real verification available before committing.
4. Commit and push.
