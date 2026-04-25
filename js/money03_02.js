var ccifManager;

$(function() {
    "use strict";
// -------------------------------------------------
// main
// -------------------------------------------------

    // ヒストリーバック時、PIN要求されないようにする SEE #12369
    $.sessionStorage().setItem('pin_code_checked_money', 'true');
    //set menubar
    $('input[name="cc_pass"]').attr('placeholder',$('#str_pass').text());
    var ref,menu_bar;
    var url = $.url();
    var back_url = null;

    ccifManager = Wood.CCPM.setUpCCIF($('#card_info_frame'));
    // $.print('geisha sessionStorage: '+ JSON.stringify(window.sessionStorage));

    // 継続課金
    var contract_id = $.sessionStorage().getItem('auto_billing_contract_id');
    var title_id = $.sessionStorage().getItem('auto_billing_title_id');
    var is_auto_billing = !!contract_id;
    var is_update = $.sessionStorage().getItem('credit_card_update') === 'true';
    // 継続課金中のソフトがあるか？ is_auto_billing とは違うので注意
    var is_using_auto_billing;

    if (is_auto_billing || is_update) {
        // 継続課金 または カードの変更 ではヘッダーを変更
        $('#header_common > h1').text($('#str_cc_setting').text());
    }
    if($.sessionStorage().getItem('required_check_under_age') === 'true') {
        // 継続課金のときは未成年ユーザチェック
        $.sessionStorage().removeItem('required_check_under_age');
        routeViaCheckUnderAge(url);
    }
    //戻る(残高不足分)
    if($.sessionStorage().getItem('buying_section')==='card'){
        ref= $.sessionStorage().getItem('money_referrer');
        back_url = ref;
    //購入フロー（残高追加）or 通常フロー
    }else{
        back_url = 'money03_01.html';
        //未成年ユーザチェック承諾後
        if($.url().param('seq')==='underage'){
            location.replace('money04_01.html');
        }
    }

    // 継続課金
    if(is_auto_billing) {
        // 継続課金のときはhistoryBack
        back_url = undefined;
    // カードの変更
    }else if(is_update) {
        back_url = 'set04_01.html';
    }
    menu_bar = new MenuBar(4, back_url);


    var screen_arr = [];
    screen_arr.push('money03_02','money03_03','money03_04','money03_05');

    var screen = new SwitchScreen(screen_arr);
    screen.change();
    var do_replace = false;
    //追加金額取得
    if(url.param('amount')!==undefined){
        var amount = url.param('amount');
        $.sessionStorage().setItem('addbal_cc',amount);
    }
    //クレカ情報登録後
    if($.sessionStorage().getItem('ccard_registration')==='done'){
        if (is_auto_billing && $.sessionStorage().getItem('cc_pass')!==null) {
            gotoAutoBillingPurchase();
        }else if(is_update){
            // クレカ情報の更新
            //ホームボタン、ユーザ操作禁止
            disableUserOperation();
            disableHomeButton();
            $.sessionStorage().setItem('addbal_cc', '0');
            $.when(getTransaction())
                .pipe(function(result) {
                    return getToken(result);
                }
            )
                .then(function(result) {
                    return updateCard(result);
                }
            );
        }else {
            //追加金額表示
            showAddingAmount(screen);
        }
    //パスワードエラー
    }else if($.url().param('seq')==='pass'){
        screen.change('money03_03');
        // 「Wii U GamePadで入力を進めてください。」の画像を表示する SEE #14207
        showRequestDrc(back_url);
    }else{
        //カード情報登録チェック
        var req_obj = {
            url  : ninjaBase+'ws/my/credit_card',
            type : 'GET'
        };

        //ajax
        $.getXml(req_obj)
            .done(
            function(xml){
                var str_card_name ='';
                var card_type = $(xml).find('type_name').text();
                if(card_type==='VISA'){
                    str_card_name = $('#str_card_VISA').text();
                }else if(card_type==='Master'){
                    str_card_name = $('#str_card_master').text();
                }else if(card_type==='JCB'){
                    str_card_name = $('#str_card_JCB').text();
                }
                var card_num = str_card_name + ' ' + $(xml).find('masked_number').text();
                var expire_date = $(xml).find('exp_month').text()+'/20'+$(xml).find('exp_year').text();
                is_using_auto_billing =
                    $(xml).find('credit_card').attr('auto_billing') === 'true';

                $('#sel_card_num').text(card_num);
                $('#sel_expire_date').text(expire_date);
                if (is_auto_billing) {
                    $('#confirm').html($('#str_auto_billing').html());
                }
                screen.change('money03_02');
            }
            )
            .fail(
            function(xml){
                var error_code = $(xml.responseText).find('code').text();
                var error_msg = $(xml.responseText).find('message').text();
                if(error_code == '3180'){
                    //3180 NEI_NO_WALLET
                    $.sessionStorage().setItem('ccard_registration','none');
                    do_replace = true;
                    location.replace('money04_01.html');
                }else{
                    setErrorHandler(prefixNinja, error_code, error_msg, function(){
                        //3055 VCSPAS_CONNECTION_FAILURE(汎用2)->./#top
                        //3056 VCSPAS_BAD_RESPONSE(汎用2)->./#top
                        location.href = './#top';
                    });
                }
            }
        );
    }
    if(!do_replace){
        $('body').removeClass('display_cover');
    }

// -------------------------------------------------
// event
// -------------------------------------------------
    $('#evt_other').buttonAClick().click(function(e){
        e.preventDefault();
        wood.jsExt.playSound('SE_WAVE_OK', 1);
        var msg = is_using_auto_billing ?
            $('#dialog_msg_confirm_auto_billing').text() :
            $('#dialog_msg_confirm').text();
        var res = $.confirm(msg,
            $('#dialog_back').text(),
            $('#dialog_delete').text());

        if(res === true){
            var req_del = {
                          url  : ninjaBase+'ws/my/credit_card/!delete',
                          type : 'POST'
                          };
            //ajax
            $.getXml(req_del)
            .done(
                function(xml){
                    $.alert($('#dialog_msg_complete').text(),$('#dialog_ok').text());
                    $.sessionStorage().setItem('ccard_registration','none');
                    //未成年ユーザチェック
                    routeViaCheckUnderAge(url, function() {
                        location.replace('money04_01.html');
                    });
                }
            )
            .fail(
                function(xml){
                    initCardInfo();
                    //3055 VCSPAS_CONNECTION_FAILURE(汎用2)->./#top
                    //3056 VCSPAS_BAD_RESPONSE(汎用2)->./#top
                    var error_code = $(xml.responseText).find('code').text();
                    var error_msg = $(xml.responseText).find('message').text();
                    setErrorHandler(prefixNinja, error_code, error_msg, function(){
                        location.href = './#top';
                    });
                }
            );
        }
    });
    $('#evt_use').buttonAClick().click(function(e){
        e.preventDefault();
        wood.jsExt.playSound('SE_WAVE_OK', 1);
        screen.change('money03_03');

        // 「Wii U GamePadで入力を進めてください。」の画像を表示する SEE #14207
        showRequestDrc(back_url);
    });

    $('input[name="cc_pass"]').change(function(){
        if($(this).val() === '' || $(this).val() === $('#str_pass').text()){ return false;}
        var pass = $(this).val();
        $.sessionStorage().setItem('cc_pass',pass);
        if (is_auto_billing) {
            gotoAutoBillingPurchase();
        } else {
            //追加金額表示
            showAddingAmount(screen);
        }
    });

    var add_flg = false; //追加ボタンイベント連続押し防止フラグ
    $('#evt_add').buttonAClick().click(function(e){
        e.preventDefault();
        if(add_flg){
            return false;
        }
        add_flg = true;
        wood.jsExt.playSound('SE_WAVE_OK', 1);
        //ホームボタン、ユーザ操作禁止
        disableUserOperation();
        disableHomeButton();
        //未保存クレカ
        if($.sessionStorage().getItem('ccard_registration')==='done'){
            $.when(getTransaction())
                .pipe(function(result) {
                    return getToken(result);
                }
            )
                .then(function(result) {
                    return addBalance(screen, result);
                }
            );
        }else{
            //保存クレカ
            addBalanceWallet(screen);
        }

        var buying_ref;
        //buying title
        if($.sessionStorage().getItem('buying_section')==='bal' || $.sessionStorage().getItem('buying_section')==='card'){
            menu_bar.initBackEvt($.sessionStorage().getItem('money_referrer'));
        }else{
            menu_bar.initBackEvt();
        }
    });
    $('#evt_ok').buttonAClick().click(function(e){
        e.preventDefault();
        if($.sessionStorage().getItem('buying_section')==='bal'||
           $.sessionStorage().getItem('buying_section')==='card'){
            location.replace($.sessionStorage().getItem('money_referrer'));
        }else{
            historyBack();
        }
    });

    function gotoAutoBillingPurchase() {
        var url = 'buy03_01.html?title=' + title_id + '&contract=' + contract_id;
        location.replace(url);
    }

});

