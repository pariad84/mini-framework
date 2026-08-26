# mini-framework

A minimal, schema-driven CRUD framework, distilled from [devtool.simple](https://github.com/pariad84/devtool.simple)'s `fn.js` down to eight essentials:

1. `fn.element.create` -- the one DOM-builder primitive everything else is built from.
2. `fn.component.layout.set/get/create` -- a named-layout registry/dispatcher.
3. `fn.data.select/insert/update/delete` -- a CRUD abstraction (localStorage-backed here; swapping the storage layer only means rewriting these four functions).
4. Schema-driven `form`/`list` layouts -- a `resource: {key, columns}` shape plus `data`/`datas` mechanically drives a full CRUD UI, no per-resource UI code.
5. A `render` escape hatch -- a column can carry a JS source string instead of a fixed type, letting a resource definition (pure data) extend what a field/cell does without touching this file.
6. A resource-reference field (`column.form.resource: {key, label}`) -- a select whose options come from another resource's rows, auto-resolved to a label everywhere it's displayed.
7. `data`/`datas` shape-driven dispatch (`fn.component._.openValue`) -- deciding list-vs-single-value editing UI from the actual value's shape (`Array.isArray`), not a declared type.
8. The `opt` single-parameter convention, and self-contained components that find their own context via `.closest('.__popup')` / `.querySelector('.__form')` instead of caller-injected callbacks.

No build step, no dependencies. `mini.js` is the entire framework in one file.

## Why this exists

`devtool.simple` is a single-file bookmarklet devtool built on exactly this pattern. This repo pulls the framework layer out on its own, on the theory that a framework should be validated on a *second*, unrelated app before you trust that it's actually reusable and not just convenient for the one thing it was built for.

## The example app: Task Tracker

`app.js` is a small task tracker (Projects + Tasks, with Tasks referencing a Project) built entirely on `mini.js`'s eight essentials -- nothing in `app.js` reaches past `fn.component.create`/`fn.data.*`. It's kept in its own file, the same way `devtool.simple` keeps its example app (`devtoolExampleApp`) separate from the framework it's built on (`frameworkCore`/`frameworkLayouts`).

Building it against `mini.js` surfaced one real gap: the `form` layout had no `textarea` support at all (only text input, select, and the render escape hatch), which meant a "Notes" field for a task couldn't hold more than one line. That's now fixed in `mini.js` itself -- exactly the kind of thing you only find by actually building a second app, not by reasoning about the framework in the abstract.

## The second example app: Recipe Box

`recipes-app.js` is a small recipe manager (Categories + Recipes, with Recipes referencing a Category), laid out as an ordinary multi-page website -- a nav bar and hash-based routing (`#/`, `#/categories`, `#/recipes`) swap full page sections in and out of `document.body`, instead of Task Tracker's floating popups everywhere. `nav` and `router` are plain layouts registered with the same `fn.component.layout.set` registry `list`/`form`/`popup` use -- no framework change was needed to add routing itself.

Building it surfaced one real gap: `list`'s row-click always opened its edit popup with `caller: e.target.closest('.__popup')`, so a list embedded directly in a page (not inside a popup) had no way to get refreshed after an edit. Fixed in `mini.js` by letting an explicit `caller` passed to `list` win over the auto-detected one -- again, a gap only a second real layout shape surfaced.

## Running it

Serve this directory with any static file server, e.g.:

```
npx serve .
```

Open `index.html` for Task Tracker: it seeds two sample projects and three sample tasks, then opens a Projects list and a Tasks list. Click a row to edit it; click a Task's checkmark/x to toggle done in place; click "Inspect notes" on a task whose notes happen to be a JSON array (see the "Review pull requests" task) to see `openValue`'s shape-driven dispatch open it as a list instead of plain text.

Open `recipes.html` for Recipe Box: it seeds two categories and two recipes. Use the nav bar to move between Home/Categories/Recipes; click a row to edit it in a popup, or "+ New Recipe"/"+ New Category" to add one -- either way the page's own list refreshes in place, no reload or popup-within-popup needed.

## Known limitation: swapping to a real network backend isn't free

Essential #3 above claims that swapping the storage layer only means rewriting `fn.data.select/insert/update/delete`. Verified against a real local HTTP server, that claim holds *only* because those four functions can stay synchronous (using synchronous XHR to keep the exact same call-and-get-a-return-value shape localStorage has) -- no other file needed a single change.

A real production backend would use `fetch`/Promises instead, which means `fn.data.*` would have to become async -- and every place that currently does `var rows = fn.data.select(...)` and uses `rows` immediately (throughout `list`/`form`, and every app built on them) would need to change too. That ripple is real work, and deliberately not done speculatively: the right async shape (loading states, error handling, what a popup does mid-save) can only be designed against a real backend that needs it, not guessed at in the abstract. See "Adding to the framework" above -- this is the same principle, applied to a foundational shape instead of a single feature.

## Relationship to devtool.simple

This is a one-way extraction, not a shared dependency: `devtool.simple`'s `fn.js` stays fully self-contained (a single file is core to it being a bookmarklet), so it doesn't load anything from here. If a fix or improvement discovered here (like the `textarea` gap above) is worth having in `devtool.simple` too, it gets ported over by hand.
