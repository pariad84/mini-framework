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

    // Was duplicated inside every example's own save-btn layout -- insert-or-update from the
    // popup's .__form, then refresh the caller. Only "how the popup/window/screen closes" is
    // expected to differ per example's chrome, so that part stays a callback (opt.onSaved),
    // not something this helper decides.
    fn.util.saveForm = function(opt) {
        var popup = opt.popup;
        var form = popup.querySelector('.__form');
        var data = form.getData();
        if (form._.data.id !== undefined) {
            var merged = Object.assign({}, form._.data, data);
            delete merged.id;
            fn.data.update({ key : form._.resource.key, id : form._.data.id, data : merged });
        } else {
            fn.data.insert({ key : form._.resource.key, data : data });
        }
        if (popup._.caller) {
            popup._.caller.refresh();
        }
        if (opt.onSaved) {
            opt.onSaved(popup);
        }
    };
})();
