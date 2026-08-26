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

## Running it

Serve this directory with any static file server and open `index.html`, e.g.:

```
npx serve .
```

On load it seeds two sample projects and three sample tasks, then opens a Projects list and a Tasks list. Click a row to edit it; click a Task's checkmark/x to toggle done in place; click "Inspect notes" on a task whose notes happen to be a JSON array (see the "Review pull requests" task) to see `openValue`'s shape-driven dispatch open it as a list instead of plain text.

## Relationship to devtool.simple

This is a one-way extraction, not a shared dependency: `devtool.simple`'s `fn.js` stays fully self-contained (a single file is core to it being a bookmarklet), so it doesn't load anything from here. If a fix or improvement discovered here (like the `textarea` gap above) is worth having in `devtool.simple` too, it gets ported over by hand.