// -------------------------------------------------
// functions
// -------------------------------------------------

/**
 * @param result 前のリクエストが成功していたらtrue
 * @return 正常終了: true, 失敗: false
 */
function getTransaction(){
    "use strict";

    var req_pre = {
                  url  : ninjaBase+'ws/my/balance/current/!cc_prepare',
                  type : 'POST',
                  data : {'lang' : lang,
                          'replenish_amount': $.sessionStorage().getItem('addbal_cc') }
                  };
    //ajax
    var result;
    $.getXml(req_pre)
    .done(
        function(xml){
            var request_id = $(xml).find('request_id').text();
            var application_id = $(xml).find('application_id').text();

            $.sessionStorage().setItem('request_id',request_id);
            $.sessionStorage().setItem('application_id',application_id);
            result = true;
        }
    )
    .fail(
        function(xml){
            //ホームボタン禁止解除
            enableHomeButton();
            initCardInfo();
            $.showError(errorCodeRetriable);
            location.href = './#top';
            result = false;
        }
    );
    return result;
}

/**
 * @param result 前のリクエストが成功していたらtrue
 * @return 正常終了: true, 失敗: false
 */
function getToken(result){
    "use strict";

    var d = jQuery.Deferred();
    // 前のリクエストが失敗なら即失敗
    $.print('getTransaction: ' + result);
    if(!result) {
        d.reject(false);
    	return d.promise();
    }

    var ccifPromise = ccifManager.callCCIF({
        'request_id'     : $.sessionStorage().getItem('request_id'),
        'application_id' : $.sessionStorage().getItem('application_id')
    });
    ccifPromise.done(function(error_code){
        if(error_code !== '0') {
            //ホームボタン禁止解除
            enableHomeButton();
            initCardInfo();
            if (!/^96/.test(error_code)) {
                error_code = '9700';
            }
            $.showError(prefixCcif + error_code, $('#error_general_2').text());
            location.href = './#top';
            d.reject(false);
        }else{
            d.resolve(true);
        }
    });
    return d.promise();
}

