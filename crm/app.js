// CRM -- a mobile-oriented example app built entirely on fn.js + fn.component.layout.set.js.
// Contacts + Deals, with Deals referencing a Contact and a Stage (Stage is itself a resource,
// seeded with fixed rows, so deal.stageId is a plain resource-reference select like everything
// else -- no framework change needed for a fixed set of choices).
(function crmApp() {
    var fn = window.fn;

    var stageResource = {
        key : 'stage',
        columns : [
            { name : 'name', label : 'Name', list : { type : 'text' }, form : { type : 'text' } },
        ],
    };

    var contactResource = {
        key : 'contact',
        columns : [
            { name : 'name', label : 'Name', list : { type : 'text' }, form : { type : 'text' } },
            { name : 'phone', label : 'Phone', list : { type : 'text' }, form : { type : 'text' } },
            { name : 'company', label : 'Company', list : { type : 'text' }, form : { type : 'text' } },
            { name : 'notes', label : 'Notes', form : { type : 'textarea' } },
        ],
    };

    var dealResource = {
        key : 'deal',
        columns : [
            { name : 'title', label : 'Title', list : { type : 'text' }, form : { type : 'text' } },
            { name : 'contactId', label : 'Contact', list : { type : 'text' }, form : { type : 'select', resource : { key : 'contact', label : 'name' } } },
            { name : 'stageId', label : 'Stage', list : { type : 'text' }, form : { type : 'select', resource : { key : 'stage', label : 'name' } } },
            { name : 'value', label : 'Value', list : { type : 'text' }, form : { type : 'text' } },
        ],
    };

    function contactDatas() {
        return fn.data.select({ key : 'contact' }).map(function(row) {
            return Object.assign({ id : row.id }, row.data);
        });
    }

    function dealDatas() {
        return fn.data.select({ key : 'deal' }).map(function(row) {
            return Object.assign({ id : row.id }, row.data);
        });
    }

    if (fn.data.select({ key : 'stage' }).length === 0) {
        [ 'Lead', 'Contacted', 'Won', 'Lost' ].forEach(function(name) {
            fn.data.insert({ key : 'stage', data : { name : name } });
        });
    }

    if (fn.data.select({ key : 'contact' }).length === 0) {
        var stages = fn.data.select({ key : 'stage' });
        var stageByName = {};
        stages.forEach(function(row) { stageByName[row.data.name] = row.id; });

        var acme = fn.data.insert({ key : 'contact', data : { name : 'Jane Cooper', phone : '555-0101', company : 'Acme Co', notes : '' } });
        var globex = fn.data.insert({ key : 'contact', data : { name : 'Marcus Lee', phone : '555-0142', company : 'Globex', notes : 'Prefers text over calls.' } });
        fn.data.insert({ key : 'deal', data : { title : 'Website redesign', contactId : acme.id, stageId : stageByName['Contacted'], value : '4200' } });
        fn.data.insert({ key : 'deal', data : { title : 'Annual support contract', contactId : globex.id, stageId : stageByName['Lead'], value : '9600' } });
    }

    function newButton(opt) {
        return fn.element.create({
            tagName : 'button',
            attribute : { type : 'button' },
            text : opt.text,
            style : { padding : '14px 18px', marginBottom : '16px', fontSize : '16px', width : '100%' },
            parent : opt.parent,
            event : {
                click : function() {
                    fn.component.create({
                        name : 'popup',
                        title : opt.title,
                        caller : opt.caller,
                        render : function(popupEl) {
                            fn.component.create({ name : 'form', resource : opt.resource, data : {}, parent : popupEl.content });
                            fn.component.create({ name : 'save-btn', parent : popupEl.content });
                        },
                    });
                }
            },
        });
    }

    fn.component.layout.set({
        name : 'contacts-page',
        layout : function() {
            var page = fn.element.create({ tagName : 'div', style : { padding : '16px', paddingBottom : '100px' } });
            fn.element.create({ tagName : 'h1', text : 'Contacts', style : { fontSize : '20px' }, parent : page });
            newButton({ text : '+ New Contact', title : 'New Contact', resource : contactResource, caller : page, parent : page });
            var listContainer = fn.element.create({ tagName : 'div', parent : page });
            page.refresh = function() {
                fn.component.refresh({ name : 'list', resource : contactResource, datas : contactDatas(), caller : page, parent : listContainer });
            };
            page.refresh();
            return page;
        }
    });

    fn.component.layout.set({
        name : 'deals-page',
        layout : function() {
            var page = fn.element.create({ tagName : 'div', style : { padding : '16px', paddingBottom : '100px' } });
            fn.element.create({ tagName : 'h1', text : 'Deals', style : { fontSize : '20px' }, parent : page });
            newButton({ text : '+ New Deal', title : 'New Deal', resource : dealResource, caller : page, parent : page });
            var listContainer = fn.element.create({ tagName : 'div', parent : page });
            page.refresh = function() {
                fn.component.refresh({ name : 'list', resource : dealResource, datas : dealDatas(), caller : page, parent : listContainer });
            };
            page.refresh();
            return page;
        }
    });

    fn.component.layout.set({
        name : 'tab-bar',
        layout : function(opt = {}) {
            var bar = fn.element.create({
                tagName : 'nav',
                style : {
                    position : 'fixed',
                    bottom : '0',
                    left : '0',
                    right : '0',
                    display : 'flex',
                    borderTop : '1px solid #3a3f4b',
                    background : '#1e2128',
                },
            });
            opt.tabs.forEach(function(tab) {
                fn.element.create({
                    tagName : 'a',
                    attribute : { href : tab.href },
                    text : tab.text,
                    style : {
                        flex : '1',
                        textAlign : 'center',
                        padding : '14px 0',
                        color : location.hash === tab.href || (location.hash === '' && tab.href === '#/') ? '#8ab4f8' : '#e8eaed',
                        textDecoration : 'none',
                        fontSize : '15px',
                    },
                    parent : bar,
                });
            });
            return bar;
        }
    });

    fn.component.layout.set({
        name : 'router',
        layout : function(opt = {}) {
            var container = fn.element.create({ tagName : 'div' });
            var pageArea = fn.element.create({ tagName : 'div', parent : container });
            var tabBarArea = fn.element.create({ tagName : 'div', parent : container });
            function render() {
                var name = opt.routes[location.hash] || opt.routes['#/'];
                fn.component.refresh({ name : name, parent : pageArea });
                fn.component.refresh({ name : 'tab-bar', tabs : opt.tabs, parent : tabBarArea });
            }
            window.addEventListener('hashchange', render);
            render();
            return container;
        }
    });

    fn.component.create({
        name : 'router',
        routes : { '#/' : 'contacts-page', '#/deals' : 'deals-page' },
        tabs : [
            { href : '#/', text : 'Contacts' },
            { href : '#/deals', text : 'Deals' },
        ],
        parent : document.body,
    });
})();
