// Idle Hunter -- a dark-fantasy idle RPG built on fn.js + fn.util.js. No level/XP concept for
// the player at all: only Attack, Defense, and HP, all derived purely from weapon/armor level
// (attackOf/defenseOf/maxHp below) and moved only when a Shop upgrade is actually bought. The
// player picks a Ground from a `<select>` (10 seeded rows, monster stats scaling with `huntLevel`)
// and then hunts continuously -- resolveTick fires on a setInterval once a ground is entered and
// keeps firing, unattended, until Stop Hunting is clicked, which is the only thing that clears it.
// Each tick is real combat: the player's Attack damages a persistent per-encounter monster HP pool
// (killing it drops Iron Ore + gold and spawns the next one), and if the monster survives it hits
// back for real damage against the player's own HP. Potions are never a manual reflex: the instant
// a tick would leave the player at or below `potionThreshold` of max HP, one is auto-drunk (a
// manual Use Potion button on the stat bar exists too, for topping off before a hunt) -- with none
// left, the player is defeated and forced back to town. Iron Ore is inert until either sold
// directly or combined (the Bag tab, a chosen quantity at once via a number input + a Max button
// that fills in floor(ironOre / oreToIngot)) into a higher-value Iron Ingot, so "hunt for ore ->
// combine -> sell -> upgrade -> hunt a harder ground" is a real, closed loop. `town` is the single
// persistent shell -- stat bar, `feed-box` (a bordered text box of the most recent HuntLog
// activity), tab content, then the bottom tab bar (Hunt/Bag/Shop/Log) -- and it's the only thing
// `refreshScreen` ever re-renders, whether or not a hunt is in progress: `hunt-tab` itself branches
// on `activeGroundId` to show either the ground picker or the live encounter (name/monster
// HP/Stop Hunting), so the tab bar and stat bar never disappear mid-hunt the way a separate
// full-screen "hunting" layout would make them. Which tab is active is a real route, though, via
// fn.util.route ('#/hunt', '#/bag', '#/shop', '#/log', defaulting to '#/hunt'): tapping a tab is a
// real navigation, so the back button steps back through tabs instead of leaving the app -- it
// doesn't touch `activeGroundId` at all, since which ground you're hunting (or mid-hunt at all)
// isn't itself a distinct screen, just state the Hunt tab's own render branches on, the same way
// it always has. HuntLog is a real growing resource worth paging through
// (list/pagination, restyled compact so a page fits without scrolling); Ground is only ever
// entered, never edited, so a plain `<select>` + Enter button covers it without needing a per-row
// component at all; Player is CRUD'd through the usual popup/form/save-btn only for its name (the
// Rename button) -- gold/ore/ingots/hp/weaponLevel/armorLevel/potions are all game state a form
// should never let the player type in directly.
(function() {
    var fn = window.fn;

    function attackOf(player) {
        return 10 + player.data.weaponLevel * 8;
    }

    function defenseOf(player) {
        return 5 + player.data.armorLevel * 5;
    }

    function maxHp(player) {
        return 50 + player.data.armorLevel * 20;
    }

    function monsterMaxHp(ground) {
        return 20 + ground.data.huntLevel * 15;
    }

    function weaponCost(level) {
        return 50 * level * level;
    }

    function armorCost(level) {
        return 40 * level * level;
    }

    var orePrice = 5;
    var ingotPrice = 30;
    var oreToIngot = 5;
    var potionPrice = 15;
    var potionHeal = 40;
    var potionThreshold = 0.4;

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    var playerResource = null;
    var huntLogResource = null;
    var playerId = null;
    var routeEl = null;
    var activeGroundId = null;
    var currentMonsterHp = null;
    var huntTimer = null;
    var tabKeys = [ 'hunt', 'bag', 'shop', 'log' ];

    function currentTab() {
        var key = location.hash.replace('#/', '');
        return tabKeys.indexOf(key) !== -1 ? key : 'hunt';
    }

    function getPlayer() {
        return fn.data.select({ key : 'player', id : playerId });
    }

    function refreshScreen() {
        routeEl.refresh();
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

        if (currentMonsterHp === null) {
            currentMonsterHp = monsterMaxHp(ground);
        }

        var dmgDealt = Math.max(1, attackOf(player) - ground.data.monsterDefense);
        currentMonsterHp -= dmgDealt;

        if (currentMonsterHp <= 0) {
            var oreGained = randInt(ground.data.oreMin, ground.data.oreMax);
            var goldGained = randInt(ground.data.goldMin, ground.data.goldMax);
            fn.data.update({
                key : 'player', id : player.id,
                data : Object.assign({}, player.data, { gold : player.data.gold + goldGained, ironOre : player.data.ironOre + oreGained }),
            });
            fn.data.insert({ key : 'huntLog', data : { ground : ground.data.name, result : 'Kill', dmgDealt : dmgDealt, dmgTaken : 0, ore : oreGained, gold : goldGained } });
            currentMonsterHp = monsterMaxHp(ground);
            refreshScreen();
            return;
        }

        var dmgTaken = Math.max(1, ground.data.monsterAttack - defenseOf(player));
        var hp = player.data.hp - dmgTaken;
        var usedPotion = false;
        if (hp <= maxHp(player) * potionThreshold && player.data.potions > 0) {
            hp = Math.min(maxHp(player), hp + potionHeal);
            usedPotion = true;
        }
        hp = Math.max(0, hp);

        fn.data.update({
            key : 'player', id : player.id,
            data : Object.assign({}, player.data, { hp : hp, potions : player.data.potions - (usedPotion ? 1 : 0) }),
        });
        fn.data.insert({
            key : 'huntLog',
            data : { ground : ground.data.name, result : hp <= 0 ? 'Defeat' : (usedPotion ? 'Potion' : 'Hit'), dmgDealt : dmgDealt, dmgTaken : dmgTaken, ore : 0, gold : 0 },
        });

        if (hp <= 0) {
            leaveGround();
            return;
        }

        refreshScreen();
    }

    function enterGround(id) {
        activeGroundId = id;
        currentMonsterHp = null;
        refreshScreen();
        stopHuntLoop();
        huntTimer = setInterval(resolveTick, 800);
    }

    function leaveGround() {
        stopHuntLoop();
        activeGroundId = null;
        currentMonsterHp = null;
        refreshScreen();
    }

    function usePotion() {
        var player = getPlayer();
        if (player.data.potions <= 0 || player.data.hp >= maxHp(player)) {
            return;
        }
        fn.data.update({
            key : 'player', id : player.id,
            data : Object.assign({}, player.data, { hp : Math.min(maxHp(player), player.data.hp + potionHeal), potions : player.data.potions - 1 }),
        });
        refreshScreen();
    }

    function combineOreToIngot(qty) {
        var player = getPlayer();
        var maxQty = Math.floor(player.data.ironOre / oreToIngot);
        if (maxQty < 1) {
            return;
        }
        var amount = Math.min(Math.max(1, qty), maxQty);
        fn.data.update({
            key : 'player', id : player.id,
            data : Object.assign({}, player.data, { ironOre : player.data.ironOre - amount * oreToIngot, ironIngot : player.data.ironIngot + amount }),
        });
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
        var el = fn.element.create({ tagName : 'table', style : { width : '100%', borderCollapse : 'collapse', fontSize : '11px' }, datas : opt.datas });

        var thead = fn.element.create({ tagName : 'thead', parent : el });
        var headRow = fn.element.create({ tagName : 'tr', parent : thead });
        opt.resource.columns.forEach(function(column) {
            if (!column.list) {
                return;
            }
            fn.element.create({
                tagName : 'th',
                text : column.label || column.name,
                style : { textAlign : 'left', padding : '4px 6px', borderBottom : '1px solid ' + dim, color : dim, fontWeight : 'normal' },
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
                var cell = fn.element.create({ tagName : 'td', style : { padding : '4px 6px', borderBottom : '1px solid #33230f' }, parent : row });
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
                style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', padding : '6px 0', color : gold },
            });

            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : 'Prev',
                style : { padding : '4px 10px', fontSize : '11px', background : bg, color : gold, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer', visibility : opt.page > 0 ? 'visible' : 'hidden' },
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
                style : { color : dim, fontSize : '11px' },
                parent : bar,
            });

            fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : 'Next',
                style : { padding : '4px 10px', fontSize : '11px', background : bg, color : gold, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer', visibility : opt.page < opt.pageCount - 1 ? 'visible' : 'hidden' },
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
        name : 'stat-bar',
        layout : function() {
            var player = getPlayer();
            var bar = fn.element.create({ tagName : 'div', style : { padding : '16px', borderBottom : '1px solid ' + dim } });

            var topRow = fn.element.create({ tagName : 'div', style : { display : 'flex', justifyContent : 'space-between', alignItems : 'flex-start' }, parent : bar });
            var left = fn.element.create({ tagName : 'div', parent : topRow });
            fn.element.create({ tagName : 'div', text : player.data.name, style : { fontWeight : '700', fontSize : '18px' }, parent : left });
            fn.element.create({ tagName : 'div', text : 'ATK ' + attackOf(player) + '  DEF ' + defenseOf(player), style : { fontSize : '13px', color : dim, marginTop : '2px' }, parent : left });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Rename',
                style : { padding : '6px 12px', background : bg, color : gold, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer' },
                event : { click : openRename }, parent : topRow,
            });

            var hpRow = fn.element.create({ tagName : 'div', style : { marginTop : '10px' }, parent : bar });
            fn.element.create({ tagName : 'div', text : 'HP ' + player.data.hp + ' / ' + maxHp(player), style : { fontSize : '12px', color : dim }, parent : hpRow });
            var track = fn.element.create({ tagName : 'div', style : { width : '100%', height : '8px', background : '#33230f', borderRadius : '4px', overflow : 'hidden', marginTop : '2px' }, parent : hpRow });
            var pct = Math.max(0, Math.min(100, player.data.hp / maxHp(player) * 100));
            fn.element.create({ tagName : 'div', style : { width : pct + '%', height : '100%', background : pct > 30 ? win : loss }, parent : track });

            var bottomRow = fn.element.create({ tagName : 'div', style : { display : 'flex', justifyContent : 'space-between', alignItems : 'center', marginTop : '10px' }, parent : bar });
            fn.element.create({ tagName : 'div', text : 'Gold ' + player.data.gold + '  Ore ' + player.data.ironOre + '  Potions ' + player.data.potions, style : { fontSize : '12px', color : dim }, parent : bottomRow });
            var canUse = player.data.potions > 0 && player.data.hp < maxHp(player);
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Use Potion',
                style : { padding : '6px 12px', background : bg, color : canUse ? gold : dim, border : '1px solid ' + dim, borderRadius : '4px', cursor : canUse ? 'pointer' : 'default' },
                event : { click : usePotion }, parent : bottomRow,
            });

            return bar;
        }
    });

    fn.component.layout.set({
        name : 'feed-box',
        layout : function() {
            var wrap = fn.element.create({ tagName : 'div', style : { padding : '10px 16px' } });
            fn.element.create({ tagName : 'div', text : 'Activity', style : { fontWeight : '700', fontSize : '12px', marginBottom : '4px' }, parent : wrap });

            var box = fn.element.create({ tagName : 'div', style : { padding : '6px 8px', border : '1px solid ' + dim, borderRadius : '6px', background : panelBg, fontSize : '11px' }, parent : wrap });
            var recent = fn.util.selectFlat({ key : 'huntLog' }).slice(-3).reverse();
            if (recent.length === 0) {
                fn.element.create({ tagName : 'div', text : 'No activity yet. Go hunt!', style : { color : dim }, parent : box });
                return wrap;
            }
            recent.forEach(function(entry) {
                var line = '[' + entry.result + '] ' + entry.ground + '  dealt ' + entry.dmgDealt + ' dmg';
                if (entry.dmgTaken) {
                    line += ', took ' + entry.dmgTaken + ' dmg';
                }
                if (entry.ore) {
                    line += '  +' + entry.ore + ' ore +' + entry.gold + ' gold';
                }
                var color = entry.result === 'Kill' ? win : entry.result === 'Potion' ? gold : entry.result === 'Defeat' ? loss : dim;
                fn.element.create({ tagName : 'div', text : line, style : { color : color, marginBottom : '2px' }, parent : box });
            });

            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'tab-bar',
        layout : function() {
            var bar = fn.element.create({
                tagName : 'nav',
                style : {
                    position : 'fixed', bottom : '0', left : '50%', transform : 'translateX(-50%)',
                    width : '100%', maxWidth : '480px', boxSizing : 'border-box',
                    display : 'flex', borderTop : '1px solid ' + dim, background : panelBg,
                },
            });
            [ { key : 'hunt', text : 'Hunt' }, { key : 'bag', text : 'Bag' }, { key : 'shop', text : 'Shop' }, { key : 'log', text : 'Log' } ].forEach(function(tab) {
                fn.element.create({
                    tagName : 'button',
                    attribute : { type : 'button' },
                    text : tab.text,
                    style : {
                        flex : '1', padding : '14px 0', background : 'transparent', border : 'none',
                        color : currentTab() === tab.key ? gold : dim, fontWeight : currentTab() === tab.key ? '700' : '400',
                        font : '14px ' + appFont, cursor : 'pointer',
                    },
                    event : { click : function() { location.hash = '#/' + tab.key; } },
                    parent : bar,
                });
            });
            return bar;
        }
    });

    fn.component.layout.set({
        name : 'hunt-tab',
        layout : function() {
            var wrap = fn.element.create({ tagName : 'div' });

            if (activeGroundId) {
                var ground = fn.data.select({ key : 'ground', id : activeGroundId });
                fn.element.create({ tagName : 'div', text : ground.data.name + ' (Lv.' + ground.data.huntLevel + ')', style : { fontWeight : '700', fontSize : '18px' }, parent : wrap });
                fn.element.create({ tagName : 'div', text : 'Monster HP ' + Math.max(0, currentMonsterHp) + ' / ' + monsterMaxHp(ground), style : { fontSize : '13px', color : dim, marginTop : '4px' }, parent : wrap });
                fn.element.create({
                    tagName : 'button', attribute : { type : 'button' }, text : 'Stop Hunting',
                    style : { marginTop : '12px', padding : '10px 16px', background : gold, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer' },
                    event : { click : leaveGround }, parent : wrap,
                });
                return wrap;
            }

            fn.element.create({ tagName : 'div', text : 'Hunting Grounds', style : { marginBottom : '8px', fontWeight : '700' }, parent : wrap });

            var grounds = fn.util.selectFlat({ key : 'ground' });
            var select = fn.element.create({
                tagName : 'select',
                style : { width : '100%', padding : '10px', font : '14px ' + appFont, background : bg, color : gold, border : '1px solid ' + dim, borderRadius : '4px' },
                parent : wrap,
            });
            grounds.forEach(function(ground) {
                fn.element.create({ tagName : 'option', attribute : { value : ground.id }, text : ground.name + ' (Lv.' + ground.huntLevel + ')', parent : select });
            });

            var preview = fn.element.create({ tagName : 'div', style : { fontSize : '12px', color : dim, marginTop : '8px' }, parent : wrap });
            function updatePreview() {
                var ground = grounds.find(function(g) { return g.id === Number(select.value); });
                preview.textContent = 'Monster ATK ' + ground.monsterAttack + ' / DEF ' + ground.monsterDefense;
            }
            select.addEventListener('change', updatePreview);
            updatePreview();

            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Enter',
                style : { marginTop : '12px', padding : '10px 16px', background : gold, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer', width : '100%' },
                event : { click : function() { enterGround(Number(select.value)); } },
                parent : wrap,
            });

            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'shop-tab',
        layout : function() {
            var player = getPlayer();
            var wrap = fn.element.create({ tagName : 'div' });

            fn.element.create({ tagName : 'div', text : 'Iron Ore: ' + player.data.ironOre + ' (sells for ' + orePrice + ' gold each)', style : { marginBottom : '8px' }, parent : wrap });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Sell All Ore',
                style : { padding : '8px 14px', background : gold, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer', width : '100%' },
                event : { click : function() {
                    var p = getPlayer();
                    fn.data.update({ key : 'player', id : p.id, data : Object.assign({}, p.data, { gold : p.data.gold + p.data.ironOre * orePrice, ironOre : 0 }) });
                    refreshScreen();
                } },
                parent : wrap,
            });

            fn.element.create({ tagName : 'div', text : 'Iron Ingot: ' + player.data.ironIngot + ' (sells for ' + ingotPrice + ' gold each)', style : { marginTop : '12px', marginBottom : '8px' }, parent : wrap });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Sell All Ingots',
                style : { padding : '8px 14px', background : gold, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer', width : '100%' },
                event : { click : function() {
                    var p = getPlayer();
                    fn.data.update({ key : 'player', id : p.id, data : Object.assign({}, p.data, { gold : p.data.gold + p.data.ironIngot * ingotPrice, ironIngot : 0 }) });
                    refreshScreen();
                } },
                parent : wrap,
            });

            fn.element.create({ tagName : 'div', style : { borderTop : '1px solid ' + dim, margin : '14px 0' }, parent : wrap });

            var wCost = weaponCost(player.data.weaponLevel);
            fn.element.create({ tagName : 'div', text : 'Weapon Lv.' + player.data.weaponLevel + ' (Attack ' + attackOf(player) + ') -- upgrade: ' + wCost + ' gold', style : { marginBottom : '6px' }, parent : wrap });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Upgrade Weapon',
                style : { padding : '8px 14px', background : player.data.gold >= wCost ? gold : dim, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer', width : '100%' },
                event : { click : function() {
                    var p = getPlayer();
                    var cost = weaponCost(p.data.weaponLevel);
                    if (p.data.gold < cost) {
                        return;
                    }
                    fn.data.update({ key : 'player', id : p.id, data : Object.assign({}, p.data, { gold : p.data.gold - cost, weaponLevel : p.data.weaponLevel + 1 }) });
                    refreshScreen();
                } },
                parent : wrap,
            });

            fn.element.create({ tagName : 'div', style : { borderTop : '1px solid ' + dim, margin : '14px 0' }, parent : wrap });

            var aCost = armorCost(player.data.armorLevel);
            fn.element.create({ tagName : 'div', text : 'Armor Lv.' + player.data.armorLevel + ' (Defense ' + defenseOf(player) + ', Max HP ' + maxHp(player) + ') -- upgrade: ' + aCost + ' gold', style : { marginBottom : '6px' }, parent : wrap });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Upgrade Armor',
                style : { padding : '8px 14px', background : player.data.gold >= aCost ? gold : dim, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer', width : '100%' },
                event : { click : function() {
                    var p = getPlayer();
                    var cost = armorCost(p.data.armorLevel);
                    if (p.data.gold < cost) {
                        return;
                    }
                    var oldMax = maxHp(p);
                    var newArmorLevel = p.data.armorLevel + 1;
                    var newMax = 50 + newArmorLevel * 20;
                    fn.data.update({ key : 'player', id : p.id, data : Object.assign({}, p.data, { gold : p.data.gold - cost, armorLevel : newArmorLevel, hp : p.data.hp + (newMax - oldMax) }) });
                    refreshScreen();
                } },
                parent : wrap,
            });

            fn.element.create({ tagName : 'div', style : { borderTop : '1px solid ' + dim, margin : '14px 0' }, parent : wrap });

            fn.element.create({ tagName : 'div', text : 'Potions: ' + player.data.potions + ' (heal ' + potionHeal + ' HP each) -- buy: ' + potionPrice + ' gold', style : { marginBottom : '6px' }, parent : wrap });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Buy Potion',
                style : { padding : '8px 14px', background : player.data.gold >= potionPrice ? gold : dim, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : 'pointer', width : '100%' },
                event : { click : function() {
                    var p = getPlayer();
                    if (p.data.gold < potionPrice) {
                        return;
                    }
                    fn.data.update({ key : 'player', id : p.id, data : Object.assign({}, p.data, { gold : p.data.gold - potionPrice, potions : p.data.potions + 1 }) });
                    refreshScreen();
                } },
                parent : wrap,
            });

            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'bag-tab',
        layout : function() {
            var player = getPlayer();
            var wrap = fn.element.create({ tagName : 'div' });
            fn.element.create({ tagName : 'div', text : 'Bag', style : { marginBottom : '8px', fontWeight : '700' }, parent : wrap });

            fn.element.create({ tagName : 'div', text : 'Iron Ore: ' + player.data.ironOre, style : { marginBottom : '4px' }, parent : wrap });
            fn.element.create({ tagName : 'div', text : 'Iron Ingot: ' + player.data.ironIngot, style : { marginBottom : '4px' }, parent : wrap });
            fn.element.create({ tagName : 'div', text : 'Potions: ' + player.data.potions, style : { marginBottom : '4px' }, parent : wrap });

            fn.element.create({ tagName : 'div', style : { borderTop : '1px solid ' + dim, margin : '14px 0' }, parent : wrap });

            var maxCraftable = Math.floor(player.data.ironOre / oreToIngot);
            fn.element.create({ tagName : 'div', text : 'Combine ' + oreToIngot + ' Iron Ore -> 1 Iron Ingot (max ' + maxCraftable + ' now)', style : { marginBottom : '6px' }, parent : wrap });

            var row = fn.element.create({ tagName : 'div', style : { display : 'flex', gap : '8px' }, parent : wrap });
            var qtyInput = fn.element.create({
                tagName : 'input',
                attribute : { type : 'number', min : '1', max : String(Math.max(1, maxCraftable)), value : '1' },
                style : { width : '64px', padding : '8px', font : '14px ' + appFont, background : bg, color : gold, border : '1px solid ' + dim, borderRadius : '4px' },
                parent : row,
            });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Max',
                style : { padding : '8px 12px', background : bg, color : gold, border : '1px solid ' + dim, borderRadius : '4px', cursor : 'pointer' },
                event : { click : function() { qtyInput.value = String(Math.max(1, maxCraftable)); } },
                parent : row,
            });
            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : 'Combine',
                style : { flex : '1', padding : '8px 14px', background : maxCraftable > 0 ? gold : dim, color : bg, border : 'none', borderRadius : '4px', fontWeight : '700', cursor : maxCraftable > 0 ? 'pointer' : 'default' },
                event : { click : function() { combineOreToIngot(Number(qtyInput.value) || 1); } },
                parent : row,
            });

            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'log-tab',
        layout : function() {
            var wrap = fn.element.create({ tagName : 'div' });
            fn.element.create({ tagName : 'div', text : 'Hunt Log', style : { marginBottom : '8px', fontWeight : '700' }, parent : wrap });
            var logDatas = fn.util.selectFlat({ key : 'huntLog' }).slice().reverse();
            fn.component.create({ name : 'list', resource : huntLogResource, datas : logDatas, readonly : true, pageSize : 5, parent : wrap });
            return wrap;
        }
    });

    fn.component.layout.set({
        name : 'town',
        layout : function() {
            var wrap = fn.element.create({ tagName : 'div', style : { paddingBottom : '64px' } });
            fn.component.create({ name : 'stat-bar', parent : wrap });
            fn.component.create({ name : 'feed-box', parent : wrap });

            var content = fn.element.create({ tagName : 'div', style : { padding : '16px' }, parent : wrap });
            var tabLayouts = { hunt : 'hunt-tab', bag : 'bag-tab', shop : 'shop-tab', log : 'log-tab' };
            fn.component.create({ name : tabLayouts[currentTab()], parent : content });

            fn.component.create({ name : 'tab-bar', parent : wrap });
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

            routeEl = fn.util.route({ resolve : function() { return 'town'; }, parent : shell });

            return shell;
        }
    });
})();