function addBalance(screen, result){
    "use strict";

    // 前のリクエストが失敗なら即失敗
    $.print('getToken: ' + result);
    if(!result) {
    	return false;
    }

    var pass = $.sessionStorage().getItem('cc_pass') || '';
    var postal_code = $.sessionStorage().getItem('postal_code') || '';
    var req_add = {
        url  : ninjaBase+'ws/my/balance/current/!cc_add',
        type : 'POST',
        timeout: 120000, // ECI入金時のタイムアウトを考慮して2分 SEE #16422
        data : {
            'lang' : lang,
            'request_id'     : $.sessionStorage().getItem('request_id'),
            'application_id' : $.sessionStorage().getItem('application_id'),
            'postal_code'    : postal_code,
            'password'       : pass
        },
        complete : function(){
            //失敗・成功に関わらず、リクエスト終了後にセッションの残高情報を消去
            $.sessionStorage().removeItem('balance');
            $.sessionStorage().removeItem('balance_raw');
        }
     };
    //ajax
    return $.getXml(req_add)
    .done(
        function(xml){
            //ホームボタン禁止解除
            enableHomeButton();
            showAddResult(xml, screen);
        }
    )
    .fail(
        function(xml){
            //ホームボタン禁止解除
            enableHomeButton();
            var error_code = $(xml.responseText).find('code').text();
            var error_msg = $(xml.responseText).find('message').text();
            //7530 VCSPAS_INVALID_PIN パスワードエラー
            //3171 NEI_INVALID_WALLET_PIN_FORMAT
            if(error_code==='3171' || error_code==='7530'){
                $.alert(error_msg,$('#dialog_ok').text());
                location.replace('money04_01.html?seq=pass');
            //6591 ECS_MAX_BALANCE_REACHED(専用2)->TOP01_01
            }else if(error_code==='6591'){
                var max_cash_str = $.sessionStorage().getItem('max_cash_str');
                $.showError(prefixNinja+error_code,$('#dialog_msg_maxcash').text().replace('%{price}',max_cash_str));
                location.href = './#top';
            }else{
                initCardInfo();
                setErrorHandler(prefixNinja, error_code, error_msg, function(){
                    switch(error_code){
                    case '3161': //NEI_VIRTUAL_ACCOUNT_ON_HOLD(専用2)->トップ
                    case '3051': //ECGS_CONNECTION_FAILURE(汎用2)->トップ
                    case '3052': //ECGS_BAD_RESPONSE(汎用2)->トップ
                    case '6542': //ECS_BALANCE_INCREASE_LIMIT_REACHED(専用2)->TOP01_01
                    case '6644': //ECS_ACCOUNT_ON_HOLD(専用2)->トップ
                    case '7509': //ECS_VCSPAS_TECHNICAL_DIFFICULTY(汎用2)->トップ
                    case '7510': //ECS_VCSPAS_SYSTEM_ERROR(汎用2)->トップ
                    case '7535': //ECS_VCSPAS_NO_ACTIVE_TAXES
                        location.href = './#top';
                        break;
                    case '7501': //ECS_VCSPAS_BLACKLISTED_CC(専用2)->Money03のトップ
                    case '7503': //ECS_VCSPAS_INVALID_CARD_TYPE_OR_NUMBER(専用2)->Money03のトップ
                    case '7506': //ECS_VCSPAS_INVALID_CARD_NUMBER(汎用2)->Money03のトップ
                    case '7507': //ECS_VCSPAS_INVALID_CARD_EXPIRATION_DATE(専用2)->Money03のトップ
                    case '7511': //ECS_VCSPAS_CARD_DECLINED(専用2)->Money03のトップ
                    case '7514': //ECS_VCSPAS_CARD_DECLINED_EXPIRED(専用2)->Money03のトップ
                    case '7515': //ECS_VCSPAS_CARD_DECLINED_CODE(汎用2)->Money03のトップ
                    case '7516': //ECS_VCSPAS_CARD_DECLINED_NUMBER(汎用2)->Money03のトップ
                    case '7519': //ECS_VCSPAS_CARD_DECLINED_AVS(専用2)->Money03のトップ
                    case '7532': //ECS_VCSPAS_WALLET_EXISTS(汎用2)->Money03のトップ
                    case '7536': //ECS_VCSPAS_CARD_DECLINED_CVV(専用2)->Money03のトップ
                    case '7537': //ECS_VCSPAS_TOKEN_NOT_FOUND(汎用2)->Money03のトップ
                    case '3170': //NEI_CCIF_TIMEOUT(汎用2)
                        if($.sessionStorage().getItem('buying_section')==='card'){
                            location.replace($.sessionStorage().getItem('money_referrer'));
                        }else{
                            location.replace('money03_01.html');
                        }
                        break;
                    case '7534': //ECS_VCSPAS_INVALID_TAX_LOCATION_ID
                        // US/CAは住所設定画面へ遷移
                        if(country !== 'US' && country !== 'CA') {
                            $.showError(errorCodeRetriable);
                            initPurchaseInfo();
                            historyBack(true);
                            break;
                        }

                        //住所設定画面へ遷移
                        location.replace('legal07_02.html?type=title'+
                            '&title='+ $.sessionStorage().getItem('buying_title_id') +
                            '&buying_section=addr');
                        break;
                    default:
                        enableUserOperation();
                        break;
                    }
                });
            }
        }
    );
}
function addBalanceWallet(screen){
    "use strict";
    var pass = $.sessionStorage().getItem('cc_pass') || '';
    var req_add = {
        url  : ninjaBase+'ws/my/balance/current/!wallet_add',
        type : 'POST',
        data : {
            'lang' : lang,
            'replenish_amount' : $.sessionStorage().getItem('addbal_cc'),
            'password'         : pass
        },
        complete : function(){
            //失敗・成功に関わらず、リクエスト終了後にセッションの残高情報を消去
            $.sessionStorage().removeItem('balance');
            $.sessionStorage().removeItem('balance_raw');
        }
    };
    //ajax
    return $.getXml(req_add)
    .done(
        function(xml){
            //ホームボタン禁止解除
            enableHomeButton();
            showAddResult(xml, screen);
        }
    )
    .fail(
        function(xml){
            //ホームボタン禁止解除
            enableHomeButton();
            var error_code = $(xml.responseText).find('code').text();
            var error_msg = $(xml.responseText).find('message').text();
            //3160 NEI_WALLET_DELETED パスワード3回エラー
            if(error_code==='3160'){
                $.alert(error_msg,$('#dialog_ok').text());
                location.replace('./#top');
                initCardInfo();
            //7530 VCSPAS_INVALID_PIN パスワードエラー
            //3171 NEI_INVALID_WALLET_PIN_FORMAT
            }else if(error_code==='3171' || error_code==='7530'){
                $.alert(error_msg,$('#dialog_ok').text());
                location.replace('money03_02.html?seq=pass');
            //6591 ECS_MAX_BALANCE_REACHED(専用2)->TOP01_01
            }else if(error_code==='6591'){
                var max_cash_str = $.sessionStorage().getItem('max_cash_str');
                $.showError(prefixNinja+ error_code,$('#dialog_msg_maxcash').text().replace('%{price}',max_cash_str));
                location.href = './#top';
            }else{
                initCardInfo();
                setErrorHandler(prefixNinja, error_code, error_msg, function(){
                    switch(error_code){
                    case '3161': //NEI_VIRTUAL_ACCOUNT_ON_HOLD(専用2)->トップ
                    case '3160': //NEI_WALLET_DELETED(専用2)->トップ
                    case '6542': //ECS_BALANCE_INCREASE_LIMIT_REACHED(専用2)->TOP01_01
                    case '6644': //ECS_ACCOUNT_ON_HOLD(専用2)->トップ
                    case '3051': //ECGS_CONNECTION_FAILURE(汎用2)->トップ
                    case '3052': //ECGS_BAD_RESPONSE(汎用2)->トップ
                    case '7510': //ECS_VCSPAS_SYSTEM_ERROR(汎用2)->トップ
                    case '7509': //ECS_VCSPAS_TECHNICAL_DIFFICULTY(汎用2)->トップ
                    case '7535': //ECS_VCSPAS_NO_ACTIVE_TAXES
                        location.href = './#top';
                        break;
                    case '7501': //ECS_VCSPAS_BLACKLISTED_CC(専用2)->Money03のトップ
                    case '7506': //ECS_VCSPAS_INVALID_CARD_NUMBER(汎用2)->Money03のトップ
                    case '7511': //ECS_VCSPAS_CARD_DECLINED(専用2)->Money03のトップ
                    case '7514': //ECS_VCSPAS_CARD_DECLINED_EXPIRED(専用2)->Money03のトップ
                    case '7515': //ECS_VCSPAS_CARD_DECLINED_CODE(汎用2)->Money03のトップ
                    case '7516': //ECS_VCSPAS_CARD_DECLINED_NUMBER(汎用2)->Money03のトップ
                    case '7519': //ECS_VCSPAS_CARD_DECLINED_AVS(専用2)->Money03のトップ
                    case '7536': //ECS_VCSPAS_CARD_DECLINED_CVV(専用2)->Money03のトップ
                        if($.sessionStorage().getItem('buying_section')==='card'){
                            location.replace($.sessionStorage().getItem('money_referrer'));
                        }else{
                            location.replace('money03_01.html');
                        }
                        break;
                    case '7534': //ECS_VCSPAS_INVALID_TAX_LOCATION_ID
                        // US/CAは住所設定画面へ遷移
                        if(country !== 'US' && country !== 'CA') {
                            $.showError(errorCodeRetriable);
                            initPurchaseInfo();
                            historyBack(true);
                            break;
                        }
                        //住所設定画面へ遷移
                        location.replace('legal07_02.html?type=title'+
                            '&title='+ $.sessionStorage().getItem('buying_title_id') +
                            '&buying_section=addr');
                        break;
                    default:
                        enableUserOperation();
                        break;
                    }
                });
            }
        }
    );
}

