$(function() {
    "use strict";
// -------------------------------------------------
// main
// -------------------------------------------------

    var url = $.url();
    var add_amount = decodeURIComponent(url.param('add_amount'));
    var post_balance = decodeURIComponent(url.param('post_balance'));
    var tran_id = decodeURIComponent(url.param('tran_id'));
    var is_integrated_account = url.param('integrated_account') === 'true';
    var referrer = url.param('referrer');
    //set menubar
    var menu_bar;
    if(referrer !== undefined && referrer !== ''){
        referrer = decodeURIComponent(referrer);
        menu_bar = new MenuBar(4, referrer);
    }else{
        menu_bar = new MenuBar(4);
    }

    $('#sel_replace').html($('#sel_replace').html().replace('%{price}',add_amount));
    $('#sel_add_amount').text(add_amount);
    $('#sel_post_balance').text(post_balance);

// -------------------------------------------------
// event
// -------------------------------------------------
    //明細イベント
    $('#sel_receipt').buttonAClick().click(function(e){
        e.preventDefault();
        if(referrer !== undefined && referrer !== null && referrer !== ''){
            location.href = 'history05_01.html?tran_id='+tran_id+'#buy';
        }else{
            location.href = 'history05_01.html?tran_id='+tran_id+'#add';
        }
    });
    if (is_integrated_account) {
        // 残高統合済みならレシートボタンを隠す
        $('.cc').hide();
    }
    //OK
    $('#evt_ok').buttonAClick().click(function(e){
        e.preventDefault();
        if(referrer !== undefined && referrer !== ''){
            location.replace(referrer);
        }else{
            historyBack();
        }
    });
});
//history.back時の処理
window.onpageshow = function(e) {
    getBalance();
    //BGM
    setBGM('setting');
};
