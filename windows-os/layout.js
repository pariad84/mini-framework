// This example's own popup/close-btn/save-btn/form/list/pagination, plus its desktop-OS-only
// layouts -- fn.component.layout.js is itself just one reference implementation of these,
// not a dependency every example must load, so this file defines every layout the app below
// needs directly, via the same fn.component.layout.set registry. popup/close-btn/save-btn are
// Windows-OS-style (draggable/resizable/minimizable windows with a taskbar and Start menu --
// exactly the "UI chrome" CLAUDE.md calls out of scope for the framework: popup
// dragging/resizing, z-index, cascading position); form/list/pagination are unchanged from the
// reference implementation.
(function() {
    var fn = window.fn;

    var topZIndex = 100;
    var openWindows = [];
    var cascadeCount = 0;
    var taskbarWindowsArea = null;

    function refreshTaskbarWindows() {
        if (taskbarWindowsArea) {
            fn.component.refresh({ name : 'taskbar-windows', windows : openWindows, parent : taskbarWindowsArea });
        }
    }

    function focusWindow(win) {
        win.style.zIndex = String(++topZIndex);
        openWindows.forEach(function(w) { w._.focused = (w === win); });
        refreshTaskbarWindows();
    }

    function closeWindow(win) {
        openWindows = openWindows.filter(function(w) { return w !== win; });
        win.remove();
        refreshTaskbarWindows();
    }

    fn.component.layout.set({
        name : 'popup',
        layout : function(opt = {}) {
            var offset = (cascadeCount++ % 8) * 28;
            var popup = fn.element.create({
                tagName : 'div',
                attribute : { class : '__popup' },
                style : {
                    position : 'fixed',
                    top : (80 + offset) + 'px',
                    left : (120 + offset) + 'px',
                    width : '420px',
                    height : '360px',
                    minWidth : '260px',
                    minHeight : '180px',
                    display : 'flex',
                    flexDirection : 'column',
                    background : '#ece9d8',
                    color : '#000',
                    border : '2px solid #0a246a',
                    borderRadius : '6px 6px 0 0',
                    boxShadow : '2px 2px 10px rgba(0,0,0,0.5)',
                    font : "13px/1.4 Tahoma, Verdana, sans-serif",
                    overflow : 'hidden',
                },
                event : { mousedown : function() { focusWindow(popup); } },
            });
            popup._.title = opt.title || 'Window';
            popup._.minimized = false;
            popup._.maximized = false;

            var titlebar = fn.element.create({
                parent : popup,
                tagName : 'div',
                style : {
                    display : 'flex', justifyContent : 'space-between', alignItems : 'center',
                    padding : '4px 6px', background : 'linear-gradient(#1c5adb, #0a246a)',
                    color : '#fff', cursor : 'move', fontWeight : 'bold', flexShrink : '0',
                },
                event : { mousedown : function(e) {
                    if (e.target.closest('button')) {
                        return;
                    }
                    var startX = e.clientX, startY = e.clientY;
                    var startLeft = popup.offsetLeft, startTop = popup.offsetTop;
                    function onMove(ev) {
                        popup.style.left = (startLeft + ev.clientX - startX) + 'px';
                        popup.style.top = Math.max(0, startTop + ev.clientY - startY) + 'px';
                    }
                    function onUp() {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                    }
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                } },
            });
            fn.element.create({
                tagName : 'div', text : popup._.title,
                style : { overflow : 'hidden', textOverflow : 'ellipsis', whiteSpace : 'nowrap' },
                parent : titlebar,
            });

            var controls = fn.element.create({ tagName : 'div', style : { display : 'flex', gap : '2px' }, parent : titlebar });
            fn.component.create({ name : 'minimize-btn', parent : controls });
            fn.component.create({ name : 'maximize-btn', parent : controls });
            fn.component.create({ name : 'close-btn', parent : controls });

            var content = fn.element.create({ parent : popup, tagName : 'div', style : { padding : '10px', overflow : 'auto', flex : '1' } });

            popup.content = content;
            popup._.resource = opt.resource;
            popup._.data = opt.data;
            popup._.caller = opt.caller;

            if (opt.render) {
                opt.render(popup);
            }

            document.body.appendChild(popup);

            fn.element.create({
                tagName : 'div', parent : popup,
                style : { position : 'absolute', right : '0', bottom : '0', width : '14px', height : '14px', cursor : 'nwse-resize' },
                event : { mousedown : function(e) {
                    e.stopPropagation();
                    focusWindow(popup);
                    var startX = e.clientX, startY = e.clientY;
                    var startW = popup.offsetWidth, startH = popup.offsetHeight;
                    function onMove(ev) {
                        popup.style.width = Math.max(260, startW + ev.clientX - startX) + 'px';
                        popup.style.height = Math.max(180, startH + ev.clientY - startY) + 'px';
                    }
                    function onUp() {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                    }
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                } },
            });

            openWindows.push(popup);
            focusWindow(popup);

            return popup;
        }
    });

    fn.component.layout.set({
        name : 'minimize-btn',
        layout : function() {
            return fn.element.create({
                tagName : 'button',
                attribute : { type : 'button', title : 'Minimize' },
                text : '_',
                style : { width : '20px', height : '18px', fontSize : '12px', lineHeight : '1', padding : '0' },
                event : { click : function(e) {
                    var popup = e.target.closest('.__popup');
                    popup.style.display = 'none';
                    popup._.minimized = true;
                    popup._.focused = false;
                    refreshTaskbarWindows();
                } },
            });
        }
    });

    fn.component.layout.set({
        name : 'maximize-btn',
        layout : function() {
            return fn.element.create({
                tagName : 'button',
                attribute : { type : 'button', title : 'Maximize' },
                text : '□',
                style : { width : '20px', height : '18px', fontSize : '12px', lineHeight : '1', padding : '0' },
                event : { click : function(e) {
                    var popup = e.target.closest('.__popup');
                    if (popup._.maximized) {
                        var rect = popup._.preMaximizeRect;
                        popup.style.top = rect.top;
                        popup.style.left = rect.left;
                        popup.style.width = rect.width;
                        popup.style.height = rect.height;
                        popup._.maximized = false;
                    } else {
                        popup._.preMaximizeRect = {
                            top : popup.style.top, left : popup.style.left,
                            width : popup.style.width, height : popup.style.height,
                        };
                        popup.style.top = '0px';
                        popup.style.left = '0px';
                        popup.style.width = '100%';
                        popup.style.height = 'calc(100% - 40px)';
                        popup._.maximized = true;
                    }
                    focusWindow(popup);
                } },
            });
        }
    });

    fn.component.layout.set({
        name : 'close-btn',
        layout : function() {
            return fn.element.create({
                tagName : 'button',
                attribute : { type : 'button', title : 'Close' },
                text : '✕',
                style : { width : '20px', height : '18px', fontSize : '12px', lineHeight : '1', padding : '0', background : '#d94f4f', color : '#fff' },
                event : { click : function(e) { closeWindow(e.target.closest('.__popup')); } },
            });
        }
    });

    fn.component.layout.set({
        name : 'save-btn',
        layout : function() {
            return fn.element.create({
                tagName : 'button',
                attribute : { type : 'button', title : 'Save' },
                text : 'Save',
                style : { padding : '6px 16px', marginTop : '10px' },
                event : { click : function(e) {
                    fn.util.saveForm({
                        popup : e.target.closest('.__popup'),
                        onSaved : closeWindow,
                    });
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
        name : 'desktop-icon',
        layout : function(opt = {}) {
            var wrap = fn.element.create({
                tagName : 'div',
                style : { width : '80px', textAlign : 'center', cursor : 'pointer', padding : '8px', userSelect : 'none' },
                event : { dblclick : function() { opt.launch(); } },
            });
            fn.element.create({ tagName : 'div', text : opt.icon, style : { fontSize : '32px' }, parent : wrap });
            fn.element.create({
                tagName : 'div', text : opt.label,
                style : { fontSize : '12px', color : '#fff', textShadow : '1px 1px 2px rgba(0,0,0,0.8)', marginTop : '4px' },
                parent : wrap,
            });
            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'start-menu',
        layout : function(opt = {}) {
            var menu = fn.element.create({
                tagName : 'div',
                attribute : { class : '__start-menu' },
                style : {
                    position : 'fixed', left : '4px', bottom : '44px', width : '200px',
                    background : '#ece9d8', border : '2px solid #0a246a', borderRadius : '4px 4px 0 0',
                    boxShadow : '2px 2px 10px rgba(0,0,0,0.5)', zIndex : '99999', padding : '6px',
                },
            });
            (opt.apps || []).forEach(function(app) {
                fn.element.create({
                    tagName : 'div',
                    text : app.icon + '  ' + app.label,
                    style : { padding : '8px 10px', cursor : 'pointer' },
                    event : { click : function() { menu.remove(); app.launch(); } },
                    parent : menu,
                });
            });
            return menu;
        }
    });

    fn.component.layout.set({
        name : 'clock',
        layout : function() {
            return fn.element.create({
                tagName : 'div',
                text : new Date().toLocaleTimeString([], { hour : '2-digit', minute : '2-digit' }),
                style : { padding : '4px 10px', border : '1px solid #163d80', fontSize : '12px', flexShrink : '0', color : '#fff' },
            });
        }
    });

    fn.component.layout.set({
        name : 'taskbar-windows',
        layout : function(opt = {}) {
            var area = fn.element.create({ tagName : 'div', style : { display : 'flex', gap : '4px', flex : '1', overflow : 'hidden' } });
            (opt.windows || []).forEach(function(win) {
                fn.element.create({
                    tagName : 'button',
                    attribute : { type : 'button' },
                    text : win._.title,
                    style : {
                        padding : '4px 12px', fontSize : '12px', maxWidth : '160px',
                        overflow : 'hidden', textOverflow : 'ellipsis', whiteSpace : 'nowrap',
                        background : (win._.focused && !win._.minimized) ? '#d3e4fc' : '#ece9d8',
                        border : '1px solid #0a246a',
                    },
                    event : { click : function() {
                        if (win._.minimized || !win._.focused) {
                            win.style.display = 'flex';
                            win._.minimized = false;
                            focusWindow(win);
                        } else {
                            win.style.display = 'none';
                            win._.minimized = true;
                            win._.focused = false;
                            refreshTaskbarWindows();
                        }
                    } },
                    parent : area,
                });
            });
            return area;
        }
    });

    fn.component.layout.set({
        name : 'taskbar',
        layout : function(opt = {}) {
            var bar = fn.element.create({
                tagName : 'div',
                style : {
                    position : 'fixed', left : '0', right : '0', bottom : '0', height : '40px',
                    display : 'flex', alignItems : 'center', gap : '8px', padding : '0 6px',
                    background : 'linear-gradient(#3a76d8, #1e50a2)', borderTop : '1px solid #0a246a',
                    zIndex : '99998',
                },
            });

            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : 'Start',
                style : { padding : '6px 14px', fontWeight : 'bold', background : 'linear-gradient(#3c9c3c, #1f6e1f)', color : '#fff', border : '1px solid #0a246a', borderRadius : '3px' },
                event : { click : function() {
                    var existing = document.querySelector('.__start-menu');
                    if (existing) {
                        existing.remove();
                        return;
                    }
                    fn.component.create({ name : 'start-menu', apps : opt.apps, parent : document.body });
                } },
                parent : bar,
            });

            var windowsArea = fn.element.create({ tagName : 'div', style : { display : 'flex', gap : '4px', flex : '1', overflow : 'hidden' }, parent : bar });
            taskbarWindowsArea = windowsArea;
            fn.component.refresh({ name : 'taskbar-windows', windows : openWindows, parent : windowsArea });

            var clockArea = fn.element.create({ tagName : 'div', parent : bar });
            fn.component.create({ name : 'clock', parent : clockArea });
            setInterval(function() {
                fn.component.refresh({ name : 'clock', parent : clockArea });
            }, 30000);

            return bar;
        }
    });

    fn.component.layout.set({
        name : 'desktop',
        layout : function(opt = {}) {
            var desktop = fn.element.create({
                tagName : 'div',
                style : {
                    position : 'fixed', top : '0', left : '0', right : '0', bottom : '0',
                    background : 'linear-gradient(#3a6ea5, #5b8fc7)', overflow : 'hidden',
                },
            });

            var iconsArea = fn.element.create({
                tagName : 'div',
                style : { position : 'absolute', top : '16px', left : '16px', display : 'flex', flexDirection : 'column', gap : '12px' },
                parent : desktop,
            });
            (opt.apps || []).forEach(function(app) {
                fn.component.create({ name : 'desktop-icon', icon : app.icon, label : app.label, launch : app.launch, parent : iconsArea });
            });

            fn.component.create({ name : 'taskbar', apps : opt.apps, parent : desktop });

            return desktop;
        }
    });
})();
