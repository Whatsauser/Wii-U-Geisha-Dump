// jshint debug:true
// jshint devel:true

// CCPM: Credit Card Post Message
// 旧JSや新JSで動くようにしています
(function(exports) {
var Wood = exports.Wood || {};
exports.Wood = Wood;
Wood.CCPM = (function () {
    var isWiiU = (typeof wiiuSystemSetting !== 'undefined');
    var MESSAGE = {
        GO_BACK: 'CCPM_GO_BACK',
        SET_CARD_TYPE: 'CCPM_SET_CARD_TYPE',
        CHECK: 'CCPM_CHECK',
        VALIDATE: 'CCPM_VALIDATE',
        SAVE: 'CCPM_SAVE',
        CALL_CCIF: 'CCPM_CALL_CCIF',
        RETURN_CCIF: 'CCPM_RETURN_CCIF'
    };
    var targetOrigin = '';
    var IFRAME_TIMEOUT = 30000;
    var errorCodeRetriable = 1119001;
    function debug (message) {
        if (isWiiU && typeof wiiuDebug !== 'undefined') {
            wiiuDebug.print(message);
        } else {
            console.log(message);
        }
    }
    function setTargetOrigin (origin) {
        targetOrigin = origin;
    }
    function createMessage(type, payload) {
        return JSON.stringify({
            type: type,
            payload: payload
        });
    }
    function postCCMessage(event, type, payload) {
        event.source.postMessage(createMessage(type, payload), event.origin);
    }

    function showError(code) {
        if (isWiiU) {
            wiiuErrorViewer.openByCode(code);
        } else {
            window.alert(code);
        }
    }

    function getPMPromise($elm) {
        var iframeErrorId;
        // iframeが読み込めない場合はヒストリーバック
        iframeErrorId = setTimeout(function() {
            showError(errorCodeRetriable);
            history.back();
        }, IFRAME_TIMEOUT);
        var frameDeferred = jQuery.Deferred();
        $elm.on('load', function() {
            clearTimeout(iframeErrorId);
            // wrap した postMessage を返す
            function postMessage(message) {
                $elm[0].contentWindow.postMessage(message, targetOrigin);
            }
            frameDeferred.resolve(postMessage);
        });
        return frameDeferred.promise();
    }

    function onMessage(fn) {
        // クロスドメインメッセージ通信
        function receiveMessage(event) {
            var data = JSON.parse(event.data);
            debug(data.type + ", " + data.payload + ", " + event.origin);
            fn(event);
        }
        exports.addEventListener('message', receiveMessage, false);
    }

    function setUpCCIF ($card_info_frame) {
        setTargetOrigin('https://ccweb.wup.shop.nintendo.net');
        var promise = getPMPromise($card_info_frame);
        return {
            // ccifを叩いたPromiseを返す関数を返す
            callCCIF: function (data) {
                var d = jQuery.Deferred();
                promise.done(function(postMessage) {
                    postMessage(createMessage(MESSAGE.CALL_CCIF, data));
                });

                onMessage(function (event) {
                    var data = JSON.parse(event.data);
                    if (data.type === MESSAGE.RETURN_CCIF) {
                        d.resolve(data.payload);
                    }
                });

                return d.promise();
            }
        };
    }

    return {
        isWiiU: isWiiU,
        showError: showError,
        MESSAGE: MESSAGE,
        setTargetOrigin: setTargetOrigin,
        createMessage: createMessage,
        postCCMessage: postCCMessage,
        getPMPromise: getPMPromise,
        onMessage: onMessage,
        setUpCCIF: setUpCCIF
    };
})();
})(window);
