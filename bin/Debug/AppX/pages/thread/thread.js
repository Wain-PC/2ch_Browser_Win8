(function () {
    "use strict";

    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var binding = WinJS.Binding;
    var nav = WinJS.Navigation;
    var ui = WinJS.UI;
    var utils = WinJS.Utilities;

    var _boardAbbr = '/b/'; //default board
    var _threadNumber = 0;
    var _THREAD,_LISTVIEW;


    ui.Pages.define("/pages/thread/thread.html", {


        // Эта функция вызывается каждый раз, когда пользователь переходит на данную страницу. Она
        // заполняет элементы страницы данными приложения.
        ready: function (element, options) {
            var boardAbbr = options.boardAbbr;
            _boardAbbr = boardAbbr;

            var threadNumber = options.threadNumber;


            var header = document.querySelector(".pagetitle");
            WinJS.Binding.processAll(header, { 'boardAbbr': boardAbbr + ' - ' + options.threadHeader }, false);

            getPosts(boardAbbr, threadNumber, function (json) {
                //clear the page from previous messages
                APP.disposeMessageOnPage();

                //make a list to show results in
                var postsList = makePostsList(json, boardAbbr);

                WinJS.Namespace.define("THREAD", {
                    postsList: postsList,
                    makeAnswersList: makeAnswersList,
                    getPostIndexByPostNumber: getPostIndexByPostNumber
                });

            //    try {

                    var listView = element.querySelector(".itemslist-thread").winControl;
                    listView.itemDataSource = THREAD.postsList.dataSource;
                    listView.itemTemplate = element.querySelector("#postTemplate");
                    listView.layout = new ui.GridLayout();
                    listView.oniteminvoked = showPostAnswers.bind(this);
                    listView.layout.groupInfo = function () {
                        return {
                            enableCellSpanning: true,
                            cellWidth: 300,
                            cellHeight: 100
                        };
                    }
                    _LISTVIEW = listView;

                    APP.toggleLoadingRingState('hide');

                    //by now the list has finished loading
                    //let's make answers list for each post
                    THREAD.makeAnswersList();

                    WinJS.Utilities.query(".itemspage").listen("click", function (e) {
                        var link = e.target.href;
                        if (link) {
                            e.preventDefault();
                            var linkObject = e.target;
                            // goToPostByLink(linkObject);
                        }
                    });

                //}
                //catch (err) {
                //    APP.showMessageOnPage("Ошибка при создании списка постов треда");
                //}

            });


            document.querySelector(".refresh-thread").addEventListener("click", function (e) {
                console.log("REFRESH THREAD");
                getPosts(boardAbbr, threadNumber, refreshThread);
                //ДОДЕЛАТЬ ХЕНДЛЕР ДЛЯ ОБНОВЛЕНИЯ СТРАНИЦЫ
            });

        }
    });

    function acquireJSONThread(boardAbbr,threadNumber) {

        var url = "http://" + DVACH.url + boardAbbr + 'res/' + threadNumber + '.json';
        console.log("THREAD_URL: "+url);
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

    function getPosts(boardAbbr, threadNumber, callback) {
        APP.disposeMessageOnPage();
        APP.toggleLoadingRingState('show');

        acquireJSONThread(boardAbbr,threadNumber).done(function (responseJSON) {
            var posts = JSON.parse(responseJSON.responseText);
            if (callback)
                callback(posts, boardAbbr);
        },
        function (error) {
            APP.showMessageOnPage("Ошибка при загрузке треда. Возможно, нет доступа к Сети.");
  
        });

    }

    function makePostsList(thread, boardAbbr) {

        function makePostsAnswersList(postComment) { //get links to other posts in each post
            try {
                var postsAnswerList = new Array();

                var parser = new DOMParser();
                var commentDOMElement = parser.parseFromString(postComment,'text/html');
                var postLinks = commentDOMElement.querySelectorAll('a');
                var linkRegexp = /#([0-9]*)/; //need to change that only internal links are processed
                for (var i = 0; i < postLinks.length; i++) {
                    var linkHref = postLinks[i].toString();
                    var matches = linkHref.match(linkRegexp);

                    if (matches) {
                        if (matches[1]) {
                            postsAnswerList.push(matches[1]);
                            postLinks[i].href = "#";
                            postLinks[i].setAttribute('class',matches[1]); //making internal link (to other posts on 2ch)
                        }
                        else console.log("Matches found, but no match #1");

                       // console.log("FOUND MATCH " + matches[1] + " LINKS IN POST " + postComment);
                    }
                    //this is an external link
                    //DO SOMETHING WITH IT!!!
                }
                return postsAnswerList;

            }
            catch (err) {
                console.log("Unable to parse post for links, error: " + err.description);
                return false;
            }

        }

        var postsList = new WinJS.Binding.List();
        var post;
        thread = thread.thread; //get root element

        for (var j = 0; j < thread.length; j++) { //show 4 last posts on each thread (OPPOST+ 3 last replies MAX)
            post = thread[j][0];
            var postImageExists = (function () { return j ? "post" : "post oppost" }());
            var linksList = makePostsAnswersList(toStaticHTML(post.comment));
            postsList.push({
                'isOpPost': (function () { return j ? "post" : "post oppost" }()),
                'threadNumber': post.threadNumber,
                'threadLastHit': post.lasthit,
                'postNum': post.num,
                'postSubject': post.subject,
                'postComment': toStaticHTML(post.comment), //removed toStaticHTML
                'postImageExists': (function () { return post.thumbnail ? 'block' : 'none' }()),
                'postImageThumbnail': (function () { return post.thumbnail ? "http://" + DVACH.url + _boardAbbr + post.thumbnail : '#' }()),
                'postImageSource': (function () { return post.image ? "http://" + DVACH.url + _boardAbbr + post.image : '#' }()),
                'postName': post.name,
                'postTime': post.timestamp,
                'linksList': (function () { return linksList ? linksList : false }()),
                'answersList': new Array(),
                'answersHTML': "" //will be filled later
            });

        }
        return postsList;

    }


    function refreshThread(json,boardAbbr) {

        var listView = document.querySelector(".itemslist-thread").winControl;

        //make a list to show results in
        var postsList = makePostsList(json, boardAbbr);
        console.log("NOW POSTS:" + postsList.length);

        if (THREAD) {
            var postsNumber = postsList.length;
            var oldPostsNumber = THREAD.postsList.length;
            if (postsNumber > oldPostsNumber) {
                console.log(postsNumber + ">" + oldPostsNumber);
                for (var i = oldPostsNumber; i < postsNumber; i++) {
                    console.log("Pushing new post #" + i + " to thread");
                    THREAD.postsList.push(postsList.getAt(i));
                }

                var difference = postsNumber - oldPostsNumber;
                console.log("Difference is: " + difference + " posts");
                THREAD.makeAnswersList(postsNumber - difference);
               // listView.itemDataSource = THREAD.postsList.dataSource;

            if(difference == 1) { APP.showMessageOnToast("1 новое сообщение в треде."); }
            else if (difference < 5) { APP.showMessageOnToast(difference + " новых сообщения в треде."); }
            else { APP.showMessageOnToast(difference + " новых сообщений в треде."); }
            }
            else {
                APP.showMessageOnToast("Нет новых сообщений в треде.");
            }
        }
        else {
            //Create new list
            console.log("Creating new posts list");
            THREAD.postsList = postsList;

            
            listView.itemDataSource = THREAD.postsList.dataSource;
            listView.itemTemplate = document.querySelector("#postTemplate");
            listView.layout = new ui.GridLayout();
            listView.oniteminvoked = showPostAnswers.bind(this);
            listView.layout.groupInfo = function () {
                return {
                    enableCellSpanning: true,
                    cellWidth: 300,
                    cellHeight: 100
                };
            }
        }
        //by now the list has finished loading
        //let's make answers list for each post

        APP.toggleLoadingRingState('hide');
    }


    function makeAnswersList(processFromPost) {

        var post, postIndex;
        var outerPost = null, //it's the post containing links to other posts in its text (comment)
        outerPostNumber = null, //number of the outer post
        linksList = null;
        var i=0, j=0, k=0; //iterators

        if (processFromPost) {
            i = processFromPost;
            console.log("STARTING FROM POST "+i);
        }
        for (i; i < THREAD.postsList.length; i++) {
            outerPost = THREAD.postsList.getAt(i);
            console.log("NOW PROCESSING POST "+outerPost.postNum);
            linksList = outerPost.linksList;

            if (linksList.length==0) {
                console.log("LINKS LIST is empty for post: " + outerPost.postNum);
                continue;
            } //STOP RIGHT THERE, CRIMINAL SCUM (if no links to other posts are present, move straight to the next post on the list)
            outerPostNumber = outerPost.postNum;

            for (var j = 0; j < linksList.length; j++) {
                postIndex = THREAD.getPostIndexByPostNumber(linksList[i]);
                if (postIndex) {
                    THREAD.postsList.getAt(postIndex).answersList.push(linksList[j]);
                    THREAD.postsList.getAt(postIndex).answersHTML += ("<a href=\"#\" class=\"" + linksList[j] + "\">  >>" + linksList[j] + "</a>");
                    THREAD.postsList.notifyMutated(postsList.getAt(postIndex));
                    console.log("POST " + linksList[j] + ": FOUND ANSWER POST " + outerPostNumber);
                    console.log("HTML:" + postsList.getAt(postIndex).answersHTML);
                }
                else {
                    console.log("No such post in thread");
                }

            }
        }
    }


    function showPostAnswers(args) {
        console.log("SHOWING POST ANSWER!");
        var post = THREAD.postsList.getAt(args.detail.itemIndex);
        for (var i = 0; i < post.answersList.length; i++) {
            console.log("POST: " + post.postNum + " Found ANSWER :" + post.answersList[i] + " HTML:" + post.answersHTML);
        }
    }


    function getPostIndexByPostNumber(postNumber) {
        for (var i = 0; i < THREAD.postsList.length; i++) {
            if (THREAD.postsList.getAt(i).postNum == postNumber) {
                return i;
            }
        }
        return null;
    }

})();
