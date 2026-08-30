// Shared logic every example needs identically, unlike fn.component.layout.js (which is a
// reference *visual* implementation examples are meant to diverge from). This file holds no
// styling and no layout registrations of its own -- just the pure CRUD/UI-wiring logic that was
// getting copy-pasted verbatim into every example's app.js/layout.js, which is exactly where the
// framework/app split calls for a shared helper (see "Structural consistency" in CLAUDE.md).
(function() {
    var fn = window.fn;
    fn.util = {};

    // Was duplicated as contactDatas()/dealDatas()/folderDatas()/fileDatas()/noteDatas() (etc.)
    // in every example's app.js -- fn.data.select returns {id, data} rows; every list/form
    // needs the flattened {id, ...data} shape instead.
    fn.util.selectFlat = function(opt) {
        return fn.data.select({ key : opt.key }).map(function(row) {
            return Object.assign({ id : row.id }, row.data);
        });
    };

    // Was duplicated as newButton() in every example's app.js -- opens a popup with a blank
    // form + save-btn for the given resource. opt.style is the one thing that's expected to
    // differ per example's visual theme; everything else about "open an add form" is identical.
    fn.util.newButton = function(opt) {
        return fn.element.create({
            tagName : 'button',
            attribute : { type : 'button' },
            text : opt.text,
            style : opt.style,
            parent : opt.parent,
            event : {
                click : function() {
                    fn.component.create({
                        name : 'popup',
                        title : opt.title,
                        caller : opt.caller,
                        render : function(popupEl) {
                            fn.component.create({ name : 'form', resource : opt.resource, data : {}, parent : popupEl.content });
                            fn.component.create({ name : 'save-btn', parent : popupEl.content });
                        },
                    });
                }
            },
        });
    };

    // Was duplicated inside every example's own save-btn layout -- calls the popup's .__form's
    // own .save() (insert-or-update is the form's business, since it's the form that knows its
    // resource/data -- see the `form` layout in any example's layout.js), then refreshes the
    // caller. Only "how the popup/window/screen closes" is expected to differ per example's
    // chrome, so that part stays a callback (opt.onSaved), not something this helper decides.
    fn.util.saveForm = function(opt) {
        var popup = opt.popup;
        var form = popup.querySelector('.__form');
        form.save();
        if (popup._.caller) {
            popup._.caller.refresh();
        }
        if (opt.onSaved) {
            opt.onSaved(popup);
        }
    };

    // Was hand-written as crm/'s own 'router' layout (the first example that cared whether the
    // browser back button worked); now shared once a second app (signal-lost's scene/editor
    // navigation) needed the identical mechanism -- read location.hash, look up or resolve which
    // layout that hash means, refresh it into opt.parent, and do it again on every hashchange (a
    // browser back/forward press fires hashchange like any other navigation, which is the whole
    // point: routes are real history entries, so the back button steps through them instead of
    // leaving the app). opt.routes is a flat {hash: layoutName} map for apps with a fixed small
    // set of screens (crm's two pages, idle-hunter's four tabs); opt.resolve(hash) is a function
    // instead, for apps whose hash carries a variable id/key (signal-lost's '#/scene/<key>',
    // team-chat's '#/channel/<id>') and so can't be a finite lookup table. Only one of the two is
    // expected per call. What to do about hash values that don't matter for navigation at all --
    // a per-item edit popup, a "New X" form -- is answered by never routing them in the first
    // place, the same way none of the examples put a modal's state in the URL: popups stay exactly
    // what they already were, transient DOM the caller.refresh() convention cleans up, not a route.
    // The returned element's own .refresh() re-runs the same resolve-and-render step without
    // requiring a hash change first, for updates that affect what the current route displays but
    // aren't a navigation (signal-lost's language switch, a live simulation tick) -- the same
    // "refresh in place" shape as a `list` element, and reusable directly as a caller.
    fn.util.route = function(opt) {
        var el = fn.element.create({ tagName : 'div', parent : opt.parent });
        el.refresh = function() {
            var name = opt.resolve ? opt.resolve(location.hash) : (opt.routes[location.hash] || opt.routes[opt.defaultHash || '#/']);
            fn.component.refresh({ name : name, parent : el });
            if (opt.onRoute) {
                opt.onRoute(location.hash);
            }
        };
        window.addEventListener('hashchange', el.refresh);
        el.refresh();
        return el;
    };
})();