function updateCard(result){
    "use strict";

    // 前のリクエストが失敗なら即失敗
    $.print('getToken: ' + result);
    if(!result) {
    	return false;
    }

    var pass = $.sessionStorage().getItem('cc_pass') || '';
    var postal_code = $.sessionStorage().getItem('postal_code') || '';

    var req_add = {
        url  : ninjaBase+'ws/my/credit_card',
        type : 'POST',
        data : {
            'lang' : lang,
            'request_id'     : $.sessionStorage().getItem('request_id'),
            'application_id' : $.sessionStorage().getItem('application_id'),
            'postal_code'    : postal_code,
            'password'       : pass
        }
     };
    //ajax
    return $.getXml(req_add)
    .done(
        function(xml){
            //ホームボタン、ユーザ操作禁止解除
            enableHomeButton();
            enableUserOperation();

            initCardInfo();
            $.alert($('#dialog_msg_complete_update').text(),$('#dialog_ok').text());
            historyBack();
        }
    )
    .fail(
        function(xml){
            //ホームボタン、ユーザ操作禁止解除
            enableHomeButton();
            enableUserOperation();

            initCardInfo();
            var error_code = $(xml.responseText).find('code').text();
            var error_msg = $(xml.responseText).find('message').text();

            setErrorHandler(prefixNinja, error_code, error_msg, function(){
                location.replace('set04_01.html');
            });
        }
    );
}
function showAddResult(xml, screen){
    //完了画面へジャンプする
    var tran_id = $(xml).find('transaction_id').text();
    var integrated_account = $(xml).find('integrated_account').text();
    var add_amount = $.sessionStorage().getItem('addbal_cc_str');
    var post_balance = $(xml).find('post_balance').children('amount').text();
    var post_balance_raw = $(xml).find('post_balance').children('raw_value').text();

    var params = {
        'add_amount' : add_amount,
        'post_balance' : post_balance,
        'tran_id' : tran_id,
        'integrated_account': integrated_account,
        '_nsig_amount' : $.sessionStorage().getItem('addbal_cc'), //_NSIG_
        '_nsig_currency' : $(xml).find('currency').text(), //_NSIG_
    }
    if($.sessionStorage().getItem('buying_section')==='bal'||
       $.sessionStorage().getItem('buying_section')==='card'){
        params.referrer = $.sessionStorage().getItem('money_referrer');
    }
    var query = setParamsEncodeCURL(params)

    // FIXME: このメキシコ特殊処理はまとめられるべき
    // money02_01.js も参照
    if (country === 'MX') {
        post_balance = post_balance.replace('MX$','MX$ ');
    }
    $.sessionStorage().setItem('balance', post_balance);
    $.sessionStorage().setItem('balance_raw', post_balance_raw);
    getBalance();
    initCardInfo();

    location.replace('money03_05.html?'+query);
}

