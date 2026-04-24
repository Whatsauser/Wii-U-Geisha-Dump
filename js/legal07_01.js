$(function() {
    "use strict";

// -------------------------------------------------  
// main  
// -------------------------------------------------  
    var url = $.url();
    //set menubar
    var menu_bar;
    menu_bar = new MenuBar(1);

    //ペアレンタルコントロール(残高)
    var res_parental = checkParentalControlForEShop();
    if(!res_parental){
        location.replace('legal01_01.html?seq='+encodeURIComponent(url.attr('file')+'?'+url.attr('query'))+'#eshop');
    }else{
        
        var inst = new TaxLocation();
        inst.request();
    }
// -------------------------------------------------  
// event  
// -------------------------------------------------  

});
// -------------------------------------------------  
// functions  
// -------------------------------------------------  
function TaxLocation(){
    "use strict";
    var self = this;
    
    this.request = function(){
        //tax location
        var req_obj = {
                      url  : ninjaBase + 'ws/my/tax_location',
                      type : 'GET'
        };
        //ajax
        $.getXml(req_obj)
        .done(
            function(xml){
                $.when(self.render(xml)).pipe(function(){
                    self.event();
                });
            }
        )
        .fail(
            function(xml){
                if($(xml.responseText).find('code').text()==='3123'){
                    //NEI_ACCOUNT_HAS_NO_TAX_LOCATION_ID
                    location.replace('legal07_02.html');
                }else if($(xml.responseText).find('code').text()==='3124'){
                    //NEI_INVALID_TAX_LOCATION_ID
                    location.replace('legal07_05.html');
                }else{
                    var error_code = $(xml.responseText).find('code').text();
                    var error_msg = $(xml.responseText).find('message').text();
                    setErrorHandler(prefixNinja, error_code, error_msg, function(){
                        switch(error_code){
                        case '3055': //VCSPAS_CONNECTION_FAILURE(汎用2)->トップ
                        case '3056': //VCSPAS_BAD_RESPONSE(汎用2)->トップ
                            location.href = './#top';
                            break;
                        case '9034': //TODO VCSPAS_INVALID_TAX_LOCATION_ID(汎用2)->US/CAではTax住所の再設定。US/CA以外は購入画面トップ
                            if(country==='CA' || country==='US'){
                                location.replace('legal07_02.html');
                            }else{
                                historyBack();
                            }
                            break;
                        }
                    });
                }
            }
        );
    };
    this.render = function(xml){
        $(xml).find('tax_location').each(function(){
            //parse xml
            var str_zip_code = $(this).children('postal_code').text();
            var str_city_name = $(this).children('city').text();
            var str_county_name = $(this).children('county').text();
            var str_state_name = $(this).children('state').text();
            
            $('body').removeClass('display_cover');
            //render template
            if(country === 'CA'){
                $('#template_ca_tax_location').tmpl({
                    'str_province_name' : str_state_name,
                    'str_province'      : $('#str_province').text()
                }).appendTo('#result_dl');
            }else{
                $('#template_tax_location').tmpl({
                    'str_zip_code'     : str_zip_code,
                    'str_city_name'    : str_city_name,
                    'str_county_name'  : str_county_name,
                    'str_state_name'   : str_state_name,
                    'str_zip'          : $('#str_zip').text(),
                    'str_city'         : $('#str_city').text(),
                    'str_county'       : $('#str_county').text(),
                    'str_state'        : $('#str_state').text()
                }).appendTo('#result_dl');
            }
        });
    };
    this.event = function(){
        $('#evt_modify').click(function(e){
            disableUserOperation();            
        });
        $('#evt_delete_tax_location').click(function(e){
            e.preventDefault();
            wood.jsExt.playSound('SE_WAVE_OK', 1);
            var res = $.confirm($('#dialog_delete_msg').text(),$('#dialog_delete_cancel').text(),$('#dialog_delete_ok').text());
            if(res === true){
                var req_obj = {
                              url  : ninjaBase + 'ws/my/tax_location/!delete',
                              type : 'POST'
                };
                //ajax
                $.getXml(req_obj)
                .done(
                    function(xml){
                        historyBack();
                    }
                )
                .fail(
                    function(xml){
                        // 特別なエラーなし
                        historyBack();
                    }
                );
            }
        });
    };
}
//history.back時の処理
window.onpageshow = function(e) {
    if (e.persisted) {
        $('body').addClass('display_cover');
        location.reload();
    }
    getBalance();
    //BGM
    setBGM('setting');
};
