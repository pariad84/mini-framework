(function mini(global) {
    const fn = {};

    fn.component = {};
    fn.component._ = {};
    fn.component.layout = {};
    fn.component.layout.data = {};
    fn.data = {};
    fn.data._ = {};
    fn.element = {};

    // 5. render escape hatch -- a column can carry a JS source string instead of a fixed type,
    // so a resource definition (pure data) can extend what a cell/field does without touching
    // this file. Same mechanism serves both list cells and form fields.
    fn.render = function(opt = {}) {
        var render = new Function('return (' + opt.source + ')')();
        return render(opt.data);
    };

    // 1. fn.element.create -- the one DOM-builder primitive everything else is built from.
    fn.element.create = function(opt = {}) {
        var el = document.createElement(opt.tagName);
        el._ = {};
        if (opt.attribute) {
            for (const [key, value] of Object.entries(opt.attribute)) {
                el.setAttribute(key, value);
            }
        }
        if (opt.style) {
            for (const [key, value] of Object.entries(opt.style)) {
                el.style[key] = value;
            }
        }
        if (opt.parent) {
            opt.parent.appendChild(el);
        }
        if (opt.text) {
            el.textContent = opt.text;
        }
        if (opt.event) {
            for (const [eventType, eventHandler] of Object.entries(opt.event)) {
                el.addEventListener(eventType, eventHandler);
            }
        }
        el._.opt = opt;
        if (opt.data) {
            el._.data = opt.data;
        }
        if (opt.datas) {
            el._.datas = opt.datas;
        }
        return el;
    };

    // 2. fn.component.layout.set/get/create -- named-layout registry/dispatcher.
    fn.component.layout.set = function(opt = {}) {
        this.data[opt.name] = opt.layout;
    };

    fn.component.layout.get = function(opt = {}) {
        return this.data[opt.name];
    };

    fn.component.create = function(opt = {}) {
        var layout = fn.component.layout.get(opt);
        if (!layout) {
            throw new Error('Unknown component layout: ' + opt.name);
        }
        var el = layout(opt);
        if (opt.parent) {
            opt.parent.appendChild(el);
        }
        return el;
    };

    // 2. fn.component.refresh -- removes opt.parent's current children and recreates the named
    // layout inside it, so the caller.refresh() convention doesn't force every app to reach past
    // fn.component.create into the DOM just to re-render a list/page in place.
    fn.component.refresh = function(opt = {}) {
        Array.from(opt.parent.children).forEach(function(child) { child.remove(); });
        return fn.component.create(opt);
    };

    // 3. fn.data.select/insert/update/delete -- CRUD abstraction. Every layout below only ever
    // talks to these four functions, so swapping localStorage for a real backend later only
    // means rewriting this block, not any layout.
    fn.data._.read = function(opt = {}) {
        var raw = typeof(Storage) !== "undefined" ? localStorage.getItem(opt.key) : null;
        return raw ? JSON.parse(raw) : [];
    };

    fn.data._.write = function(opt = {}) {
        if (typeof(Storage) !== "undefined") {
            localStorage.setItem(opt.key, JSON.stringify(opt.rows));
        }
    };

    fn.data.select = function(opt = {}) {
        var rows = fn.data._.read({ key : opt.key });
        if (opt.id !== undefined) {
            return rows.find(function(row) { return row.id === opt.id; });
        }
        return rows;
    };

    fn.data.insert = function(opt = {}) {
        var rows = fn.data._.read({ key : opt.key });
        var nextId = rows.reduce(function(max, row) { return Math.max(max, row.id); }, 0) + 1;
        var row = { id : nextId, data : opt.data };
        rows.push(row);
        fn.data._.write({ key : opt.key, rows : rows });
        return row;
    };

    fn.data.update = function(opt = {}) {
        var rows = fn.data._.read({ key : opt.key });
        var row = rows.find(function(r) { return r.id === opt.id; });
        if (row) {
            row.data = opt.data;
            fn.data._.write({ key : opt.key, rows : rows });
        }
        return row;
    };

    fn.data.delete = function(opt = {}) {
        var rows = fn.data._.read({ key : opt.key });
        var row = rows.find(function(row) { return row.id === opt.id; });
        fn.data._.write({ key : opt.key, rows : rows.filter(function(row) { return row.id !== opt.id; }) });
        return row;
    };

    // 7. data/datas shape-driven dispatch -- deciding list-vs-single-value editing UI by the
    // actual VALUE's shape (Array.isArray), not a declared type. Lets one function open
    // anything: a plain field or a nested collection, however deep, with no schema needed.
    fn.component._.openValue = function(opt = {}) {
        if (Array.isArray(opt.value)) {
            fn.component.create({
                name : 'popup',
                title : opt.title || 'List',
                parent : document.body,
                caller : opt.caller,
                render : function(el) {
                    fn.component.create({
                        name : 'list',
                        resource : { key : '', columns : [ { name : 'value', label : 'Value', list : { type : 'text' } } ] },
                        datas : opt.value.map(function(value, i) { return { id : i, value : value }; }),
                        readonly : true,
                        parent : el.content,
                    });
                },
            });
        } else {
            fn.component.create({
                name : 'popup',
                title : opt.title || 'Value',
                parent : document.body,
                caller : opt.caller,
                render : function(el) {
                    fn.element.create({
                        tagName : 'textarea',
                        style : { width : '100%', minHeight : '80px' },
                        text : String(opt.value),
                        parent : el.content,
                    });
                },
            });
        }
    };

    // 8. opt convention + self-contained components: every layout takes one `opt` object, and
    // buttons below find their own popup/form via .closest('.__popup')/.querySelector('.__form')
    // instead of a caller-injected onClick.
    fn.component.layout.set({
        name : 'popup',
        layout : function(opt = {}) {
            var popup = fn.element.create({
                tagName : 'div',
                attribute : { class : '__popup' },
                style : {
                    position : 'fixed',
                    top : '60px',
                    left : '60px',
                    display : 'flex',
                    flexDirection : 'column',
                    minWidth : '280px',
                    background : '#1e2128',
                    color : '#e8eaed',
                    border : '1px solid #3a3f4b',
                    borderRadius : '8px',
                    font : "13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                },
            });

            var header = fn.element.create({
                parent : popup,
                tagName : 'div',
                style : { display : 'flex', justifyContent : 'space-between', padding : '8px 12px', borderBottom : '1px solid #3a3f4b' },
            });
            fn.element.create({ parent : header, tagName : 'div', style : { fontWeight : '600' }, text : opt.title || 'Popup' });
            fn.component.create({ name : 'close-btn', parent : header });

            var content = fn.element.create({ parent : popup, tagName : 'div', style : { padding : '12px' } });

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

    // 7. data/datas shape-driven dispatch, applied to a textarea's own value: if it happens to
    // hold a JSON array/object, derive read-only list columns/datas from its shape so the form
    // can preview it without any schema declaring that the field is JSON.
    fn.component._.jsonPreview = function(value) {
        if (Array.isArray(value)) {
            var keys = [];
            value.forEach(function(item) {
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                    Object.keys(item).forEach(function(key) {
                        if (keys.indexOf(key) === -1) {
                            keys.push(key);
                        }
                    });
                }
            });
            var columns = keys.length
                ? keys.map(function(key) { return { name : key, label : key, list : {} }; })
                : [ { name : 'value', label : 'Value', list : {} } ];
            var datas = value.map(function(item, index) {
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                    var row = { id : index };
                    keys.forEach(function(key) {
                        var v = item[key];
                        row[key] = (v && typeof v === 'object') ? JSON.stringify(v) : v;
                    });
                    return row;
                }
                return { id : index, value : item };
            });
            return { columns : columns, datas : datas };
        }
        return {
            columns : [ { name : 'key', label : 'Key', list : {} }, { name : 'value', label : 'Value', list : {} } ],
            datas : Object.keys(value).map(function(key) {
                var v = value[key];
                return { id : key, key : key, value : (v && typeof v === 'object') ? JSON.stringify(v) : v };
            }),
        };
    };

    // 4 + 6. schema-driven form: resource.columns + column.form mechanically drives the fields,
    // including a resource-reference select (column.form.resource:{key,label}), a plain textarea,
    // and the render escape hatch -- no per-resource form code needed.
    fn.component.layout.set({
        name : 'form',
        layout : function(opt = {resource : {key : '', columns : []}, data : {}}) {
            var el = fn.element.create({ tagName : 'table', attribute : { class : '__form' }, data : opt.data });
            el._.resource = opt.resource;
            el._.inputs = {};

            opt.resource.columns.forEach(function(column) {
                if (!column.form) {
                    return;
                }
                var row = fn.element.create({ tagName : 'tr', parent : el });
                fn.element.create({ tagName : 'td', text : column.label || column.name, parent : row });
                var valueCell = fn.element.create({ tagName : 'td', parent : row });

                var input;
                if (column.form.render) {
                    input = fn.render({ source : column.form.render, data : opt.data });
                    valueCell.appendChild(input);
                } else if (column.form.type === 'select') {
                    input = fn.element.create({ tagName : 'select', attribute : { name : column.name }, parent : valueCell });
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
                        style : { width : '100%', minHeight : column.form.height || '60px', resize : 'vertical' },
                        parent : valueCell,
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
                            parent : valueCell,
                        });
                    }
                } else {
                    input = fn.element.create({ tagName : 'input', attribute : { type : 'text', name : column.name }, parent : valueCell });
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

    // 4 + 5 + 6. schema-driven list: same resource.columns (via column.list this time) drives
    // headers and cells, auto-resolving a resource-reference column to the referenced row's
    // label instead of showing the raw id, and clicking a row opens it in a form popup.
    fn.component.layout.set({
        name : 'list',
        layout : function(opt = {resource : {key : '', columns : []}, datas : []}) {
            var el = fn.element.create({ tagName : 'table', datas : opt.datas });

            var thead = fn.element.create({ tagName : 'thead', parent : el });
            var headRow = fn.element.create({ tagName : 'tr', parent : thead });
            opt.resource.columns.forEach(function(column) {
                if (!column.list) {
                    return;
                }
                fn.element.create({ tagName : 'th', text : column.label || column.name, style : { textAlign : 'left' }, parent : headRow });
            });

            var tbody = fn.element.create({ tagName : 'tbody', parent : el });
            opt.datas.forEach(function(data) {
                var clickable = !!opt.resource.key && !opt.readonly;
                var row = fn.element.create({
                    tagName : 'tr',
                    style : clickable ? { cursor : 'pointer' } : {},
                    data : data,
                    parent : tbody,
                    event : clickable ? {
                        click : function(e) {
                            fn.component.create({
                                name : 'popup',
                                title : 'Edit',
                                caller : opt.caller || e.target.closest('.__popup'),
                                render : function(popupEl) {
                                    fn.component.create({ name : 'form', resource : opt.resource, data : data, parent : popupEl.content });
                                    fn.component.create({ name : 'save-btn', parent : popupEl.content });
                                },
                            });
                        }
                    } : {},
                });

                opt.resource.columns.forEach(function(column) {
                    if (!column.list) {
                        return;
                    }
                    var cell = fn.element.create({ tagName : 'td', parent : row });
                    if (column.list.render) {
                        var rendered = fn.render({ source : column.list.render, data : data });
                        if (rendered instanceof HTMLElement) {
                            cell.appendChild(rendered);
                        } else {
                            cell.textContent = rendered;
                        }
                    } else if (column.form && column.form.resource && data[column.name] !== undefined) {
                        var referencedRow = fn.data.select({ key : column.form.resource.key, id : data[column.name] });
                        cell.textContent = referencedRow ? referencedRow.data[column.form.resource.label] : data[column.name];
                    } else {
                        cell.textContent = data[column.name] !== undefined ? data[column.name] : '';
                    }
                });
            });

            return el;
        }
    });

    global.fn = fn;
})(window);
