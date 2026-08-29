// Team Chat -- this example's own popup/close-btn/save-btn/form, plus a persistent split-pane
// chrome (sidebar of channels + a main panel) that none of the other examples use: crm/
// windows-os/android-phone all show one screen at a time (a tab swap, a window stack, a screen
// stack), but here the channel list and the selected channel's messages are both on screen at
// once, like a messaging app. Clicking a channel doesn't open a popup the way `list`'s default
// row-click does -- it selects the channel and refreshes the main panel in place -- so this
// example writes its own `sidebar`/`channel-item`/`main-panel` layouts instead of using `list`
// at all; `list`/`pagination` aren't needed here and aren't defined. The selected channel is a
// real route, though, via fn.util.route ('#/channel/<id>'): the sidebar never itself decides what
// to show, it's just a fixed shell around whatever fn.util.route renders into mainPanelArea, so
// clicking a channel is a real navigation and the back button steps back through the channels
// you've visited instead of leaving the app. No framework file is touched.
(function() {
    var fn = window.fn;

    var channelResource = null;
    var sidebarArea = null;
    var mainRouteEl = null;

    function channelIdFromHash() {
        var m = location.hash.match(/^#\/channel\/(\d+)$/);
        return m ? Number(m[1]) : null;
    }

    function refreshSidebar() {
        fn.component.refresh({ name : 'sidebar', parent : sidebarArea });
    }

    function selectChannel(id) {
        location.hash = '#/channel/' + id;
    }

    fn.component.layout.set({
        name : 'popup',
        layout : function(opt = {}) {
            var popup = fn.element.create({
                tagName : 'div',
                attribute : { class : '__popup' },
                style : {
                    position : 'fixed', top : '80px', left : '50%', transform : 'translateX(-50%)',
                    width : '360px', background : '#fff', color : '#1d1c1d',
                    border : '1px solid #ddd', borderRadius : '8px', boxShadow : '0 4px 20px rgba(0,0,0,0.3)',
                    font : "14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    overflow : 'hidden',
                },
            });

            var header = fn.element.create({
                parent : popup, tagName : 'div',
                style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', padding : '14px 16px', background : '#4a154b', color : '#fff' },
            });
            fn.element.create({ parent : header, tagName : 'div', style : { fontWeight : '700' }, text : opt.title || 'Popup' });
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
        layout : function() {
            return fn.element.create({
                tagName : 'button',
                attribute : { type : 'button', title : 'Close' },
                text : '✕',
                style : { background : 'transparent', border : 'none', color : '#fff', fontSize : '16px', cursor : 'pointer' },
                event : { click : function(e) { e.target.closest('.__popup').remove(); } },
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
                style : { padding : '8px 16px', marginTop : '12px', width : '100%', background : '#4a154b', color : '#fff', border : 'none', borderRadius : '4px', fontWeight : '600', cursor : 'pointer' },
                event : { click : function(e) {
                    fn.util.saveForm({
                        popup : e.target.closest('.__popup'),
                        onSaved : function(popup) { popup.remove(); },
                    });
                } },
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
                width : '100%', boxSizing : 'border-box', padding : '8px', fontSize : '14px',
                border : '1px solid #ccc', borderRadius : '4px',
            };

            opt.resource.columns.forEach(function(column) {
                if (!column.form) {
                    return;
                }
                var field = fn.element.create({ tagName : 'div', style : { marginBottom : '12px' }, parent : el });
                fn.element.create({ tagName : 'div', text : column.label || column.name, style : { marginBottom : '4px', color : '#616061', fontSize : '12px' }, parent : field });

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
                        style : Object.assign({}, inputStyle, { minHeight : column.form.height || '60px', resize : 'vertical' }),
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

            el.save = function() {
                var data = el.getData();
                if (el._.data.id !== undefined) {
                    var merged = Object.assign({}, el._.data, data);
                    delete merged.id;
                    return fn.data.update({ key : el._.resource.key, id : el._.data.id, data : merged });
                }
                return fn.data.insert({ key : el._.resource.key, data : data });
            };

            return el;
        }
    });

    fn.component.layout.set({
        name : 'channel-item',
        layout : function(opt = {}) {
            var channel = opt.channel;
            var item = fn.element.create({
                tagName : 'div',
                style : {
                    display : 'flex', justifyContent : 'space-between', alignItems : 'center',
                    padding : '8px 16px', cursor : 'pointer', color : '#fff', fontSize : '14px',
                    background : channel.id === channelIdFromHash() ? '#1164a3' : 'transparent',
                },
                event : { click : function() { selectChannel(channel.id); } },
            });
            fn.element.create({
                tagName : 'div', text : '# ' + channel.name,
                style : { overflow : 'hidden', textOverflow : 'ellipsis', whiteSpace : 'nowrap' },
                parent : item,
            });
            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button', title : 'Edit' },
                text : '✏️',
                style : { background : 'transparent', border : 'none', fontSize : '12px', cursor : 'pointer', flexShrink : '0' },
                event : { click : function(e) {
                    e.stopPropagation();
                    fn.component.create({
                        name : 'popup',
                        title : 'Edit Channel',
                        caller : { refresh : refreshSidebar },
                        render : function(popupEl) {
                            fn.component.create({ name : 'form', resource : channelResource, data : channel, parent : popupEl.content });
                            fn.component.create({ name : 'save-btn', parent : popupEl.content });
                        },
                    });
                } },
                parent : item,
            });
            return item;
        }
    });

    fn.component.layout.set({
        name : 'sidebar',
        layout : function() {
            var bar = fn.element.create({ tagName : 'div', style : { display : 'flex', flexDirection : 'column', height : '100%' } });
            fn.element.create({
                tagName : 'div', text : 'Team Chat',
                style : { padding : '16px', color : '#fff', fontWeight : '700', fontSize : '16px' },
                parent : bar,
            });
            fn.util.newButton({
                text : '+ New Channel', title : 'New Channel', resource : channelResource,
                caller : { refresh : refreshSidebar }, parent : bar,
                style : { margin : '0 16px 12px', padding : '8px', fontSize : '13px', background : 'transparent', color : '#fff', border : '1px solid rgba(255,255,255,0.3)', borderRadius : '4px', cursor : 'pointer' },
            });
            var list = fn.element.create({ tagName : 'div', style : { flex : '1', overflow : 'auto' }, parent : bar });
            fn.util.selectFlat({ key : 'channel' }).forEach(function(channel) {
                fn.component.create({ name : 'channel-item', channel : channel, parent : list });
            });
            return bar;
        }
    });

    fn.component.layout.set({
        name : 'message-bubble',
        layout : function(opt = {}) {
            var wrap = fn.element.create({ tagName : 'div', style : { marginBottom : '14px' } });
            fn.element.create({ tagName : 'div', text : opt.message.author, style : { fontWeight : '700', fontSize : '13px', marginBottom : '2px' }, parent : wrap });
            fn.element.create({ tagName : 'div', text : opt.message.body, style : { fontSize : '14px', color : '#1d1c1d', whiteSpace : 'pre-wrap' }, parent : wrap });
            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'composer',
        layout : function(opt = {}) {
            var bar = fn.element.create({
                tagName : 'div',
                style : { display : 'flex', gap : '8px', padding : '12px', borderTop : '1px solid #ddd', flexShrink : '0' },
            });

            function send() {
                var text = input.value.trim();
                if (!text) {
                    return;
                }
                fn.data.insert({ key : 'message', data : { channelId : opt.channelId, author : 'You', body : text } });
                input.value = '';
                mainRouteEl.refresh();
            }

            var input = fn.element.create({
                tagName : 'input',
                attribute : { type : 'text', placeholder : 'Message #' + opt.channelName },
                style : { flex : '1', padding : '8px 10px', fontSize : '14px', border : '1px solid #ccc', borderRadius : '4px' },
                event : { keydown : function(e) { if (e.key === 'Enter') { send(); } } },
                parent : bar,
            });
            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : 'Send',
                style : { padding : '8px 16px', background : '#4a154b', color : '#fff', border : 'none', borderRadius : '4px', cursor : 'pointer' },
                event : { click : send },
                parent : bar,
            });

            return bar;
        }
    });

    fn.component.layout.set({
        name : 'main-panel',
        layout : function() {
            var panel = fn.element.create({ tagName : 'div', style : { display : 'flex', flexDirection : 'column', height : '100%' } });

            var channelId = channelIdFromHash();
            var channelRow = channelId !== null ? fn.data.select({ key : 'channel', id : channelId }) : null;
            if (!channelRow) {
                fn.element.create({
                    tagName : 'div', text : 'Select a channel to start chatting',
                    style : { margin : 'auto', color : '#8a8a8a', fontSize : '14px' },
                    parent : panel,
                });
                return panel;
            }

            fn.element.create({
                tagName : 'div', text : '# ' + channelRow.data.name,
                style : { padding : '14px 16px', borderBottom : '1px solid #ddd', fontWeight : '700', flexShrink : '0' },
                parent : panel,
            });

            var feed = fn.element.create({ tagName : 'div', style : { flex : '1', overflow : 'auto', padding : '16px' }, parent : panel });
            fn.util.selectFlat({ key : 'message' })
                .filter(function(message) { return message.channelId === channelId; })
                .forEach(function(message) {
                    fn.component.create({ name : 'message-bubble', message : message, parent : feed });
                });

            fn.component.create({ name : 'composer', channelId : channelId, channelName : channelRow.data.name, parent : panel });

            return panel;
        }
    });

    fn.component.layout.set({
        name : 'chat-shell',
        layout : function(opt = {}) {
            channelResource = opt.channelResource;

            var shell = fn.element.create({
                tagName : 'div',
                style : { position : 'fixed', top : '0', left : '0', right : '0', bottom : '0', display : 'flex', font : "14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
            });

            sidebarArea = fn.element.create({ tagName : 'div', style : { width : '240px', flexShrink : '0', background : '#3f0e40', overflow : 'auto' }, parent : shell });
            fn.component.create({ name : 'sidebar', parent : sidebarArea });

            var mainPanelArea = fn.element.create({ tagName : 'div', style : { flex : '1', display : 'flex', flexDirection : 'column', overflow : 'hidden' }, parent : shell });
            mainRouteEl = fn.util.route({
                resolve : function() { return 'main-panel'; },
                parent : mainPanelArea,
                onRoute : refreshSidebar,
            });

            return shell;
        }
    });
})();
