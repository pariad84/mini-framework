// Android-phone-style chrome for this example only -- a device frame, status bar, home screen
// with tappable icons, a 3-button nav bar, and full-screen app views with back-stack navigation
// are all app-specific UI chrome, the same category CLAUDE.md calls out of scope for the
// framework (see windows-os/layout.js for the desktop-OS equivalent of this same override
// technique). Re-registers popup/close-btn/save-btn through the same fn.component.layout.set
// registry; adds new app-only layouts (phone, home-screen, app-icon, nav-bar, status-clock).
// No framework file is touched.
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
            var device = fn.element.create({
                tagName : 'div',
                style : {
                    width : '360px', height : '720px', margin : '40px auto',
                    background : '#111', borderRadius : '36px', padding : '12px',
                    boxShadow : '0 10px 40px rgba(0,0,0,0.5)', boxSizing : 'border-box',
                },
            });

            var screen = fn.element.create({
                tagName : 'div', parent : device,
                style : {
                    position : 'relative', width : '100%', height : '100%',
                    background : '#fff', borderRadius : '24px', overflow : 'hidden',
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

            return device;
        }
    });
})();
