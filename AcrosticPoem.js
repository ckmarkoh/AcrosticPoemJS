"use strict";


var PoemGen = function( ){
  
    var _gram2 = {}  ;
    var _gram1 = []  ;
    var _dict = {} ;
    var _yun = {} ;
    var _length = 5  ;
    var _vword_count = 400  ;
    var _itval_backward = 0  ;
    var _itval_slash = null ;
    var _pinje = {0:[],1:[]} ;
    var _pinje_shun = {' ':0, 'ˊ':0 , 'ˇ':1, 'ˋ':1,'˙':1} ;
    var _print_out = true ;
    var _raw_str =  ['藏','頭','詩','產','生','器'];

    function load_dict_gram(cb){
        if($.isEmptyObject(_dict) || $.isEmptyObject(_gram2) ||$.isEmptyObject(_yun) || _gram1.length ==0){
            $.when(
                $.getJSON("word_dict.json", {
                    format: "json"
                }),
                $.getJSON("gram1.json", {
                    format: "json"
                }),
                $.getJSON("gram2.json", {
                    format: "json"
                }) ).then(function (data0, data1, data2) {
                var dic = data0[0]
                var gram1 = data1[0]
                var gram2 = data2[0]
                for(var key in dic ){
                    _dict[key] = dic[key];
                    var this_yun = dic[key]['yun'] + _pinje_shun[_dict[key]['shun']];
                    _dict[key]['yun']= this_yun ;
                    if(!_yun[_dict[key]['yun']]){
                        _yun[_dict[key]['yun']] = [];
                    }
                    _yun[_dict[key]['yun']].push([key]);
                    _pinje[_pinje_shun[_dict[key]['shun']]].push(key);
                }
                _gram1 = gram1;
                _gram2 = gram2; 
                var result = gen_poem();
                cb(result);
            }); 
        }
        else{
            setTimeout( function(){
                var result = gen_poem();
                cb(result);
            }, 0 );
        }
    }

    function select_words(){
        var result_list = [];
        for(var i =0 ; i< _vword_count; i++){
            var idx = (Math.random()*(_gram1.length-1)).toFixed();
            var temp_item = _gram1[idx];
            result_list.push(temp_item[0]);
        }
        return result_list;
    }
 
    function viterbi_sub_2( pre_ary, this_ary, backward){
        var default_prob = 0.5;
        for(var tw in this_ary){
            var max_prob = 0
            var rand_pw =  null;                
            var all_temp_prob =[] 
            for(var pw in pre_ary){
                //console.log('pw',pw);
                var gram_str = (backward) ? tw+" "+pw : pw+" "+tw
                var this_prob = (gram_str in _gram2) ? _gram2[gram_str] : default_prob;
                //var this_prob = default_prob;
                var temp_prob_val = this_prob * pre_ary[pw]['prob'];
                if( temp_prob_val >= max_prob){
                    rand_pw = pw;
                    max_prob = temp_prob_val;
                }
            }
            this_ary[tw]['prob'] = max_prob;
            this_ary[tw]['word'] = (backward) ? [rand_pw].concat(pre_ary[rand_pw]['word']) :
                pre_ary[rand_pw[0]]['word'].concat( [rand_pw]);
        }
    }


    function viterbi_sub_1(word_start,interval,backward){
        var pre_ary = {};
        pre_ary[word_start.slice(-1)[0]] = {'prob':1.0,'word':word_start.slice(0,word_start.length-1)}; 
        for (var i =0; i < interval; i++){ 
            var word_list = select_words();
            var this_ary = {};
            for(var j in word_list){
                this_ary[word_list[j]] = {'prob':0.0,'word':[]};
            }
            viterbi_sub_2(pre_ary,this_ary,backward);
            pre_ary = this_ary;
        }
        return pre_ary;
    }

    function viterbi( word_start_raw, itval_backward){
        var itval_all = _length - 1;
        var itval_forward = itval_all - itval_backward;
        var word_start = [word_start_raw];
        if( itval_backward >= 1){
            var pre_ary_backward = viterbi_sub_1(word_start,itval_backward,true);
            var max_w = null;
            var max_prob = 0;
            for(var w in pre_ary_backward){ 
                var this_prob = pre_ary_backward[w]['prob'];
                if(this_prob >= max_prob){
                    max_prob = this_prob;
                    max_w = w;
                }
            }
            word_start = [max_w].concat(pre_ary_backward[max_w]['word']);
        }
        var pre_ary_forward = viterbi_sub_1(word_start,itval_forward,false);
        return pre_ary_forward;
    }


    function gen_poem_yun(word_yun, itval_dict){
        var yun_ary = {};
        for(var y in _yun){
            yun_ary[y] = [];
            for(var i =0; i< word_yun.length; i++ ){
                yun_ary[y].push({'prob':0,'word':[]});
            }
        }
        for(var i=0; i<word_yun.length; i++){ 
            var w_start = word_yun[i];
            var pre_ary = viterbi(w_start, itval_dict[i]);
            for(var w in pre_ary){
                var yun = _dict[w]['yun'];
                var last_word_ary = {};
                for(var y in yun_ary){
                    for(var j =0; j< i+1; j++){
                        var temp_y = yun_ary[yun][j]['word'].slice(-1)[0]; 
                        if(temp_y){ 
                            last_word_ary[temp_y] = true; 
                        } 
                    }
                }
                if( (pre_ary[w]['prob'] > yun_ary[yun][i]['prob']) && !(w in last_word_ary)){
                    yun_ary[yun][i]['prob'] = pre_ary[w]['prob'];
                    yun_ary[yun][i]['word'] = pre_ary[w]['word'].concat( [w]);
                }
            }
        }            
        var max_yun_product = 0;
        var max_yun = null;
        for(var yun in yun_ary){ 
            var yun_prob_product = 1;
            for(var i in yun_ary[yun]){
                yun_prob_product *= yun_ary[yun][i]['prob'];
                if(yun_ary[yun][i]['word'].length == 0){
                    continue;
                }
            }
            if(yun_prob_product >= max_yun_product){
                max_yun_product = yun_prob_product;
                max_yun = yun;
            }
        }
        var result_raw = yun_ary[max_yun];
        var result_ary = {}; 
        for (var i in result_raw){
             var rsl = result_raw[i];
            result_ary[i] = rsl['word'];
        }
        return result_ary;
    }


    function gen_poem_nonyun(word_nonyun, itval_dict){ 
        var result_ary = {};
        for (var i in word_nonyun){
            var w_start = word_nonyun[i];
            var pre_ary = viterbi(w_start,itval_dict[i]);
            var max_prob = 0;
            var max_pw = null;
            for(var w in pre_ary){ 
                if(pre_ary[w]['prob'] >= max_prob){
                    max_prob = pre_ary[w]['prob'];
                    max_pw = w;
                }
            }
            result_ary[i] = pre_ary[max_pw]['word'].concat( [max_pw] );
        }
        return result_ary;
    }         

    function gen_poem(){
        var word_yun = [] ;
        var word_nonyun = [];
        var word_idx_list = [];
        var itval_dict_yun = {};
        var itval_dict_nonyun = {};
        var itval_val = [];


        for(var i=0; i< _raw_str.length; i++){
            if (!_itval_slash){
                itval_val.push(_itval_backward);
            }
            else{
                if (_itval_slash == 'lr'){
                    itval_val.push(i%_length);
                }
                else if(_itval_slash == 'rl'){
                    itval_val.push((_length-1)-i%_length);
                }
            }
        }

        for(var i=0 ; i<_raw_str.length; i++){
            var word = _raw_str[i];
            if( i%2!=0 &&  ((_length -1) != itval_val[i] )){
                word_idx_list.push([word_yun.length,'yun']);
                itval_dict_yun[word_yun.length] = itval_val[i];
                word_yun.push(word);
            }
            else{
                word_idx_list.push([word_nonyun.length,'nonyun']);
                itval_dict_nonyun[word_nonyun.length] = itval_val[i];
                word_nonyun.push(word);
            }
        }

        var result_yun = gen_poem_yun(word_yun,itval_dict_yun);
        var result_nonyun = gen_poem_nonyun(word_nonyun,itval_dict_nonyun);
        var result_list = [];
        
        for(var i in word_idx_list){
            var idx = word_idx_list[i][0];
            var typ = word_idx_list[i][1];
            if( typ == 'yun'){
                result_list.push( result_yun[idx].join("") );
            }
            else if( typ == 'nonyun'){
                result_list.push( result_nonyun[idx].join("") );
            }
        }
        return result_list;
    }                

    this.setting = function(args){
        if(args.length){
            var len = parseInt(args.length);
            _length = len;
        }
        if(args.position){
            var pos = parseInt(args.position);
            if(isNaN(pos)){
                _itval_backward = 0;
                _itval_slash = args.position;
            }
            else{
                _itval_backward = pos-1;
                _itval_slash = null;
            }
        }
        if(args.input_str){
            _raw_str = args.input_str;
        }
    } 

    this.run = function(cb){
        load_dict_gram(cb);
    }

    this.reset = function(){
        _raw_str =  ['藏','頭','詩','產','生','器'];
        _length = 5;
        _itval_backward = 0;
        _itval_slash = null; 
    }

};
