// Idle Hunter -- a dark-fantasy idle RPG built on fn.js + fn.util.js. No level/XP concept for
// the player at all (that was the last game example, and it wasn't fun): the player only has
// Attack and Defense, both derived purely from weapon/armor level (attackOf/defenseOf below), and
// those only move when the Shop's upgrade buttons are actually bought. Instead of picking a
// single target and answering, the player picks one of 10 seeded Ground rows (their monster
// stats scale with `huntLevel`) and then hunts continuously -- resolveTick fires on a setInterval
// once a ground is entered and keeps firing, unattended, until Stop Hunting is clicked, which is
// the only thing that clears it. A win drops Iron Ore + gold (both scale with the ground's
// level); a loss costs gold scaled by how much the monster's attack exceeds the player's defense,
// so upgrading Defense is a real, felt choice and not just a bigger number. Iron Ore itself is
// inert until sold at the Shop, so "collect ore -> sell -> upgrade -> hunt harder ground" is a
// real loop, not three disconnected screens. HuntLog is a real growing resource worth paging
// through (list/pagination, restyled but otherwise unchanged from the reference implementation);
// Ground is only ever entered, never edited, so it gets its own `ground-card` grid instead of
// `list` (same reasoning `team-chat/`'s `channel-item` used); Player is CRUD'd through the usual
// popup/form/save-btn only for its name (the Rename button) -- gold/ore/weaponLevel/armorLevel
// are all game state a form should never let the player type in directly.
(function() {
    var fn = window.fn;

    function attackOf(player) {
        return 10 + player.data.weaponLevel * 8;
    }

    function defenseOf(player) {
        return 5 + player.data.armorLevel * 5;
    }

    function weaponCost(level) {
        return 50 * level * level;
    }

    function armorCost(level) {
        return 40 * level * level;
    }

    var orePrice = 5;

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    var playerResource = null;
    var huntLogResource = null;
    var playerId = null;
    var rootArea = null;
    var activeGroundId = null;
    var huntTimer = null;

    function getPlayer() {
        return fn.data.select({ key : 'player', id : playerId });
    }

    function refreshScreen() {
        fn.component.refresh({ name : 'screen', parent : rootArea });
    }

    function stopHuntLoop() {
        if (huntTimer) {
            clearInterval(huntTimer);
            huntTimer = null;
        }
    }

    function resolveTick() {
        var ground = fn.data.select({ key : 'ground', id : activeGroundId });
        var player = getPlayer();
        var atk = attackOf(player);
        var winChance = clamp(atk / (atk + ground.data.monsterDefense), 0.15, 0.9);

        var oreGained = 0;
        var goldDelta = 0;
        var result;
        if (Math.random() < winChance) {
            oreGained = randInt(ground.data.oreMin, ground.data.oreMax);
            goldDelta = randInt(ground.data.goldMin, ground.data.goldMax);
            result = 'Win';
        } else {
            var raw = Math.round((ground.data.monsterAttack - defenseOf(player)) / 2);
            goldDelta = -Math.min(player.data.gold, Math.max(0, raw));
            result = 'Hit';
        }

        fn.data.update({
            key : 'player', id : player.id,
            data : Object.assign({}, player.data, { gold : player.data.gold + goldDelta, ironOre : player.data.ironOre + oreGained }),
        });
        fn.data.insert({ key : 'huntLog', data : { ground : ground.data.name, result : result, ore : oreGained, gold : goldDelta } });

        refreshScreen();
    }

    function enterGround(id) {
        activeGroundId = id;
        refreshScreen();
        stopHuntLoop();
        huntTimer = setInterval(resolveTick, 800);
    }

    function leaveGround() {
        stopHuntLoop();
        activeGroundId = null;
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

    function openShop() {
        fn.component.create({
            name : 'popup',
            title : 'Shop',
            caller : { refresh : refreshScreen },
            render : function(popupEl) {
                fn.component.create({ name : 'shop', parent : popupEl.content });
            },
        });
    }

    var bg = '#1a120b';
    var panelBg = '#241a10';
    var gold = '#d4af37';
    var dim = '#8a6d3b';
    var win = '#4caf50';
    var loss = '#c0392b';
    var appFont = "Georgia, 'Times New Roman', serif";

    fn.component.layout.set({
        name : 'popup',
        layout : function(opt = {}) {
            var popup = fn.element.create({
                tagName : 'div',
                attribute : { class : '__popup' },
                style : {
                    position : 'fixed', top : '70px', left : '50%', transform : 'translateX(-50%)',
                    width : '320px', background : panelBg, color : gold,
                    border : '1px solid ' + dim, borderRadius : '6px', font : '14px/1.5 ' + appFont,
                },
            });

            var header = fn.element.create({
                parent : popup, tagName : 'div',
                style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', padding : '10px 14px', borderBottom : '1px solid ' + dim },
            });
            fn.element.create({ parent : header, tagName : 'div', text : opt.title || 'Popup', style : { fontWeight : '700' } });
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
                style : { background : 'transparent', border : 'none', color : gold, fontSize : '14px', cursor : 'pointer' },
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
                style : { padding : '8px 16px', marginTop : '12px', width : '100%', background : gold, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer' },
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
                background : bg, color : gold, border : '1px solid ' + dim, borderRadius : '4px',
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
                var cell = fn.element.create({ tagName : 'td', style : { padding : '6px 10px', borderBottom : '1px solid #33230f' }, parent : row });
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
                style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', padding : '8px 0', color : gold },
            });

            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : 'Prev',
                style : { padding : '6px 12px', background : bg, color : gold, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer', visibility : opt.page > 0 ? 'visible' : 'hidden' },
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
                style : { padding : '6px 12px', background : bg, color : gold, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer', visibility : opt.page < opt.pageCount - 1 ? 'visible' : 'hidden' },
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
        name : 'ground-card',
        layout : function(opt = {}) {
            var ground = opt.ground;
            var card = fn.element.create({
                tagName : 'div',
                style : {
                    border : '1px solid ' + dim, borderRadius : '6px', padding : '10px',
                    cursor : 'pointer', background : panelBg,
                },
                event : { click : function() { enterGround(ground.id); } },
            });
            fn.element.create({ tagName : 'div', text : ground.name, style : { fontWeight : '700', fontSize : '13px' }, parent : card });
            fn.element.create({ tagName : 'div', text : 'Lv.' + ground.huntLevel, style : { fontSize : '12px', color : dim, marginTop : '2px' }, parent : card });
            fn.element.create({ tagName : 'div', text : 'ATK ' + ground.monsterAttack + ' / DEF ' + ground.monsterDefense, style : { fontSize : '11px', color : dim }, parent : card });
            return card;
        }
    });

    fn.component.layout.set({
        name : 'shop',
        layout : function() {
            var player = getPlayer();
            var wrap = fn.element.create({ tagName : 'div', attribute : { class : '__shop' } });

            fn.element.create({ tagName : 'div', text : 'Iron Ore: ' + player.data.ironOre + ' (sells for ' + orePrice + ' gold each)', style : { marginBottom : '8px' }, parent : wrap });
            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : 'Sell All Ore',
                style : { padding : '8px 14px', background : gold, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer', width : '100%' },
                event : { click : function(e) {
                    var p = getPlayer();
                    fn.data.update({ key : 'player', id : p.id, data : Object.assign({}, p.data, { gold : p.data.gold + p.data.ironOre * orePrice, ironOre : 0 }) });
                    var popup = e.target.closest('.__popup');
                    fn.component.refresh({ name : 'shop', parent : popup.content });
                    if (popup._.caller) { popup._.caller.refresh(); }
                } },
                parent : wrap,
            });

            fn.element.create({ tagName : 'div', style : { borderTop : '1px solid ' + dim, margin : '14px 0' }, parent : wrap });

            var wCost = weaponCost(player.data.weaponLevel);
            fn.element.create({ tagName : 'div', text : 'Weapon Lv.' + player.data.weaponLevel + ' (Attack ' + attackOf(player) + ') -- upgrade: ' + wCost + ' gold', style : { marginBottom : '6px' }, parent : wrap });
            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : 'Upgrade Weapon',
                style : { padding : '8px 14px', background : player.data.gold >= wCost ? gold : dim, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer', width : '100%' },
                event : { click : function(e) {
                    var p = getPlayer();
                    var cost = weaponCost(p.data.weaponLevel);
                    if (p.data.gold < cost) {
                        return;
                    }
                    fn.data.update({ key : 'player', id : p.id, data : Object.assign({}, p.data, { gold : p.data.gold - cost, weaponLevel : p.data.weaponLevel + 1 }) });
                    var popup = e.target.closest('.__popup');
                    fn.component.refresh({ name : 'shop', parent : popup.content });
                    if (popup._.caller) { popup._.caller.refresh(); }
                } },
                parent : wrap,
            });

            fn.element.create({ tagName : 'div', style : { borderTop : '1px solid ' + dim, margin : '14px 0' }, parent : wrap });

            var aCost = armorCost(player.data.armorLevel);
            fn.element.create({ tagName : 'div', text : 'Armor Lv.' + player.data.armorLevel + ' (Defense ' + defenseOf(player) + ') -- upgrade: ' + aCost + ' gold', style : { marginBottom : '6px' }, parent : wrap });
            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : 'Upgrade Armor',
                style : { padding : '8px 14px', background : player.data.gold >= aCost ? gold : dim, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer', width : '100%' },
                event : { click : function(e) {
                    var p = getPlayer();
                    var cost = armorCost(p.data.armorLevel);
                    if (p.data.gold < cost) {
                        return;
                    }
                    fn.data.update({ key : 'player', id : p.id, data : Object.assign({}, p.data, { gold : p.data.gold - cost, armorLevel : p.data.armorLevel + 1 }) });
                    var popup = e.target.closest('.__popup');
                    fn.component.refresh({ name : 'shop', parent : popup.content });
                    if (popup._.caller) { popup._.caller.refresh(); }
                } },
                parent : wrap,
            });

            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'town',
        layout : function() {
            var player = getPlayer();
            var wrap = fn.element.create({ tagName : 'div', style : { padding : '16px' } });

            var hud = fn.element.create({ tagName : 'div', style : { display : 'flex', justifyContent : 'space-between', alignItems : 'flex-start' }, parent : wrap });
            var left = fn.element.create({ tagName : 'div', parent : hud });
            fn.element.create({ tagName : 'div', text : player.data.name, style : { fontWeight : '700', fontSize : '18px' }, parent : left });
            fn.element.create({ tagName : 'div', text : 'ATK ' + attackOf(player) + '  DEF ' + defenseOf(player), style : { fontSize : '13px', color : dim, marginTop : '2px' }, parent : left });
            fn.element.create({ tagName : 'div', text : 'Gold ' + player.data.gold + '  Iron Ore ' + player.data.ironOre, style : { fontSize : '13px', color : dim, marginTop : '2px' }, parent : left });

            var btnRow = fn.element.create({ tagName : 'div', style : { display : 'flex', gap : '8px' }, parent : hud });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Shop',
                style : { padding : '6px 12px', background : bg, color : gold, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer' },
                event : { click : openShop }, parent : btnRow,
            });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Rename',
                style : { padding : '6px 12px', background : bg, color : gold, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer' },
                event : { click : openRename }, parent : btnRow,
            });

            fn.element.create({ tagName : 'div', text : 'Hunting Grounds', style : { marginTop : '20px', marginBottom : '8px', fontWeight : '700' }, parent : wrap });
            var grid = fn.element.create({ tagName : 'div', style : { display : 'grid', gridTemplateColumns : 'repeat(2, 1fr)', gap : '10px' }, parent : wrap });
            fn.util.selectFlat({ key : 'ground' }).forEach(function(ground) {
                fn.component.create({ name : 'ground-card', ground : ground, parent : grid });
            });

            fn.element.create({ tagName : 'div', text : 'Hunt Log', style : { marginTop : '20px', marginBottom : '8px', fontWeight : '700' }, parent : wrap });
            var logDatas = fn.util.selectFlat({ key : 'huntLog' }).slice().reverse();
            fn.component.create({ name : 'list', resource : huntLogResource, datas : logDatas, readonly : true, parent : wrap });

            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'hunting-ground',
        layout : function() {
            var ground = fn.data.select({ key : 'ground', id : activeGroundId });
            var player = getPlayer();
            var wrap = fn.element.create({ tagName : 'div', style : { padding : '16px' } });

            fn.element.create({ tagName : 'div', text : ground.data.name + ' (Lv.' + ground.data.huntLevel + ')', style : { fontWeight : '700', fontSize : '18px' }, parent : wrap });
            fn.element.create({ tagName : 'div', text : 'ATK ' + attackOf(player) + '  DEF ' + defenseOf(player) + '  Gold ' + player.data.gold + '  Iron Ore ' + player.data.ironOre, style : { fontSize : '13px', color : dim, marginTop : '4px' }, parent : wrap });

            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Stop Hunting',
                style : { marginTop : '12px', padding : '10px 16px', background : gold, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer' },
                event : { click : leaveGround }, parent : wrap,
            });

            fn.element.create({ tagName : 'div', text : 'Combat Feed', style : { marginTop : '20px', marginBottom : '8px', fontWeight : '700' }, parent : wrap });
            var feed = fn.element.create({ tagName : 'div', style : { fontSize : '13px' }, parent : wrap });
            fn.util.selectFlat({ key : 'huntLog' }).slice(-8).reverse().forEach(function(entry) {
                var line = '[' + entry.result + '] ' + entry.ground;
                if (entry.ore) {
                    line += '  +' + entry.ore + ' ore';
                }
                line += entry.gold >= 0 ? '  +' + entry.gold + ' gold' : '  ' + entry.gold + ' gold';
                fn.element.create({ tagName : 'div', text : line, style : { color : entry.result === 'Win' ? win : loss, marginBottom : '2px' }, parent : feed });
            });

            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'screen',
        layout : function() {
            var wrap = fn.element.create({ tagName : 'div' });
            fn.component.create({ name : activeGroundId ? 'hunting-ground' : 'town', parent : wrap });
            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'game',
        layout : function(opt = {}) {
            playerResource = opt.playerResource;
            huntLogResource = opt.huntLogResource;
            playerId = opt.playerId;

            var shell = fn.element.create({
                tagName : 'div',
                style : { maxWidth : '480px', margin : '0 auto', minHeight : '100vh', background : bg, color : gold, font : '14px/1.5 ' + appFont },
            });

            rootArea = fn.element.create({ tagName : 'div', parent : shell });
            refreshScreen();

            return shell;
        }
    });
})();
