$(function() {
    "use strict";
// -------------------------------------------------
// main
// -------------------------------------------------
    //set menubar
    var menu_bar = new MenuBar(1);

    var inst = new LanguageList();
    inst.requestList();

// -------------------------------------------------
// event
// -------------------------------------------------
    $('#evt_ok').buttonAClick().click(function(e) {
        e.preventDefault();
        wood.jsExt.playSound('SE_WAVE_OK', 1);
        var ans = $.confirm($('#dialog_msg').text(),
                            $('#dialog_cancel').text(),
                            $('#dialog_change').text());
        if(ans){
            //Homeボタン・ユーザ操作無効化
            disableUserOperation();
            disableHomeButton();
            var lang_new = $('input[name="lang"]:checked').val();
            var req_obj_set = {
                url  : ninjaBase + 'ws/my/language',
                type : 'POST',
                data : {'lang' : lang_new }
            };
            //ajax
            $.getXml(req_obj_set)
                .done(
                    function(xml){
                        //BOSSタスク登録チェック
                        var reg_boss_flg = false;
                        var res_task = wiiuBOSS.isRegisteredBossTask();
                        processJsxError(res_task);
                        if(res_task.isRegistered){ reg_boss_flg = true; }
                        if(reg_boss_flg){
                            //変更後の言語でBOSSタスクの再登録
                            var res;
                            criticalAction(function() {
                                res = wiiuBOSS.unregisterBossTask();
                            });
                            processJsxError(res);
                            criticalAction(function() {
                                res = wiiuBOSS.registerBossTask(lang_new);
                            });
                            processJsxError(res);
                        }
                        //Homeボタン無効解除
                        enableHomeButton();
                        if(isWiiU){
                            wiiuBrowser.closeApplication();
                        }else{
                            //ユーザ操作無効解除
                            enableUserOperation();
                            location.href = './#top';
                        }
                    }
                )
                .fail(
                    function(xml){
                        //Homeボタン・ユーザ操作無効解除
                        enableUserOperation();
                        enableHomeButton();
                        var error_code = $(xml.responseText).find('code').text();
                        var error_msg = $(xml.responseText).find('message').text();
                        setErrorHandler(prefixNinja, error_code, error_msg);
                    }
                );
        }
    });
    $('#sel_lang input').buttonAClick().click(function(e) {
        $('#sel_lang li').removeClass('ck_lamp_on').addClass('ck_lamp');
        $('input[name="lang"]').prop('checked', false);
        $(this).prop('checked', true).parent().parent().removeClass('ck_lamp').addClass('ck_lamp_on');
    });
});

// -------------------------------------------------
// functions
// -------------------------------------------------
function LanguageList() {
    "use strict";
    var self = this;
    this.requestList = function(){
        var req_obj_list = {
            url  : samuraiBase + 'ws/'+ country +'/languages',
            type : 'GET',
            data: {'lang':lang}
        };
        //ajax
        $.getXml(req_obj_list)
        .done(
            function(xml){
                $.when(self.renderList(xml)).pipe(function(){
                    self.requestSet();
                });
            }
        )
        .fail(
            function(xml){
                var error_code = $(xml.responseText).find('code').text();
                var error_msg = $(xml.responseText).find('message').text();
                setErrorHandler(prefixSamurai, error_code, error_msg);
            }
        );
    };
    this.renderList = function(xml){
        $(xml).find('language').each(function(){
            var iso_code = $(this).children('iso_code').text();
            var str_lang = $(this).children('name').text();
            //render template
            $('#template_lang').tmpl({
                'param_value'      : iso_code,
                'str_lang'         : str_lang
            }).appendTo('#sel_lang');
        });
    };
    this.requestSet = function(){
        var req_obj_sel = {
            url  : ninjaBase + 'ws/my/language',
            type : 'GET'
        };
        //ajax
        $.getXml(req_obj_sel)
        .done(
            function(xml){
                self.renderSet(xml);
            }
        )
        .fail(
            function(xml){
                var error_code = $(xml.responseText).find('code').text();
                var error_msg = $(xml.responseText).find('message').text();
                setErrorHandler(prefixNinja, error_code, error_msg, function(){});
            }
        );
    };
    this.renderSet = function(xml){
        var obj = $('input[name="lang"][value="'+ $(xml).find('iso_code').text() +'"]');
        $('input[name="lang"]').prop('checked', false);
        obj.prop('checked', true).parent().parent().addClass('ck_lamp_on');
    };
}
//history.back時の処理
window.onpageshow = function(e) {
    if (e.persisted) {
        $('#sel_menu_bar .on').removeClass('on'); // SEE #11973
    }
    getBalance();
    //BGM
    setBGM('setting');
};
