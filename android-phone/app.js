// Contacts + Notes -- a small Android-phone-themed example app built entirely on fn.js +
// fn.component.layout.set.js. Notes reference a Contact, same resource-reference pattern as
// task-tracker's project/task, crm's contact/deal, and windows-os's folder/file. The phone
// chrome (device frame, status bar, home screen, back-stack navigation) lives entirely in
// layout.js.
(function androidApp() {
    var fn = window.fn;

    var contactResource = {
        key : 'contact',
        columns : [
            { name : 'name', label : 'Name', list : { type : 'text' }, form : { type : 'text' } },
            { name : 'phone', label : 'Phone', list : { type : 'text' }, form : { type : 'text' } },
        ],
    };

    var noteResource = {
        key : 'note',
        columns : [
            { name : 'title', label : 'Title', list : { type : 'text' }, form : { type : 'text' } },
            { name : 'contactId', label : 'Contact', list : { type : 'text' }, form : { type : 'select', resource : { key : 'contact', label : 'name' } } },
            { name : 'body', label : 'Note', form : { type : 'textarea' } },
        ],
    };

    function contactDatas() {
        return fn.data.select({ key : 'contact' }).map(function(row) {
            return Object.assign({ id : row.id }, row.data);
        });
    }

    function noteDatas() {
        return fn.data.select({ key : 'note' }).map(function(row) {
            return Object.assign({ id : row.id }, row.data);
        });
    }

    if (fn.data.select({ key : 'contact' }).length === 0) {
        var alex = fn.data.insert({ key : 'contact', data : { name : 'Alex Kim', phone : '010-1234-5678' } });
        var priya = fn.data.insert({ key : 'contact', data : { name : 'Priya Shah', phone : '010-9876-5432' } });
        fn.data.insert({ key : 'note', data : { title : 'Called about project', contactId : alex.id, body : 'Discussed timeline, follow up Friday.' } });
        fn.data.insert({ key : 'note', data : { title : 'Birthday reminder', contactId : priya.id, body : 'Send a card next week.' } });
    }

    function newButton(opt) {
        return fn.element.create({
            tagName : 'button',
            attribute : { type : 'button' },
            text : opt.text,
            style : { padding : '10px 16px', marginBottom : '12px', width : '100%', background : '#fff', color : '#4285f4', border : '1px solid #4285f4', borderRadius : '4px', fontWeight : '600' },
            parent : opt.parent,
            event : {
                click : function() {
                    fn.component.create({
                        name : 'popup',
                        title : opt.title,
                        caller : opt.caller,
                        render : function(screen) {
                            fn.component.create({ name : 'form', resource : opt.resource, data : {}, parent : screen.content });
                            fn.component.create({ name : 'save-btn', parent : screen.content });
                        },
                    });
                }
            },
        });
    }

    function openContacts() {
        fn.component.create({
            name : 'popup',
            title : 'Contacts',
            render : function(screen) {
                newButton({ text : '+ New Contact', title : 'New Contact', resource : contactResource, caller : screen, parent : screen.content });
                var listContainer = fn.element.create({ tagName : 'div', parent : screen.content });
                screen.refresh = function() {
                    fn.component.refresh({ name : 'list', resource : contactResource, datas : contactDatas(), caller : screen, parent : listContainer });
                };
                screen.refresh();
            },
        });
    }

    function openNotes() {
        fn.component.create({
            name : 'popup',
            title : 'Notes',
            render : function(screen) {
                newButton({ text : '+ New Note', title : 'New Note', resource : noteResource, caller : screen, parent : screen.content });
                var listContainer = fn.element.create({ tagName : 'div', parent : screen.content });
                screen.refresh = function() {
                    fn.component.refresh({ name : 'list', resource : noteResource, datas : noteDatas(), caller : screen, parent : listContainer });
                };
                screen.refresh();
            },
        });
    }

    fn.component.create({
        name : 'phone',
        apps : [
            { icon : '👤', label : 'Contacts', launch : openContacts },
            { icon : '📝', label : 'Notes', launch : openNotes },
        ],
        parent : document.body,
    });
})();
