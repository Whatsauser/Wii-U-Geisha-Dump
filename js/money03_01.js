$(function() {
    "use strict";
// -------------------------------------------------
// main
// -------------------------------------------------

    //set menubar
    var ref = 'money01_01.html';
    var menu_bar = new MenuBar(4,ref);
});
function initCardInfo(){
    "use strict";
    $.sessionStorage().removeItem('addbal_cc');
    $.sessionStorage().removeItem('ccard_registration');
    $.sessionStorage().removeItem('cc_pass');
    $.sessionStorage().removeItem('postal_code');
    $.sessionStorage().removeItem('request_id');
    $.sessionStorage().removeItem('application_id');
}

//history.back時の処理
window.onpageshow = function(e) {
    getBalance(undefined, false);
    //BGM
    setBGM('setting');
    var url = $.url();

    // 購入フロー（残高不足分）
    // legal01_01 でsessionStorageを参照するので先にsetItemする SEE #12626
    var is_section_card = (url.param('buying_section')==='card');
    if (is_section_card) {
        $.sessionStorage().setItem('buying_section',url.param('buying_section'));
        switch(url.param('type')){
            case('title'):
                $.sessionStorage().setItem('money_referrer','buy01_01.html?type='+url.param('type') +
                    '&title='+url.param('title')+
                    getCouponCodeUrlQuery() +
                    '&buying_section='+url.param('buying_section'));
                break;
            case('aoc'):
                $.sessionStorage().setItem('buying_aoc',url.param('aoc[]'));
                $.sessionStorage().setItem('money_referrer','buy01_01.html?type='+url.param('type') +
                    '&title='+url.param('title')+
                    '&buying_section='+url.param('buying_section')+
                    '&aoc[]='+url.param('aoc[]'));
                break;
            case('ticket'):
                $.sessionStorage().setItem('buying_ticket',url.param('ticket'));
                $.sessionStorage().setItem('money_referrer','buy01_01.html?type='+url.param('type') +
                    '&title='+url.param('title')+
                    '&buying_section='+url.param('buying_section')+
                    '&ticket='+url.param('ticket'));
                break;
            default:
                break;
        }
    }

    var chk_flg = false;
    //未成年ユーザチェック承諾後
    if($.url().param('seq') === 'underage'){
        chk_flg = true;
    }else{
        //カード情報初期化
        initCardInfo();
        //クレカ利用国チェック
        if(!checkCCard()){
            location.replace('./#top');
        }else{
            var seq = encodeURIComponent(url.attr('file')+'?'+url.attr('query'));
            //未成年ユーザチェック
            var res_underage = checkUnderAge();
            if(res_underage == 1){
                $.alert($('#dialog_msg_parental').text(), $('#dialog_ok').text());
                historyBack();
            }else if(res_underage == 2){
                location.replace('legal01_01.html?seq='+seq+'#underage');
            }else{
                // ペアレンタルコントロール(残高)
                // 残高不足ならPIN入力済かを考慮
                // そうでなければPIN要求する  SEE #11355
                var is_shortfall = ($.sessionStorage().getItem('buying_shortfall') !== null);
                var res_parental = is_shortfall
                    ? checkParentalControlForEShop()
                    : !getParentalControlForEShopIsLocked();
                var pin_code_checked = ($.sessionStorage().getItem('pin_code_checked_money') === 'true');
                var require_pin = !pin_code_checked && !res_parental;
                if(require_pin){
                    location.replace('legal01_01.html?seq='+seq+'#money');
                }else{
                    $.sessionStorage().removeItem('pin_code_checked_money');
                    chk_flg = true;
                }
            }
        }
    }
    if(chk_flg){
        //購入フロー（残高不足分）
        if(is_section_card){
            location.replace('money03_02.html?amount='+url.param('amount'));
            //その他フロー
        }else{
            $('body').removeClass('display_cover');
            var balance = $.sessionStorage().getItem('balance_raw');
            var max_cash = $.sessionStorage().getItem('max_cash');
            var str_max_amount = $('#max_amount').html().replace('%{price}',$.sessionStorage().getItem('max_cash_str'));
            $('#sel_replace').html(str_max_amount);
            var req_obj = {
                url  : ninjaBase+'ws/country/'+ country +'/replenish_amounts',
                type : 'GET',
                data : {'lang' : lang}
            };
            //ajax
            $.getXml(req_obj)
                .done(function(xml){
                    $(xml).find('replenish_amount').each(function(){
                        var raw_value = $(this).children('raw_value').text();
                        var btn = $('#template_amount').tmpl({
                            'str_amount'    : $(this).children('amount').text()
                        }).appendTo('#sel_amount').children('a');
                        // 残高超過チェック
                        var adding_cash = priceAdd(balance,raw_value);
                        var res_price = priceSub(max_cash,adding_cash);
                        if(isNegativePrice(res_price)){
                            btn.attr('class', 'btn_not_buy');
                            btn.removeAttr('href');
                        }else{
                            btn.buttonAClick().click(function(e){
                                e.preventDefault();
                                location.replace("money03_02.html?amount="+raw_value);
                            });
                        }
                    });
                })
                .fail(function(xml){
                    var error_code = $(xml.responseText).find('code').text();
                    var error_msg = $(xml.responseText).find('message').text();
                    setErrorHandler(prefixNinja, error_code, error_msg, function(){
                        //3001 NEI_INVALID_PARAMETER(汎用1)
                        //3002 NEI_PARAMETER_REQUIRED(汎用1)
                        //3049 NEI_UNEXPECTED_SERVER_ERROR(汎用1)
                        location.href = './#top';
                    });
                });
        }
    }

};
