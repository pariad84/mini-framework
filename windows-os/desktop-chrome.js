// Windows-OS-style chrome for this example only -- draggable/resizable/minimizable windows, a
// taskbar, and a Start menu are exactly the "UI chrome" CLAUDE.md calls out of scope for the
// framework (popup dragging/resizing, z-index, cascading position). So this file re-registers
// popup/close-btn/save-btn through the same fn.component.layout.set registry mobile-layout.js in
// crm/ used, plus adds new app-only layouts (desktop, taskbar, taskbar-windows, clock,
// start-menu, desktop-icon, minimize-btn, maximize-btn). No framework file is touched.
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
                    closeWindow(popup);
                } },
            });
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
