// Signal Lost -- a branching sci-fi visual novel built on fn.js + fn.util.js. Scene is the whole
// story: each row is one beat (key/title/text/choices), seeded once in app.js exactly like
// idle-hunter's Ground rows -- read-only content the app itself owns, never user-CRUD'd. Scenes
// reference each other by their own `key` field (a stable string like 'bridge_solo'), not by
// fn.data's auto-increment id, since the story graph is written by hand in app.js and needs
// readable, stable targets for `choice.next` -- goToScene looks a scene up by that key via
// fn.util.selectFlat + .find rather than fn.data.select's id lookup. A scene with an empty
// `choices` array *is* an ending: goToScene logs it into the Ending resource the moment you first
// arrive (not on every re-render, which would double-count), so EndingLog is a real, replayable
// resource -- reach the same or a different ending across playthroughs and it keeps growing,
// genuinely worth paging through (list/pagination, unchanged from the reference implementation)
// once a few playthroughs pile up. That log lives behind an "Endings" popup rather than a tab bar
// -- unlike idle-hunter's multi-screen economy loop, this app only ever has one real view (the
// story itself), so a second full navigation system would be machinery this app doesn't need.
// Player is CRUD'd through the usual popup/form/save-btn only for its name (the Rename button).
(function() {
    var fn = window.fn;

    var playerResource = null;
    var endingResource = null;
    var playerId = null;
    var rootArea = null;
    var currentSceneKey = 'start';

    function getPlayer() {
        return fn.data.select({ key : 'player', id : playerId });
    }

    function findScene(key) {
        return fn.util.selectFlat({ key : 'scene' }).find(function(scene) { return scene.key === key; });
    }

    function refreshScreen() {
        fn.component.refresh({ name : 'story', parent : rootArea });
    }

    function goToScene(key) {
        currentSceneKey = key;
        var scene = findScene(key);
        if (scene.choices.length === 0) {
            fn.data.insert({ key : 'ending', data : { endingTitle : scene.title, endingType : scene.endingType } });
        }
        refreshScreen();
    }

    function openRename() {
        var player = getPlayer();
        fn.component.create({
            name : 'popup',
            title : 'Rename',
            caller : { refresh : refreshScreen },
            render : function(popupEl) {
                fn.component.create({ name : 'form', resource : playerResource, data : Object.assign({ id : player.id }, player.data), parent : popupEl.content });
                fn.component.create({ name : 'save-btn', parent : popupEl.content });
            },
        });
    }

    function openEndings() {
        fn.component.create({
            name : 'popup',
            title : 'Endings Reached',
            render : function(popupEl) {
                var datas = fn.util.selectFlat({ key : 'ending' }).slice().reverse();
                fn.component.create({ name : 'list', resource : endingResource, datas : datas, readonly : true, parent : popupEl.content });
            },
        });
    }

    var bg = '#070b14';
    var panelBg = '#101b33';
    var accent = '#4fd8e8';
    var dim = '#5b6b8c';
    var text = '#e6ecff';
    var appFont = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";

    fn.component.layout.set({
        name : 'popup',
        layout : function(opt = {}) {
            var popup = fn.element.create({
                tagName : 'div',
                attribute : { class : '__popup' },
                style : {
                    position : 'fixed', top : '70px', left : '50%', transform : 'translateX(-50%)',
                    width : '320px', background : panelBg, color : text,
                    border : '1px solid ' + dim, borderRadius : '6px', font : '14px/1.5 ' + appFont,
                },
            });

            var header = fn.element.create({
                parent : popup, tagName : 'div',
                style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', padding : '10px 14px', borderBottom : '1px solid ' + dim },
            });
            fn.element.create({ parent : header, tagName : 'div', text : opt.title || 'Popup', style : { fontWeight : '700', color : accent } });
            fn.component.create({ name : 'close-btn', parent : header });

            var content = fn.element.create({ parent : popup, tagName : 'div', style : { padding : '14px' } });

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
                style : { background : 'transparent', border : 'none', color : accent, fontSize : '14px', cursor : 'pointer' },
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
                style : { padding : '8px 16px', marginTop : '12px', width : '100%', background : accent, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer' },
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
                width : '100%', boxSizing : 'border-box', padding : '8px', font : '14px ' + appFont,
                background : bg, color : text, border : '1px solid ' + dim, borderRadius : '4px',
            };

            opt.resource.columns.forEach(function(column) {
                if (!column.form) {
                    return;
                }
                var field = fn.element.create({ tagName : 'div', style : { marginBottom : '12px' }, parent : el });
                fn.element.create({ tagName : 'div', text : column.label || column.name, style : { marginBottom : '4px', color : dim, fontSize : '12px' }, parent : field });

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
                style : { textAlign : 'left', padding : '6px 10px', borderBottom : '1px solid ' + dim, color : dim, fontWeight : 'normal' },
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
                var cell = fn.element.create({ tagName : 'td', style : { padding : '6px 10px', borderBottom : '1px solid #1c2947' }, parent : row });
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
                style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', padding : '8px 0', color : accent },
            });

            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : 'Prev',
                style : { padding : '6px 12px', background : bg, color : accent, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer', visibility : opt.page > 0 ? 'visible' : 'hidden' },
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
                style : { color : dim, fontSize : '13px' },
                parent : bar,
            });

            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : 'Next',
                style : { padding : '6px 12px', background : bg, color : accent, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer', visibility : opt.page < opt.pageCount - 1 ? 'visible' : 'hidden' },
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
        name : 'story',
        layout : function() {
            var player = getPlayer();
            var scene = findScene(currentSceneKey);
            var wrap = fn.element.create({ tagName : 'div', style : { padding : '20px' } });

            var header = fn.element.create({ tagName : 'div', style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', marginBottom : '20px' }, parent : wrap });
            fn.element.create({ tagName : 'div', text : 'Reader: ' + player.data.name, style : { fontSize : '12px', color : dim }, parent : header });
            var btnRow = fn.element.create({ tagName : 'div', style : { display : 'flex', gap : '8px' }, parent : header });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Endings',
                style : { padding : '6px 10px', fontSize : '12px', background : bg, color : accent, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer' },
                event : { click : openEndings }, parent : btnRow,
            });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Rename',
                style : { padding : '6px 10px', fontSize : '12px', background : bg, color : accent, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer' },
                event : { click : openRename }, parent : btnRow,
            });

            var isEnding = scene.choices.length === 0;
            if (isEnding) {
                fn.element.create({ tagName : 'div', text : scene.endingType, style : { fontSize : '11px', letterSpacing : '2px', color : accent, textTransform : 'uppercase', marginBottom : '6px' }, parent : wrap });
            }

            fn.element.create({ tagName : 'div', text : scene.title, style : { fontWeight : '700', fontSize : '20px', color : accent, marginBottom : '12px' }, parent : wrap });
            fn.element.create({ tagName : 'div', text : scene.text, style : { fontSize : '15px', lineHeight : '1.7', color : text, marginBottom : '24px' }, parent : wrap });

            if (isEnding) {
                fn.element.create({ tagName : 'div', text : 'THE END', style : { fontSize : '12px', letterSpacing : '3px', color : dim, marginBottom : '16px' }, parent : wrap });
                fn.element.create({
                    tagName : 'button', attribute : { type : 'button' }, text : 'Play Again',
                    style : { padding : '10px 16px', width : '100%', background : accent, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer' },
                    event : { click : function() { goToScene('start'); } },
                    parent : wrap,
                });
                return wrap;
            }

            scene.choices.forEach(function(choice) {
                fn.element.create({
                    tagName : 'button', attribute : { type : 'button' }, text : choice.label,
                    style : {
                        display : 'block', width : '100%', textAlign : 'left', padding : '12px 14px', marginBottom : '10px',
                        background : panelBg, color : text, border : '1px solid ' + dim, borderRadius : '6px',
                        font : '14px ' + appFont, cursor : 'pointer',
                    },
                    event : { click : function() { goToScene(choice.next); } },
                    parent : wrap,
                });
            });

            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'game',
        layout : function(opt = {}) {
            playerResource = opt.playerResource;
            endingResource = opt.endingResource;
            playerId = opt.playerId;

            var shell = fn.element.create({
                tagName : 'div',
                style : { maxWidth : '480px', margin : '0 auto', minHeight : '100vh', background : bg, color : text, font : '14px/1.5 ' + appFont },
            });

            rootArea = fn.element.create({ tagName : 'div', parent : shell });
            refreshScreen();

            return shell;
        }
    });
})();
