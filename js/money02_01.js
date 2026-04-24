$(function() {
    "use strict";
// -------------------------------------------------
// main
// -------------------------------------------------

    //set menubar
    var ref = 'money01_01.html';
    var menu_bar = new MenuBar(4,ref);
    var screen_arr = [];
    screen_arr.push('money02_01','money02_04','money02_02','money02_03','money02_09');

    var screen = new SwitchScreen(screen_arr);

    //プリカ画像
    var region = getShopRegion();
    if(region === 'AUS'){
        $('#sel_img_aus').removeAttr('style');
    }else if(region === 'USA'){
        $('#sel_img_us').removeAttr('style');
    }else if(region === 'EUR'){
        $('#sel_img_eu').removeAttr('style');
    }

    $('input[name="card_number"]').attr('placeholder',$('#str_cardnumber').text());
    $('input[name="pass"]').attr('placeholder',$('#str_pass').text());

    if(country==='JP'){
        screen.change('money02_04');
    }else{
        screen.change('money02_01');
    }
    var url = $.url();
    if(url.param('seq')==='checkNum' && $.sessionStorage().getItem('card_num')!==null){
        seqCheckCardNumber($.sessionStorage().getItem('card_num'));
    }

// -------------------------------------------------
// event
// -------------------------------------------------

    //money02_01
    $('input[name="card_number"]').change(function(e){
        if($(this).val() === '' || $(this).val() === $('#str_input').text()){ return false;}
        var add_amount;
        var card_num = $(this).val();
        if($(this).val().match(/[IOZ\-]/i)){
            // 引き換え番号ではI（アイ）、O（オー）、Z（ゼット）、
            // -（ハイフン）は使われない文字
            $.alert($('#dialog_msg_unused_char').text(),$('#dialog_ok').text());
        }else if(!$(this).val().match(/^[a-zA-Z0-9]+$/)){
            //英数字チェック
            $.alert($('#dialog_msg_invalid').text(),$('#dialog_ok').text());
        }else{
            seqCheckCardNumber(card_num);
        }
    });
    //money02_02
    $('#evt_add').buttonAClick().click(function(e){
        e.preventDefault();
        wood.jsExt.playSound('SE_WAVE_OK', 1);
        //ホームボタン、ユーザ操作禁止
        disableUserOperation();
        disableHomeButton();
        //追加上限額チェック
        setCountryInfo();
        var max_cash = $.sessionStorage().getItem('max_cash');
        var max_cash_str = $.sessionStorage().getItem('max_cash_str');
        var adding_cash = priceAdd($.sessionStorage().getItem('balance_raw'),$.sessionStorage().getItem('addbal_pc'));
        var res_price = priceSub(max_cash,adding_cash);
        if(isNegativePrice(res_price)){
            //ホームボタン、ユーザ操作禁止解除
            enableUserOperation();
            enableHomeButton();
            $.alert($('#dialog_msg_maxcash').text().replace('%{price}',max_cash_str),$('#dialog_ok').text());
            historyBack();
        }else{
            if($.sessionStorage().getItem('card_num')!==null){
                var card_num = $.sessionStorage().getItem('card_num');
                var req_obj = {
                    url  : ninjaBase+'ws/my/balance/current/!add_prepaid',
                    type : 'POST',
                    data : {'lang' : lang,
                        'card_number' : card_num
                    },
                    complete : function(){
                        //失敗・成功に関わらず、リクエスト終了後にセッションの残高情報を消去
                        $.sessionStorage().removeItem('balance');
                        $.sessionStorage().removeItem('balance_raw');
                    }
                };
                //ajax
                $.getXml(req_obj)
                    .done(
                    function(xml){
                        //ホームボタン、ユーザ操作禁止解除
                        enableUserOperation();
                        enableHomeButton();

                        var balance = $(xml).find('amount').text();
                        var balance_raw = $(xml).find('raw_value').text();

                        // update balance
                        // FIXME: このメキシコ特殊処理はまとめられるべき
                        // money03_02.js も参照
                        if (country === 'MX') {
                            balance = balance.replace('MX$','MX$ ');
                        }
                        $.sessionStorage().setItem('balance',balance);
                        $.sessionStorage().setItem('balance_raw',balance_raw);

                        var txt = $('#sel_str_amount').html().replace('%{price}',$.sessionStorage().getItem('addbal_pc_str'));
                        $('#sel_str_amount').html(txt);

                        $('.sel_add_amount').text($.sessionStorage().getItem('addbal_pc_str'));
                        var selector = $('#sel_balance_after');
                        getBalance(selector);

                        //buying title
                        if($.sessionStorage().getItem('buying_section')==='bal'){
                            menu_bar.initBackEvt($.sessionStorage().getItem('money_referrer'));
                        }else if(url.param('seq')==='checkNum'){
                            menu_bar.initBackEvt();
                        }else{
                            menu_bar.initBackEvt();
                        }
                        $.sessionStorage().removeItem('card_num');
                        $.sessionStorage().removeItem('addbal_pc_str');
                        $.sessionStorage().removeItem('addbal_pc');
                        screen.change('money02_03');
                    }
                )
                    .fail(
                    function(xml){
                        //ホームボタン、ユーザ操作禁止解除
                        enableUserOperation();
                        enableHomeButton();
                        var error_code = $(xml.responseText).find('code').text();
                        var error_msg = $(xml.responseText).find('message').text();
                        setErrorHandler(prefixNinja, error_code, error_msg, function(){
                            switch(error_code){
                                case '3051': //ECGS_CONNECTION_FAILURE(汎用2)->トップ
                                case '3052': //ECGS_BAD_RESPONSE(汎用2)->トップ
                                case '6591': //ECS_MAX_BALANCE_REACHED(専用2)->TOP01_01
                                case '6542': //ECS_BALANCE_INCREASE_LIMIT_REACHED(専用2)->TOP01_01
                                    location.href = './#top';
                                    break;
                                case '3100': //NEI_ECARD_GUNIT_UNEXPECTED_STATUS(専用2)->番号入力画面 (引換orプリカ残高追加)
                                case '3101': //NEI_ECARD_GUNIT_REDEEMED(専用2)->番号入力画面 (引換orプリカ残高追加)
                                case '3102': //NEI_ECARD_GUNIT_INACTIVE(専用2)->番号入力画面 (引換orプリカ残高追加)
                                case '3103': //NEI_ECARD_GUNIT_REVOKED(専用2)->番号入力画面 (引換orプリカ残高追加)
                                case '3104': //NEI_ECARD_CASH_UNEXPECTED_STATUS (専用2)->番号入力画面 (引換orプリカ残高追加)
                                case '3105': //NEI_ECARD_CASH_REDEEMED (専用2)->番号入力画面 (引換orプリカ残高追加)
                                case '3106': //NEI_ECARD_CASH_INACTIVE (専用2)->番号入力画面 (引換orプリカ残高追加)
                                case '3107': //NEI_ECARD_CASH_REVOKED (専用2)->番号入力画面 (引換orプリカ残高追加)
                                case '3110':  //NEI_ECARD_CASH_CURRENCY_MISMATCH
                                case '3111':  //NEI_ECARD_FOR_NINTENDO_POINT
                                case '3278': //NEI_ECARD_CASH_WRAPPED_ERROR_FOR_C3PO
                                case '3279': //NEI_REDEEM_WRAPPED_ERROR_FOR_C3PO
                                case '6561': //ECS_INVALID_ECARD(専用2)->発生したページ
                                case '6568': //ECS_CURRENCY_MISMATCH(専用2)->発生したページ
                                case '6805': //PAS_CASH_CARD_EXPIRATION_ERROR(専用2)->番号を入力したページ
                                case '6811': //PAS_ACCOUNT_EXPIRED(専用2)->番号を入力したページ
                                case '6812': //PAS_ACCOUNT_REVOKED(専用2)->番号を入力したページ
                                case '6814': //PAS_ACCOUNT_NOT_USABLE(汎用2)->番号を入力したページ
                                case '6813': //PAS_ACCOUNT_NOT_ACTIVATED(専用2)
                                case '6815': //PAS_ACCOUNT_IS_USED_ONCE(専用2)->番号を入力したページ
                                case '6830': //PAS_INVALID_ECARD(汎用2)->番号を入力したページ
                                case '6831': //PAS_ECARD_COUNTRY_CODE(汎用2)->番号を入力したページ
                                case '6834': //PAS_POS_IF_BUSY(専用2)->番号を入力したページ
                                case '6835': //PAS_POS_SERVER_BUSY(専用2)->番号を入力したページ
                                case '6836': //PAS_POS_URL_ERROR(専用2)->番号を入力したページ
                                case '6837': //PAS_POS_AUTH_ERROR(専用2)->番号を入力したページ
                                case '6838': //PAS_POS_SERVER_ERROR(専用2)->番号を入力したページ
                                    if(url.param('seq')==='checkNum'){
                                        location.replace('./#redeem');
                                    }else{
                                        location.replace('money02_01.html');
                                    }
                                    break;
                                case '6810': //PAS_NOT_ENOUGH_MONEY(汎用2)->購入フローの前 (棚 or ソフト情報トップ)
                                    if($.sessionStorage().getItem('buying_section')==='bal'){
                                        location.replace($.sessionStorage().getItem('money_referrer'));
                                    }else if(url.param('seq')==='checkNum'){
                                        location.replace('./#redeem');
                                    }else{
                                        historyBack();
                                    }
                                    break;

                                default:
                                    break;
                            }
                        });
                    }
                );
            }
        }
    });
    //money02_03
    $('#evt_complete').buttonAClick().click(function(e){
        e.preventDefault();
        if($.sessionStorage().getItem('buying_section')==='bal'){
            location.replace($.sessionStorage().getItem('money_referrer'));
        }else{
            historyBack();
        }
    });
// -------------------------------------------------
// sequence
// -------------------------------------------------
    function seqCheckCardNumber(card_num){
        //ユーザ操作無効
        disableUserOperation();
        var req_obj = {
            url  : ninjaBase+'ws/redeemable_card/!check',
            data : {
                card_number: card_num
            },
            type : 'POST'
        };
        //ajax
        $.getXml(req_obj)
            .done(
            function(xml){
                if($(xml).find('cash').size() >0){
                    $.sessionStorage().setItem('card_num',$(xml).find('number').text());
                    $.sessionStorage().setItem('addbal_pc_str',$(xml).find('amount').text());
                    $.sessionStorage().setItem('addbal_pc',$(xml).find('raw_value').text());
                    $('.sel_add_amount').text($.sessionStorage().getItem('addbal_pc_str'));
                    var selector = $('#sel_balance_before');
                    getBalance(selector);
                    screen.change('money02_02');
                    if($.sessionStorage().getItem('buying_section')==='bal'){
                        menu_bar.initBackEvt('money02_01.html');
                    }else if(url.param('seq')==='checkNum'){
                        menu_bar.initBackEvt();
                    }else{
                        menu_bar.initBackEvt('money02_01.html');
                    }
                    //ユーザ操作無効解除
                    enableUserOperation();
                }else if(($(xml).find('contents').size() >0)){
                    $.alert($('#dialog_msg_redeem_num').text(),$('#dialog_ok').text());
                    $.sessionStorage().setItem('redeem_num',$(xml).find('number').text());
                    location.href = './#redeem?seq=checkNum';
                }
            }
        )
            .fail(
            function(xml){
                //ユーザ操作無効解除
                enableUserOperation();
                var error_code = $(xml.responseText).find('code').text();
                var error_msg = $(xml.responseText).find('message').text();
                setErrorHandler(prefixNinja, error_code, error_msg, function(){
                    switch(error_code){
                    case '3051': //ECGS_CONNECTION_FAILURE(汎用2)->トップ
                    case '3052': //ECGS_BAD_RESPONSE(汎用2)->トップ
                    case '3053': //CAS_CONNECTION_FAILURE(汎用2)->トップ
                    case '3054': //CAS_BAD_RESPONSE(汎用2)->トップ
                    case '3150': //NEI_TITLE_DISABLE_DOWNLOAD(汎用2)->トップ
                    case '3021': //NEI_TITLE_NOT_EXIST(専用2)->トップ
                        location.href = './#top';
                        break;
                    case '3100': //NEI_ECARD_GUNIT_UNEXPECTED_STATUS(専用2)->番号入力画面 (引換orプリカ残高追加)
                    case '3101': //NEI_ECARD_GUNIT_REDEEMED(専用2)->番号入力画面 (引換orプリカ残高追加)
                    case '3102': //NEI_ECARD_GUNIT_INACTIVE(専用2)->番号入力画面 (引換orプリカ残高追加)
                    case '3103': //NEI_ECARD_GUNIT_REVOKED(専用2)->番号入力画面 (引換orプリカ残高追加)
                    case '3104':  //NEI_ECARD_CASH_UNEXPECTED_STATUS
                    case '3105':  //NEI_ECARD_CASH_REDEEMED
                    case '3106':  //NEI_ECARD_CASH_INACTIVE
                    case '3107':  //NEI_ECARD_CASH_REVOKED
                    case '3110':  //NEI_ECARD_CASH_CURRENCY_MISMATCH
                    case '3111':  //NEI_ECARD_FOR_NINTENDO_POINT
                    //BTS 1958 追加エラーコード対応
                    case '3112':  //NEI_ECARD_GUNIT_FOR_ITEM_UNEXPECTED_STATUS
                    case '3113':  //NEI_ECARD_GUNIT_FOR_ITEM_REDEEMED
                    case '3114':  //NEI_ECARD_GUNIT_FOR_ITEM_INACTIVE
                    case '3115':  //NEI_ECARD_GUNIT_FOR_ITEM_REVOKED
                    case '3116':  //NEI_ECARD_GUNIT_FOR_ITEM_NOT_EXT_CATALOG
                    case '3117':  //NEI_REDEEM_ITEM_NOT_RELEASE
                    case '3118':  //NEI_REDEEM_ITEM_NOT_EXIST

                    case '6561': //ECS_INVALID_ECARD(専用2)->発生したページ
                    case '6568': //ECS_CURRENCY_MISMATCH(専用2)->発生したページ
                    case '6804': //PAS_GAME_CARD_EXPIRATION_ERROR(専用2)->番号を入力したページ
                    case '6805': //PAS_CASH_CARD_EXPIRATION_ERROR(専用2)->番号を入力したページ
                    case '6810': //PAS_NOT_ENOUGH_MONEY(汎用2)->購入フローの前 (棚 or ソフト情報トップ)
                    case '6811': //PAS_ACCOUNT_EXPIRED(専用2)->番号を入力したページ
                    case '6812': //PAS_ACCOUNT_REVOKED(専用2)->番号を入力したページ
                    case '6813': //PAS_ACCOUNT_NOT_ACTIVATED(専用2)
                    case '6814': //PAS_ACCOUNT_NOT_USABLE(汎用2)->番号を入力したページ
                    case '6815': //PAS_ACCOUNT_IS_USED_ONCE(専用2)->番号を入力したページ
                    case '6830': //PAS_INVALID_ECARD(汎用2)->番号を入力したページ
                    case '6831': //PAS_ECARD_COUNTRY_CODE(汎用2)->番号を入力したページ
                    case '6834': //PAS_POS_IF_BUSY(専用2)->番号を入力したページ
                    case '6835': //PAS_POS_SERVER_BUSY(専用2)->番号を入力したページ
                    case '6836': //PAS_POS_URL_ERROR(専用2)->番号を入力したページ
                    case '6837': //PAS_POS_AUTH_ERROR(専用2)->番号を入力したページ
                    case '6838': //PAS_POS_SERVER_ERROR(専用2)->番号を入力したページ
                        if(url.param('seq')==='checkNum'){
                            location.replace('./#redeem');
                        }
                        break;
                    default:
                        break;
                    }
                });
            }
        );
    }

});


// -------------------------------------------------
// functions
// -------------------------------------------------

//history.back時の処理
window.onpageshow = function(e) {
    getBalance();
    //BGM
    setBGM('setting');
};
