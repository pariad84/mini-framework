// Message Board -- Board + Post, with Post referencing a Board. Anyone can open a new board
// (the "+ New Board" button on the board list, same fn.util.newButton pattern as every other
// example's "+ New X") and anyone can post into any board (the "+ New Post" button on a board's
// page) -- there's no auth/ownership model here at all, matching the brief. Boards are real
// routes ('#/board/<id>'), not popups: browsing into one and back out is real navigation via
// fn.util.route, and a board's row is a plain `<a href="#/board/<id>">` (like `crm/`'s tab bar),
// so clicking one is a native browser navigation, no click handler needed. Posts stay inside the
// standard schema-driven `list` + edit-popup pattern (clicking a post shows/edits its full body
// through the usual form), since -- unlike Board, which is pure navigation with no fields worth
// editing after creation -- a post's title/author/body is exactly the shape `form` already
// handles; only board-list-page writes its own row component (`board-row` in layout.js),
// the same reason `team-chat/`'s channel list isn't `list`/`pagination` either: clicking a row
// here means "navigate into it", not "open its edit form".
(function messageBoardApp() {
    var fn = window.fn;

    var boardResource = {
        key : 'board',
        columns : [
            { name : 'name', label : 'Board name', form : { type : 'text' } },
            { name : 'description', label : 'Description', form : { type : 'text' } },
        ],
    };

    var postResource = {
        key : 'post',
        columns : [
            { name : 'boardId', label : 'Board', form : { type : 'select', resource : { key : 'board', label : 'name' } } },
            { name : 'title', label : 'Title', list : { type : 'text' }, form : { type : 'text' } },
            { name : 'author', label : 'Author', list : { type : 'text' }, form : { type : 'text' } },
            { name : 'body', label : 'Body', form : { type : 'textarea', height : '140px' } },
        ],
    };

    if (fn.data.select({ key : 'board' }).length === 0) {
        var general = fn.data.insert({ key : 'board', data : { name : 'General', description : 'Anything goes.' } });
        var offTopic = fn.data.insert({ key : 'board', data : { name : 'Off-Topic', description : 'Not about the app.' } });
        fn.data.insert({ key : 'board', data : { name : 'Help & Support', description : 'Ask a question.' } });
        fn.data.insert({ key : 'post', data : { boardId : general.id, author : 'Alice', title : 'Welcome!', body : 'Feel free to open your own board or post here.' } });
        fn.data.insert({ key : 'post', data : { boardId : general.id, author : 'Bob', title : 'Hello everyone', body : 'First post, excited to be here.' } });
        fn.data.insert({ key : 'post', data : { boardId : offTopic.id, author : 'Alice', title : 'Coffee or tea?', body : "I can't decide." } });
    }

    var newButtonStyle = { padding : '14px 18px', marginBottom : '16px', fontSize : '16px', width : '100%', background : '#4fd1b5', color : '#12171a', border : 'none', borderRadius : '6px', fontWeight : '700' };

    function boardIdFromHash() {
        var m = location.hash.match(/^#\/board\/(\d+)$/);
        return m ? Number(m[1]) : null;
    }

    fn.component.layout.set({
        name : 'board-list-page',
        layout : function() {
            var page = fn.element.create({ tagName : 'div', style : { padding : '16px', paddingBottom : '32px' } });
            fn.element.create({ tagName : 'h1', text : 'Message Boards', style : { fontSize : '20px' }, parent : page });
            fn.util.newButton({ text : '+ New Board', title : 'New Board', resource : boardResource, caller : page, parent : page, style : newButtonStyle });

            var listContainer = fn.element.create({ tagName : 'div', parent : page });
            page.refresh = function() {
                Array.from(listContainer.children).forEach(function(child) { child.remove(); });
                fn.util.selectFlat({ key : 'board' }).forEach(function(board) {
                    fn.component.create({ name : 'board-row', board : board, parent : listContainer });
                });
            };
            page.refresh();
            return page;
        }
    });

    fn.component.layout.set({
        name : 'board-page',
        layout : function() {
            var boardId = boardIdFromHash();
            var board = boardId !== null ? fn.data.select({ key : 'board', id : boardId }) : null;
            var page = fn.element.create({ tagName : 'div', style : { padding : '16px', paddingBottom : '32px' } });

            fn.element.create({
                tagName : 'a', attribute : { href : '#/' }, text : '← Boards',
                style : { display : 'inline-block', marginBottom : '12px', color : '#4fd1b5', textDecoration : 'none', fontSize : '14px' },
                parent : page,
            });

            if (!board) {
                fn.element.create({ tagName : 'div', text : 'Board not found.', style : { color : '#7f9199' }, parent : page });
                return page;
            }

            fn.element.create({ tagName : 'h1', text : board.data.name, style : { fontSize : '20px', marginBottom : '2px' }, parent : page });
            if (board.data.description) {
                fn.element.create({ tagName : 'div', text : board.data.description, style : { color : '#7f9199', marginBottom : '16px' }, parent : page });
            }

            fn.element.create({
                tagName : 'button', attribute : { type : 'button' }, text : '+ New Post',
                style : newButtonStyle,
                event : { click : function() {
                    fn.component.create({
                        name : 'popup', title : 'New Post', caller : page,
                        render : function(popupEl) {
                            fn.component.create({ name : 'form', resource : postResource, data : { boardId : boardId }, parent : popupEl.content });
                            fn.component.create({ name : 'save-btn', parent : popupEl.content });
                        },
                    });
                } },
                parent : page,
            });

            var listContainer = fn.element.create({ tagName : 'div', parent : page });
            page.refresh = function() {
                var posts = fn.util.selectFlat({ key : 'post' }).filter(function(p) { return p.boardId === boardId; }).reverse();
                fn.component.refresh({ name : 'list', resource : postResource, datas : posts, caller : page, pageSize : 8, parent : listContainer });
            };
            page.refresh();
            return page;
        }
    });

    fn.util.route({
        resolve : function(hash) { return hash.indexOf('#/board/') === 0 ? 'board-page' : 'board-list-page'; },
        parent : document.body,
    });
})();
