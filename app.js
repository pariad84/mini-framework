// Task Tracker -- a small side-project app built entirely on mini.js, kept separate from the
// framework file itself (same split as devtool.simple's frameworkCore/Layouts vs devtoolExampleApp).
// Its only job is to prove mini.js's essentials hold up on a second, unrelated app.
(function taskTrackerApp() {
    var fn = window.fn;

    var projectResource = {
        key : 'project',
        columns : [
            { name : 'name', label : 'Name', list : { type : 'text' }, form : { type : 'text' } },
        ],
    };

    var taskResource = {
        key : 'task',
        columns : [
            { name : 'title', label : 'Title', list : { type : 'text' }, form : { type : 'text' } },
            { name : 'projectId', label : 'Project', list : { type : 'text' }, form : { type : 'select', resource : { key : 'project', label : 'name' } } },
            { name : 'notes', label : 'Notes', form : { type : 'textarea' } },
            {
                name : 'done', label : 'Done',
                list : { render : 'function(data) { var b = document.createElement("button"); b.textContent = data.done ? "✓" : "✗"; b.addEventListener("click", function(e) { e.stopPropagation(); fn.data.update({ key: "task", id: data.id, data: { title: data.title, projectId: data.projectId, notes: data.notes, done: !data.done } }); e.target.closest(".__popup").refresh(); }); return b; }' },
            },
            {
                name : 'inspect', label : '',
                list : { render : 'function(data) { var b = document.createElement("button"); b.textContent = "Inspect notes"; b.addEventListener("click", function(e) { e.stopPropagation(); var value; try { value = JSON.parse(data.notes); } catch (err) { value = data.notes || ""; } fn.component._.openValue({ value: value, title: "Notes: " + data.title, caller: e.target.closest(".__popup") }); }); return b; }' },
            },
        ],
    };

    function projectDatas() {
        return fn.data.select({ key : 'project' }).map(function(row) {
            return Object.assign({ id : row.id }, row.data);
        });
    }

    function taskDatas() {
        return fn.data.select({ key : 'task' }).map(function(row) {
            return Object.assign({ id : row.id }, row.data);
        });
    }

    if (fn.data.select({ key : 'project' }).length === 0) {
        var work = fn.data.insert({ key : 'project', data : { name : 'Work' } });
        var home = fn.data.insert({ key : 'project', data : { name : 'Home' } });
        fn.data.insert({ key : 'task', data : { title : 'Write quarterly report', projectId : work.id, notes : 'Cover Q1 metrics and hiring plan.', done : false } });
        fn.data.insert({ key : 'task', data : { title : 'Review pull requests', projectId : work.id, notes : JSON.stringify([ 'PR #12', 'PR #14', 'PR #19' ]), done : false } });
        fn.data.insert({ key : 'task', data : { title : 'Fix leaky faucet', projectId : home.id, notes : 'Call plumber if the washer swap does not work.', done : true } });
    }

    fn.component.create({
        name : 'popup',
        title : 'Projects',
        render : function(popupEl) {
            fn.component.create({ name : 'list', resource : projectResource, datas : projectDatas(), parent : popupEl.content });
            popupEl.refresh = function() {
                fn.component.refresh({ name : 'list', resource : projectResource, datas : projectDatas(), parent : popupEl.content });
            };
        },
    });

    fn.component.create({
        name : 'popup',
        title : 'Tasks',
        render : function(popupEl) {
            fn.component.create({ name : 'list', resource : taskResource, datas : taskDatas(), parent : popupEl.content });
            popupEl.refresh = function() {
                fn.component.refresh({ name : 'list', resource : taskResource, datas : taskDatas(), parent : popupEl.content });
            };
        },
    });
})();
