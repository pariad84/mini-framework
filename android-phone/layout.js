// This example's own popup/close-btn/save-btn/form/list/pagination, plus its Android-phone-only
// layouts -- fn.component.layout.js is itself just one reference implementation of these,
// not a dependency every example must load, so this file defines every layout the app below
// needs directly, via the same fn.component.layout.set registry. popup/close-btn/save-btn are
// Android-phone-style (a status bar, home screen with tappable icons, a 3-button nav bar, and
// full-screen app views with back-stack navigation, filling the whole viewport like a real
// mobile web page -- no device bezel, this isn't a phone mockup) -- the same category of
// app-specific UI chrome CLAUDE.md calls out of scope for the framework; see windows-os/layout.js
// for the desktop-OS equivalent of this same override technique); form/list/pagination are
// unchanged from the reference implementation.
(function() {
    var fn = window.fn;

    var screenArea = null;
    var screenStack = [];

    function popScreen(screen) {
        var target = screen || screenStack[screenStack.length - 1];
        if (!target) {
            return;
        }
        screenStack = screenStack.filter(function(s) { return s !== target; });
        target.remove();
    }

    function goHome() {
        screenStack.forEach(function(s) { s.remove(); });
        screenStack = [];
    }

    fn.component.layout.set({
        name : 'popup',
        layout : function(opt = {}) {
            var screen = fn.element.create({
                tagName : 'div',
                attribute : { class : '__popup' },
                style : {
                    position : 'absolute', top : '0', left : '0', right : '0', bottom : '0',
                    background : '#fff', color : '#202124',
                    display : 'flex', flexDirection : 'column',
                    font : "14px/1.4 Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                },
                parent : screenArea,
            });
            screen._.title = opt.title || 'App';

            var appBar = fn.element.create({
                parent : screen, tagName : 'div',
                style : { display : 'flex', alignItems : 'center', gap : '16px', padding : '14px 12px', background : '#4285f4', color : '#fff', flexShrink : '0' },
            });
            fn.component.create({ name : 'close-btn', parent : appBar });
            fn.element.create({ tagName : 'div', text : screen._.title, style : { fontSize : '17px', fontWeight : '500' }, parent : appBar });

            var content = fn.element.create({ parent : screen, tagName : 'div', style : { padding : '12px', overflow : 'auto', flex : '1' } });

            screen.content = content;
            screen._.resource = opt.resource;
            screen._.data = opt.data;
            screen._.caller = opt.caller;

            if (opt.render) {
                opt.render(screen);
            }

            screenStack.push(screen);
            return screen;
        }
    });

    fn.component.layout.set({
        name : 'close-btn',
        layout : function() {
            return fn.element.create({
                tagName : 'button',
                attribute : { type : 'button', title : 'Back' },
                text : '←',
                style : { background : 'transparent', border : 'none', color : '#fff', fontSize : '20px', padding : '0', cursor : 'pointer' },
                event : { click : function(e) { popScreen(e.target.closest('.__popup')); } },
            });
        }
    });

    fn.component.layout.set({
        name : 'save-btn',
        layout : function() {
            return fn.element.create({
                tagName : 'button',
                attribute : { type : 'button', title : 'Save' },
                text : 'SAVE',
                style : { padding : '10px 16px', marginTop : '12px', width : '100%', background : '#4285f4', color : '#fff', border : 'none', borderRadius : '4px', fontWeight : '600', fontSize : '14px' },
                event : { click : function(e) {
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
                    popScreen(popup);
                } },
            });
        }
    });

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

    fn.component._.renderListTable = function(opt) {
        var el = fn.element.create({ tagName : 'table', style : { width : '100%', borderCollapse : 'collapse' }, datas : opt.datas });

        var thead = fn.element.create({ tagName : 'thead', parent : el });
        var headRow = fn.element.create({ tagName : 'tr', parent : thead });
        opt.resource.columns.forEach(function(column) {
            if (!column.list) {
                return;
            }
            fn.element.create({
                tagName : 'th',
                text : column.label || column.name,
                style : { textAlign : 'left', padding : '10px 12px', borderBottom : '2px solid #3a3f4b', color : '#9aa0a6', fontWeight : '600' },
                parent : headRow,
            });
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
                var cell = fn.element.create({ tagName : 'td', style : { padding : '10px 12px', borderBottom : '1px solid #262a33' }, parent : row });
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
    };

    fn.component.layout.set({
        name : 'list',
        layout : function(opt = {resource : {key : '', columns : []}, datas : []}) {
            var el = fn.element.create({ tagName : 'div', attribute : { class : '__list' }, datas : opt.datas });
            el._.resource = opt.resource;
            el._.caller = opt.caller;
            el._.readonly = opt.readonly;
            el._.pageSize = opt.pageSize || 10;
            el._.page = 0;

            el.tableArea = fn.element.create({ tagName : 'div', parent : el });
            el.paginationArea = fn.element.create({ tagName : 'div', parent : el });

            el.refresh = function() {
                var pageCount = Math.max(1, Math.ceil(el._.datas.length / el._.pageSize));
                el._.page = Math.min(el._.page, pageCount - 1);
                var pageDatas = el._.datas.slice(el._.page * el._.pageSize, (el._.page + 1) * el._.pageSize);

                Array.from(el.tableArea.children).forEach(function(child) { child.remove(); });
                el.tableArea.appendChild(fn.component._.renderListTable({
                    resource : el._.resource, datas : pageDatas, caller : el._.caller, readonly : el._.readonly,
                }));

                if (pageCount > 1) {
                    fn.component.refresh({ name : 'pagination', page : el._.page, pageCount : pageCount, parent : el.paginationArea });
                } else {
                    Array.from(el.paginationArea.children).forEach(function(child) { child.remove(); });
                }
            };

            el.refresh();
            return el;
        }
    });

    fn.component.layout.set({
        name : 'pagination',
        layout : function(opt = {}) {
            var bar = fn.element.create({
                tagName : 'div',
                style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', padding : '8px 0' },
            });

            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : 'Prev',
                style : { padding : '10px 16px', fontSize : '15px', visibility : opt.page > 0 ? 'visible' : 'hidden' },
                event : { click : function(e) {
                    var list = e.target.closest('.__list');
                    list._.page = Math.max(0, list._.page - 1);
                    list.refresh();
                } },
                parent : bar,
            });

            fn.element.create({
                tagName : 'div',
                text : 'Page ' + (opt.page + 1) + ' of ' + opt.pageCount,
                style : { color : '#9aa0a6', fontSize : '14px' },
                parent : bar,
            });

            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : 'Next',
                style : { padding : '10px 16px', fontSize : '15px', visibility : opt.page < opt.pageCount - 1 ? 'visible' : 'hidden' },
                event : { click : function(e) {
                    var list = e.target.closest('.__list');
                    var pageCount = Math.max(1, Math.ceil(list._.datas.length / list._.pageSize));
                    list._.page = Math.min(pageCount - 1, list._.page + 1);
                    list.refresh();
                } },
                parent : bar,
            });

            return bar;
        }
    });

    fn.component.layout.set({
        name : 'app-icon',
        layout : function(opt = {}) {
            var wrap = fn.element.create({
                tagName : 'div',
                style : { width : '70px', textAlign : 'center', cursor : 'pointer', userSelect : 'none' },
                event : { click : function() { opt.launch(); } },
            });
            fn.element.create({
                tagName : 'div', text : opt.icon,
                style : { fontSize : '28px', width : '56px', height : '56px', lineHeight : '56px', margin : '0 auto', background : 'rgba(255,255,255,0.9)', borderRadius : '16px' },
                parent : wrap,
            });
            fn.element.create({
                tagName : 'div', text : opt.label,
                style : { fontSize : '11px', color : '#fff', marginTop : '4px', textShadow : '0 1px 2px rgba(0,0,0,0.4)' },
                parent : wrap,
            });
            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'home-screen',
        layout : function(opt = {}) {
            var home = fn.element.create({
                tagName : 'div',
                style : {
                    position : 'absolute', top : '0', left : '0', right : '0', bottom : '0',
                    background : 'linear-gradient(#4285f4, #34a853)',
                    padding : '20px 12px',
                    display : 'flex', flexWrap : 'wrap', gap : '16px', alignContent : 'flex-start',
                },
            });
            (opt.apps || []).forEach(function(app) {
                fn.component.create({ name : 'app-icon', icon : app.icon, label : app.label, launch : app.launch, parent : home });
            });
            return home;
        }
    });

    fn.component.layout.set({
        name : 'nav-bar',
        layout : function() {
            var bar = fn.element.create({
                tagName : 'div',
                style : { display : 'flex', justifyContent : 'space-around', alignItems : 'center', padding : '10px 0', background : '#111', flexShrink : '0' },
            });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button', title : 'Back' }, text : '◁',
                style : { background : 'transparent', border : 'none', color : '#fff', fontSize : '18px' },
                event : { click : function() { popScreen(); } },
                parent : bar,
            });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button', title : 'Home' }, text : '○',
                style : { background : 'transparent', border : 'none', color : '#fff', fontSize : '18px' },
                event : { click : function() { goHome(); } },
                parent : bar,
            });
            fn.element.create({
                // Recents is drawn for authenticity but, to keep this example minimal, behaves
                // the same as Home rather than modeling a real app-switcher.
                tagName : 'button', attribute : { type : 'button', title : 'Recents' }, text : '□',
                style : { background : 'transparent', border : 'none', color : '#fff', fontSize : '18px' },
                event : { click : function() { goHome(); } },
                parent : bar,
            });
            return bar;
        }
    });

    fn.component.layout.set({
        name : 'status-clock',
        layout : function() {
            return fn.element.create({
                tagName : 'div',
                text : new Date().toLocaleTimeString([], { hour : '2-digit', minute : '2-digit' }),
            });
        }
    });

    fn.component.layout.set({
        name : 'phone',
        layout : function(opt = {}) {
            var screen = fn.element.create({
                tagName : 'div',
                style : {
                    position : 'fixed', top : '0', left : '0', right : '0', bottom : '0',
                    background : '#fff', overflow : 'hidden',
                    display : 'flex', flexDirection : 'column',
                },
            });

            var statusBar = fn.element.create({
                tagName : 'div', parent : screen,
                style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', padding : '6px 16px', background : '#000', color : '#fff', fontSize : '12px', flexShrink : '0' },
            });
            var clockArea = fn.element.create({ tagName : 'div', parent : statusBar });
            fn.component.create({ name : 'status-clock', parent : clockArea });
            setInterval(function() { fn.component.refresh({ name : 'status-clock', parent : clockArea }); }, 30000);
            fn.element.create({ tagName : 'div', text : '📶 🔋 100%', parent : statusBar });

            var content = fn.element.create({
                tagName : 'div', parent : screen,
                style : { position : 'relative', flex : '1', overflow : 'hidden' },
            });
            screenArea = content;

            fn.component.create({ name : 'home-screen', apps : opt.apps, parent : content });
            fn.component.create({ name : 'nav-bar', parent : screen });

            return screen;
        }
    });
})();
