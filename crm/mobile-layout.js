// Mobile overrides for popup/close-btn/save-btn/form -- registering the same layout names again
// (via the same fn.component.layout.set registry fn.component.layout.set.js uses) replaces the
// desktop-sized defaults with this app's own versions, entirely from within this example folder.
// Framework files are untouched: the default popup was fixed at top:60px/left:60px/minWidth:280px,
// which runs off the edge of a 320px-wide phone screen with no way to scroll to the rest of it,
// and its 13px font carries down into form inputs, small enough to trigger iOS Safari's
// zoom-on-focus. list is left alone -- it read fine on a phone screen as-is.
(function() {
    var fn = window.fn;

    fn.component.layout.set({
        name : 'popup',
        layout : function(opt = {}) {
            var popup = fn.element.create({
                tagName : 'div',
                attribute : { class : '__popup' },
                style : {
                    position : 'fixed',
                    top : '0',
                    left : '0',
                    right : '0',
                    bottom : '0',
                    display : 'flex',
                    flexDirection : 'column',
                    background : '#1e2128',
                    color : '#e8eaed',
                    font : "16px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    overflowY : 'auto',
                },
            });

            var header = fn.element.create({
                parent : popup,
                tagName : 'div',
                style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', padding : '16px', borderBottom : '1px solid #3a3f4b' },
            });
            fn.element.create({ parent : header, tagName : 'div', style : { fontWeight : '600', fontSize : '18px' }, text : opt.title || 'Popup' });
            fn.component.create({ name : 'close-btn', parent : header });

            var content = fn.element.create({ parent : popup, tagName : 'div', style : { padding : '16px' } });

            popup.content = content;
            popup._.resource = opt.resource;
            popup._.data = opt.data;
            popup._.caller = opt.caller;

            if (opt.render) {
                opt.render(popup);
            }

            document.body.appendChild(popup);
            return popup;
        }
    });

    fn.component.layout.set({
        name : 'close-btn',
        layout : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : { type : 'button', title : 'Close' },
                text : '✕',
                style : { padding : '10px 14px', fontSize : '20px' },
                event : { click : function(e) { e.target.closest('.__popup').remove(); } },
            });
        }
    });

    fn.component.layout.set({
        name : 'save-btn',
        layout : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : { type : 'button', title : 'Save' },
                text : 'Save',
                style : { padding : '14px 18px', fontSize : '16px', width : '100%', marginTop : '8px' },
                event : {
                    click : function(e) {
                        var popup = e.target.closest('.__popup');
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
                        popup.remove();
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name : 'form',
        layout : function(opt = {resource : {key : '', columns : []}, data : {}}) {
            var el = fn.element.create({ tagName : 'div', attribute : { class : '__form' }, data : opt.data });
            el._.resource = opt.resource;
            el._.inputs = {};

            var inputStyle = {
                width : '100%', boxSizing : 'border-box', padding : '12px', fontSize : '16px',
                background : '#14161b', color : '#e8eaed', border : '1px solid #3a3f4b', borderRadius : '6px',
            };

            opt.resource.columns.forEach(function(column) {
                if (!column.form) {
                    return;
                }
                var field = fn.element.create({ tagName : 'div', style : { marginBottom : '16px' }, parent : el });
                fn.element.create({ tagName : 'div', text : column.label || column.name, style : { marginBottom : '6px', color : '#9aa0a6', fontSize : '14px' }, parent : field });

                var input;
                if (column.form.render) {
                    input = fn.render({ source : column.form.render, data : opt.data });
                    field.appendChild(input);
                } else if (column.form.type === 'select') {
                    input = fn.element.create({ tagName : 'select', attribute : { name : column.name }, style : inputStyle, parent : field });
                    fn.data.select({ key : column.form.resource.key }).forEach(function(row) {
                        fn.element.create({
                            tagName : 'option',
                            attribute : { value : row.id },
                            text : row.data[column.form.resource.label],
                            parent : input,
                        });
                    });
                } else if (column.form.type === 'textarea') {
                    input = fn.element.create({
                        tagName : 'textarea',
                        attribute : { name : column.name },
                        style : Object.assign({}, inputStyle, { minHeight : column.form.height || '80px', resize : 'vertical' }),
                        parent : field,
                    });

                    var parsed;
                    try {
                        parsed = JSON.parse(opt.data[column.name]);
                    } catch (e) {
                        parsed = undefined;
                    }
                    if (parsed !== undefined && parsed !== null && typeof parsed === 'object') {
                        var preview = fn.component._.jsonPreview(parsed);
                        fn.component.create({
                            name : 'list',
                            resource : { key : '', columns : preview.columns },
                            datas : preview.datas,
                            readonly : true,
                            parent : field,
                        });
                    }
                } else {
                    input = fn.element.create({ tagName : 'input', attribute : { type : 'text', name : column.name }, style : inputStyle, parent : field });
                }

                if (input.tagName !== 'BUTTON' && opt.data[column.name] !== undefined) {
                    input.value = opt.data[column.name];
                }
                el._.inputs[column.name] = input;
            });

            el.getData = function() {
                var result = {};
                opt.resource.columns.forEach(function(column) {
                    if (!column.form) {
                        return;
                    }
                    var input = el._.inputs[column.name];
                    if (input.tagName === 'BUTTON') {
                        return;
                    }
                    result[column.name] = column.form.resource ? Number(input.value) : input.value;
                });
                return result;
            };

            return el;
        }
    });
})();
