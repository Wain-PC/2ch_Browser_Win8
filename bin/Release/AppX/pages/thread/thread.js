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
                    makeAnswersList:makeAnswersList
                });

                _THREAD = THREAD;

                try {

                    var listView = element.querySelector(".itemslist-thread").winControl;
                    listView.itemDataSource = _THREAD.postsList.dataSource;
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
                    _THREAD.makeAnswersList(_THREAD.postsList);

                    WinJS.Utilities.query(".itemspage").listen("click", function (e) {
                        var link = e.target.href;
                        if (link) {
                            e.preventDefault();
                            var linkObject = e.target;
                            // goToPostByLink(linkObject);
                        }
                    });

                }
                catch (err) {
                    APP.showMessageOnPage("Ошибка при создании списка постов треда");

                }
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

        //make a list to show results in
        var postsList = makePostsList(json, boardAbbr);
        console.log("NOW POSTS:" + postsList.length);

        if (_THREAD) {
            var postsNumber = postsList.length;
            var oldPostsNumber = _THREAD.postsList.length;
            if (postsNumber > oldPostsNumber) {
                console.log(postsNumber + ">" + oldPostsNumber);
                for (var i = oldPostsNumber; i < postsNumber; i++) {
                    console.log("Pushing new post #" + i + " to thread");
                    _THREAD.postsList.push(postsList.getAt(i));
                }

                var difference = postsNumber - oldPostsNumber;
                console.log("Difference is: "+difference+" posts");
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
            _THREAD.postsList = postsList;

            _THREAD.makeAnswersList(_THREAD.postsList);

            var listView = _LISTVIEW;
            listView.itemDataSource = _THREAD.postsList.dataSource;
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


    function makeAnswersList(postsList,processFromPost) {

        var outerPost = null, //it's the post containing links to other posts in its text (comment)
        outerPostNumber = null, //number of the outer post
        innerPost = null,//it's the post which has been linked. It should store list of such addresses (answers)
        innerPostNumber = null, //number of the inner post
        linksList = null;
        var i=0, j=0, k=0; //iterators

        if (processFromPost) i = processFromPost;
        for (i; i < postsList.length; i++) {
            outerPost = postsList.getAt(i);
          //  console.log("NOW PROCESSING POST "+outerPost.postNum);
            linksList = outerPost.linksList;

            if (linksList.length==0) {
          //      console.log("LINKS LIST is empty for post: " + outerPost.postNum);
                continue;
            } //STOP RIGHT THERE, CRIMINAL SCUM (if no links to other posts are present, move straight to the next post on the list)
            outerPostNumber = outerPost.postNum;

            //Cycle through the same list (all the posts on the thread)
            for (j = 0; j < postsList.length; j++) {
                innerPost = postsList.getAt(j);
                innerPostNumber = innerPost.postNum;

                for (var k = 0; k < linksList.length; k++) {
                   // console.log("POST:"+outerPostNumber+" IN_POST:"+innerPostNumber+"LINK:"+linksList[k]);
                    if (linksList[k] == innerPostNumber) {
                        //add this link to answers array
                        postsList.getAt(j).answersList.push(outerPostNumber);
                        postsList.getAt(j).answersHTML += ("<a href=\"#\" class=\"" + outerPostNumber + "\">  >>" + outerPostNumber + "</a>");
                       // console.log("POST "+innerPostNumber+": FOUND ANSWER POST "+outerPostNumber );
                    }
                }
            }
        }
    }


    function showPostAnswers(args) {
        console.log("SHOWING POST ANSWER!");
        var post = _THREAD.postsList.getAt(args.detail.itemIndex);
        for (var i = 0; i < post.answersList.length; i++) {
            console.log("POST: " + post.postNum + " Found ANSWER :" + post.answersList[i]);
        }
    }

})();
