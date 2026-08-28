// Team Chat -- a small chat-app-themed example built entirely on fn.js + fn.util.js. Channel +
// Message, with Message referencing a Channel, but unlike every other example, messages never go
// through the schema-driven `form`/`list` layouts -- they're inserted directly by the `composer`
// layout (see layout.js), so there's no messageResource here; only Channel is CRUD'd through the
// usual popup/form/save-btn (via the "+ New Channel" button and each channel's edit icon).
(function teamChatApp() {
    var fn = window.fn;

    var channelResource = {
        key : 'channel',
        columns : [
            { name : 'name', label : 'Name', form : { type : 'text' } },
        ],
    };

    if (fn.data.select({ key : 'channel' }).length === 0) {
        var general = fn.data.insert({ key : 'channel', data : { name : 'general' } });
        var random = fn.data.insert({ key : 'channel', data : { name : 'random' } });
        fn.data.insert({ key : 'message', data : { channelId : general.id, author : 'Alice', body : 'Welcome to the team channel! 👋' } });
        fn.data.insert({ key : 'message', data : { channelId : general.id, author : 'Bob', body : 'Excited to be here!' } });
        fn.data.insert({ key : 'message', data : { channelId : random.id, author : 'Alice', body : 'Anyone up for coffee later? ☕' } });
    }

    fn.component.create({
        name : 'chat-shell',
        channelResource : channelResource,
        parent : document.body,
    });
})();
