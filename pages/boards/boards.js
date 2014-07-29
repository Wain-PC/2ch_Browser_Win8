(function () {
    "use strict";

    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var ui = WinJS.UI;

    ui.Pages.define("/pages/boards/boards.html", {
        // Эта функция вызывается каждый раз, когда пользователь переходит на данную страницу. Она
        // заполняет элементы страницы данными приложения.

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


})();
