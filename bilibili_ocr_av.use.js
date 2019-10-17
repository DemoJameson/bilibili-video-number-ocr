// ==UserScript==
// @name         B 站排行榜类视频中 av 编号提取工具
// @namespace    http://www.demojameson.com/bilibili-get-av
// @version      0.4
// @description  通过获得局部视频截图，然后通过 OCR 的方式提取视频编号，生成链接或者在后台打开
// @author       DemoJameson
// @match        *://www.bilibili.com/video/av*
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM_notification
// @grant        GM_getResourceURL
// @require      https://code.jquery.com/jquery-3.2.1.slim.min.js
// @require      https://cdn.jsdelivr.net/gh/naptha/tesseract.js@v1.0.14/dist/tesseract.min.js
// @resource     tesseractCore https://github.com/naptha/tesseract.js-core/raw/master/index.js
// @connect      bilibili.com
// @updateURL    https://openuserjs.org/meta/DemoJameson/B_站排行榜类视频中_av_编号提取工具.meta.js
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // ----------------------------- 配置区域 --- 开始   -----------------------------
    // 截图与识别快捷键设置，默认按 alt+z 选择区域，alt+q 识别，如有需要请自行修改
    var ctrl = false;
    var alt = true;
    var shift = false;
    var selectAreaKey = "z"; // 如果视频编号位置固定，同一类视频只要设置一次就行了。
    var ocrKey = "q";

    // 识别后是否自动在后台打开视频链接
    var openInBackground = true;

    // 识别后是否自动在视频标签后添加链接
    var addLink = true;

    // 识别后是否自动在评论框添加 av 编号与标题
    var addComment = true;
    // ----------------------------- 配置区域 --- 结束 -----------------------------

    // 初始化 OCR 库，2m 的 coreJS 通过油猴预加载，rawgit 很难加载成功……还有个 9m 的 english 数据库得通过网络加载，第一次需要耐心等待
    window.Tesseract = Tesseract.create({
        corePath: GM_getResourceURL('tesseractCore')
    });

    var noHtml5Message = "请使用 HTML5 播放器";
    var notCrossDomainMessage = "因跨域的问题暂时无法截图，需等待视频缓冲完毕后方可截图";
    var downX, downY, upX, upY;
    var clipWidht, clipHeight, offsetX, offsetY;
    var width, height, x, y, scale;
    if (localStorage.ocrAV) {
        restoreArea();
    }

    window.onkeydown = function (e) {
        var code = e.key;
        console.log(code);
        if (code === selectAreaKey && e.ctrlKey === ctrl && e.altKey === alt && e.shiftKey === shift) {
            if (noHtml5Video()) {
                GM_notification(noHtml5Message);
            } else if (disallowVideo()) {
                GM_notification(notCrossDomainMessage);
            } else {
                GM_notification("按住鼠标滑动后松开选定截图区域，检查弹出的图片是否包含视频编号。关掉图片回到视频，然后按下快捷键 alt+q 识别 av 号");
                addMouseListener();
            }
        } else if (code === ocrKey && e.ctrlKey === ctrl && e.altKey === alt && e.shiftKey === shift) {
            if (noHtml5Video()) {
                GM_notification(noHtml5Message);
            } else if (disallowVideo()) {
                GM_notification(notCrossDomainMessage);
            } else if (!width) {
                GM_notification("请先选择视频编号所在的区域，默认快捷键为 alt+z");
            } else {
                ocrImage();
            }
        }
    };

    function noHtml5Video() {
        return null === document.querySelector('video');
    }

    function disallowVideo() {
        var video = document.querySelector('video');
        return !!(video && video.src.indexOf('blob') !== 0);
    }

    function mouseDownListener(e) {
        if (e.button !== 0) return;
        downX = e.offsetX;
        downY = e.offsetY;
        console.log("down x: " + e.offsetX);
        console.log("down y: " + e.offsetY);
    }

    function mouseUpListener(e) {
        if (e.button !== 0) return;
        upX = e.offsetX;
        upY = e.offsetY;
        console.log("up x: " + e.offsetX);
        console.log("up y: " + e.offsetY);

        // 鼠标没有移动则不截图，等待重新选定范围
        if (Math.abs(downX - upX) < 5 || Math.abs(downY - upY) < 5) return;

        computeClip();
        showCanvas();
        removeMouseListener();
    }

    function addMouseListener() {
        console.log("addListener");
        document.addEventListener("mousedown", mouseDownListener);
        document.addEventListener("mouseup", mouseUpListener);
    }

    function removeMouseListener() {
        console.log("removeListener");
        document.removeEventListener("mousedown", mouseDownListener);
        document.removeEventListener("mouseup", mouseUpListener);
    }

    function restoreArea() {
        var ocrAV = JSON.parse(localStorage.ocrAV);
        width = ocrAV.width;
        height = ocrAV.height;
        x = ocrAV.x;
        y = ocrAV.y;
        scale = ocrAV.scale;
    }

    function saveArea() {
        localStorage.ocrAV = JSON.stringify({
            width: width,
            height: height,
            x: x,
            y: y,
            scale: scale
        });
    }

    function computeClip() {
        offsetX = Math.min(downX, upX);
        offsetY = Math.min(downY, upY);

        clipWidht = Math.abs(downX - upX);
        clipHeight = Math.abs(downY - upY);

        var video = document.querySelector('video');
        var videoWidth = video.videoWidth;
        var videoHeight = video.videoHeight;
        var videRatio = videoWidth / videoHeight;
        var windowRation = video.offsetWidth / video.offsetHeight;

        if (windowRation > videRatio) {
            // 两边有黑边
            scale = videoHeight / (video.offsetHeight - video.offsetLeft * 2);
            y = offsetY - video.offsetTop;
            x = offsetX - (video.offsetWidth - videoWidth / scale) / 2;
        } else {
            // 上下有黑边
            scale = videoWidth / (video.offsetWidth - video.offsetLeft * 2);
            x = offsetX - video.offsetLeft;
            y = offsetY - (video.offsetHeight - videoHeight / scale) / 2;
        }

        x = Math.max(0, x);
        y = Math.max(0, y);

        console.log("width:" + video.videoWidth);
        console.log("height:" + video.videoHeight);

        width = clipWidht * scale;
        height = clipHeight * scale;

        saveArea();
    }

    function getClipCanvas() {
        var video = document.querySelector('video');
        var canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, x * scale, y * scale, width, height, 0, 0, width, height);
        return canvas;
    }

    function showCanvas() {
        var canvas = getClipCanvas();
        $(canvas).css({
            top: "50%",
            left: "50%",
            position: "absolute",
            "margin-top": "-" + height / 2 + "px",
            "margin-left": "-" + width / 2 + "px"
        });

        var container = document.querySelector('#canvasContainer');
        if (!container) {
            $('<div id="canvasContainer"></div>').css({
                width: "100%",
                height: "100%",
                background: "rgba(0,0,0,0.8)",
                "z-index": "9999999",
                position: "fixed"
            }).append(canvas).prependTo(document.body).click(function () {
                $(this).hide();
            });
        } else {
            $(container).empty().append(canvas).show();
        }
    }

    var loadingData = false;

    function ocrImage() {
        var canvas = getClipCanvas();
        var title = document.title;
        Tesseract.recognize(canvas, {
            lang: 'eng',
            tessedit_char_whitelist: 'avAV0123456789'
        }).progress(function (p) {
            console.log('progress', p);

            if (p.status === "downloading eng.traineddata.gz" && loadingData === false) {
                GM_notification("首次使用需加载识别数据库，大约 9m 左右，加载进度可通过页面标题得知");
                loadingData = true;
            }

            if (p.status === "downloading eng.traineddata.gz" && loadingData === true) {
                document.title = "OCR 数据库加载进度：" + p.progress.toFixed(2) * 100 + "%";
            } else if (p.status === "recognizing text") {
                document.title = "识别进度 " + p.progress.toFixed(2) * 100 + "%";
            } else {
                document.title = "识别中……";
            }
        }).then(function (result) {
            document.title = title;
            console.log('result', result);
            var videoNumber = result.text.replace(/[^avAV0-9]/g, "").toLowerCase();
            if (/^av\d+$/.test(videoNumber)) {
                GM_notification("视频编号：" + videoNumber + " 提取成功");
                var linkURL = "https://www.bilibili.com/video/" + videoNumber;
                fetchLinkText(linkURL, videoNumber);
                if (openInBackground) GM_openInTab(linkURL, true);
            } else {
                GM_notification("提取失败，请确认所选区域存在视频编号");
            }
        });
    }

    var firstLink = true;

    function appendLink(linkURL, videoNumber, title) {
        title = title || videoNumber;

        // 防止重复识别后重复添加链接
        if (document.querySelector('#' + videoNumber)) return;

        var htmlStr = "";
        if (firstLink) {
            firstLink = false;
            htmlStr = '<li class="tag" style="margin-left: 10px"><a id="' + videoNumber + '" href="' + linkURL + '" target="_blank">' + title + '</a></li>';
        } else {
            htmlStr = '<li class="tag"><a id="' + videoNumber + '" href="' + linkURL + '" target="_blank">' + title + '</a></li>';
        }

        var tempElement = document.createElement('template');
        tempElement.innerHTML = htmlStr;
        document.querySelector('.tag-area').appendChild(tempElement.content.firstChild);
    }

    function appendComment(videoNumber, title) {
        var commentArea = document.querySelector('textarea.ipt-txt');
        if (commentArea) {
            var originalValue = commentArea.value;
            if (originalValue === "") {
                commentArea.value = videoNumber + "\t" + title;
            } else {
                commentArea.value = originalValue + "\n" + videoNumber + "\t" + title;
            }
        }
    }

    function fetchLinkText(linkURL, videoNumber) {
        GM_xmlhttpRequest({
            method: "GET",
            url: linkURL,
            onload: function (response) {
                console.log(response);
                var titleMatch = response.responseText.match(/<title[^>]*>([^<]+)_哔哩哔哩 \(゜-゜\)つロ 干杯~-bilibili<\/title>/);
                var title = "";
                if (titleMatch) {
                    title = titleMatch[1];
                }
                console.log(title);
                if (addLink) appendLink(linkURL, videoNumber, title);
                if (addComment) appendComment(videoNumber, title);
            }
        });
    }
})();