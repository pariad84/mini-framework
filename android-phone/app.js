// Contacts + Notes -- a small Android-phone-themed example app built entirely on fn.js +
// fn.component.layout.js. Notes reference a Contact, same resource-reference pattern as
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

    if (fn.data.select({ key : 'contact' }).length === 0) {
        var alex = fn.data.insert({ key : 'contact', data : { name : 'Alex Kim', phone : '010-1234-5678' } });
        var priya = fn.data.insert({ key : 'contact', data : { name : 'Priya Shah', phone : '010-9876-5432' } });
        fn.data.insert({ key : 'note', data : { title : 'Called about project', contactId : alex.id, body : 'Discussed timeline, follow up Friday.' } });
        fn.data.insert({ key : 'note', data : { title : 'Birthday reminder', contactId : priya.id, body : 'Send a card next week.' } });
    }

    var newButtonStyle = { padding : '10px 16px', marginBottom : '12px', width : '100%', background : '#fff', color : '#4285f4', border : '1px solid #4285f4', borderRadius : '4px', fontWeight : '600' };

    function openContacts() {
        fn.component.create({
            name : 'popup',
            title : 'Contacts',
            render : function(screen) {
                fn.util.newButton({ text : '+ New Contact', title : 'New Contact', resource : contactResource, caller : screen, parent : screen.content, style : newButtonStyle });
                var listContainer = fn.element.create({ tagName : 'div', parent : screen.content });
                screen.refresh = function() {
                    fn.component.refresh({ name : 'list', resource : contactResource, datas : fn.util.selectFlat({ key : 'contact' }), caller : screen, parent : listContainer });
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
                fn.util.newButton({ text : '+ New Note', title : 'New Note', resource : noteResource, caller : screen, parent : screen.content, style : newButtonStyle });
                var listContainer = fn.element.create({ tagName : 'div', parent : screen.content });
                screen.refresh = function() {
                    fn.component.refresh({ name : 'list', resource : noteResource, datas : fn.util.selectFlat({ key : 'note' }), caller : screen, parent : listContainer });
                };
                screen.refresh();
            },
        });
    }

    fn.component.create({
        name : 'phone',
        apps : [
            { key : 'contacts', icon : '👤', label : 'Contacts', launch : openContacts },
            { key : 'notes', icon : '📝', label : 'Notes', launch : openNotes },
        ],
        parent : document.body,
    });
})();
