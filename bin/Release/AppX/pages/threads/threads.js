(function () {
    "use strict";

    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var binding = WinJS.Binding;
    var nav = WinJS.Navigation;
    var ui = WinJS.UI;
    var utils = WinJS.Utilities;

    var _boardAbbr = '/b/'; //default board
    var _THREADS;


    ui.Pages.define("/pages/threads/threads.html", {

        // Эта функция вызывается каждый раз, когда пользователь переходит на данную страницу. Она
        // заполняет элементы страницы данными приложения.
        ready: function (element, options) {
            var boardAbbr = options.boardAbbr;
            _boardAbbr = boardAbbr;
            var header = document.querySelector(".pagetitle");
            WinJS.Binding.processAll(header, { 'boardAbbr': boardAbbr + ' - ' + DVACH.getBoardName(boardAbbr) }, false);

            getThreads(boardAbbr, function (json) {
               
                refreshThreads(json);

            });

            document.querySelector(".refresh-threads").addEventListener("click", function (e) {
                getThreads(boardAbbr, refreshThreads);
            });
        } 

    });


    function makeThreadHeader(thread) {
        var maxChars = 50; //max charachters allowed in the header
        var charNum = 50; //number of charachters to trim
        var trimPosition = -1; //trim position can be less than maxChars if there's {br} tag in the text
        var header = thread.threadNumber;
        if (!thread.postSubject) {
            if (!thread.postComment) {
                return header;
            }
            else {
                trimPosition = thread.postComment.indexOf('<br');
                if (((trimPosition + 1) > 0) && ((trimPosition + 1) < maxChars)) {
                    charNum = trimPosition - 3;
                }
                else {
                    trimPosition = thread.postComment.indexOf('. ');
                    if (((trimPosition + 1) > 0) && ((trimPosition + 1) < maxChars)) {
                        charNum = trimPosition - 2;
                    }
                }

                header = thread.postComment.replace(/(<([^>]+)>)/ig, ""); //trim HTML tags
                if (header.length > charNum) { //trim excess length
                    header = header.substr(0, charNum);
                    if (charNum == maxChars) header += "...";
                }
                return header;
            }
        }
        else return thread.postSubject;
    };

    function acquireJSONBoard(boardAbbr) {

        var url = "http://" + DVACH.url + boardAbbr + 'wakaba.json';
        //var url = "http://search.twitter.com/search.json?q=%23Windows8&rpp=5";
        // Call xhr for the URL to get results asynchronously
        return WinJS.xhr(
            {
                url: url,
                responseType: 'json',
                headers: {
                    "If-Modified-Since": "Mon, 27 Mar 1972 00:00:00 GMT"
                }

            });
    }

    function getThreads(boardAbbr, callback) { //Root function getting all the threads on the page. Callback is called when threads list in json is acquired
        //clear the page
        APP.disposeMessageOnPage();
        APP.toggleLoadingRingState('show');

        acquireJSONBoard(boardAbbr).done(function (responseJSON) {

            try {
                var threads = JSON.parse(responseJSON.responseText);
                
                if (callback)
                    callback(threads, boardAbbr);

        }
            catch(err) {
                APP.showMessageOnPage("Ошибка при парсинге страницы. Попробуйте обновить.");
                console.log(err.description);

            }
            },
        function (error) {
            APP.showMessageOnPage("Ошибка при загрузке страницы. Возможно, нет доступа к Сети.");
        });
}


function makeThreadsPostsList(json) {

    var threadsPostsList = new WinJS.Binding.List();
    var threadObject;

    var threads = json.threads;
    var thread;
    var post;
    var threadNumber;
    var threadThumbnail;
    var opPostComment;
    var totalComments;
    var totalImages;
    var lastPosts = new WinJS.Binding.List();
    var i, j;

    for (i = 0; i < threads.length; i++) { //work over each thread
        thread = threads[i];
        post = thread.posts[0][0];
        threadNumber = thread.posts[0][0].num;
        threadThumbnail = "http://" + DVACH.url + _boardAbbr + post.thumbnail;
        opPostComment = toStaticHTML(post.comment);
        totalComments = parseInt(thread.reply_count) + 1;
        totalImages = thread.image_count;


        var numberOfLastPosts = 4; //number of posts (incl. OP-post) to show on the threads page. Now hardcoded to 4 as 1366*768 screens cannot handle more
        if (numberOfLastPosts > thread.posts.length) numberOfLastPosts = thread.posts.length;
        for (j = 0; j < numberOfLastPosts; j++) { //show 4 last posts on each thread (OPPOST+ 3 last replies MAX)
            post = thread.posts[j][0];
            var postImageExists = (function () { return j ? "post" : "post oppost" }());
            lastPosts.push({
                'isOpPost': (function () { return j ? "post" : "post oppost" }()),
                'threadNumber': threadNumber,
                'threadLastHit': post.lasthit,
                'postNum': post.num,
                'postSubject': post.subject,
                'postComment': toStaticHTML(post.comment),
                'postImageExists': (function () { return post.thumbnail ? 'block' : 'none' }()),
                'postImageThumbnail': (function () { return post.thumbnail ? "http://" + DVACH.url + _boardAbbr + post.thumbnail : '#' }()),
                'postImageSource': (function () { return post.image ? "http://" + DVACH.url + _boardAbbr + post.image : '#' }()),
                'postName': post.name,
                'postTime': post.timestamp
            });

        }

        threadObject = {
            'threadNumber': threadNumber,
            'threadThumbnail': threadThumbnail,
            'totalComments': totalComments,
            'totalImages': totalImages,
            'opPostComment': opPostComment,
            'lastPosts': lastPosts
        }

        // threadsPostsList.push(threadObject);
    }

    //return threadsPostsList;
    return lastPosts;
}

function refreshThreads(json) {

    var threadsPostsList = makeThreadsPostsList(json);


    var groupedThreadsPostsList = threadsPostsList.createGrouped(
function groupKeySelector(item) { return parseInt(item.threadLastHit) + parseInt(item.threadNumber); },
function groupDataSelector(item) {
    return {
        "group": item.threadNumber,
        "header": makeThreadHeader(item),
        'lastHit': item.threadLastHit
    };
},
function (item1, item2) {
    return parseInt(item2) - parseInt(item1);

}
);

    //check for COMPLETELY NEW threads or new threads on the page
    //then modify the page accordingly
    if (_THREADS) {

        for (var i = 0; i < threadsPostsList.length; i++) {
            var post = threadsPostsList[i];
            //step 1. Check if there has been the same thread already available.

                //step 1.1. Check if there's already the same post on the list

                //step 1.2. If it's not, we need to add it to the list.
                //However, for list's number consistency, one according element should be removed.
                //In this case, we have to find the oldest post of this thread (BUT NOT OP's !!!)

            //step 2. If there's no such thread, we should add one.
            //However, for keeping thread number constant we should remove one thread just before adding a new one.
                //step 2.1 Remove the thread that's NOT on the new list
                //step 2.2 Add new post to the list.

        }
    }

    else {
        WinJS.Namespace.define("THREADS", {
            threadsPostsList: groupedThreadsPostsList,
            threadsPostsGroupes: groupedThreadsPostsList.groups,
            getOpPostByThreadNumber: getOpPostByThreadNumber,
            getPostsByThreadNumber: getPostsByThreadNumber
        });

        _THREADS = THREADS;
    }

    _THREADS.threadsPostsList = groupedThreadsPostsList;
    _THREADS.threadsPostsGroupes = groupedThreadsPostsList.groups;

    var listView = document.querySelector(".itemslist-threads").winControl;
    listView.itemDataSource = _THREADS.threadsPostsList.dataSource;
    listView.groupDataSource = _THREADS.threadsPostsGroupes.dataSource;
    listView.groupHeaderTemplate = document.querySelector("#headerTemplate");
    listView.itemTemplate = document.querySelector("#postTemplate");
    listView.oniteminvoked = navigateToThread.bind(this);
    listView.layout = new ui.GridLayout();
    listView.layout.groupInfo = function () {
        return {
            enableCellSpanning: true,
            cellWidth: 300,
            cellHeight: 100
        };
    }

    APP.toggleLoadingRingState('hide');
}

function navigateToThread(args) {
    var post = _THREADS.threadsPostsList.getAt(args.detail.itemIndex);
    var opPost = _THREADS.getOpPostByThreadNumber(post.threadNumber);

    WinJS.Navigation.navigate("/pages/thread/thread.html", {'boardAbbr':_boardAbbr, 'threadNumber': post.threadNumber, 'threadHeader':makeThreadHeader(opPost), 'opPost': opPost});

}


function getOpPostByThreadNumber(threadNumber) {
    for (var i = 0; i < _THREADS.threadsPostsList.length; i++) {
        if (_THREADS.threadsPostsList.getAt(i).postNum == threadNumber) {
            return _THREADS.threadsPostsList.getAt(i);
        }
    }
}


function getPostsByThreadNumber(threadNumber) {

    //code here

}

})();
