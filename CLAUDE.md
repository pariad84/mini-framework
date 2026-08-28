# mini-framework

A minimal, schema-driven CRUD framework distilled from [devtool.simple](https://github.com/pariad84/devtool.simple)'s
`fn.js` down to eight essentials (see README.md for the list). `mini.js` (at the repo root) is
the framework, and knows nothing about any specific app. Each example app lives in its own
folder next to it -- `task-tracker/app.js` and `recipe-box/recipes-app.js` -- the way
`devtoolExampleApp` sits on top of `frameworkCore`/`frameworkLayouts` in devtool.simple. The
split is a hard rule: `mini.js` must never reference anything app-specific (a resource key, a
field name, a UI label), and an example app must never reach past
`fn.component.create`/`fn.data.*`/`fn.element.create` to touch the DOM or storage directly.

## The three things that matter most

1. **Structural consistency.** Before adding or changing something, look at how the existing,
   similar pieces do it and match that shape. Don't let two things that do conceptually the
   same job drift into different implementations — extract a shared helper instead.
2. **Terminology.** Names should agree with each other end to end — the option key, the
   layout name, the visible label, and the log output should all describe the same concept
   the same way.
3. **Stay minimal.** This project's entire point is to be small enough to read in one sitting.
   A feature only belongs in `mini.js` if it's needed to keep the eight essentials genuinely
   usable — UI chrome (popup dragging/resizing, z-index auto-detection, scale/opacity
   settings, cascading popup position off a caller) is explicitly out of scope; devtool.simple
   already proved those are "the example app," not "the framework." When in doubt, build it
   in `app.js` first — only promote something into `mini.js` once a second real use needs it
   too (see "Adding to the framework" below).

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
  a comment marking which of the eight essentials a piece of code is (see the numbered
  comments already in `mini.js`) — keep those in sync if you reorder or rename things.
- **English only** for UI text, titles, labels, and log output.
- **CRUD verbs**: `fn.data.select/insert/update/delete` follow SQL naming, matching
  devtool.simple. Don't introduce a different verb set (`get`/`fetch`/`remove`/etc.) for the
  same concept.
- **File order within `mini.js`**: most foundational first, most composed last — primitives
  (`fn.element.create`, the layout registry, `fn.data.*`) before the escape hatches
  (`render`, `openValue`) before the layouts that use them (`popup` → `form`/`list`, since
  both reference `popup`'s `.__popup` convention and `renderColumn`).

## Adding to the framework

Don't add a capability to `mini.js` because a hypothetical app might need it — add it because
`app.js` (or some other real app built on this) actually needed it and mini.js was missing it.
The `textarea` form type is the model case: it was added because the Task Tracker's "Notes"
field needed multi-line text and mini.js had no way to express that, not speculatively ahead of
time. When you hit a real gap like that, fix it in `mini.js`, then use it from `app.js` — and
note what real need drove it in the commit message, not just what the diff does.

## Staying in sync with devtool.simple

`mini.js` was extracted from `fn.js` at a point in time, not linked to it — `fn.js` keeps
evolving on its own after the extraction, and nothing here notices when it does. When you're
about to touch `mini.js` (or asked to), first check whether the framework-layer piece you're
touching (naming, an escape hatch, a layout) has since changed shape in `devtool.simple`'s
`fn.js` and port that change over too, the same direction the `textarea` and `render` gaps
were closed: read the equivalent code in `fn.js`, match its current naming/behavior exactly
in `mini.js`'s simpler form, and don't reintroduce app-specific pieces (`devtoolExampleApp`
concerns) that don't belong here. This is a manual, occasional check, not automatic — nothing
enforces it, so it only happens when it's deliberately done.

## Workflow for changes

1. Implement the change (in `mini.js` if it's the framework, `app.js` if it's app-specific).
2. `node --check mini.js` / `node --check app.js` to catch syntax errors.
3. Verify in an actual browser (Playwright) — load the relevant example's HTML file (e.g.
   `task-tracker/index.html`), drive the interaction, check the result (DOM state, localStorage).
   This project has no committed test suite, so this is
   the only real verification available before committing.
4. Commit and push.
