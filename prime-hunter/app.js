// Prime Hunter -- Player + Attempt. Player (name/xp/level) is a single seeded row edited only
// through the game itself and the Rename button; Attempt is a growing log of every round played,
// browsed through the standard list/pagination once it passes 10 rows. See layout.js for how a
// round is actually graded (real trial-division primality checking, not a shortcut).
(function primeHunterApp() {
    var fn = window.fn;

    var playerResource = {
        key : 'player',
        columns : [
            { name : 'name', label : 'Name', form : { type : 'text' } },
        ],
    };

    var attemptResource = {
        key : 'attempt',
        columns : [
            { name : 'number', label : 'Number', list : { type : 'text' } },
            { name : 'guess', label : 'Guess', list : { type : 'text' } },
            { name : 'result', label : 'Result', list : { type : 'text' } },
            { name : 'xpEarned', label : 'XP', list : { type : 'text' } },
        ],
    };

    var players = fn.data.select({ key : 'player' });
    var player = players.length ? players[0] : fn.data.insert({ key : 'player', data : { name : 'Player 1', xp : 0, level : 1 } });

    fn.component.create({
        name : 'arena',
        playerResource : playerResource,
        attemptResource : attemptResource,
        playerId : player.id,
        parent : document.body,
    });
})();
