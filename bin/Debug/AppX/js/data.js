(function () {
    "use strict";

    
    var notifications = Windows.UI.Notifications;

    WinJS.Namespace.define("APP", {
        showMessageOnToast: showMessageOnToast,
        showMessageOnPage: showMessageOnPage,
        disposeMessageOnPage: disposeMessageOnPage,
        toggleLoadingRingState: toggleLoadingRingState

    });


    var list = new WinJS.Binding.List();

    generateSampleData().forEach(function (item) {
        list.push(item);
    });

    var groupedItems = list.createGrouped(
        function groupKeySelector(item) { return item.group; },
        function groupDataSelector(item) { return { 'group': item.group }; },
        function groupSorter(groupName1, groupName2) {
            function groupImportance(item) {
                switch (item) {
                    case "Разное": {
                        return 6;
                    }
                    case "Тематика": {
                        return 5;
                    }
                    case "Творчество": {
                        return 4;
                    }
                    case "Игры": {
                        return 3;
                    }
                    case "Творчество": {
                        return 2;
                    }
                    case "Япония": {
                        return 1;
                    }
                    default: {
                        return 0;
                    }
                }

            }

            return groupImportance(groupName2) - groupImportance(groupName1);
        }
    );

    WinJS.Namespace.define("DVACH", {
        boardsList: groupedItems,
        boardGroupes: groupedItems.groups,
        url: "2ch.hk",
        getBoardName: getBoardName,
    });


    function generateSampleData() {
        var board;
        var i;
        var items = new Array;
        for (i = 0; i < boardsList.length; i++) {
            board = { "title": boardsList[i].name, "abbr": '/' + boardsList[i].abbr + '/', group: boardsList[i].group };
            items.push(board);
        }
        return items;
    }


    function getBoardName(boardAbbr) {
        for (var i = 0; i < DVACH.boardsList.length; i++) {
            if (DVACH.boardsList.getAt(i).abbr === boardAbbr) {
                return DVACH.boardsList.getAt(i).title;
            }
        }
    }

    function showMessageOnPage(message) {

        try {
            APP.toggleLoadingRingState('hide');
            WinJS.Binding.processAll(messageBox, { 'display': 'block', 'message': message });
            return true;
        }
        catch (err) {
            console.log("Unable to show message on page: " + err.description);
            return false;
        }
}

    function showMessageOnToast(message) {
        console.log("Showing message: "+message);
        var template = notifications.ToastTemplateType.toastImageAndText01;
        var toastXml = notifications.ToastNotificationManager.getTemplateContent(template);

        var toastTextElements = toastXml.getElementsByTagName("text");
        toastTextElements[0].appendChild(toastXml.createTextNode(message));

        var toastNode = toastXml.selectSingleNode("/toast");

        var audio = toastXml.createElement("audio");
        audio.setAttribute("silent", "true");

        toastNode.appendChild(audio);

       // console.log(toastXml.toString);

        var toast = new notifications.ToastNotification(toastXml);

        var toastNotifier = notifications.ToastNotificationManager.createToastNotifier();
        toastNotifier.show(toast);
    }


    function disposeMessageOnPage() {
        try {
            WinJS.Binding.processAll(messageBox, { 'display': 'none', 'message': "" });
            return true;
        }
        catch (err) {
            console.log("Unable to dispose message on page: " + err.description);
            return false;
        }

    }


    function toggleLoadingRingState(status) {
        switch (status) {
            case 'show': {
                try {
                    document.getElementsByClassName('refresh-thread-loading')[0].style.display = 'block';
                    return true;
                }
                catch (err) {
                    console.log("Cannot toggle (enable) loading ring:" + err.description);
                    return false;
                }
            };

            case 'hide': {
                try {
                    document.getElementsByClassName('refresh-thread-loading')[0].style.display = 'none';
                    return true;
                }
                catch (err) {
                    console.log("Cannot toggle (disable) loading ring:" + err.description);
                    return false;
                }
            };

            default: {
                console.log("Uknown toggle state. \"Show\" or \"hide\" expected.");
                return false;
            }


        }
    }


})();
