// Prime Hunter -- a terminal-styled text game built entirely on fn.js + fn.util.js. The actual
// task the player does is real primality testing: `checkPrime` below is the standard trial-
// division algorithm (skip even numbers, divide by every odd candidate up to sqrt(n)), not a
// shortcut or a lookup table -- every round's verdict and the explanation shown to the player
// come from that one function, so "guessing right" only pays out XP when it agrees with the
// proper method. XP earned per correct answer scales with the target's digit count, and total
// XP derives the player's level, which in turn widens the number range future rounds draw from
// -- so leveling up is a real, inspectable consequence of correctly-verified answers, not a
// cosmetic counter. This example does use `list`/`pagination` (unchanged from the reference
// implementation) for the attempt history, since that's a resource genuinely worth paging
// through; `player` is the only resource edited through the usual popup/form/save-btn (the
// Rename button) -- xp/level are game state, not something a form lets the player type in.
(function() {
    var fn = window.fn;

    function checkPrime(n) {
        if (n < 2) {
            return { isPrime : false, reason : n + ' is less than 2, not prime by definition.' };
        }
        if (n === 2) {
            return { isPrime : true, reason : '2 is the only even prime.' };
        }
        if (n % 2 === 0) {
            return { isPrime : false, reason : n + ' is even -- divisible by 2.' };
        }
        for (var i = 3; i * i <= n; i += 2) {
            if (n % i === 0) {
                return { isPrime : false, reason : n + ' = ' + i + ' x ' + (n / i) + '.' };
            }
        }
        return { isPrime : true, reason : 'No divisor found up to sqrt(' + n + ') ~ ' + Math.floor(Math.sqrt(n)) + ' -- prime.' };
    }

    function xpForNumber(n) {
        return String(n).length * 10;
    }

    function levelForXp(xp) {
        return Math.floor(xp / 100) + 1;
    }

    function rangeForLevel(level) {
        return { min : 2, max : Math.min(9999, 20 + (level - 1) * 40) };
    }

    var playerResource = null;
    var attemptResource = null;
    var playerId = null;
    var hudArea = null;
    var roundArea = null;
    var historyArea = null;
    var currentNumber = null;
    var feedback = null;

    function getPlayer() {
        return fn.data.select({ key : 'player', id : playerId });
    }

    function refreshHud() {
        fn.component.refresh({ name : 'hud', parent : hudArea });
    }

    function refreshRound() {
        fn.component.refresh({ name : 'round', parent : roundArea });
    }

    function refreshHistory() {
        fn.component.refresh({ name : 'history', parent : historyArea });
    }

    function newRound() {
        var range = rangeForLevel(getPlayer().data.level);
        currentNumber = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
        feedback = null;
        refreshRound();
    }

    function answer(guessIsPrime) {
        var checked = checkPrime(currentNumber);
        var correct = guessIsPrime === checked.isPrime;
        var xpEarned = correct ? xpForNumber(currentNumber) : 0;

        var player = getPlayer();
        var newXp = player.data.xp + xpEarned;
        var newLevel = levelForXp(newXp);
        var leveledUp = newLevel > player.data.level;
        fn.data.update({ key : 'player', id : player.id, data : Object.assign({}, player.data, { xp : newXp, level : newLevel }) });

        fn.data.insert({
            key : 'attempt',
            data : {
                number : currentNumber,
                guess : guessIsPrime ? 'Prime' : 'Composite',
                result : correct ? 'Correct' : 'Wrong',
                xpEarned : xpEarned,
            },
        });

        feedback = { correct : correct, reason : checked.reason, xpEarned : xpEarned, leveledUp : leveledUp, newLevel : newLevel };

        refreshHud();
        refreshRound();
        refreshHistory();
    }

    var termFont = "'Courier New', Courier, monospace";
    var termGreen = '#33ff66';
    var termDim = '#1f8f42';
    var termBg = '#0a0e0a';

    fn.component.layout.set({
        name : 'popup',
        layout : function(opt = {}) {
            var popup = fn.element.create({
                tagName : 'div',
                attribute : { class : '__popup' },
                style : {
                    position : 'fixed', top : '80px', left : '50%', transform : 'translateX(-50%)',
                    width : '320px', background : termBg, color : termGreen,
                    border : '1px solid ' + termDim, font : '14px/1.5 ' + termFont,
                },
            });

            var header = fn.element.create({
                parent : popup, tagName : 'div',
                style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', padding : '10px 14px', borderBottom : '1px solid ' + termDim },
            });
            fn.element.create({ parent : header, tagName : 'div', text : '> ' + (opt.title || 'Popup') });
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
                text : '[X]',
                style : { background : 'transparent', border : 'none', color : termGreen, font : '14px ' + termFont, cursor : 'pointer' },
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
                text : '[SAVE]',
                style : { padding : '8px 16px', marginTop : '12px', width : '100%', background : termBg, color : termGreen, border : '1px solid ' + termGreen, font : '14px ' + termFont, cursor : 'pointer' },
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
                width : '100%', boxSizing : 'border-box', padding : '8px', font : '14px ' + termFont,
                background : termBg, color : termGreen, border : '1px solid ' + termDim,
            };

            opt.resource.columns.forEach(function(column) {
                if (!column.form) {
                    return;
                }
                var field = fn.element.create({ tagName : 'div', style : { marginBottom : '12px' }, parent : el });
                fn.element.create({ tagName : 'div', text : column.label || column.name, style : { marginBottom : '4px', color : termDim, fontSize : '12px' }, parent : field });

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
                style : { textAlign : 'left', padding : '6px 10px', borderBottom : '1px solid ' + termDim, color : termDim, fontWeight : 'normal' },
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
                var cell = fn.element.create({ tagName : 'td', style : { padding : '6px 10px', borderBottom : '1px solid #0f2a17' }, parent : row });
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
                style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', padding : '8px 0', color : termGreen },
            });

            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : '[PREV]',
                style : { background : termBg, color : termGreen, border : '1px solid ' + termDim, font : '13px ' + termFont, padding : '6px 12px', cursor : 'pointer', visibility : opt.page > 0 ? 'visible' : 'hidden' },
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
                style : { color : termDim, fontSize : '13px' },
                parent : bar,
            });

            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : '[NEXT]',
                style : { background : termBg, color : termGreen, border : '1px solid ' + termDim, font : '13px ' + termFont, padding : '6px 12px', cursor : 'pointer', visibility : opt.page < opt.pageCount - 1 ? 'visible' : 'hidden' },
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
        name : 'hud',
        layout : function() {
            var player = getPlayer();
            var bar = fn.element.create({
                tagName : 'div',
                style : { display : 'flex', justifyContent : 'space-between', alignItems : 'flex-end', padding : '16px', borderBottom : '1px solid ' + termDim },
            });

            var left = fn.element.create({ tagName : 'div', parent : bar });
            fn.element.create({ tagName : 'div', text : '> ' + player.data.name, style : { fontSize : '16px' }, parent : left });
            fn.element.create({ tagName : 'div', text : 'LEVEL ' + player.data.level + ' -- ' + player.data.xp + ' XP', style : { fontSize : '12px', color : termDim, marginTop : '4px' }, parent : left });
            var track = fn.element.create({ tagName : 'div', style : { width : '160px', height : '6px', background : '#0f2a17', marginTop : '6px' }, parent : left });
            fn.element.create({ tagName : 'div', style : { width : (player.data.xp % 100) + '%', height : '100%', background : termGreen }, parent : track });

            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : '[RENAME]',
                style : { background : termBg, color : termGreen, border : '1px solid ' + termDim, font : '12px ' + termFont, padding : '6px 10px', cursor : 'pointer' },
                event : { click : function() {
                    fn.component.create({
                        name : 'popup',
                        title : 'Rename',
                        caller : { refresh : refreshHud },
                        render : function(popupEl) {
                            fn.component.create({ name : 'form', resource : playerResource, data : Object.assign({ id : player.id }, player.data), parent : popupEl.content });
                            fn.component.create({ name : 'save-btn', parent : popupEl.content });
                        },
                    });
                } },
                parent : bar,
            });

            return bar;
        }
    });

    fn.component.layout.set({
        name : 'round',
        layout : function() {
            var panel = fn.element.create({ tagName : 'div', style : { padding : '24px 16px', textAlign : 'center' } });

            if (feedback) {
                fn.element.create({
                    tagName : 'div',
                    text : feedback.correct ? '> CORRECT' : '> WRONG',
                    style : { fontSize : '18px', color : feedback.correct ? termGreen : '#ff5555' },
                    parent : panel,
                });
                fn.element.create({ tagName : 'div', text : feedback.reason, style : { marginTop : '8px', color : termDim, fontSize : '13px' }, parent : panel });
                fn.element.create({ tagName : 'div', text : '+' + feedback.xpEarned + ' XP', style : { marginTop : '8px' }, parent : panel });
                if (feedback.leveledUp) {
                    fn.element.create({ tagName : 'div', text : '*** LEVEL UP -> ' + feedback.newLevel + ' ***', style : { marginTop : '8px', color : '#ffd23f' }, parent : panel });
                }
                fn.element.create({
                    tagName : 'button',
                    attribute : { type : 'button' },
                    text : '[NEXT NUMBER]',
                    style : { marginTop : '16px', padding : '10px 20px', background : termBg, color : termGreen, border : '1px solid ' + termGreen, font : '14px ' + termFont, cursor : 'pointer' },
                    event : { click : function() { newRound(); } },
                    parent : panel,
                });
                return panel;
            }

            fn.element.create({ tagName : 'div', text : '> IS THIS NUMBER PRIME?', style : { color : termDim, fontSize : '13px' }, parent : panel });
            fn.element.create({ tagName : 'div', text : String(currentNumber), style : { fontSize : '48px', margin : '16px 0' }, parent : panel });

            var btnRow = fn.element.create({ tagName : 'div', style : { display : 'flex', gap : '12px', justifyContent : 'center' }, parent : panel });
            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : '[PRIME]',
                style : { padding : '12px 20px', background : termBg, color : termGreen, border : '1px solid ' + termGreen, font : '14px ' + termFont, cursor : 'pointer' },
                event : { click : function() { answer(true); } },
                parent : btnRow,
            });
            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : '[COMPOSITE]',
                style : { padding : '12px 20px', background : termBg, color : '#ff5555', border : '1px solid #ff5555', font : '14px ' + termFont, cursor : 'pointer' },
                event : { click : function() { answer(false); } },
                parent : btnRow,
            });

            return panel;
        }
    });

    fn.component.layout.set({
        name : 'history',
        layout : function() {
            var wrap = fn.element.create({ tagName : 'div', style : { padding : '16px' } });
            fn.element.create({ tagName : 'div', text : '> HISTORY', style : { color : termDim, fontSize : '13px', marginBottom : '8px' }, parent : wrap });
            var datas = fn.util.selectFlat({ key : 'attempt' }).slice().reverse();
            fn.component.create({ name : 'list', resource : attemptResource, datas : datas, readonly : true, parent : wrap });
            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'arena',
        layout : function(opt = {}) {
            playerResource = opt.playerResource;
            attemptResource = opt.attemptResource;
            playerId = opt.playerId;

            var shell = fn.element.create({
                tagName : 'div',
                style : { maxWidth : '480px', margin : '0 auto', minHeight : '100vh', background : termBg, color : termGreen, font : '14px/1.5 ' + termFont },
            });

            hudArea = fn.element.create({ tagName : 'div', parent : shell });
            roundArea = fn.element.create({ tagName : 'div', parent : shell });
            historyArea = fn.element.create({ tagName : 'div', parent : shell });

            refreshHud();
            newRound();
            refreshHistory();

            return shell;
        }
    });
})();
