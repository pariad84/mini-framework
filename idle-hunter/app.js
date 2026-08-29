// Idle Hunter -- Player + Ground + HuntLog. Ground is seeded once, 10 rows, difficulty scaling
// with huntLevel (see layout.js's resolveTick/attackOf/defenseOf/maxHp for how that difficulty
// actually plays out against the player's own Attack/Defense/HP). Player starts with a little
// gold (first weapon upgrade is reachable without a long grind), full HP, and one potion so the
// auto-drink-on-death mechanic is discoverable without having to buy one first.
(function idleHunterApp() {
    var fn = window.fn;

    var playerResource = {
        key : 'player',
        columns : [
            { name : 'name', label : 'Name', form : { type : 'text' } },
        ],
    };

    var huntLogResource = {
        key : 'huntLog',
        columns : [
            { name : 'ground', label : 'Ground', list : { type : 'text' } },
            { name : 'result', label : 'Result', list : { type : 'text' } },
            { name : 'dmgDealt', label : 'Dealt', list : { type : 'text' } },
            { name : 'dmgTaken', label : 'Taken', list : { type : 'text' } },
            { name : 'ore', label : 'Ore', list : { type : 'text' } },
            { name : 'gold', label : 'Gold', list : { type : 'text' } },
        ],
    };

    var groundNames = [
        'Whispering Meadow', 'Shadowed Grove', 'Rusted Quarry', 'Howling Ravine', 'Ember Wastes',
        'Frostfang Tundra', 'Sunken Catacombs', 'Storm-Scarred Cliffs', 'Obsidian Deep', "Dragon's Maw",
    ];

    if (fn.data.select({ key : 'ground' }).length === 0) {
        groundNames.forEach(function(name, index) {
            var level = index + 1;
            fn.data.insert({
                key : 'ground',
                data : {
                    name : name,
                    huntLevel : level,
                    monsterAttack : 8 + level * 6,
                    monsterDefense : 6 + level * 5,
                    oreMin : level,
                    oreMax : level * 2,
                    goldMin : level * 3,
                    goldMax : level * 6,
                },
            });
        });
    }

    var players = fn.data.select({ key : 'player' });
    var player = players.length ? players[0] : fn.data.insert({ key : 'player', data : { name : 'Hunter', weaponLevel : 1, armorLevel : 1, gold : 20, ironOre : 0, ironIngot : 0, hp : 70, potions : 1 } });

    fn.component.create({
        name : 'game',
        playerResource : playerResource,
        huntLogResource : huntLogResource,
        playerId : player.id,
        parent : document.body,
    });
})();
