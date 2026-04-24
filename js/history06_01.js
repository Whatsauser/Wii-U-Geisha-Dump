$(function() {
    "use strict";
// -------------------------------------------------
// main
// -------------------------------------------------

    //set menubar
    var menu_bar = new MenuBar(1);
    var inst = new VoteTitle();
    inst.request();

// -------------------------------------------------
// event
// -------------------------------------------------
    //delete button
    $('#evt_delete').click(function(e){
        e.preventDefault();
        wood.jsExt.playSound('SE_WAVE_OK', 1);
        var res = $.confirm($('#dialog_msg').text(),$('#dialog_cancel').text(),$('#dialog_ok').text());
        if(res === true){
            var req_obj = {
                url  : ninjaBase + 'ws/my/votes/!delete',
                type : 'POST'
            };
            //ajax
            $.getXml(req_obj)
                .done(
                function(){
                    historyBack();
                }
            )
                .fail(
                function(xml){
                    var error_code = $(xml.responseText).find('code').text();
                    var error_msg = $(xml.responseText).find('message').text();
                    setErrorHandler(prefixNinja, error_code, error_msg, function(){});
                }
            );
        }
    });
});

// -------------------------------------------------
// functions
// -------------------------------------------------
function VoteTitle(){
    "use strict";
    var self = this;
    this.page_num = 0;
    this.total_num = 0;
    this.limit = 25;
    this.lock_flg = false;

    this.request = function(offset){
        var req_data;
        if(offset!==undefined){
            req_data = { 'offset' : offset,'limit' : self.limit};
        }else{
            req_data = { 'offset' : 0,'limit' : self.limit};
        }
        var req_obj = {
                      url  : ninjaBase + 'ws/my/votes',
                      type : 'GET',
                      data : req_data
        };
        //ajax
        $.getXml(req_obj,true)
        .done(
            function(xml){
                self.total_num = parseInt($(xml).find('votes').attr('total'),10);
                self.renderPager();
                $.when(self.render(xml)).pipe(function(){
                    self.event();
                    if(self.lock_flg===true){
                        enableUserOperation();
                        self.lock_flg = false;
                    }
                });
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
    this.render = function(xml){

        Wood.Analytics
            .addFromAttr(self.total_num > 0 && 'recohist')
            .sendVirtualPV("VP_Recohist");

        $('#reco_list  li').remove();
        //ページャー
        if(self.total_num===0){
            $('#data_none').show();
            $('#data_exist').hide();
            $('#sel_desc').hide();
            $('#header_common').removeClass('g_belt');
        }else{
            $('#data_exist').show();
            $('#sel_desc').show();
            $('#header_common').addClass('g_belt');
            if(self.lock_flg){$('html,body').animate({ scrollTop: $('html,body').offset().top }, 0);}
            //contents
            $(xml).find('vote').each(function(){
                //parse xml
                var title_id = $(this).children('title').attr('id');
                var url_img = $(this).children('title').children('icon_url').text();
                var str_title = $(this).children('title').children('name').text();
                var q3 = $(this).children('q3').text();
                var url_rating = '';
                if(q3==='1'){
                    url_rating = 'image/history/img_relating_01.png';
                }else if(q3==='2'){
                    url_rating = 'image/history/img_relating_02.png';
                }else if(q3==='3'){
                    url_rating = 'image/history/img_relating_03.png';
                }else if(q3==='4'){
                    url_rating = 'image/history/img_relating_04.png';
                }else if(q3==='5'){
                    url_rating = 'image/history/img_relating_05.png';
                }
                var str_q4;
                var str_q5;
                var q4 = $(this).children('q4').text();
                if(q4==='true'){
                    str_q4 = $('#str_q4_true').text();
                }else{
                    str_q4 = $('#str_q4_false').text();
                }
                var q5 = $(this).children('q5').text();
                if(q5==='true'){
                    str_q5 = $('#str_q5_true').text();
                }else{
                    str_q5 = $('#str_q5_false').text();
                }

                //render template
                $('#template_reco').tmpl({
                    'url_detail' : '#'+title_id,
                    'url_img'    : url_img,
                    'str_title'  : str_title,
                    'str_rating' : $('#str_rating').text()
                }).appendTo('#reco_list');

                //render template
                $('#template_reco_detail').tmpl({
                    'url_rating'    : url_rating,
                    'url_img'       : url_img,
                    'str_title'     : str_title,
                    'id_title'      : title_id,
                    'str_q4'        : str_q4,
                    'str_q5'        : str_q5,
                    'str_detail'    : $('#str_detail').text(),
                    'str_header'    : $('#str_header').text(),
                    'str_close'    : $('#str_close').text()
                }).appendTo('#history06_02');
            });
        }
    };
    this.event = function(){
        lazyload('img.lazy');
        //prev next pagebuttonイベント
        $('.evt_vote_pager_prev, .evt_vote_pager_next, a.evt_vote_pager_num').buttonAClick().click(function(e){
            e.preventDefault();
            var offset = ($(this).data('page_num')-1)*self.limit;
            self.page_num = $(this).data('page_num');
            if($(this).hasClass('evt_vote_pager_num')){
                $('.evt_vote_pager_num').removeClass('btn_006').addClass('btn_002');
                $(this).removeClass('btn_002').addClass('btn_006');
            }else if($(this).hasClass('evt_vote_pager_prev')){
                $(this).parent().removeClass('ps_arrow_l02').addClass('ps_arrow_l03');
            }else if($(this).hasClass('evt_vote_pager_next')){
                $(this).parent().removeClass('ps_arrow_r02').addClass('ps_arrow_r03');
            }
            disableUserOperation();
            self.lock_flg = true;
            self.request(offset);
        });
        //show detail
        $('.evt_show_detail').buttonAClick().click(function(e){
            e.preventDefault();
            self.last_scroll = $('body').scrollTop();
            var show_num = $(this).data('detail');
            $('#history06_01').hide(0,function(){
                $('#history06_02').show();
                $(show_num).show();
            });
            
            var menu =new MenuBar(7);
            var close_evt = function() {
                $('#history06_02').hide();
                $('#history06_02 > div').hide();
                $('#history06_01').show();
                var menu =new MenuBar(1);
                window.scrollTo(0, self.last_scroll);
            };
            $('body').unbind('keydown').buttonB(close_evt);
            $('#top_link_07').buttonAClick().click(function(e){
                e.preventDefault();
                close_evt();
            });
        });
        $('#his06_02_head img').on("error", function(){
            $(this).attr('src','image/placeholder/place_icon_wii_u.png');
        });
    };
    this.renderPager = function(){
        $('.sel_vote_navi li').remove();
        //ページャー
        if(self.total_num > self.limit){
            var total = Math.ceil(self.total_num/self.limit);//ページャー数
            if(total>1){
                var show_navi = 5;
                if(total < show_navi){
                    show_navi = total;
                }
                var current = 1;
                if(self.page_num>1){
                    current = parseInt(self.page_num,10);
                }
                var show_navih = Math.floor(show_navi / 2);
                var start = current - show_navih;
                var end = current + show_navih;
                if(start <= 0){
                    start = 1;
                    end = show_navi;
                }
                if(end > total){
                    start = total - show_navi+1;
                    end = total;
                }
                if((current < 4 && total > 7) || (current < 4 && total === 6)){
                    end++;
                }
                if((current > total-3 && total > 7) || (current > total-3 && total === 6)){
                    start--;
                }
                if(total===7){
                    start =1;
                    end =7;
                }
                var navi_html = '';
                //prev
                if(current > 1){
                    navi_html += '<li class="ps_arrow_l02"><a href="#" class="evt_vote_pager_prev se" data-se-label="SE_WAVE_OK_SUB" data-page_num="'+(current - 1)+'">'+(current - 1)+'</a></li>';
                }else{
                    navi_html += '<li class="ps_arrow_l01"><a>&lt;</a></li>';
                }
                //min表示
                if(current > 3 && total >7){
                    navi_html += '<li><a href="#" class="btn_002 evt_vote_pager_num se" data-se-label="SE_WAVE_OK_SUB" data-page_num="1">1</a></li>';
                    if(current > 4 && total >7){
                        navi_html += '<li class="ps_3point">...</li>';
                    }
                }
                for(var i=start; i<=end; i++){
                    if(i === current){
                        navi_html += '<li><a href="#" class="btn_006 evt_vote_pager_num se" data-se-label="SE_WAVE_OK_SUB" data-page_num="'+i+'">'+i+'</a></li>';
                    }else{
                        navi_html += '<li><a href="#" class="btn_002 evt_vote_pager_num se" data-se-label="SE_WAVE_OK_SUB" data-page_num="'+i+'">'+i+'</a></li>';
                    }
                }

                //max表示
                if(current < total - 2 && total>7 ){
                    if(current < total - 3 && total >7){
                        navi_html += '<li class="ps_3point">...</li>';
                    }
                    navi_html += '<li><a href="#" class="btn_002 evt_vote_pager_num se" data-se-label="SE_WAVE_OK_SUB" data-page_num="'+total+'">'+total+'</a></li>';
                }
                //next
                if(current < total){
                    navi_html += '<li class="ps_arrow_r02"><a href="#" class="evt_vote_pager_next se" data-se-label="SE_WAVE_OK_SUB" data-page_num="'+(current + 1)+'">'+(current + 1)+'</a></li>';
                }else{
                    navi_html += '<li class="ps_arrow_r01"><a>&gt;</a></li>';
                }
                $('.sel_vote_navi').append(navi_html);
            }
        }
    };

}
//history.back時の処理
window.onpageshow = function(e) {
    if (e.persisted) {
        $('body').addClass('display_cover');
        location.reload();
        return;
    }
    getBalance();
    //BGM
    setBGM('setting');
};

