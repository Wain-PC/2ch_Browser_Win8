(function () {
    "use strict";

    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var ui = WinJS.UI;

    ui.Pages.define("/pages/boards/boards.html", {
        // Эта функция вызывается каждый раз, когда пользователь переходит на данную страницу. Она
        // заполняет элементы страницы данными приложения.

        var list = new WinJS.Binding.List();
 
    generateSampleData().forEach(function (item) {
        list.push(item);
    });

    var groupedItems = list.createGrouped(
        function groupKeySelector(item) { return item.group; },
        function groupDataSelector(item) { return {'group':item.group}; }
    );

    WinJS.Namespace.define("DVACH", {
        boardsList: groupedItems,
        boardGroupes:groupedItems.groups,
        url: "2ch.hk",
        getBoardName: getBoardName,
    });

        ready: function (element, options) {
            var listView = element.querySelector(".itemslist-boards").winControl;
            listView.itemDataSource = DVACH.boardsList.dataSource;
            listView.groupDataSource = DVACH.boardGroupes.dataSource;
            listView.itemTemplate = element.querySelector(".itemtemplate");
            listView.groupHeaderTemplate = element.querySelector("#headerTemplate");
            listView.oniteminvoked = this.boardClicked.bind(this);
            listView.layout = new ui.GridLayout();
            listView.element.focus();
        },

        boardClicked: function(args) {
            var boardAbbr = DVACH.boardsList.getAt(args.detail.itemIndex).abbr;
            WinJS.Navigation.navigate("/pages/threads/threads.html", { 'boardAbbr': boardAbbr });
        }
   
});


function generateSampleData() {
    var board;
    var i;
    var items = new Array;
    for (i = 0; i < boardsList.length; i++) {
        board = { "title": boardsList[i].name, "abbr": '/' + boardsList[i].abbr + '/', group:boardsList[i].group };
        items.push(board);
    }

    return items;
}


})();
