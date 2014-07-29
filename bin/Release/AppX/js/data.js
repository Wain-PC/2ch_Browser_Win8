(function () {
    "use strict";

    
    var notifications = Windows.UI.Notifications;

    WinJS.Namespace.define("APP", {
        showMessageOnToast: showMessageOnToast,
        showMessageOnPage: showMessageOnPage,
        disposeMessageOnPage: disposeMessageOnPage,
        toggleLoadingRingState: toggleLoadingRingState

    });


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
