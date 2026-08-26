// Recipe Box -- a second side-project app built entirely on mini.js, laid out as an ordinary
// multi-page website (nav + hash routing) instead of Task Tracker's floating popups. Its job is
// to prove mini.js's essentials -- list/form/popup, the layout registry, the caller convention --
// hold up outside the "everything lives in a popup" shape the framework was first built around.
(function recipeBoxApp() {
    var fn = window.fn;

    var categoryResource = {
        key : 'category',
        columns : [
            { name : 'name', label : 'Name', list : { type : 'text' }, form : { type : 'text' } },
        ],
    };

    var recipeResource = {
        key : 'recipe',
        columns : [
            { name : 'title', label : 'Title', list : { type : 'text' }, form : { type : 'text' } },
            { name : 'categoryId', label : 'Category', list : { type : 'text' }, form : { type : 'select', resource : { key : 'category', label : 'name' } } },
            { name : 'ingredients', label : 'Ingredients', form : { type : 'textarea' } },
            { name : 'instructions', label : 'Instructions', form : { type : 'textarea' } },
        ],
    };

    function categoryDatas() {
        return fn.data.select({ key : 'category' }).map(function(row) {
            return Object.assign({ id : row.id }, row.data);
        });
    }

    function recipeDatas() {
        return fn.data.select({ key : 'recipe' }).map(function(row) {
            return Object.assign({ id : row.id }, row.data);
        });
    }

    if (fn.data.select({ key : 'category' }).length === 0) {
        var breakfast = fn.data.insert({ key : 'category', data : { name : 'Breakfast' } });
        var dinner = fn.data.insert({ key : 'category', data : { name : 'Dinner' } });
        fn.data.insert({ key : 'recipe', data : { title : 'Pancakes', categoryId : breakfast.id, ingredients : 'Flour, eggs, milk, sugar', instructions : 'Mix and fry on a griddle.' } });
        fn.data.insert({ key : 'recipe', data : { title : 'Spaghetti', categoryId : dinner.id, ingredients : 'Pasta, tomato sauce, garlic', instructions : 'Boil pasta, simmer sauce, combine.' } });
    }

    function newButton(opt) {
        return fn.element.create({
            tagName : 'button',
            attribute : { type : 'button' },
            text : opt.text,
            style : { padding : '6px 14px', marginBottom : '12px' },
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
        name : 'home-page',
        layout : function() {
            var page = fn.element.create({ tagName : 'div', style : { padding : '24px' } });
            fn.element.create({ tagName : 'h1', text : 'Recipe Box', parent : page });
            fn.element.create({
                tagName : 'p',
                text : 'A small recipe manager built entirely on mini.js, laid out as an ordinary multi-page website instead of floating popups.',
                parent : page,
            });
            return page;
        }
    });

    fn.component.layout.set({
        name : 'categories-page',
        layout : function() {
            var page = fn.element.create({ tagName : 'div', style : { padding : '24px' } });
            fn.element.create({ tagName : 'h1', text : 'Categories', parent : page });
            page.appendChild(newButton({ text : '+ New Category', title : 'New Category', resource : categoryResource, caller : page }));
            var listContainer = fn.element.create({ tagName : 'div', parent : page });
            page.refresh = function() {
                Array.from(listContainer.children).forEach(function(c) { c.remove(); });
                fn.component.create({ name : 'list', resource : categoryResource, datas : categoryDatas(), caller : page, parent : listContainer });
            };
            page.refresh();
            return page;
        }
    });

    fn.component.layout.set({
        name : 'recipes-page',
        layout : function() {
            var page = fn.element.create({ tagName : 'div', style : { padding : '24px' } });
            fn.element.create({ tagName : 'h1', text : 'Recipes', parent : page });
            page.appendChild(newButton({ text : '+ New Recipe', title : 'New Recipe', resource : recipeResource, caller : page }));
            var listContainer = fn.element.create({ tagName : 'div', parent : page });
            page.refresh = function() {
                Array.from(listContainer.children).forEach(function(c) { c.remove(); });
                fn.component.create({ name : 'list', resource : recipeResource, datas : recipeDatas(), caller : page, parent : listContainer });
            };
            page.refresh();
            return page;
        }
    });

    fn.component.layout.set({
        name : 'nav',
        layout : function(opt = {}) {
            var nav = fn.element.create({
                tagName : 'nav',
                style : { display : 'flex', gap : '16px', padding : '16px 24px', borderBottom : '1px solid #3a3f4b' },
            });
            opt.links.forEach(function(link) {
                fn.element.create({
                    tagName : 'a',
                    attribute : { href : link.href },
                    text : link.text,
                    style : { color : '#8ab4f8', textDecoration : 'none' },
                    parent : nav,
                });
            });
            return nav;
        }
    });

    fn.component.layout.set({
        name : 'router',
        layout : function(opt = {}) {
            var container = fn.element.create({ tagName : 'div' });
            function render() {
                Array.from(container.children).forEach(function(c) { c.remove(); });
                var name = opt.routes[location.hash] || opt.routes['#/'];
                fn.component.create({ name : name, parent : container });
            }
            window.addEventListener('hashchange', render);
            render();
            return container;
        }
    });

    fn.component.create({
        name : 'nav',
        links : [
            { href : '#/', text : 'Home' },
            { href : '#/categories', text : 'Categories' },
            { href : '#/recipes', text : 'Recipes' },
        ],
        parent : document.body,
    });

    fn.component.create({
        name : 'router',
        routes : { '#/' : 'home-page', '#/categories' : 'categories-page', '#/recipes' : 'recipes-page' },
        parent : document.body,
    });
})();
