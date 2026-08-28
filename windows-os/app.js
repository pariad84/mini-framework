// File Manager -- a small desktop-OS-themed example app built entirely on fn.js +
// fn.component.layout.js. Folders + Files, with Files referencing a Folder. Same
// resource-reference pattern as task-tracker's project/task and crm's contact/deal; the desktop
// OS chrome (draggable windows, taskbar, Start menu) lives entirely in layout.js.
(function fileManagerApp() {
    var fn = window.fn;

    var folderResource = {
        key : 'folder',
        columns : [
            { name : 'name', label : 'Name', list : { type : 'text' }, form : { type : 'text' } },
        ],
    };

    var fileResource = {
        key : 'file',
        columns : [
            { name : 'name', label : 'Name', list : { type : 'text' }, form : { type : 'text' } },
            { name : 'folderId', label : 'Folder', list : { type : 'text' }, form : { type : 'select', resource : { key : 'folder', label : 'name' } } },
            { name : 'content', label : 'Content', form : { type : 'textarea' } },
        ],
    };

    if (fn.data.select({ key : 'folder' }).length === 0) {
        var docs = fn.data.insert({ key : 'folder', data : { name : 'Documents' } });
        var pics = fn.data.insert({ key : 'folder', data : { name : 'Pictures' } });
        fn.data.insert({ key : 'file', data : { name : 'todo.txt', folderId : docs.id, content : 'Buy milk\nFinish report' } });
        fn.data.insert({ key : 'file', data : { name : 'vacation.jpg', folderId : pics.id, content : '' } });
    }

    var newButtonStyle = { padding : '6px 14px', marginBottom : '10px' };

    function openFolders() {
        fn.component.create({
            name : 'popup',
            title : 'Folders',
            render : function(popupEl) {
                fn.util.newButton({ text : '+ New Folder', title : 'New Folder', resource : folderResource, caller : popupEl, parent : popupEl.content, style : newButtonStyle });
                var listContainer = fn.element.create({ tagName : 'div', parent : popupEl.content });
                popupEl.refresh = function() {
                    fn.component.refresh({ name : 'list', resource : folderResource, datas : fn.util.selectFlat({ key : 'folder' }), caller : popupEl, parent : listContainer });
                };
                popupEl.refresh();
            },
        });
    }

    function openFiles() {
        fn.component.create({
            name : 'popup',
            title : 'Files',
            render : function(popupEl) {
                fn.util.newButton({ text : '+ New File', title : 'New File', resource : fileResource, caller : popupEl, parent : popupEl.content, style : newButtonStyle });
                var listContainer = fn.element.create({ tagName : 'div', parent : popupEl.content });
                popupEl.refresh = function() {
                    fn.component.refresh({ name : 'list', resource : fileResource, datas : fn.util.selectFlat({ key : 'file' }), caller : popupEl, parent : listContainer });
                };
                popupEl.refresh();
            },
        });
    }

    fn.component.create({
        name : 'desktop',
        apps : [
            { icon : '📁', label : 'Folders', launch : openFolders },
            { icon : '📄', label : 'Files', launch : openFiles },
        ],
        parent : document.body,
    });
})();