function showAddingAmount(screen){
    disableUserOperation();
    //追加金額表示
    var req_obj = {
        url  : ninjaBase+'ws/my/balance/prereplenish_info',
        type : 'GET',
        data : { 'replenish_amount' : $.sessionStorage().getItem('addbal_cc')}
    };
    //ajax
    $.getXml(req_obj)
        .done(
            function(xml){
                var replenish_amount = $(xml).find('replenish_amount').children('amount').text();
                $.sessionStorage().setItem('addbal_cc_str', replenish_amount);
                $('#sel_adding_amount').text(replenish_amount);
                // see #8263 AUSリージョンのみリーガル文言追加
                if(getShopRegion() === 'AUS') { $('#sel_notice_au').show();}

                // 欧州「撤回権」クーリングオフ対応
                if (getShopRegion() === 'EUR') {
                    var agree = $.confirm($('#dialog_msg_withdrawal').text(),
                        $('#dialog_cancel').text(), $('#dialog_agree').text());

                    if (!agree) {
                        var ref = $.sessionStorage().getItem('money_referrer');
                        var url = ref || 'money03_01.html';
                        location.replace(url);
                        return;
                    }
                }
                screen.change('money03_04');
                var card_country_text = $(getShopRegion() === 'AUS'
                    ? '#str_card_country_au'
                    : '#str_card_country'
                ).text();
                $('#card_country').text(card_country_text);
                enableUserOperation();
            }
        )
        .fail(
            function(xml){
                initCardInfo();
                var error_code = $(xml.responseText).find('code').text();
                var error_msg = $(xml.responseText).find('message').text();
                setErrorHandler(prefixNinja, error_code, error_msg, function(){
                    //TODO エラーハンドリング
                    location.href = './#top';
                });
            }
        );
}

//history.back時の処理
window.onpageshow = function(e) {
    getBalance();
    //BGM
    setBGM('setting');
};
