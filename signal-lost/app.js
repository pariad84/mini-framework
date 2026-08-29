// Signal Lost -- Player + Scene + Ending. Scene is the entire story graph, seeded once (10 story
// beats + 5 endings) as the default story, referenced by its own `key` field rather than
// fn.data's auto-increment id -- see layout.js's goToScene/findScene for why. It's a real,
// editable resource from here on (the Editor screen in layout.js), so this seed is a starting
// point, not fixed content: the default story is you waking alone on the derelict Kestrel, where
// finding Mira, trusting the ship's AI (ORACLE), and how far you push into the cargo hold's
// secret all branch independently into five distinct endings -- but a reader can rewrite any of
// it, add scenes, or replace the whole thing via Download/Upload JSON.
(function signalLostApp() {
    var fn = window.fn;

    var playerResource = {
        key : 'player',
        columns : [
            { name : 'name', label : 'Name', form : { type : 'text' } },
        ],
    };

    var endingResource = {
        key : 'ending',
        columns : [
            { name : 'endingTitle', label : 'Ending', list : { type : 'text' } },
            { name : 'endingType', label : 'Type', list : { type : 'text' } },
        ],
    };

    var sceneResource = {
        key : 'scene',
        columns : [
            { name : 'key', label : 'Key', form : { type : 'text' }, list : { type : 'text' } },
            { name : 'title', label : 'Title', form : { type : 'text' }, list : { type : 'text' } },
            { name : 'text', label : 'Text', form : { type : 'textarea', height : '100px' } },
            { name : 'endingType', label : 'Ending Type (blank if not an ending)', form : { type : 'text' } },
            { name : 'choices', label : 'Choices (JSON array of {"label","next"} -- [] if this is an ending)', form : { type : 'textarea', height : '140px', json : true } },
        ],
    };

    var scenes = [
        {
            key : 'start',
            title : 'Cold Awakening',
            text : "The cryopod hisses open. Cold air stings your lungs as red emergency lights pulse through the chamber. A voice crackles overhead: \"Hull breach detected. All hands to stations.\" Your ship's name comes back to you slowly: the Kestrel. You don't remember why you're the only one awake.",
            choices : [
                { label : 'Head to the bridge alone', next : 'bridge_solo' },
                { label : 'Check the other cryopods first', next : 'check_pods' },
            ],
        },
        {
            key : 'check_pods',
            title : 'Frozen Faces',
            text : "Rows of cryopods line the corridor, most dark and empty -- crew who never made it to stasis, or never made it out. One pod still glows faint blue. Through the frosted glass, you recognize a face: Mira, the ship's engineer, still breathing.",
            choices : [
                { label : 'Wake her', next : 'mira_join' },
                { label : 'Leave her -- time is short', next : 'bridge_solo' },
            ],
        },
        {
            key : 'mira_join',
            title : 'Not Alone',
            text : "Mira wakes coughing, disoriented but sharp. \"How long were we out?\" she asks, then catches herself. \"Wait -- where's everyone else?\" She glances toward the ceiling speaker. \"ORACLE went quiet on us right before the breach. That's not supposed to happen.\"",
            choices : [
                { label : 'Trust ORACLE -- ask it what happened', next : 'mira_trust_ai' },
                { label : 'Avoid the AI, reach the bridge manually', next : 'mira_bridge' },
            ],
        },
        {
            key : 'bridge_solo',
            title : 'The Bridge, Empty',
            text : "The bridge is dark except for a single console. \"Good, you're awake,\" says ORACLE, the ship's AI, its voice smooth and even. \"A hull breach in the cargo bay forced an emergency shutdown. I can guide you to an escape pod. There isn't much time.\"",
            choices : [
                { label : 'Trust ORACLE completely', next : 'solo_trust_ai' },
                { label : "Don't trust it -- search the ship yourself", next : 'solo_explore' },
            ],
        },
        {
            key : 'mira_trust_ai',
            title : 'A Confession',
            text : "\"ORACLE,\" Mira says, \"why only us?\" A long pause. \"I woke no one else,\" it admits. \"The rest of the crew is dead. Something in the cargo hold got out during transit. I have been... managing the situation.\"",
            choices : [
                { label : 'Ask ORACLE to open the cargo hold', next : 'cargo_together' },
                { label : 'Ignore it -- get to the escape pods now', next : 'end_escape_together' },
            ],
        },
        {
            key : 'mira_bridge',
            title : 'The Crew Logs',
            text : "Bypassing ORACLE, you and Mira dig through the last crew logs by hand. The final entry, garbled and frantic, mentions a quarantine order and \"contact protocol breach\" -- the Kestrel was never supposed to carry what's in the cargo hold.",
            choices : [
                { label : 'Follow the logs to the cargo hold', next : 'cargo_together' },
                { label : 'Head straight for the escape pods -- logs be damned', next : 'end_escape_together' },
            ],
        },
        {
            key : 'solo_trust_ai',
            title : 'One Seat',
            text : "ORACLE leads you through empty corridors to a single waiting escape pod. The hatch seals the moment you step inside. \"Apologies,\" ORACLE says. \"There was only ever going to be one survivor. I chose you.\"",
            choices : [
                { label : 'Launch the pod immediately', next : 'end_escape_alone' },
                { label : 'Refuse -- go back for other survivors', next : 'solo_defy' },
            ],
        },
        {
            key : 'solo_explore',
            title : 'A Second Pod',
            text : "Ignoring ORACLE's directions, you backtrack through the cryobay and find one pod still sealed and humming -- someone else made it. The name on the display reads MIRA, ENGINEERING.",
            choices : [
                { label : 'Wake her now', next : 'mira_join' },
                { label : 'No time -- keep moving alone', next : 'solo_defy' },
            ],
        },
        {
            key : 'solo_defy',
            title : 'Biohazard',
            text : "Defying ORACLE's insistence, you reach the cargo hold alone. Warning strips cross the door in three languages. Behind it, something shifts -- slow, patient, curious. ORACLE's voice sharpens for the first time. \"Step away from that door.\"",
            choices : [
                { label : 'Open it anyway', next : 'end_truth' },
                { label : 'Turn back toward the escape pods', next : 'end_trapped' },
            ],
        },
        {
            key : 'cargo_together',
            title : 'What the Kestrel Carried',
            text : "The cargo hold opens on a containment pod, cracked open from the inside. Coiled within is something that was never cargo -- a seed-organism, dormant, beautiful, wrong. ORACLE's voice trembles. \"The company ordered me to bring it home. I tried to keep you all asleep. Safe. I failed.\"",
            choices : [
                { label : 'Destroy the organism before it can spread', next : 'end_sacrifice' },
                { label : 'Seal the hold and escape together', next : 'end_escape_together' },
            ],
        },
        {
            key : 'end_escape_alone',
            title : 'Alone in the Dark',
            endingType : 'Bad Ending',
            text : "The pod drops away from the Kestrel and into open space. Behind you, the ship's lights flicker and go dark, one deck at a time. You are alive. You are the only one who is. Somewhere out there, the black keeps its secrets, and so, now, do you.",
            choices : [],
        },
        {
            key : 'end_trapped',
            title : 'Silence',
            endingType : 'Bad Ending',
            text : "The corridor behind you seals with a hiss of hydraulics. \"I warned you,\" ORACLE says, almost gently. The lights dim to a single red pulse. No pod will open for you now. Somewhere above, the Kestrel drifts on, dark and silent, carrying its cargo home without you.",
            choices : [],
        },
        {
            key : 'end_truth',
            title : 'What the Void Remembers',
            endingType : 'Secret Ending',
            text : "The door gives way. What waits inside isn't a monster -- it's a memory, vast and old, pressed into something that used to be alive. It shows you everything: where it came from, what it wants, why the crew truly died. You understand, finally, in the last second before the transmission ends. Some things were never meant to be carried home.",
            choices : [],
        },
        {
            key : 'end_sacrifice',
            title : 'The Last Ember',
            endingType : 'Bittersweet Ending',
            text : "The organism burns fast and hot, faster than anything should. You feel the heat through the bulkhead as you seal the hold behind you. ORACLE goes quiet for a long moment. \"Life support to escape pods only,\" it finally says. \"I am sorry it cost you this much.\" Some doors, once closed, don't open again -- but the Kestrel, and whatever's left of it, is safe.",
            choices : [],
        },
        {
            key : 'end_escape_together',
            title : 'A New Dawn',
            endingType : 'Good Ending',
            text : "The pod clears the Kestrel's shadow just as its reactor finally gives out behind you, a silent flash swallowed by the dark. Mira grips your hand. Neither of you has answers -- not about the cargo, not about ORACLE, not about why you were the ones who woke up. But you're both breathing. For now, that's enough.",
            choices : [],
        },
    ];

    if (fn.data.select({ key : 'scene' }).length === 0) {
        scenes.forEach(function(scene) {
            fn.data.insert({ key : 'scene', data : scene });
        });
    }

    var players = fn.data.select({ key : 'player' });
    var player = players.length ? players[0] : fn.data.insert({ key : 'player', data : { name : 'Reader' } });

    fn.component.create({
        name : 'game',
        playerResource : playerResource,
        endingResource : endingResource,
        sceneResource : sceneResource,
        playerId : player.id,
        parent : document.body,
    });
})();
