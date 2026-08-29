// Signal Lost -- a branching sci-fi visual novel built on fn.js + fn.util.js. Scene is the whole
// story: each row is one beat (key/title/text/choices), seeded once in app.js like idle-hunter's
// Ground rows, but -- unlike Ground -- genuinely CRUD'd here: the Editor screen (behind an
// "Editor" button) is exactly the standard `list` + popup/form/save-btn pattern every other
// example uses, so writing your own story means clicking a row (or "+ New Scene") and editing it
// like any other resource. Scenes reference each other by their own `key` field (a stable string
// like 'bridge_solo'), not by fn.data's auto-increment id, since the graph is hand- or
// reader-written and needs stable targets for `choice.next` -- goToScene looks a scene up by that
// key via fn.util.selectFlat + .find rather than fn.data.select's id lookup. `choices` is stored
// as a real array (same as every other resource field), but its form field carries a
// `column.form.json: true` flag this file's own `form` layout understands: populate the textarea
// with `JSON.stringify(value, null, 2)` instead of the raw value, and `JSON.parse` it back on
// save -- so a reader authors a scene's branches as JSON text directly, the same idea as the
// framework's read-only JSON-preview escape hatch but round-tripping instead of just previewing.
// exportStory/importStory extend that same JSON-as-source-of-truth idea to the whole story: a
// Download button serializes every Scene row into one JSON array (a portable "novel file"), and
// an Upload file input replaces every Scene row with a freshly parsed one (validated to include a
// 'start' key) -- both built from nothing but fn.data.select/insert/delete, no framework change
// needed. Because a reader can wire `choice.next` to anything, the graph isn't guaranteed acyclic
// the way the seeded story is -- a "Check for Loops" button runs findCycles (a plain DFS that
// tracks which keys are on the current path; a choice back into that path is a back-edge, i.e. a
// real loop) and reports any it finds by title in a popup. It's informational only, same as
// everything else in the Editor -- a loop is a legitimate narrative device (a repeating day, a
// hub you can leave and return to), not an error, so this never blocks saving or importing.
// A scene with an empty `choices` array *is* an ending: goToScene logs it into the Ending
// resource the moment you first arrive (not on every re-render, which would double-count), so
// EndingLog is a real, replayable resource -- reach the same or a different ending across
// playthroughs and it keeps growing, genuinely worth paging through (list/pagination, unchanged
// from the reference implementation) once a few playthroughs pile up. That log lives behind an
// "Endings" popup rather than a tab bar, same reasoning the Editor toggle uses instead of a tab
// bar of its own: this app only ever shows one of three views at a time (story/editor/endings),
// and only Editor is substantial enough to need its own screen rather than a popup. Player is
// CRUD'd through the usual popup/form/save-btn only for its name (the Rename button).
// Multi-language content reuses that same `column.form.json` mechanism rather than adding new
// machinery: `title`/`text`/`endingType`/`choices` are stored as `{lang: value}` objects (e.g.
// `title: {en: "...", ko: "..."}`), authored together as one JSON blob per field in one save --
// there is no separate "add a translation" action. getLocalized(obj) reads `obj[currentLang]`,
// falling back to `.en`; the story screen's language <select> is built from
// `Object.keys(scene.title)`, so a scene that only has `en` shows no other option, and any
// language a reader adds to a scene's JSON shows up automatically next time that scene renders.
// findCycles walks every language's choices (deduped) since the graph is meant to be the same
// shape across languages -- only the labels differ.
(function() {
    var fn = window.fn;

    var playerResource = null;
    var endingResource = null;
    var sceneResource = null;
    var playerId = null;
    var rootArea = null;
    var currentSceneKey = 'start';
    var mode = 'story';
    var currentLang = 'en';
    var langLabels = { en : 'English', ko : '한국어' };

    function getLocalized(obj) {
        if (!obj) {
            return '';
        }
        if (obj[currentLang] !== undefined) {
            return obj[currentLang];
        }
        if (obj.en !== undefined) {
            return obj.en;
        }
        return '';
    }

    function getPlayer() {
        return fn.data.select({ key : 'player', id : playerId });
    }

    function findScene(key) {
        return fn.util.selectFlat({ key : 'scene' }).find(function(scene) { return scene.key === key; });
    }

    function refreshScreen() {
        fn.component.refresh({ name : 'screen', parent : rootArea });
    }

    function openEditor() {
        mode = 'editor';
        refreshScreen();
    }

    function closeEditor() {
        mode = 'story';
        refreshScreen();
    }

    function exportStory() {
        var scenes = fn.util.selectFlat({ key : 'scene' }).map(function(s) {
            return { key : s.key, title : s.title, text : s.text, endingType : s.endingType || {}, choices : s.choices };
        });
        var blob = new Blob([ JSON.stringify(scenes, null, 2) ], { type : 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = fn.element.create({ tagName : 'a', attribute : { href : url, download : 'signal-lost-story.json' } });
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function importStory(file) {
        var reader = new FileReader();
        reader.onload = function() {
            var parsed;
            try {
                parsed = JSON.parse(reader.result);
            } catch (e) {
                alert('That file is not valid JSON.');
                return;
            }
            if (!Array.isArray(parsed) || !parsed.some(function(s) { return s.key === 'start'; })) {
                alert('Expected a JSON array of scenes, including one with key "start".');
                return;
            }
            fn.data.select({ key : 'scene' }).forEach(function(row) {
                fn.data.delete({ key : 'scene', id : row.id });
            });
            parsed.forEach(function(scene) {
                fn.data.insert({
                    key : 'scene',
                    data : { key : scene.key, title : scene.title, text : scene.text, endingType : scene.endingType || {}, choices : scene.choices || {} },
                });
            });
            currentSceneKey = 'start';
            refreshScreen();
        };
        reader.readAsText(file);
    }

    // Standard directed-graph cycle detection: DFS from every scene, tracking which keys are on
    // the current path (`inStack`). A choice pointing at a key still on that path is a back-edge
    // -- a real loop -- and the path slice from that key to here (plus the repeat) is the cycle,
    // reported by title. Purely informational (see the file header) -- never blocks save/import.
    function findCycles() {
        var byKey = {};
        fn.util.selectFlat({ key : 'scene' }).forEach(function(s) { byKey[s.key] = s; });

        var cycles = [];
        var visited = {};
        var stack = [];
        var inStack = {};

        function nextKeysOf(scene) {
            var seen = {};
            var keys = [];
            Object.keys(scene.choices || {}).forEach(function(lang) {
                (scene.choices[lang] || []).forEach(function(choice) {
                    if (!seen[choice.next]) {
                        seen[choice.next] = true;
                        keys.push(choice.next);
                    }
                });
            });
            return keys;
        }

        function dfs(key) {
            if (visited[key] || !byKey[key]) {
                return;
            }
            stack.push(key);
            inStack[key] = true;

            nextKeysOf(byKey[key]).forEach(function(next) {
                if (inStack[next]) {
                    var idx = stack.indexOf(next);
                    var path = stack.slice(idx).concat(next);
                    cycles.push(path.map(function(k) { return byKey[k] ? getLocalized(byKey[k].title) : k; }));
                } else {
                    dfs(next);
                }
            });

            stack.pop();
            inStack[key] = false;
            visited[key] = true;
        }

        Object.keys(byKey).forEach(dfs);
        return cycles;
    }

    function openLoopCheck() {
        var cycles = findCycles();
        fn.component.create({
            name : 'popup',
            title : 'Loop Check',
            render : function(popupEl) {
                if (cycles.length === 0) {
                    fn.element.create({ tagName : 'div', text : 'No loops detected.', style : { color : dim }, parent : popupEl.content });
                    return;
                }
                fn.element.create({
                    tagName : 'div', text : cycles.length + (cycles.length === 1 ? ' loop found:' : ' loops found:'),
                    style : { fontWeight : '700', color : accent, marginBottom : '10px' }, parent : popupEl.content,
                });
                cycles.forEach(function(cycle) {
                    fn.element.create({ tagName : 'div', text : cycle.join(' → '), style : { fontSize : '13px', marginBottom : '8px', color : text }, parent : popupEl.content });
                });
            },
        });
    }

    function goToScene(key) {
        currentSceneKey = key;
        var scene = findScene(key);
        var choices = getLocalized(scene.choices) || [];
        if (choices.length === 0) {
            fn.data.insert({ key : 'ending', data : { endingTitle : getLocalized(scene.title), endingType : getLocalized(scene.endingType) } });
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
                        attribute : column.form.placeholder ? { name : column.name, placeholder : column.form.placeholder } : { name : column.name },
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
                    input = fn.element.create({
                        tagName : 'input',
                        attribute : column.form.placeholder ? { type : 'text', name : column.name, placeholder : column.form.placeholder } : { type : 'text', name : column.name },
                        style : inputStyle,
                        parent : field,
                    });
                }

                if (input.tagName !== 'BUTTON' && opt.data[column.name] !== undefined) {
                    input.value = column.form.json ? JSON.stringify(opt.data[column.name], null, 2) : opt.data[column.name];
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
                    var value = column.form.resource ? Number(input.value) : input.value;
                    if (column.form.json) {
                        try {
                            value = JSON.parse(value);
                        } catch (e) {
                            value = {};
                        }
                    }
                    result[column.name] = value;
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
            var choices = getLocalized(scene.choices) || [];
            var wrap = fn.element.create({ tagName : 'div', style : { padding : '20px' } });

            var header = fn.element.create({ tagName : 'div', style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', marginBottom : '20px' }, parent : wrap });
            fn.element.create({ tagName : 'div', text : 'Reader: ' + player.data.name, style : { fontSize : '12px', color : dim }, parent : header });
            var btnRow = fn.element.create({ tagName : 'div', style : { display : 'flex', gap : '8px', alignItems : 'center' }, parent : header });
            var langSelect = fn.element.create({
                tagName : 'select',
                style : { padding : '5px 6px', fontSize : '12px', background : bg, color : accent, border : '1px solid ' + dim, borderRadius : '4px' },
                event : { change : function(e) { currentLang = e.target.value; refreshScreen(); } },
                parent : btnRow,
            });
            Object.keys(scene.title || {}).forEach(function(lang) {
                fn.element.create({ tagName : 'option', attribute : { value : lang }, text : langLabels[lang] || lang, parent : langSelect });
            });
            langSelect.value = currentLang;
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Editor',
                style : { padding : '6px 10px', fontSize : '12px', background : bg, color : accent, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer' },
                event : { click : openEditor }, parent : btnRow,
            });
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

            var isEnding = choices.length === 0;
            if (isEnding) {
                fn.element.create({ tagName : 'div', text : getLocalized(scene.endingType), style : { fontSize : '11px', letterSpacing : '2px', color : accent, textTransform : 'uppercase', marginBottom : '6px' }, parent : wrap });
            }

            fn.element.create({ tagName : 'div', text : getLocalized(scene.title), style : { fontWeight : '700', fontSize : '20px', color : accent, marginBottom : '12px' }, parent : wrap });
            fn.element.create({ tagName : 'div', text : getLocalized(scene.text), style : { fontSize : '15px', lineHeight : '1.7', color : text, marginBottom : '24px' }, parent : wrap });

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

            choices.forEach(function(choice) {
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
        name : 'editor',
        layout : function() {
            var wrap = fn.element.create({ tagName : 'div', style : { padding : '20px' } });

            var header = fn.element.create({ tagName : 'div', style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', marginBottom : '16px' }, parent : wrap });
            fn.element.create({ tagName : 'div', text : 'Story Editor', style : { fontWeight : '700', fontSize : '18px', color : accent }, parent : header });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Back to Story',
                style : { padding : '6px 10px', fontSize : '12px', background : bg, color : accent, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer' },
                event : { click : closeEditor }, parent : header,
            });

            var toolRow = fn.element.create({ tagName : 'div', style : { display : 'flex', gap : '8px', marginBottom : '16px', flexWrap : 'wrap', alignItems : 'center' }, parent : wrap });
            fn.util.newButton({
                text : '+ New Scene', title : 'New Scene', resource : sceneResource,
                caller : { refresh : refreshScreen }, parent : toolRow,
                style : { padding : '8px 12px', fontSize : '13px', background : accent, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer' },
            });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Check for Loops',
                style : { padding : '8px 12px', fontSize : '13px', background : bg, color : accent, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer' },
                event : { click : openLoopCheck }, parent : toolRow,
            });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Download JSON',
                style : { padding : '8px 12px', fontSize : '13px', background : bg, color : accent, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer' },
                event : { click : exportStory }, parent : toolRow,
            });
            fn.element.create({
                tagName : 'input',
                attribute : { type : 'file', accept : 'application/json,.json' },
                style : { fontSize : '12px', color : text, maxWidth : '160px' },
                event : { change : function(e) { if (e.target.files[0]) { importStory(e.target.files[0]); } } },
                parent : toolRow,
            });

            var sceneDatas = fn.util.selectFlat({ key : 'scene' });
            fn.component.create({ name : 'list', resource : sceneResource, datas : sceneDatas, caller : { refresh : refreshScreen }, pageSize : 8, parent : wrap });

            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'screen',
        layout : function() {
            var wrap = fn.element.create({ tagName : 'div' });
            fn.component.create({ name : mode === 'editor' ? 'editor' : 'story', parent : wrap });
            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'game',
        layout : function(opt = {}) {
            playerResource = opt.playerResource;
            endingResource = opt.endingResource;
            sceneResource = opt.sceneResource;
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
