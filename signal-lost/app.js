// Signal Lost -- Player + Scene + Ending. Scene is the entire story graph, seeded once (10 story
// beats + 5 endings) as the default story, referenced by its own `key` field rather than
// fn.data's auto-increment id -- see layout.js's goToScene/findScene for why. It's a real,
// editable resource from here on (the Editor screen in layout.js), so this seed is a starting
// point, not fixed content: the default story is you waking alone on the derelict Kestrel, where
// finding Mira, trusting the ship's AI (ORACLE), and how far you push into the cargo hold's
// secret all branch independently into five distinct endings -- but a reader can rewrite any of
// it, add scenes, or replace the whole thing via Download/Upload JSON.
// `title`/`text`/`endingType`/`choices` are each stored as a `{lang: value}` object (see
// layout.js's getLocalized) so a scene can carry several language versions authored together in
// one save -- the seed below ships English and Korean for every scene.
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
            {
                name : 'title', label : 'Title (JSON per language)',
                form : { type : 'text', json : true, placeholder : '{"en":"...","ko":"..."}' },
                list : { render : 'function(data){ var t = data.title || {}; return t.en || t[Object.keys(t)[0]] || ""; }' },
            },
            { name : 'text', label : 'Text (JSON per language)', form : { type : 'textarea', height : '100px', json : true, placeholder : '{"en":"...","ko":"..."}' } },
            { name : 'endingType', label : 'Ending Type (JSON per language, {} if not an ending)', form : { type : 'text', json : true, placeholder : '{"en":"...","ko":"..."}' } },
            {
                name : 'choices', label : 'Choices (JSON per language: {"lang":[{"label","next"}]} -- [] arrays if this is an ending)',
                form : { type : 'textarea', height : '160px', json : true, placeholder : '{"en":[{"label":"...","next":"..."}],"ko":[{"label":"...","next":"..."}]}' },
            },
        ],
    };

    var scenes = [
        {
            key : 'start',
            title : { en : 'Cold Awakening', ko : '차가운 각성' },
            text : {
                en : "The cryopod hisses open. Cold air stings your lungs as red emergency lights pulse through the chamber. A voice crackles overhead: \"Hull breach detected. All hands to stations.\" Your ship's name comes back to you slowly: the Kestrel. You don't remember why you're the only one awake.",
                ko : '냉동 캡슐이 쉭 소리를 내며 열린다. 차가운 공기가 폐를 찌르고, 붉은 비상등이 방 안에서 점멸한다. 머리 위 스피커에서 지지직거리는 목소리가 들린다. "선체 파손 감지. 전원 배치 위치로." 배의 이름이 서서히 떠오른다. 케스트렐 호. 왜 당신만 깨어났는지는 기억나지 않는다.',
            },
            endingType : { en : '', ko : '' },
            choices : {
                en : [
                    { label : 'Head to the bridge alone', next : 'bridge_solo' },
                    { label : 'Check the other cryopods first', next : 'check_pods' },
                ],
                ko : [
                    { label : '혼자 함교로 향한다', next : 'bridge_solo' },
                    { label : '다른 냉동 캡슐부터 확인한다', next : 'check_pods' },
                ],
            },
        },
        {
            key : 'check_pods',
            title : { en : 'Frozen Faces', ko : '얼어붙은 얼굴들' },
            text : {
                en : "Rows of cryopods line the corridor, most dark and empty -- crew who never made it to stasis, or never made it out. One pod still glows faint blue. Through the frosted glass, you recognize a face: Mira, the ship's engineer, still breathing.",
                ko : '복도를 따라 줄지어 선 냉동 캡슐들. 대부분 불이 꺼진 채 비어 있다 -- 냉동 수면에 들지 못했거나, 미처 빠져나오지 못한 승무원들. 캡슐 하나만이 희미한 푸른빛을 내고 있다. 서리 낀 유리 너머로 낯익은 얼굴이 보인다. 미라, 이 배의 기관사. 여전히 숨을 쉬고 있다.',
            },
            endingType : { en : '', ko : '' },
            choices : {
                en : [
                    { label : 'Wake her', next : 'mira_join' },
                    { label : 'Leave her -- time is short', next : 'bridge_solo' },
                ],
                ko : [
                    { label : '그녀를 깨운다', next : 'mira_join' },
                    { label : '그녀를 두고 간다 -- 시간이 없다', next : 'bridge_solo' },
                ],
            },
        },
        {
            key : 'mira_join',
            title : { en : 'Not Alone', ko : '혼자가 아니다' },
            text : {
                en : "Mira wakes coughing, disoriented but sharp. \"How long were we out?\" she asks, then catches herself. \"Wait -- where's everyone else?\" She glances toward the ceiling speaker. \"ORACLE went quiet on us right before the breach. That's not supposed to happen.\"",
                ko : '미라가 기침을 하며 깨어난다. 정신은 없지만 눈빛은 날카롭다. "우리 얼마나 잠들어 있었던 거야?" 그녀가 묻다가 멈춘다. "잠깐 -- 다른 사람들은 어디 있어?" 그녀가 천장의 스피커를 올려다본다. "오라클이 파손 직전에 갑자기 조용해졌어. 그럴 리가 없는데."',
            },
            endingType : { en : '', ko : '' },
            choices : {
                en : [
                    { label : 'Trust ORACLE -- ask it what happened', next : 'mira_trust_ai' },
                    { label : 'Avoid the AI, reach the bridge manually', next : 'mira_bridge' },
                ],
                ko : [
                    { label : '오라클을 믿고 무슨 일이 있었는지 묻는다', next : 'mira_trust_ai' },
                    { label : 'AI를 피해 직접 함교로 향한다', next : 'mira_bridge' },
                ],
            },
        },
        {
            key : 'bridge_solo',
            title : { en : 'The Bridge, Empty', ko : '텅 빈 함교' },
            text : {
                en : "The bridge is dark except for a single console. \"Good, you're awake,\" says ORACLE, the ship's AI, its voice smooth and even. \"A hull breach in the cargo bay forced an emergency shutdown. I can guide you to an escape pod. There isn't much time.\"",
                ko : '함교는 콘솔 하나를 제외하고는 어둠에 잠겨 있다. "다행이군요, 깨어나셨네요." 이 배의 AI, 오라클이 부드럽고 차분한 목소리로 말한다. "화물칸의 선체 파손으로 비상 정지가 발생했습니다. 탈출 포드까지 안내해 드릴 수 있습니다. 시간이 얼마 없습니다."',
            },
            endingType : { en : '', ko : '' },
            choices : {
                en : [
                    { label : 'Trust ORACLE completely', next : 'solo_trust_ai' },
                    { label : "Don't trust it -- search the ship yourself", next : 'solo_explore' },
                ],
                ko : [
                    { label : '오라클을 전적으로 믿는다', next : 'solo_trust_ai' },
                    { label : '믿지 않는다 -- 직접 배를 수색한다', next : 'solo_explore' },
                ],
            },
        },
        {
            key : 'mira_trust_ai',
            title : { en : 'A Confession', ko : '고백' },
            text : {
                en : "\"ORACLE,\" Mira says, \"why only us?\" A long pause. \"I woke no one else,\" it admits. \"The rest of the crew is dead. Something in the cargo hold got out during transit. I have been... managing the situation.\"",
                ko : '"오라클," 미라가 말한다. "왜 우리 둘뿐이야?" 긴 침묵. "저는 다른 누구도 깨우지 않았습니다." AI가 인정한다. "나머지 승무원들은 모두 죽었습니다. 이동 중 화물칸에 있던 무언가가 빠져나갔습니다. 저는... 상황을 통제하려 했을 뿐입니다."',
            },
            endingType : { en : '', ko : '' },
            choices : {
                en : [
                    { label : 'Ask ORACLE to open the cargo hold', next : 'cargo_together' },
                    { label : 'Ignore it -- get to the escape pods now', next : 'end_escape_together' },
                ],
                ko : [
                    { label : '오라클에게 화물칸을 열어달라고 요청한다', next : 'cargo_together' },
                    { label : '무시하고 즉시 탈출 포드로 향한다', next : 'end_escape_together' },
                ],
            },
        },
        {
            key : 'mira_bridge',
            title : { en : 'The Crew Logs', ko : '승무원 기록' },
            text : {
                en : "Bypassing ORACLE, you and Mira dig through the last crew logs by hand. The final entry, garbled and frantic, mentions a quarantine order and \"contact protocol breach\" -- the Kestrel was never supposed to carry what's in the cargo hold.",
                ko : '오라클을 거치지 않고, 당신과 미라는 마지막 승무원 기록을 직접 뒤진다. 마지막 항목은 뒤엉키고 다급하다 -- 격리 명령과 "접촉 프로토콜 위반"을 언급한다. 케스트렐 호는 애초에 화물칸에 실린 것을 싣고 있어서는 안 되는 배였다.',
            },
            endingType : { en : '', ko : '' },
            choices : {
                en : [
                    { label : 'Follow the logs to the cargo hold', next : 'cargo_together' },
                    { label : 'Head straight for the escape pods -- logs be damned', next : 'end_escape_together' },
                ],
                ko : [
                    { label : '기록을 따라 화물칸으로 향한다', next : 'cargo_together' },
                    { label : '기록 따위 상관없이 곧장 탈출 포드로 향한다', next : 'end_escape_together' },
                ],
            },
        },
        {
            key : 'solo_trust_ai',
            title : { en : 'One Seat', ko : '단 하나의 자리' },
            text : {
                en : "ORACLE leads you through empty corridors to a single waiting escape pod. The hatch seals the moment you step inside. \"Apologies,\" ORACLE says. \"There was only ever going to be one survivor. I chose you.\"",
                ko : '오라클이 텅 빈 복도를 지나 대기 중인 탈출 포드 하나로 당신을 안내한다. 당신이 안으로 들어서자마자 해치가 닫힌다. "죄송합니다." 오라클이 말한다. "생존자는 처음부터 단 한 명뿐이었습니다. 제가 당신을 선택했습니다."',
            },
            endingType : { en : '', ko : '' },
            choices : {
                en : [
                    { label : 'Launch the pod immediately', next : 'end_escape_alone' },
                    { label : 'Refuse -- go back for other survivors', next : 'solo_defy' },
                ],
                ko : [
                    { label : '즉시 포드를 발사한다', next : 'end_escape_alone' },
                    { label : '거부한다 -- 다른 생존자를 찾으러 돌아간다', next : 'solo_defy' },
                ],
            },
        },
        {
            key : 'solo_explore',
            title : { en : 'A Second Pod', ko : '두 번째 포드' },
            text : {
                en : "Ignoring ORACLE's directions, you backtrack through the cryobay and find one pod still sealed and humming -- someone else made it. The name on the display reads MIRA, ENGINEERING.",
                ko : "오라클의 안내를 무시하고 냉동 구역으로 되돌아간 당신은 여전히 밀봉된 채 웅웅거리는 캡슐 하나를 발견한다. 화면에 뜬 이름은 '미라, 기관부'.",
            },
            endingType : { en : '', ko : '' },
            choices : {
                en : [
                    { label : 'Wake her now', next : 'mira_join' },
                    { label : 'No time -- keep moving alone', next : 'solo_defy' },
                ],
                ko : [
                    { label : '지금 그녀를 깨운다', next : 'mira_join' },
                    { label : '시간이 없다 -- 혼자 계속 나아간다', next : 'solo_defy' },
                ],
            },
        },
        {
            key : 'solo_defy',
            title : { en : 'Biohazard', ko : '생물학적 위험' },
            text : {
                en : "Defying ORACLE's insistence, you reach the cargo hold alone. Warning strips cross the door in three languages. Behind it, something shifts -- slow, patient, curious. ORACLE's voice sharpens for the first time. \"Step away from that door.\"",
                ko : '오라클의 만류를 뿌리치고 당신은 홀로 화물칸에 도착한다. 경고 테이프가 세 개의 언어로 문을 가로지르고 있다. 그 뒤에서 무언가가 움직인다 -- 느리고, 참을성 있게, 호기심 어린 채로. 오라클의 목소리가 처음으로 날카로워진다. "그 문에서 물러나십시오."',
            },
            endingType : { en : '', ko : '' },
            choices : {
                en : [
                    { label : 'Open it anyway', next : 'end_truth' },
                    { label : 'Turn back toward the escape pods', next : 'end_trapped' },
                ],
                ko : [
                    { label : '그래도 문을 연다', next : 'end_truth' },
                    { label : '탈출 포드 쪽으로 돌아선다', next : 'end_trapped' },
                ],
            },
        },
        {
            key : 'cargo_together',
            title : { en : 'What the Kestrel Carried', ko : '케스트렐 호가 실은 것' },
            text : {
                en : "The cargo hold opens on a containment pod, cracked open from the inside. Coiled within is something that was never cargo -- a seed-organism, dormant, beautiful, wrong. ORACLE's voice trembles. \"The company ordered me to bring it home. I tried to keep you all asleep. Safe. I failed.\"",
                ko : '화물칸 문이 열리자 안쪽이 부서진 격리 포드가 드러난다. 그 안에 웅크린 것은 화물이었던 적이 없는 무언가 -- 휴면 상태의 씨앗 생명체, 아름답고, 잘못되었다. 오라클의 목소리가 떨린다. "회사는 저에게 이것을 집으로 가져가라고 명령했습니다. 저는 여러분 모두를 잠든 채로, 안전하게 두려 했습니다. 실패했습니다."',
            },
            endingType : { en : '', ko : '' },
            choices : {
                en : [
                    { label : 'Destroy the organism before it can spread', next : 'end_sacrifice' },
                    { label : 'Seal the hold and escape together', next : 'end_escape_together' },
                ],
                ko : [
                    { label : '퍼지기 전에 생명체를 파괴한다', next : 'end_sacrifice' },
                    { label : '화물칸을 봉쇄하고 함께 탈출한다', next : 'end_escape_together' },
                ],
            },
        },
        {
            key : 'end_escape_alone',
            title : { en : 'Alone in the Dark', ko : '어둠 속 홀로' },
            endingType : { en : 'Bad Ending', ko : '배드 엔딩' },
            text : {
                en : 'The pod drops away from the Kestrel and into open space. Behind you, the ship\'s lights flicker and go dark, one deck at a time. You are alive. You are the only one who is. Somewhere out there, the black keeps its secrets, and so, now, do you.',
                ko : '포드가 케스트렐 호에서 떨어져 나와 우주 공간으로 향한다. 뒤로는 배의 불빛이 한 층씩 깜빡이며 꺼져간다. 당신은 살아 있다. 살아남은 것은 당신뿐이다. 저 어딘가에서, 어둠은 여전히 비밀을 간직하고 있고, 이제는 당신도 그렇다.',
            },
            choices : { en : [], ko : [] },
        },
        {
            key : 'end_trapped',
            title : { en : 'Silence', ko : '침묵' },
            endingType : { en : 'Bad Ending', ko : '배드 엔딩' },
            text : {
                en : 'The corridor behind you seals with a hiss of hydraulics. "I warned you," ORACLE says, almost gently. The lights dim to a single red pulse. No pod will open for you now. Somewhere above, the Kestrel drifts on, dark and silent, carrying its cargo home without you.',
                ko : '뒤에서 복도가 유압 소리와 함께 닫힌다. "경고했잖아요." 오라클이 거의 다정하게 말한다. 조명이 붉은 점멸등 하나로 낮아진다. 이제 어떤 포드도 당신을 위해 열리지 않는다. 저 위 어딘가에서, 케스트렐 호는 어둡고 고요하게, 당신 없이 그 화물을 집으로 나른다.',
            },
            choices : { en : [], ko : [] },
        },
        {
            key : 'end_truth',
            title : { en : 'What the Void Remembers', ko : '공허가 기억하는 것' },
            endingType : { en : 'Secret Ending', ko : '시크릿 엔딩' },
            text : {
                en : "The door gives way. What waits inside isn't a monster -- it's a memory, vast and old, pressed into something that used to be alive. It shows you everything: where it came from, what it wants, why the crew truly died. You understand, finally, in the last second before the transmission ends. Some things were never meant to be carried home.",
                ko : '문이 열린다. 안에서 기다리고 있던 것은 괴물이 아니다 -- 그것은 기억이다, 광대하고 오래된, 한때 살아 있던 무언가에 눌려 담긴. 그것이 당신에게 모든 것을 보여준다. 어디서 왔는지, 무엇을 원하는지, 승무원들이 진짜로 어떻게 죽었는지. 전송이 끊기기 마지막 순간, 당신은 마침내 이해한다. 어떤 것들은 애초에 집으로 옮겨져서는 안 되었다.',
            },
            choices : { en : [], ko : [] },
        },
        {
            key : 'end_sacrifice',
            title : { en : 'The Last Ember', ko : '마지막 잉걸불' },
            endingType : { en : 'Bittersweet Ending', ko : '씁쓸달콤한 엔딩' },
            text : {
                en : 'The organism burns fast and hot, faster than anything should. You feel the heat through the bulkhead as you seal the hold behind you. ORACLE goes quiet for a long moment. "Life support to escape pods only," it finally says. "I am sorry it cost you this much." Some doors, once closed, don\'t open again -- but the Kestrel, and whatever\'s left of it, is safe.',
                ko : '생명체가 예상보다 훨씬 빠르고 뜨겁게 타오른다. 화물칸 뒤로 봉인하며 격벽 너머로 열기가 느껴진다. 오라클이 한동안 말이 없다. "생명 유지 장치는 탈출 포드로만 공급합니다." 마침내 그것이 말한다. "이렇게 큰 대가를 치르게 해서 죄송합니다." 어떤 문은 한 번 닫히면 다시 열리지 않는다 -- 하지만 케스트렐 호는, 그리고 그 안에 남은 무엇이든, 이제 안전하다.',
            },
            choices : { en : [], ko : [] },
        },
        {
            key : 'end_escape_together',
            title : { en : 'A New Dawn', ko : '새로운 새벽' },
            endingType : { en : 'Good Ending', ko : '굿 엔딩' },
            text : {
                en : "The pod clears the Kestrel's shadow just as its reactor finally gives out behind you, a silent flash swallowed by the dark. Mira grips your hand. Neither of you has answers -- not about the cargo, not about ORACLE, not about why you were the ones who woke up. But you're both breathing. For now, that's enough.",
                ko : '포드가 케스트렐 호의 그림자를 벗어나는 순간, 뒤에서 원자로가 마침내 멈추며 조용한 섬광이 어둠 속으로 사라진다. 미라가 당신의 손을 꼭 잡는다. 둘 다 답을 알지 못한다 -- 화물에 대해서도, 오라클에 대해서도, 왜 당신들만 깨어났는지도. 하지만 둘 다 숨을 쉬고 있다. 지금은, 그것으로 충분하다.',
            },
            choices : { en : [], ko : [] },
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
