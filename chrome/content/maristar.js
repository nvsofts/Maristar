// common

// Maristar
Array.prototype.sample = function () {
	return this[Math.floor(Math.random() * this.length)];
};
// end

function $(id) { return document.getElementById(id); }
// 文字参照をデコード
function charRef(s) {
	var ele = document.createElement("div");
	ele.innerHTML = s;
	return ele.firstChild.nodeValue;
}
// フォームをシリアライズ
function serializeForm(f) {
	var url = '';
	for (var e = 0; e < f.elements.length; e++) {
		var input = f.elements[e];
		if (input.name && input.value)
			url += (url == '' ? '?' : '&') + input.name + "=" + OAuth.percentEncode(input.value.replace(/\r?\n/g, "\r\n"));
	}
	return url;
}
// OAuth用formに引数を設定(Twitter APIのみ)
function setupOAuthArgs(args) {
	var api_args = $("api_args");
	api_args.innerHTML = "";
	if (args) {
		args = args.split("&");
		for (var i = 0; i < args.length; i++) {
			var v = args[i].split("=");
			var el = document.createElement("input");
			el.type = "hidden";
			el.name = v[0];
			el.value = decodeURIComponent(v[1]);
			api_args.appendChild(el);
		}
	}
}
// クロスドメインJavaScript呼び出し
function loadXDomainScript(url, ele) {
	if (!url) return ele;
	if (ele && ele.parentNode)
		ele.parentNode.removeChild(ele);
	ele = document.createElement("script");
	ele.src = url;
	ele.type = "text/javascript";
	document.body.appendChild(ele);
	return ele;
}
// クロスドメインJavaScript呼び出し(エラー処理+リトライ付き, Twitter APIはOAuth認証)
var xds = {
	load: function(url, callback, onerror, retry, callback_key) {
		loading(true);
		proxy = null;
		for (i = 0; i < api_proxy_list.length; i++) {
			if (url.lastIndexOf(api_proxy_list[i][0], 0) == 0) {
				proxy = api_proxy_list[i];
				break;
			}
		}
		
		xhr = HTTPRequest.httpGetOAuth(url, proxy, accessor, function (xhr, e) {
			if (xhr.status == 200) {
				if (callback) callback(JSON.parse(xhr.responseText));
				loading(false);
			}else if (retry && retry > 1) {
				loading(true);
				// TODO: API切れのときのエラー処理
				setTimeout(function(){ xds.load(url, callback, onerror, retry - 1);
					loading(false);
				}, 1000);
			} else if (onerror) {
				onerror();
			}
			loading(false);
			setTimeout(function() { try { xhr.abort(); } catch(e) {} }, 0);
		}, null);
		
		return xhr;
	},
	abort: function(xhr) {
		if (xhr) {
			xhr.abort();
			loading(false);
		}
	},
	
	load_default: function(url, callback, old, callback_key) {
		this.abort(old);
		return this.load(url, callback, twFail, 3, callback_key);
	},
	load_for_tab: function(url, callback, callback_key) { // タブ切替時に自動abort
		var ifr_tab = this.ifr_tab;
		var fr = [this.load(url,
					function() { callback.apply(this,arguments); try { ifr_tab.remove(fr[0]); } catch(e) {} },
					function() { twFail(); try { ifr_tab.remove(fr[0]); } catch(e) {} },
					3, callback_key)];
		this.ifr_tab.push(fr[0]);
	},
	abort_tab: function() {
		for (var i = 0; i < this.ifr_tab.length; i++)
			this.abort(this.ifr_tab[i])
		this.ifr_tab = [];
	},
	ifr_tab: []
};
// POSTを投げる(Twitter APIはOAuth認証)
var postQueue = [];
function enqueuePost(url, done, err, retry) {
	postQueue.push(arguments);
	if (postQueue.length > 1) // 複数リクエストを同時に投げないようキューイング
		return;
	postNext();
}
function postNext() {
	if (postQueue.length)
		postInIFrame.apply(this, postQueue[0]);
}
var postSeq = 0;
function postInIFrame(url, done, err, retry) {
	loading(true);
	
	proxy = null;
	for (i = 0; i < api_proxy_list.length; i++) {
		if (url.lastIndexOf(api_proxy_list[i][0], 0) == 0) {
			proxy = api_proxy_list[i];
			break;
		}
	}
	
	param = {};
	url_temp = url.split('?');
	if (url_temp.length > 1) {
		url_param = url_temp[1].split('&');
		url_param.forEach(function (v) {
			temp = v.split('=');
			param[temp[0]] = decodeURIComponent(temp[1]);
		});
	}
	
	HTTPRequest.httpPostOAuth(url_temp[0], proxy, accessor, param, function (xhr, e) {
		loading(false);
		done();
		postQueue.shift();
		postNext();
	}, function (xhr, e) {
		loading(false);
		err();
		postQueue.shift();
		postNext();
	});
}
// 要素の位置を取得
function cumulativeOffset(ele) {
	var top = 0, left = 0;
	do {
		top += ele.offsetTop  || 0;
		left += ele.offsetLeft || 0;
		ele = ele.offsetParent;
	} while (ele);
	return [left, top];
}
// スクロール
if (navigator.userAgent.indexOf('iPhone') >= 0)
	window.scrollBy = function(x,y) { scrollTo(x+window.pageXOffset,y+window.pageYOffset) };
var scroll_adjust = 0;
var scroll_duration;
var scroll_timer = null;
function getScrollY() { return window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop; }
function scrollToY(y, total, start) {
	if (scroll_timer) clearTimeout(scroll_timer);
	scroll_timer = null;
	var t = (new Date).getTime();
	start = start || t;
	total = total || y - getScrollY();
	if (start == t) scroll_adjust = 0;
	if (start == t) scroll_duration = Math.min(500, Math.abs(total));
	y += scroll_adjust;
	scroll_adjust = 0;
	if (start+scroll_duration <= t)
		return scrollTo(0, y);
	var pix = Math.ceil(total*(1-Math.cos((t-start)/scroll_duration*Math.PI))/2);
	scrollTo(0, y-total+pix);
	scroll_timer = setTimeout(function(){scrollToY(y, total, start)}, 20);
}
function scrollToDiv(d, top_margin) {
	top_margin = top_margin || 0;
	var top = cumulativeOffset(d)[1];
	var h = d.offsetHeight;
	var sc_top = document.body.scrollTop || document.documentElement.scrollTop;
	var win_h = window.innerHeight || document.documentElement.clientHeight;
	if (top < sc_top+top_margin) scrollToY(top-top_margin);
	if (sc_top+win_h < top+h) scrollToY(top+h-win_h);
}

// 言語リソースをルックアップ
var browser_lang = navigator.browserLanguage || navigator.language || navigator.userLanguage || 'en';
var browser_lang0 = browser_lang.split('-')[0];
if (!langNames[browser_lang] && langNames[browser_lang0]) browser_lang = browser_lang0;
var user_lang = readCookie('user_lang') || browser_lang;
var lang;
for (lang = 0; lang < langList.length; lang++)
	if (langList[lang] == user_lang) break;
function _(key) {
	if (!langResources[key])
		alert("no langResource\n\n"+key);
	else
		key = langResources[key][lang] || key;
	var args = arguments;
	return key.replace(/\$(\d+)/g, function(x,n){ return args[parseInt(n)] });
}

// version check
document.maristar_js_ver = 10;
if (!document.maristar_html_ver || document.maristar_html_ver < document.maristar_js_ver) {
	if (location.href.indexOf('?') < 0) {
		location.href = location.href + '?' + document.maristar_js_ver;
	} else {
		alert(_('An old HTML file is loaded. Please reload it. If the problem is not fixed, please try erasing caches.'));
	}
}

// user-defined CSS
var user_style = readCookie('user_style') || "";
document.write('<style>' + user_style + '</style>');

// APIプロキシ
var api_proxy = readCookie('api_proxy') || '';
var api_proxy_list = [];

function init_api_proxy() {
	temp = api_proxy.split('\n');
	temp.forEach(function (v) {
		add_value = [];
		values = v.split(',');
		if (values.length == 3) {
			add_value[0] = values[0];
			add_value[1] = values[1];
			add_value[2] = values[2];
			api_proxy_list.push(add_value);
		}
	});
}

// memcached
var memcached_server = readCookie('memcached_server') || '';
//var memcached = new Memcached('marisa.j-ynv.net', 11211);

// 隠し設定
var hidden_setting = readCookie('hidden_setting') || '0';

// Maristar用変数

var twitterURL = 'http://twitter.com/';
var twitterAPI = 'http://api.twitter.com/1.1/';
var myname = null;		// 自ユーザ名
var myid = null;		// 自ユーザID
var last_user = null;	// user TLに表示するユーザ名
var last_user_info = null;	// user TLに表示するユーザ情報(TLから切替時のキャッシュ)
// 設定値
var currentCookieVer = 19;
var cookieVer = parseInt(readCookie('ver')) || 0;
var updateInterval = (cookieVer>18) && parseInt(readCookie('update_interval')) || 90;
var pluginstr = (cookieVer>6) && readCookie('tw_plugins') || " regexp.js\nlists.js\nsearch.js\nfollowers.js\nshorten_url.js\nresolve_url.js\nfavstar.js";
if (cookieVer<8) pluginstr+="\ntranslate.js\nscroll.js";
if (cookieVer<9) pluginstr+="\nthumbnail.js";
//if (cookieVer<10) pluginstr=" worldcup-2010.js\n" + pluginstr.substr(1);
if (cookieVer<11) pluginstr = pluginstr.replace(/worldcup-2010\.js[\r\n]+/,'');
if (cookieVer<11) pluginstr+="\ngeomap.js";
if (cookieVer<12 && pluginstr.indexOf('tweet_url_reply.js')<0) pluginstr+="\ntweet_url_reply.js";
//if (cookieVer<13) pluginstr+="\nrelated_results.js";
if (cookieVer<14) pluginstr+="\nembedsrc.js";
if (cookieVer<15) pluginstr = pluginstr.replace(/search2\.js[\r\n]+/,'');
if (cookieVer<16) pluginstr+="\nmute.js";
if (cookieVer<17) pluginstr = pluginstr.replace(/outputz\.js[\r\n]+/,'');
if (cookieVer<17) pluginstr = pluginstr.replace(/related_results\.js[\r\n]+/,'');
if (cookieVer<18) if (pluginstr.indexOf('shortcutkey.js')<0) pluginstr+="\nshortcutkey.js";
if (cookieVer<18) if (pluginstr.indexOf('notify.js')<0) pluginstr+="\nnotify.js";
if (cookieVer<19) if (pluginstr.indexOf('favstar.js')<0) pluginstr+="\nfavstar.js";
pluginstr = pluginstr.substr(1);
var plugins = new Array;
var max_count = Math.min((cookieVer>3) && parseInt(readCookie('max_count')) || 50, 800);
var max_count_u = Math.min(parseInt(readCookie('max_count_u')) || 50, 800);;
var nr_limit = Math.max(max_count*2.5, parseInt(readCookie('limit')) || 500);		// 表示する発言数の上限
var no_since_id = parseInt(readCookie('no_since_id') || "0");		// since_idを使用しない
var no_counter = parseInt(readCookie('no_counter') || "0");			// 発言文字数カウンタを無効化
var no_resize_fst = parseInt(readCookie('no_resize_fst') || "0");	// フィールドの自動リサイズを無効化
var replies_in_tl = parseInt(readCookie('replies_in_tl') || "1");	// フォロー外からのReplyをTLに表示
var display_as_rt = parseInt(readCookie('display_as_rt') || "0");	// Retweetを"RT @〜: …"形式で表示
var reply_to_all = parseInt(readCookie('reply_to_all') || "1");	// 全員に返信
var footer = readCookie('footer') || ""; 							// フッタ文字列
var decr_enter = parseInt(readCookie('decr_enter') || "0");			// Shift/Ctrl+Enterで投稿
var confirm_close = parseInt(readCookie('confirm_close') || "1");			// Tabを閉じるとき確認
var no_geotag = parseInt(readCookie('no_geotag') || "0");			// GeoTaggingを無効化
var use_ssl = parseInt(readCookie('use_ssl') || "1");				// SSLを使用
var show_header_img = parseInt(readCookie('show_header_img') || "1");	// ヘッダ画像表示
if (cookieVer<18) use_ssl = 1;
// TL管理用
var cur_page = 1;				// 現在表示中のページ
var nr_page = 0;				// 次に取得するページ
var nr_page_re = 0;				// 次に取得するページ(reply用)
var max_id;
var get_next_func = getOldTL;	// 次ページ取得関数
var since_id = null;			// TLの最終since_id
var since_id_reply = null;		// Replyの最終since_id
var in_reply_to_user = null;	// 発言の返信先ユーザ
var in_reply_to_status_id = null;// 発言の返信先id
// クロスドメイン通信関連
var seq = (new Date).getTime();
var users_log = [];
var update_ele = null;
var update_ele2 = null;
var reply_ele = null;
var reply_ele2 = null;
var direct_ele = null;
var direct1 = null;
var direct2 = null;
// UI関連
var user_pick1 = null;			// [⇔]で表示するユーザ名1
var user_pick2 = null;			// [⇔]で表示するユーザ名2
var popup_user = null;			// ポップアップメニューが選択されたユーザ名
var popup_id = null;			// ポップアップメニューが選択された発言ID
var popup_ele = null;			// ポップアップメニューが選択された発言ノード
var fav_mode = 0;				// Userタブで 1: fav表示中  2: following表示中  3: followers表示中
var rep_top = 0;				// replyのオーバーレイ位置
var rep_trace_id = null;		// replyのオーバーレイに追加する発言ID
var popup_top = 0;				// ポップアップメニューの表示位置
var min_fst_height = 30;		// 発言欄の最小の高さ
var selected_menu;				// 選択中のタブ
var update_timer = null;
var update_reply_counter = 0;
var update_direct_counter = 0;
var last_post = null;
var last_in_reply_to_user = null;
var last_in_reply_to_status_id = null;
var last_direct_id = null;
var geo = null;
var geowatch = null;
var loading_cnt = 0;
var err_timeout = null;
var update_post_check = false;
var tweet_failed_notified = false;
var tw_config;
var tw_limits = {};
var t_co_maxstr = "http://t.co/********";
var api_resources = ['statuses','friendships','friends','followers','users','search','lists','favorites'];
var first_update = true;

// loading表示のコントロール
function loading(start) {
	loading_cnt += start ? 1 : loading_cnt > 0 ? -1 : 0;
	$('loading').style.display = loading_cnt > 0 ? "block" : "none";
}

//ログイン・自ユーザ名受信
var access_token = readCookie('access_token');
var access_secret = readCookie('access_secret');
var accessor = {consumerKey: 'yrljmPkUQQWYbGpR54uGLQ', consumerSecret: 'zhhzG3hmbRl51MDEH00wLwEn9Lt4amiILIXlMW3Nc0', token: access_token, tokenSecret: access_secret};
if (!access_token || !access_secret) location.href = 'oauth.html';

var re_auth = false;
var check_ssl = false;
function twAuth(a) {
	if (a.errors && a.errors[0]) {
		alert(a.errors[0].message);
		if (a.errors[0].message == "Incorrect signature" || a.errors[0].message.indexOf("Could not authenticate") >= 0)
			logout();
		return;
	}
	if (!myname || !myid || myname != a.screen_name || re_auth) {
		re_auth = false;
		myname = last_user = a.screen_name;
		last_user_info = a;
		myid = a.id;
		writeCookie('access_user', myname+'|'+myid, 3652);
		$("user").innerHTML = last_user;
		update();
	}
	if (!no_geotag && a.geo_enabled && navigator.geolocation) {
		$("option").innerHTML += '<div id="geotag"><a href="javascript:toggleGeoTag()"><img align="left" id="geotag-img" src="images/earth_off.png">'+_('GeoTagging')+' <span id="geotag-st">OFF</span></a><small id="geotag-info"></small></div>';
		setFstHeight(min_fst_height, true);
	}
	callPlugins('auth');
}
function twAuthFallbackSSL() {
	if (check_ssl) return error("Authentication failed.");
	check_ssl = true;
	use_ssl = 1 - use_ssl;
	error("Authentication failed... retrying "+(use_ssl?"with":"without")+" HTTPS...");
	re_auth = true;
	return auth();
}
function twAuthFallback() {
	// verify_credentials API is unavailable?
	xds.load(twitterAPI + "users/show.json?suppress_response_codes=true&screen_name="+myname, twAuth, twAuthFallbackSSL);
}
function auth() {
	if (use_ssl)
		twitterAPI = twitterAPI.replace('http', 'https');
	else
		twitterAPI = twitterAPI.replace('https', 'http');
	var name = readCookie('access_user');
	if (!myname && name) {
		name = name.split('|');
		myname = last_user = name[0];
		myid = name[1];
		$("user").innerHTML = last_user;
		update();
	}
	xds.load_default(twitterAPI + 'help/configuration.json', twConfig);
	xds.load(twitterAPI + "account/verify_credentials.json?suppress_response_codes=true", twAuth, twAuthFallback, 1);
}

function logout(force) {
	if (!force && !confirm(_('Are you sure to logout? You need to re-authenticate Maristar at next launch.')))
		return;
	callPlugins('logout');
	deleteCookie('access_token');
	deleteCookie('access_secret');
	deleteCookie('access_user');
	location.href = 'oauth.html';
}

function error(str, err) {
	if (err && err[0] && err[0].code == 93) {
		if (confirm(_('Cannot access to direct messages. Please re-auth Maristar for DM access.')))
			logout(true);
		return;
	}
	if (err && err.errors && err.errors[0])
		str += _('Twitter API error') + ': ' + err.errors[0].message;
	$("errorc").innerHTML = str;
	$("error").style.display = "block";
	if (err_timeout) clearTimeout(err_timeout);
	err_timeout = error_animate(true);
}
function error_animate(show, t) {
	t = t || new Date();
	var dur = new Date() - t;
	var opacity = Math.min(0.7, dur/300.0);
	if (!show) opacity = Math.max(0, 0.7-opacity);
	$("error").style.opacity = opacity;
	if (show && opacity == 0.7)
		err_timeout = setTimeout(function(){ error_animate(false); }, 5000);
	else if (!show && opacity == 0)
		$("error").style.display = "none";
	else
		err_timeout = setTimeout(function(){ error_animate(show, t); }, 30);
}
function clear_error() {
	if ($("error").style.opacity == 0.7) {
		clearTimeout(err_timeout);
		err_timeout = setTimeout(function(){ error_animate(false); }, 0);
	}
}

function twFail() {
	error('<img style="vertical-align:middle" src="images/whale.png">&nbsp;&nbsp;'+_('API error (Twitter may be over capacity?)'));
}

// enterキーで発言, "r"入力で再投稿, 空欄でTL更新
function press(e) {
	if (e != 1 && (e.keyCode != 13 && e.keyCode != 10 ||
		!decr_enter && (e.ctrlKey || e.shiftKey) || decr_enter && !(e.ctrlKey || e.shiftKey)) )
			return true;
	var st = document.frm.status;
	// Maristar
	if (st.value.indexOf('!!!') == 0) {
		parseCommand(st.value);
		st.value = '';
		return false;
	}
	// end
	if (st.value == '') {
		update();
		return false;
	}
	if (parseInt($("counter").innerHTML,10) < 0) {
		alert(_("This tweet is too long."));
		return false;
	}
	var retry = 0;
	if (st.value == "r" && last_post) {
		retry = 1;
		st.value = last_post;
		in_reply_to_user = last_in_reply_to_user;
		setReplyId(last_in_reply_to_status_id);
	}
	last_post = st.value;
	last_in_reply_to_user = in_reply_to_user;
	last_in_reply_to_status_id = in_reply_to_status_id;
	if (st.value.substr(0,1) == "." || st.value.indexOf("@"+in_reply_to_user) < 0)
		setReplyId(false); // "."で始まるか"@ユーザ名"が含まれていない時はin_reply_to指定無し
	callPlugins("post", st.value);
	st.value += footer;
	st.select();
	var text = st.value;
	var do_post = function(r){
		enqueuePost(twitterAPI + 'statuses/update.json?'+
				'status=' + OAuth.percentEncode(st.value) +
				(geo && geo.coords ?  "&display_coordinates=true&lat=" + geo.coords.latitude +
										"&long=" + geo.coords.longitude : "") +
				(in_reply_to_status_id ? "&in_reply_to_status_id=" + in_reply_to_status_id : ""),
				//function(tw){ if (tw.errors) error('', tw); else resetFrm(); twShow([tw]) },
				function(){ resetFrm(); },
				function(err){ if (err) return error('', err); },
				retry);
	};
	do_post(true);
	in_reply_to_user = in_reply_to_status_id = null;
	return false;
}
// GeoTag
function toggleGeoTag() {
	if (!geowatch) {
		geowatch = navigator.geolocation.watchPosition(function(g){
			geo = g;
			var maplink = typeof(display_map) == 'function';
			$("geotag-info").innerHTML = " : " + (maplink ? '<a href="javascript:display_map([geo.coords.latitude, geo.coords.longitude, geo.coords.accuracy], $(\'geotag-info\'))">' : '') + g.coords.latitude + ", " + g.coords.longitude + " (" + g.coords.accuracy + "m)" + (maplink ? '</a>' : '');
			setFstHeight(null, true);
		});
		$("geotag-img").src = "images/earth.png";
		$("geotag-st").innerHTML = "ON";
		$("geotag-info").innerHTML = " : -";
	} else {
		navigator.geolocation.clearWatch(geowatch);
		geo = geowatch = null;
		$("geotag-img").src = "images/earth_off.png";
		$("geotag-st").innerHTML = "OFF";
		$("geotag-info").innerHTML = "";
		setFstHeight(null, true);
	}
}
// フォームリサイズ
function setFstHeight(h, force) {
	if (!h)
		h = $("fst").value.length ? Math.max($("fst").scrollHeight+2,min_fst_height) : min_fst_height;
	if (no_resize_fst && !force) return;
	if (Math.abs(h - parseInt($("fst").style.height)) < 3 && !force) return;
	var exh = (navigator.userAgent.indexOf("MSIE 8") >= 0 ? 1 : navigator.userAgent.indexOf("MSIE 9") >= 0 ? 1 : 0), opt = $("option").clientHeight;
	$("fst").style.height = h + 'px';
	$("option").style.top = h + 2 + exh*5 + 'px';
	$("menu").style.top = $("counter-div").style.top = h+3+exh*5 + opt + 'px';
	var mh = Math.max($("menu").clientHeight, $("menu2").clientHeight);
	$("control").style.height = h+mh+2+exh*5 + opt + 'px';
	$("tw").style.top = $("tw2").style.top = $("re").style.top = h+mh+3+exh*4 + opt + 'px';
}
if (navigator.userAgent.indexOf('iPhone') < 0)
	window.onresize = function(){ setFstHeight(null, true); }
// 発言文字数カウンタ表示・更新
function updateCount() {
	setFstHeight();
	if (!no_counter) $("counter-div").style.display = "block";
	
	// for calculate length with shorten URL.
	var s = $("fst").value.replace(
			/https?:\/\/[^\/\s]*[\w!#$%&\'()*+,.\/:;=?~-]*[\w#\/+-]/g,
			function(t) {return t_co_maxstr.replace(/^http/, t.substr(0, t.indexOf(':')))});
	$("counter").innerHTML = 140 - footer.length - s.length;
}
// フォームの初期化
function resetFrm() {
	document.frm.reset();
	setReplyId(false);
	if ($("counter-div").style.display == "block") updateCount();
	setFstHeight(min_fst_height);
}
// reply先の設定/解除
function setReplyId(id) {
	in_reply_to_status_id = id;
}
// reply先を設定
function replyTo(user, id, tw_id, direct) {
	in_reply_to_user = user;
	var head = (direct || selected_menu.id == "direct" ? "d " : "@") + user + " ";
	var ele = $(tw_id);
	if (!direct && selected_menu.id != "direct" && reply_to_all && ele) {
		var users = (ele.tw.retweeted_status||ele.tw).text.match(/@\w+/g);
		if (users)
			head = head + (users.uniq().join(" ")+" ").replace(head, '').replace('@'+myname+' ', '');
	}
	if (document.frm.status.value.toLowerCase().indexOf(head.toLowerCase()) !== 0) // 連続押しガード
		document.frm.status.value = head + document.frm.status.value;
	setReplyId(id);
	document.frm.status.select();
}
// reply先を表示
function dispReply(user, id, ele, cascade) {
	user_pick1 = user;
	var e = !cascade && (window.event || arguments.callee.caller.arguments[0]);
	var shiftkey = e && (e.shiftKey || e.modifiers & 4);
	var td = $((selected_menu.id == "TL" ? "tw" : selected_menu.id == "reply" ? "re" : "tw2c") + "-" + id);
	if (td && td.style.display == "none") td = null;
	var rd = $('reps-' + id);
	// 通常　　  → 反転表示 (rdあり) or オーバーレイ表示
	// shiftキー → 反転表示 (td優先) or オーバーレイ表示(td/rdなし)
	var d = shiftkey ? td || rd : rd || td;
	if (!shiftkey && !rd || shiftkey && !d || cascade) {
		// オーバーレイ表示
		var ele_top = cumulativeOffset(ele)[1] + 20;
		if (ele.parentNode.parentNode.id == "reps" || ele.parentNode.parentNode.parentNode.id == "reps" || cascade)
			rep_trace_id = id;
		else
			rep_top = ele_top;
		d = d || $("tw-" + id) || $("re-" + id) || $("tw2c-" + id);
		if (d && d.tw) {
			dispReply2(d.tw);
			return;
		}
		if (cascade) return;
		reply_ele = xds.load_default(twitterAPI + 'statuses/show/'+id+'.json?include_entities=true&suppress_response_codes=true', dispReply2, reply_ele);
		return;
	}
	// 反転表示
	if (d.parentNode.id != 'reps')
		closeRep();
	scrollToDiv(d);
	d.className += ' emp';
	setTimeout(function(){d.className = d.className.replace(' emp','')}, 2000);
}
// reply先をoverlay表示 (Timelineに無い場合)
function dispReply2(tw) {
	if (tw.errors) return error('', tw);
	var id = tw.id_str || tw.id;
	if ($('rep').style.display == 'block' && $('reps-'+id)) // already displayed
		return;
	var el = document.createElement("div");
	el.id = 'reps-'+id;
	el.innerHTML = makeHTML(tw, false, 'reps');
	el.tw = tw;
	callPlugins("newMessageElement", el, tw, 'reps');
	if (!rep_trace_id || id != rep_trace_id) {
		$('reps').innerHTML = '';
		$('rep').style.top = rep_top + 'px';
	} else
		$('reps').appendChild(document.createElement('hr'));
	$('reps').appendChild(el);
	$('rep').style.display = "block";
	scrollToDiv($('rep'));
	user_pick2 = tw.user.screen_name;
	var in_reply_to = tw.in_reply_to_status_id_str || tw.in_reply_to_status_id;
	if (in_reply_to) {
		var d = $("tw-" + in_reply_to) || $("re-" + in_reply_to) || $("tw2c-" + in_reply_to);
		if (d)
			dispReply(tw.user.screen_name, in_reply_to, $('reps') /* この引数は使われない */, true);
	}
}
// replyのoverlay表示を閉じる
function closeRep() {
	callPlugins('closeRep');
	$('rep').style.display = 'none';
	$('reps').innerHTML = '';
	rep_trace_id = null;
}
// replyからユーザ間のタイムラインを取得
function pickup2() {
	if (user_pick1 && user_pick2)
		switchUser(user_pick1 + "," + user_pick2);
}
// ポップアップメニューの初期化
function popup_init() {
	var popup_id_list = ['popup_link_user', 'popup_link_status', 'popup_status_delete',
						'popup_status_retweet', 'popup_status_quote',
						'upopup_user_block', 'upopup_user_unblock', 'upopup_user_spam'];
	for (var x = 0; x < popup_id_list.length; x++)
		$(popup_id_list[x]).innerHTML = _($(popup_id_list[x]).innerHTML);
}
// ポップアップメニューを表示
function popup_menu(user, id, ele) {
	popup_user = user;
	popup_id = id;
	popup_ele = ele.parentNode.parentNode;
	callPlugins("popup", $('popup'), user, id, ele);
	$('popup_link_user').href = twitterURL + user;
	$('popup_link_status').href = twitterURL + user + '/statuses/' + id;
	$('popup_status_delete').style.display = (selected_menu.id == "direct" || popup_ele.tw.user.screen_name == myname ? "block" : "none");
	$('popup_status_retweet').style.display = (selected_menu.id != "direct" ? "block" : "none");
	$('popup_status_quote').style.display = (selected_menu.id != "direct" ? "block" : "none");
	$('popup_status_copy').style.display = (hidden_setting == '1') ? "block" : "none";
	$('popup').style.display = "block";
	var pos = cumulativeOffset(ele);
	$('popup').style.left = pos[0] <  $('popup').offsetWidth - ele.offsetWidth ? 0 : pos[0] - $('popup').offsetWidth + ele.offsetWidth + 'px';
	popup_top = pos[1] + 20;
	$('popup').style.top = popup_top + 'px';
	$('popup_hide').style.height = Math.max(document.body.scrollHeight, $("tw").offsetHeight+$("control").offsetHeight) + 'px';
	$('popup_hide').style.display = "block";
}
// ポップアップメニューを非表示
function popup_hide() {
	callPlugins("popup_hide");
	$('popup').style.display = 'none';
	$('userinfo_popup').style.display = 'none';
	$('popup_hide').style.display = 'none';
	popup_user = popup_id = popup_ele = null;
}
// ユーザ情報のポップアップメニューを表示
function userinfo_popup_menu(user, id, ele) {
	popup_user = user;
	popup_id = id;
	callPlugins("userinfo_popup", $('userinfo_popup'), user, id, ele);
	$('userinfo_popup').style.display = "block";
	var pos = cumulativeOffset(ele);
	$('userinfo_popup').style.left = pos[0] <  $('userinfo_popup').offsetWidth - ele.offsetWidth ? 0 : pos[0] - $('userinfo_popup').offsetWidth + ele.offsetWidth + 'px';
	$('userinfo_popup').style.top = pos[1] + 20 + 'px';
	$('popup_hide').style.height = Math.max(document.body.scrollHeight, $("tw").offsetHeight+$("control").offsetHeight) + 'px';
	$('popup_hide').style.display = "block";
}
// 発言のReTweet
function retweetStatus(id, ele) {
	id = id || popup_id;
	ele = ele || popup_ele;
	if (!id) return false;
	if ($('lock-' + ele.id)) {
		error(_("This tweet is protected."));
		return false;
	}
	if (!confirm(_("Retweet to your followers?"))) return false;
	var target_ele = ele;
	enqueuePost(twitterAPI + 'statuses/retweet/' + id + '.json',
		function(){
			var img = document.createElement("img");
			img.src = "images/rt.png";
			target_ele.insertBefore(img, target_ele.childNodes[target_ele.childNodes.length-1]);
		});
	return false;
}
// 発言をRT付きで引用
function quoteStatus(id, user, ele) {
	id = id || popup_id;
	user = user || popup_user;
	ele = ele || popup_ele;
	if (!id) return false;
	if ($('lock-' + ele.id) && !confirm(_("This tweet is protected; Are you sure to retweet?"))) return false;
	var tw = !display_as_rt && ele.tw.retweeted_status || ele.tw;
	$('fst').value = "RT @"+user+": " + charRef(tw.text);
	$('fst').focus(); $('fst').select();
	return false;
}
// 発言の削除
function deleteStatus(id) {
	id = id || popup_ele.tw.id_str || popup_ele.tw.id;
	if (!id) return false;
	if (!confirm(_('Are you sure to delete this tweet?'))) return false;
	for (var i = 0; i < 3; i++) {
		var target = $(['tw-','re-','tw2c-'][i]+id);
		if (target) target.className += " deleted";
	}
	if (selected_menu.id == 'direct')
		enqueuePost(twitterAPI + 'direct_messages/destroy.json?id=' + id, function(){}, function(){});
	else
		enqueuePost(twitterAPI + 'statuses/destroy/' + id + '.json', function(){}, function(){});
	return false;
}
// 最新タイムラインを取得
function dec_id(id_str) {
	id_str = ('' + id_str).split('');
	var i = id_str.length - 1;
	while (id_str[i] == '0' && i) {
		id_str[i--] = '9';
	}
	id_str[i] = ''+(id_str[i]-1);
	return id_str.join('');
}
function update() {
	if (!myname) return auth();
	callPlugins("update");
	xds.load(twitterAPI + 'statuses/home_timeline.json' +
						'?count=' + (since_id ? 800 : max_count) +
						'&include_entities=true&suppress_response_codes=true'
						+ (!no_since_id && since_id ? '&since_id='+dec_id(since_id) : ''),
			twShow, function(){
				if (first_update)
					error(_('Cannot get TL. Please try $1logout of Twitter web site$2.', '<a href="'+twitterURL+'logout" onclick="return link(this);" target="twitter">', '</a>'));
				else
					twFail();
			}, 3);
	resetUpdateTimer();
}
function resetUpdateTimer() {
	if (update_timer) clearInterval(update_timer);
	update_timer = setInterval(update, Math.max(parseInt(updateInterval||5)*1000, 5000));
}
// 外部リンクを開く際のフック
function link(a) { return true; }
// tweetのHTML表現を生成
function d2(dig) { return (dig>9?"":"0") + dig }
function dateFmt(d) {
	d = new Date(typeof(d)=='string' && document.all ? d.replace('+','GMT+') : d);
	return (d.getMonth()+1) + "/" + d.getDate() + " " + d.getHours() + ":" + d2(d.getMinutes()) + ":" + d2(d.getSeconds());
}
function insertPDF(str) {
	var k = 0;
	for (var i = 0; i < str.length; i++) {
		if (str[i] == "\u202A" || str[i] == "\u202B" || str[i] == "\u202D" || str[i] == "\u202E")
			k++;
		else if (str[i] == "\u202C" && i > 0)
			k--;
	}
	while (k--)
		str += "\u202C"
	return str;
}
function makeHTML(tw, no_name, pid, userdesc) {
	var rt = tw.retweeted_status;
	var rs = tw.retweeted_status || tw;
	var rt_mode = !!(display_as_rt || userdesc);
	var t = rt_mode ? tw : rs;
	var text = t.text;
	var un = t.user.screen_name;
	if (display_as_rt)
		text = rt && rt.user ? "RT @" + rt.user.screen_name + ":" + rt.text : tw.text;
	if (userdesc)
		text = tw.user.description || '';
	var id = tw.id_str || tw.id;
	var id2 = t.id_str || t.id;
	var eid = pid+'-'+id;
	var in_reply_to = t.in_reply_to_status_id_str || t.in_reply_to_status_id;
	var expanded_urls = {};
	if (tw.entities && tw.entities.urls)
		Array.prototype.concat.apply(tw.entities.urls, tw.entities.media || []).map(function(_){
			if (_.url && _.expanded_url) expanded_urls[_.url] = _.expanded_url;
		});
	return /*fav*/ (t.d_dir ? '' : '<img alt="☆" class="fav" src="images/icon_star_'+(!rt&&rs.favorited?'full':'empty')+'.gif" ' +
			'onClick="fav(this,\'' + id + '\')"' + (pid ? ' id="fav-'+eid+'"' : '') + '>')+
		 (!no_name || (!display_as_rt && rt) ?
			//ユーザアイコン
			'<img class="uicon" src="' + t.user.profile_image_url + '" title="' + (t.user.description ? t.user.description.replace(/\"/g,'&quot;') :'') + '" onClick="switchUserTL(this.parentNode,'+rt_mode+');return false">' + (t.user.url ? '</a>' : '') +
			//名前
			'<a href="' + twitterURL + un + '" onClick="switchUserTL(this.parentNode,'+rt_mode+');return false"><span class="uid">' + un + '</span>' +
			 /*プロフィールの名前*/ (t.user.name!=un ? '<span class="uname">('+insertPDF(t.user.name)+')</span>' : '') + '</a>'
		: '') +
		 /* verified? */ (!no_name && t.user.verified ? '<img alt="verified" id="verified-' + eid + '" class="verified" src="images/verified.png">' : '') +
		 /* protected? */ (t.user.protected ? '<img alt="lock" id="lock-' + eid + '" class="lock" src="images/icon_lock.gif">' : '') +
		/*ダイレクトメッセージの方向*/ (t.d_dir == 1 ? '<span class="dir">→</span> ' : t.d_dir == 2 ? '<span class="dir">←</span> ' : '') +
		//本文 (https〜をリンクに置換 + @を本家リンク+JavaScriptに置換)
		" <span id=\"text-" + eid + "\" class=\"status\">" +
		text.replace(/https?:\/\/[^\/\s]*[\w!#$%&\'()*+,.\/:;=?~-]*[\w#\/+-]|[@＠](\w+(?:\/[\w-]+)?)|([,.!?　、。！？「」]|\s|^)([#＃])([\w々ぁ-ゖァ-ヺーㄱ-ㆅ㐀-\u4DBF一-\u9FFF가-\uD7FF\uF900-\uFAFF０-９Ａ-Ｚａ-ｚｦ-ﾟ]+)(?=[^\w々ぁ-ゖァ-ヺーㄱ-ㆅ㐀-\u4DBF一-\u9FFF가-\uD7FF\uF900-\uFAFF０-９Ａ-Ｚａ-ｚｦ-ﾟ]|$)/g, function(_,u,x,h,s){
				if (!u && !h) {
					if (expanded_urls[_]) {
						t.text_replaced = (t.text_replaced || t.text).replace(_, expanded_urls[_]);
						_ = expanded_urls[_];
					}
					return "<a class=\"link\" target=\"_blank\" href=\""+_.replace(/\"/g, '%22')+"\" onclick=\"return link(this);\">"+_.replace(/&/g, '&amp;')+"</a>";
				}
				if (h == "#" || h == "＃") {
					if (s.match(/^\d+$/)) return _;
					return x+"<a target=\"_blank\" class=\"hashtag\" title=\"#"+s+"\" href=\"http://search.twitter.com/search?q="+encodeURIComponent("#"+s)+"\">"+h+s+"</a>";
				}
				if (u.indexOf('/') > 0) return "<a target=\"_blank\" href=\""+twitterURL+u+"\" onclick=\"return link(this);\">"+_+"</a>";
				return "<a href=\""+twitterURL+u+"\"  class=\"mention\" onClick=\"switchUser('"+u+"'); return false;\" >"+_+"</a>";
			}).replace(/\r?\n|\r/g, "<br>") + '</span>' +
		//Retweet情報
		' <span id="rtinfo-'+eid+'" class="rtinfo">' +
		(tw.metadata && tw.metadata.result_type=="popular" ? "<img src=\"images/popular.png\" alt=\"pop\">" : "") +
		(!display_as_rt && rt ? "<img src=\"images/rt.png\" alt=\"RT\">by <img src=\""+tw.user.profile_image_url+"\" alt=\""+tw.user.screen_name+"\" class=\"rtuicon\"><a href=\""+twitterURL+tw.user.screen_name+"\" onclick=\"switchUserTL(this.parentNode.parentNode, true);return false\">" + tw.user.screen_name + "</a> " + (parseInt(tw.retweet_count) > 1 ? '& ' + (typeof(tw.retweet_count) == 'string' ? tw.retweet_count : tw.retweet_count-1) : '') : parseInt(tw.retweet_count) > 1 ? '<small>' + tw.retweet_count+'RT</small>' : '') + '</span>' +
		//日付
		' <span id="utils-'+eid+'" class="utils">' +
		'<span class="prop"><a class="date" target="twitter" href="'+twitterURL+(t.d_dir ? '#!/messages' : un+'/statuses/'+id2)+'">' + dateFmt(t.created_at) + '</a>' +
		//クライアント
		(t.source ? '<span class="separator"> / </span><span class="source">' + t.source.replace(/<a /,'<a target="twitter"') + '</span>' : '') + '</span>' +
		//Geolocation
		(rs.geo && rs.geo.type == 'Point' ? '<a class="button geomap" id="geomap-' + eid + '" target="_blank" href="http://maps.google.com?q=' + rs.geo.coordinates.join(',') + '" onclick="return link(this);"><img src="images/marker.png" alt="geolocation" title="' + rs.geo.coordinates.join(',') + '"></a>' : '') +
		(!rs.geo && rs.place ? '<a class="button geomap" id="geomap-' + eid + '" target="_blank" href="http://maps.google.com?q=' + encodeURIComponent(rs.place.full_name) + '" onclick="return link(this);"><img src="images/marker.png" alt="geolocation" title="' + rs.place.full_name.replace(/\'/g,"&apos;") + '"></a>' : '') +
		//返信先を設定
		' <a class="button reply" href="javascript:replyTo(\'' + un + "','" + id2 + '\',\'' + eid + '\')"><img src="images/reply.png" alt="↩" width="14" height="14"></a>' +
		//返信元へのリンク
		(in_reply_to ? ' <a class="button inrep" href="#" onClick="dispReply(\'' + un + '\',\'' + in_reply_to + '\',this); return false;"><img src="images/inrep.png" alt="☞" width="14" height="14"></a>' : '') +
		//popupメニュー表示
		'&nbsp;&nbsp;&nbsp;<a class="button popup" href="#" onClick="popup_menu(\'' + un + "','" + id2 + '\', this); return false;"><small><small>▼</small></small></a>' +
		'</span><div class="dummy"></div>';
}
// ユーザ情報のHTML表現を生成
function makeUserInfoHTML(user) {
	return '<a class="uicona" target="twitter" href="' + twitterURL + 'account/profile_image/'+
			user.screen_name+'"><img class="uicon2" src="' + user.profile_image_url.replace('normal.','reasonably_small.') + '" onerror="if(this.src!=\''+user.profile_image_url+'\')this.src=\''+user.profile_image_url+'\'"></a><div id="profile"><div>' +
			(user.verified ? '<img class="verified" alt="verified" src="images/verified.png">' : '') +
			(user.protected ? '<img class="lock" alt="lock" src="images/icon_lock.png">' : '') +
			'<b>@' + user.screen_name + '</b> / <b>' + user.name + '</b></div>' +
			'<div class="udesc">' + (user.description ? user.description : '<br>') + '</div>' +
			'<div class="uloc">' + (user.location ? user.location + (user.url?'・':'') : '') +
			(user.url ? '<a target="_blank" href="' + user.url + '" onclick="return link(this);">' + user.url + '</a>' : '') + '</div>' +
			'<b><a href="' + twitterURL + user.screen_name + '/following" onclick="switchFollowing();return false;">' + user.friends_count + '<small>'+_('following')+'</small></a> / ' + 
						'<a href="' + twitterURL + user.screen_name + '/followers" onclick="switchFollower();return false;">' + user.followers_count + '<small>'+_('followers')+'</small></a>' +
			' / <a href="' + twitterURL + user.screen_name + '" onclick="switchStatus();return false;">' + user.statuses_count + '<small>'+_('tweets')+'</small></a> / ' +
						'<a href="' + twitterURL + user.screen_name + '/favorites" onclick="switchFav();return false;">' + user.favourites_count + '<small>'+_('favs')+'</small></a></b>' +
			'</div><div class="clr"></div>'+
			(user.screen_name != myname ? '<a class="button upopup" href="#" onClick="userinfo_popup_menu(\'' + user.screen_name + '\',' + user.id + ', this); return false;"><small><small>▼</small></small></a>' : '')+
			'<a target="twitter" href="' + twitterURL + user.screen_name + '">[Twitter]</a>'
}
// Rate Limit情報のHTML表現を生成
function makeRateLimitInfo(ep) {
	var family = ep.split('/')[0];
	var info = tw_limits.resources[family] && tw_limits.resources[family]['/'+ep];
	if (!info) return '<tr><th>' + ep + ' :</th><td>???</td>';
	var d = info.reset - Math.floor((new Date).getTime()/1000);
	return "<tr><th>" + ep + " :</th><td>" + info.remaining + "/" + info.limit + "</td><td>(" + Math.floor(d/60) + ":" + d2(Math.floor(d%60)) + ")</td></tr>"
}
// 過去の発言取得ボタン(DOM)生成
function nextButton(id, p) {
	var ret = document.createElement('div');
	ret.id = id;
	ret.className = 'get-next';
	ret.onclick = function() { getNext(this); };
	ret.innerHTML = '▽' + (p ? '(' + p + ')' : '');
	return ret;
}
// favoriteの追加/削除
function fav(img, id) {
	if (img.src.indexOf('throbber') >= 0) return;
	var f = img.src.indexOf('empty') >= 0;
	setFavIcon(img, id, -1);
	enqueuePost(twitterAPI + 'favorites/' + (f ? 'create' : 'destroy') + '.json?id=' + id,
		function(){ setFavIcon(img, id, f) }/*, function(){ setFavIcon(img, id, !f) }*/);
}
// favアイコンの設定(f=0: 未fav, f=1:fav済, f=-1:通信中)
function setFavIcon(img, id, f) {
	var img_tl = $('fav-tw-' + id);
	var img_re = $('fav-re-' + id);
	var img_tw2c = $('fav-tw2c-' + id);
	var img_url = (f==-1) ? twitterURL + 'images/icon_throbber.gif' :
						'images/icon_star_' + (f ? 'full' : 'empty') + '.gif';
	img.src = img_url;
	if (img_tl) img_tl.src = img_url;
	if (img_re) img_re.src = img_url;
	if (img_tw2c) img_tw2c.src = img_url;
	callPlugins("fav", id, f, img, img_tl, img_re, img_tw2c);
}
// followとremove
function follow(f) {
	if (!f && !confirm(_("Are you sure to remove $1?", last_user))) return false;
	enqueuePost(twitterAPI + 'friendships/' + (f ? 'create' : 'destroy') + '.json?screen_name=' + last_user, switchUser);
	return false;
}
// blockとunblock
function blockUser(f) {
	if (f && !confirm(_("Are you sure to block $1?", last_user))) return false;
	enqueuePost(twitterAPI + 'blocks/' + (f ? 'create' : 'destroy') + '.json?skip_status=1&screen_name=' + last_user + '.json', switchUser);
	return false;
}
function reportSpam(f) {
	if (f && !confirm(_("Are you sure to report $1 as spam?", last_user))) return false;
	enqueuePost(twitterAPI + 'users/report_spam.json?screen_name=' + last_user, switchUser);
	return false;
}
// ユーザ情報を表示
function twUserInfo(user) {
	if (user.errors) return error('', user);
	var elem = $('user_info');
	elem.innerHTML = makeUserInfoHTML(user);
	callPlugins("newUserInfoElement", elem, user);
	if (show_header_img) {
		elem.className = 'user_header'
		elem.style.backgroundImage = user.profile_banner_url ? 'url('+user.profile_banner_url+'/web)' : 'url(https://si0.twimg.com/a/1355267558/t1/img/grey_header_web.png)';
		$('user_info_b').style.backgroundColor = "#"+user.profile_background_color;
	}
	if (myname != user.screen_name) {
		xds.load_for_tab(twitterAPI + 'friendships/show.json' +
					'?source_screen_name=' + myname + '&target_id=' + user.id +
					'&suppress_response_codes=true', twRelation);
	}
}
// ユーザ情報にフォロー関係を表示
function twRelation(rel) {
	var source = rel.relationship.source;
	var elem = $("user_info");
	if (source.followed_by)
		elem.innerHTML += '<a href="javascript:replyTo(\'' + rel.relationship.target.screen_name + '\',0,0,1)">[DM]</a>';
	elem.innerHTML += '<input type="button" value="' + _(source.following ? 'Remove $1' : 'Follow $1', last_user) +
					'" onClick="follow('+!source.following+')">';
	if (source.followed_by)
		$("profile").innerHTML += "<br><span id=\"following_you\" class=\"following_you\">" + _('$1 is following you!', rel.relationship.target.screen_name)+'</span>';
	callPlugins("newUserRelationship", elem, rel);
}
// ダイレクトメッセージ一覧の受信
function twDirect1(tw) {
	if (tw.errors) return error('', tw);
	direct1 = tw;
	if (direct2)
		twDirectShow();
}
function twDirect2(tw) {
	if (tw.errors) return error('', tw);
	direct2 = tw;
	if (direct1)
		twDirectShow();
}
function twDirectShow() {
	var direct = direct1.concat(direct2).sort(function(a,b){return b.id - a.id});
	direct = direct.map(function(d){
		if (d.recipient_screen_name == myname) {
			d.user = d.sender;
			d.d_dir = 1;
		} else {
			d.user = d.recipient;
			d.d_dir = 2;
		}
		return d;
	});
	twShow2(direct);
	direct1 = direct2 = false;
}
function checkDirect() {
	direct_ele = xds.load_default(twitterAPI + 'direct_messages.json' +
							'?suppress_response_codes=true', twDirectCheck, direct_ele);
	update_direct_counter = 4;
}
function twDirectCheck(tw) {
	if (tw.errors) return error('', tw);
	if (!tw || tw.length == 0) return false;
	var id = tw[0].id_str || tw[0].id;
	if (last_direct_id && last_direct_id != id)
			$("direct").className += " new";
	last_direct_id = id;
}
// API情報の受信
function twConfig(config) {
	tw_config = config;
	if (tw_config && tw_config.short_url_length)
		while (t_co_maxstr.length < tw_config.short_url_length)
			t_co_maxstr += "*";
}
function twRateLimit(limits) {
	if (tw.errors) return error('', tw);
	tw_limits = limits;
	if (selected_menu.id != "misc") return;
	var ele = document.createElement('div');
	ele.className = 'ratelimits';
	ele.innerHTML = '<table>' + makeRateLimitInfo('statuses/home_timeline') +
					makeRateLimitInfo('statuses/mentions_timeline') +
					makeRateLimitInfo('statuses/user_timeline') +
					makeRateLimitInfo('statuses/show/:id') +
					makeRateLimitInfo('friendships/show') +
					makeRateLimitInfo('search/tweets') +
					makeRateLimitInfo('lists/statuses') +
					'</table>';
	$('tw2c').innerHTML = '<div><b>API statuses:</b></div>'
	$('tw2c').appendChild(ele);
}
function updateRateLimit(callback) {
	xds.load(twitterAPI + 'application/rate_limit_status.json' +
				'?suppress_response_codes=true&resources='+api_resources.join(','),
		function(limits){
			if (tw.errors) return error('Cannot update rate limit status', tw);
			tw_limits = limits;
			callback(limits);
		});
}
// 新着reply受信通知
function noticeNewReply(replies) {
	if ($("reply").className.indexOf("new") < 0)
		$("reply").className += " new";
	callPlugins("noticeNewReply", replies);
}
// 新着repliesを取得
function getReplies() {
		reply_ele2 = xds.load_default(twitterAPI + 'statuses/mentions_timeline.json' +
						'?count=' + (since_id_reply ? 800 : max_count_u) +
						(since_id_reply ? '&since_id='+since_id_reply : '') +
						'&indclude_entities=true&suppress_response_codes=true',
						twReplies, reply_ele2);
		update_reply_counter = 4;
}
// 受信repliesを表示
function twReplies(tw, fromTL) {
	if (tw.errors) return error('', tw);

	tw.reverse();
	for (var j in tw) if (tw[j] && tw[j].user) callPlugins("gotNewReply", tw[j]);
	tw.reverse();
	if (nr_page_re == 0) {
		nr_page_re = 2;
		$("re").appendChild(nextButton('get_old_re', nr_page_re));
	}
	twShowToNode(tw, $("re"), false, false, true, false, true, false, fromTL);
	if (!fromTL && replies_in_tl)
		twShowToNode(tw, $("tw"), false, false, true, false, true);
	if (!fromTL && tw.length > 0) since_id_reply = tw[0].id_str || tw[0].id;
}
// 受信tweetを表示
function removeLink(text) {
	return text.replace(/https?:\/\/[^\/\s]*[\w!#$%&\'()*+,.\/:;=?~-]*[\w#\/+-]/g, '');
}
function twShow(tw) {
	first_update = false;
	if (tw.errors) return error('', tw);

	tw.reverse();
	var skipped = !no_since_id && !!since_id && tw.length > max_count*0.9; // several(10% is heuristic...) tweets may not be retrieved
	for (var j in tw) if (tw[j] && tw[j].user) {
		callPlugins("gotNewMessage", tw[j]);
		if (since_id && since_id == (tw[j].id_str || tw[j].id))
			skipped = false;
		if (update_post_check && tw[j].user.screen_name == myname && removeLink(tw[j].text) == removeLink(update_post_check[1])) {
			if ($('fst').value == update_post_check[1]) resetFrm();
			if (update_post_check[0] != 1) postTimeout = Math.max(1000, postTimeout-50);
			update_post_check = false;
		}
	}
	tw.reverse();
	if (nr_page == 0) {
		nr_page = max_count == 800 ? 2 : 1;
		$("tw").appendChild(nextButton('get_old', nr_page));
		skipped = false;
	} else if (skipped) {
		skipped = document.createElement('div');
		skipped.innerHTML = '…';
		skipped.className = 'skipped';
	}

	var nr_shown = twShowToNode(tw, $("tw"), false, false, true, true, true);
	if (nr_shown && skipped)
		$("tw").childNodes[0].appendChild(skipped);
	if ($("tw").oldest_id && update_reply_counter-- <= 0)
		getReplies();
	if (update_direct_counter-- <= 0)
		checkDirect();
	callPlugins("noticeUpdate", tw, nr_shown);
	if (update_post_check) {
		var st = document.frm.status;
		if (update_post_check[0] != 1)  {
			postTimeout = Math.min(10000, postTimeout+500);
			if (update_post_check[0] == 0 && st.value == update_post_check[1] && st.value == last_post) {
				st.value = 'r';
				press(1);
			} else
				update_post_check = false;
		} else {
			// fault again...
			update_post_check = false;
			if (!tweet_failed_notified)
				error(_('Cannot tweet from Maristar? Please try logging out of Twitter web site...'));
			tweet_failed_notified = true;
		}
	}
}
function twOld(tw) {
	if (tw.errors) return error('', tw);
	var tmp = $("tmp");
	twShowToNode(tw, $("tw"), false, true, false, false, false, true);
	if (tmp && tmp.parentNode) tmp.parentNode.removeChild(tmp);
	$("tw").appendChild(nextButton('get_old', nr_page));
}
function twOldReply(tw) {
	if (tw.errors) return error('', tw);
	var tmp = $("tmp");
	twShowToNode(tw, $("re"), false, true, false, false, false, true);
	if (tmp && tmp.parentNode) tmp.parentNode.removeChild(tmp);
	$("re").appendChild(nextButton('get_old_re', nr_page_re));
}
function twShow2(tw) {
	var user_info = $("user_info");
	if ((tw.errors && tw.errors[0].message == "Not authorized" || tw.error && tw.error == "Not authorized" || tw.length < 1 ) && !!user_info && !fav_mode && user_info.innerHTML == '') {
		xds.load_for_tab(twitterAPI + 'users/show.json?screen_name=' + last_user +
			'&suppress_response_codes=true', twUserInfo);
		return;
	}
	if (tw.error) return error(tw.error);
	if (tw.errors) return error('', tw);
	if (tw.length < 1) return;
	var tmp = $("tmp");
	if (tmp && tmp.parentNode) tmp.parentNode.removeChild(tmp);
	twShowToNode(tw, $("tw2c"), !!user_info && !fav_mode, cur_page > 1);
	if (selected_menu.id == "reply" || selected_menu.id == "user" && last_user.indexOf(',') < 0) {
		max_id = tw[tw.length-1].id_str;
		$("tw2c").appendChild(nextButton('next'));
		get_next_func = getNextFuncCommon;
	}
	if (tw[0] && selected_menu.id == "user" && last_user.indexOf(',') < 0 && !fav_mode && user_info.innerHTML == '')
		twUserInfo(tw[0].user);
}
function twShow3(tw) {
	if (tw.errors) return error('', tw);
	users_log.push(tw);
	if (users_log.length == last_user.split(',').length) {
		var tws = [];
		for (var i = 0; i < users_log.length; i++)
			tws = tws.concat(users_log[i]);
		tws = tws.sort(function(a,b){return b.id - a.id});
		twShow2(tws);
	}
}
function twUsers(tw) {
	if (tw.error) return error(tw.error);
	if (tw.errors) return error('', tw);
	var tmp = $("tmp");
	if (tmp && tmp.parentNode) tmp.parentNode.removeChild(tmp);
	var tw2 = tw.users.map(function(x){
		if (!x.status) x.status = {'text':'', id:0, 'created_at':x.created_at};
		x.status.user = x;
		return x.status;
	});
	twShowToNode(tw2, $("tw2c"), false, cur_page > 1, false, false, false, false, false, true);
	if (tw.next_cursor) {
		$("tw2c").appendChild(nextButton('next'));
		get_next_func = function() {
			cur_page++;
			xds.load_for_tab(twitterAPI +
					(fav_mode == 2 ? 'friends/list.json' : 'followers/list.json') +
					'?screen_name=' + last_user + '&cursor=' + tw.next_cursor +
					'&include_entities=true&suppress_response_codes=true', twUsers);
		};
	}
}
function twShowToNode(tw, tw_node, no_name, after, animation, check_since, ignore_old, ignore_new, weak, userdesc) {
	var len = tw.length;
	if (len == 0) return 0;
	var pNode = document.createElement('div');
	var dummy = pNode.appendChild(document.createElement('div'));
	var myname_r = new RegExp("[@＠]"+myname+"\\b","i");
	var nr_show = 0;
	var replies = [];
	for (var i = len-1; i >= 0; i--) {
		if (!tw[i]) continue;
		var id = tw[i].id_str || tw[i].id;
		var duplication = $(tw_node.id + "-" + id);
		if (duplication) {
			if (duplication.weak)
				duplication.parentNode.removeChild(duplication);
			else
				continue;
		}
		if (ignore_old && tw_node.oldest_id && tw_node.oldest_id > tw[i].id)
			continue;
		if (ignore_new && tw_node.oldest_id && tw_node.oldest_id < tw[i].id)
			continue;
		if (tw[i].user) {
			var s = document.createElement('div');
			s.id = tw_node.id + "-" + id;
			s.innerHTML = makeHTML(tw[i], no_name, tw_node.id, userdesc);
			s.screen_name = tw[i].user.screen_name;
			s.tw = tw[i]; // DOMツリーにJSONを記録
			if (weak) s.weak = true;
			if (tw[i].d_dir == 1 || tw[i].text.match(myname_r)) {
				s.className = "tome";
				if ((tw_node.id == "tw" || tw_node.id == "re") && !duplication) {
					replies.push(tw[i]);
				}
			}
			var user = tw[i].retweeted_status && tw[i].retweeted_status.user || tw[i].user;
			if (tw[i].d_dir == 2 || user.screen_name == myname)
				s.className = "fromme";
			if (tw[i].retweeted_status && !userdesc)
				s.className += " retweeted";
			if (userdesc)
				s.className += " userdesc";
			callPlugins("newMessageElement", s, tw[i], tw_node.id);
			pNode.insertBefore(s, pNode.childNodes[0]);
			nr_show++;
		}
	}
	pNode.removeChild(dummy);
	if (pNode.childNodes.length == 0) return 0;
	pNode.style.overflow = "hidden";
	var animation2 = animation && getScrollY() < 10;
	var maxH;
	if (animation2) { // get maxH
		tw_node.appendChild(pNode);
		maxH = pNode.clientHeight;
		tw_node.removeChild(pNode);
		pNode.style.minHeight = 0;
	}
	if (after || !tw_node.childNodes[0])
		tw_node.appendChild(pNode);
	else
		tw_node.insertBefore(pNode, tw_node.childNodes[0]);
	if (animation2)
		animate(pNode, maxH, (new Date).getTime());
	else if (animation) {
		var ch = pNode.clientHeight + parseInt(pNode.style.borderBottomWidth || 0);
		$('rep').style.top = (rep_top += ch) + 'px';
		$('popup').style.top = (popup_top += ch) + 'px';
		scrollTo(0, getScrollY()+ch);
		scroll_adjust += ch;
	}
	tw_node.nr_tw = (tw_node.nr_tw || 0) + nr_show;
	if(!tw_node.oldest_id && !weak) { // oldest_id設定
		for (var j = tw.length - 1; j >= 0; j--) {
			if (tw[j] && tw[j].user) {
				tw_node.oldest_id = tw[j].id;
				break;
			}
		}
	}
	if (animation && tw_node.nr_tw > nr_limit) {
		while (tw_node.nr_tw > nr_limit) {
			var last_node = tw_node.childNodes[tw_node.childNodes.length-1];
			tw_node.nr_tw -= last_node.childNodes.length;
			tw_node.removeChild(last_node);
		}
		var tl_oldest_id = 0; // 削除に伴いoldest_id更新
		for (var i = 0; i < 3 && i < tw_node.childNodes.length; i++) { // 最大3要素スキャン
			var target_block = tw_node.childNodes[tw_node.childNodes.length-i-1].childNodes;
			var target_ele = target_block[target_block.length-1];
			if (!target_ele.weak && target_ele.tw && (target_ele.tw.id < tl_oldest_id || !tl_oldest_id))
				tl_oldest_id = target_ele.tw.id;
		}
		tw_node.oldest_id = tl_oldest_id;
	}
	for (var i = 0; check_since && i < len; i++) {
		if (tw[i].user.screen_name != myname) {
			since_id = tw[i].id_str || tw[i].id;
			break;
		}
	}
	if (replies.length) {
		if (tw_node.id == "tw") {
			replies.reverse();
			twReplies(replies, true);
			replies.reverse();
		}
		else if (weak || since_id_reply) // 初回Reply取得時にはnoticeしない
			noticeNewReply(replies);
	}
	if (nr_show > 0) setFstHeight(null, true);
	callPlugins("added", tw, tw_node.id, after);
	
	// Maristar(obsolete)
	callPlugins('_post_twShowToNode');
	
	return nr_show;
}
// 新規tweetの出現アニメーション処理
function animate(elem, max, start) {
	var t = (new Date).getTime();
	if (start+1000 <= t)
		return elem.style.maxHeight = 'none';
	elem.style.maxHeight = Math.ceil(max*(1-Math.cos((t-start)/1000*Math.PI))/2);
	setTimeout(function(){animate(elem, max, start)}, 20);
}
// 次ページ取得
function getNext(ele) {
	var tmp = document.createElement("div");
	tmp.id = "tmp";
	tmp.innerHTML = "<p></p>";
	ele.parentNode.appendChild(tmp);
	ele.parentNode.removeChild(ele);
	get_next_func();
}
function getOldTL() {
	update_ele2 = xds.load_default(twitterAPI + 'statuses/home_timeline.json' +
				'?count=800&page=' + (nr_page++) +
				'&include_entities=true&suppress_response_codes=true', twOld, update_ele2);
}
function getOldReply() {
	update_ele2 = xds.load_default(twitterAPI + 'statuses/mentions_timeline.json' +
				'?count=' + max_count_u + '&page=' + (nr_page_re++) +
				'&include_entities=true&suppress_response_codes=true', twOldReply, update_ele2);
}
function getNextFuncCommon() {
	if (selected_menu.id == "user" && !fav_mode)
		xds.load_for_tab(twitterAPI + 'statuses/user_timeline.json' +
					'?count=' + max_count_u + '&page=' + (++cur_page) + '&screen_name=' + last_user +
					'&include_rts=true&include_entities=true&suppress_response_codes=true', twShow2);
	else if (selected_menu.id == "user" && fav_mode == 1)
		xds.load_for_tab(twitterAPI + 'favorites/list.json?screen_name=' + last_user +
					'&page=' + (++cur_page) + '&suppress_response_codes=true', twShow2);
	else if (selected_menu.id == "user" && fav_mode == 4) {
		++cur_page;
		xds.load_for_tab(twitterAPI + 'statuses/following_timeline.json' +
					'?count = ' + max_count_u + '&max_id=' + max_id + '&suppress_response_codes=true' +
					'&include_entities=true&screen_name=' + last_user, twShow2);
	}
}
// タイムライン切り替え
function switchTo(id) {
	if (err_timeout) {
		clearTimeout(err_timeout);
		err_timeout = error_animate(false);
	}
	xds.abort_tab();
	if (selected_menu.id == "TL" || selected_menu.id == "reply") {
		if (getScrollY() >= 10) {
			// スクロール位置を保持
			selected_menu.lastTopDiv = $(selected_menu.id=="TL"?"tw":"re").childNodes[0];
			selected_menu.lastScrollY = getScrollY() - selected_menu.offsetTop;
		} else {
			selected_menu.lastTopDiv = null;
			selected_menu.lastScrollY = 0;
		}
	}
	var last_menu = selected_menu;
	selected_menu.className = "";
	selected_menu = $(id);
	selected_menu.className = "sel";
	$("tw").style.display = id=="TL"?"block":"none";
	$("re").style.display = id=="reply"?"block":"none";
	$("tw2h").innerHTML = "";
	$("tw2c").innerHTML = "";
	$("tw2").style.display = id!="TL"&&id!="reply"?"block":"none";
	$("tw2c").nr_tw = 0;
	$("tw2c").oldest_id = undefined;
	closeRep();
	if (last_menu.id != id && (id == "TL" || id == "reply") &&
		selected_menu.lastScrollY && selected_menu.lastTopDiv && selected_menu.lastTopDiv.parentNode) {
		scrollTo(0, selected_menu.lastScrollY + selected_menu.lastTopDiv.offsetTop);
	} else {
		scrollTo(0, 1);
		scrollTo(0, 0);
	}
	cur_page = 1;
	fav_mode = 0;
	callPlugins("switchTo", selected_menu, last_menu);
	setTimeout(function(){ setFstHeight(null, true); }, 0);
}
function switchTL() {
	get_next_func = getOldTL;
	if (selected_menu.id == "TL") {
		switchTo("TL");
		update();
	}else{
		switchTo("TL");
	}
}
function switchReply() {
	get_next_func = getOldReply;
	if (selected_menu.id == "reply") {
		switchTo("reply");
		getReplies();
	} else {
		switchTo("reply");
	}
}
function switchUserTL(div, rt) {
	var tw = div.tw;
	if (!(rt || display_as_rt))
		tw = tw.retweeted_status || tw;
	if (tw.user.description)
		last_user_info = tw.user;
	switchUser(tw.user.screen_name);
}
function switchUser(user) {
	if (!user) {
		user = last_user;
		last_user_info = null;
	}
	last_user = user;
	$("user").innerHTML = user;
	switchTo("user");
	var users = user.split(',');
	if (users.length == 1) {
		$("tw2h").innerHTML = (show_header_img ? "<div id=\"user_info_b\">" : "") + "<div id=\"user_info\"></div>" + (show_header_img ? "</div>" : "");
		if (last_user_info && last_user_info.screen_name == user)
			twUserInfo(last_user_info);
		xds.load_for_tab(twitterAPI + 'statuses/user_timeline.json' +
			'?count=' + max_count_u + '&screen_name=' + user + 
			'&include_rts=true&include_entities=true&suppress_response_codes=true', twShow2);
	} else {
		users_log = [];
		xds.abort_tab();
		for (var i = 0; i < users.length; i++)
			xds.load_for_tab(twitterAPI + 'statuses/user_timeline.json?screen_name=' + users[i] +
						 '&include_rts=true&include_entities=true&suppress_response_codes=true&count=' + max_count_u, twShow3);
	}
}
function switchStatus() {
	cur_page = 1;
	fav_mode = 0;
	$("tw2c").innerHTML = "";
	xds.load_for_tab(twitterAPI + 'statuses/user_timeline.json' +
		'?count=' + max_count_u + '&screen_name=' + last_user + 
		'&include_rts=true&include_entities=true&suppress_response_codes=true', twShow2);
}
function switchFav() {
	cur_page = 1;
	fav_mode = 1;
	$("tw2c").innerHTML = "";
	xds.load_for_tab(twitterAPI + 'favorites/list.json?screen_name=' + last_user +
										'&suppress_response_codes=true', twShow2);
}
function switchFollowing() {
	cur_page = 1;
	fav_mode = 2;
	$("tw2c").innerHTML = "";
	xds.load_for_tab(twitterAPI + 'friends/list.json?screen_name=' + last_user + 
										'&cursor=-1&include_entities=true&suppress_response_codes=true', twUsers);
}
function switchFollower() {
	cur_page = 1;
	fav_mode = 3;
	$("tw2c").innerHTML = "";
	xds.load_for_tab(twitterAPI + 'followers/list.json' +
			'?screen_name=' + last_user + '&cursor=-1&include_entities=true&suppress_response_codes=true', twUsers);
}
function switchDirect() {
	switchTo("direct");
	xds.load_for_tab(twitterAPI + 'direct_messages.json' +
										'?suppress_response_codes=true', twDirect1);
	xds.load_for_tab(twitterAPI + 'direct_messages/sent.json' +
										'?suppress_response_codes=true', twDirect2);
}
function switchMisc() {
	switchTo("misc");
	$("tw2h").innerHTML = '<br><br><a id="clientname" target="twitter" href="/"><b>Maristar</b></a> : A Twitter client for Firefox<br><small id="copyright">Copyright &copy; 2011-2013 NV</small><br />' + 
					'Based on <a target="twitter" href="http://twicli.neocat.jp/">twicli</a> : A browser-based Twitter client<br /><small id="copyright_twicli">Copyright &copy; 2008-2013 NeoCat</small>' +
					'<hr class="spacer"><form id="switchuser" onSubmit="switchUser($(\'user_id\').value); return false;">'+
					_('show user info')+' : @<input type="text" size="15" id="user_id" value="' + myname + '"><input type="image" src="images/go.png"></form>' +
					'<a id="logout" href="javascript:logout()"><b>'+_('Log out')+'</b></a><hr class="spacer">' +
					'<div id="pref"><a href="javascript:togglePreps()">▼<b>'+_('Preferences')+'</b></a>' +
					'<form id="preps" onSubmit="setPreps(this); return false;" style="display: none;">' +
					_('language')+': <select name="user_lang">'+(['en'].concat(langList)).map(function(x){
							return '<option value="'+x+'"'+(x==user_lang?' selected':'')+'>'+langNames[x]+'</option>';
						})+'</select><br>' +
					_('max #msgs in TL')+': <input name="limit" size="5" value="' + nr_limit + '"><br>' +
					_('#msgs in TL on update (max=800)')+': <input name="maxc" size="3" value="' + max_count + '"><br>' +
					_('#msgs in user on update (max=800)')+': <input name="maxu" size="3" value="' + max_count_u + '"><br>' +
					_('update interval')+': <input name="interval" size="3" value="' + updateInterval + '"> sec<br>' +
					'<input type="checkbox" name="since_check"' + (no_since_id?"":" checked") + '>'+_('since_id check')+'<br>' +
					'<input type="checkbox" name="replies_in_tl"' + (replies_in_tl?" checked":"") + '>'+_('Show not-following replies in TL')+'<br>' +
					'<input type="checkbox" name="reply_to_all"' + (reply_to_all?" checked":"") + '>'+_('Reply to all')+'<br>' +
					'<input type="checkbox" name="display_as_rt"' + (display_as_rt?" checked":"") + '>'+_('Show retweets in "RT:" form')+'<br>' +
					'<input type="checkbox" name="counter"' + (no_counter?"":" checked") + '>'+_('Post length counter')+'<br>' +
					'<input type="checkbox" name="resize_fst"' + (no_resize_fst?"":" checked") + '>'+_('Auto-resize field')+'<br>' +
					'<input type="checkbox" name="decr_enter"' + (decr_enter?" checked":"") + '>'+_('Post with ctrl/shift+enter')+'<br>' +
					'<input type="checkbox" name="confirm_close"' + (confirm_close?" checked":"") + '>'+_('Confirm before closing tabs')+'<br>' +
					'<input type="checkbox" name="geotag"' + (no_geotag?"":" checked") + '>'+_('Enable GeoTagging')+'<br>' +
					'<input type="checkbox" name="use_ssl"' + (use_ssl?" checked":"") + '>'+_('Use HTTPS')+'<br>' +
					'<input type="checkbox" name="show_header_img"' + (show_header_img?" checked":"") + '>'+_('Show header image')+'<br>' +
					_('Footer')+': <input name="footer" size="20" value="' + footer + '"><br>' +
					_('Plugins')+':<br><textarea cols="30" rows="4" name="list">' + pluginstr + '</textarea><br>' +
					_('user stylesheet')+':<br><textarea cols="30" rows="4" name="user_style">' + user_style + '</textarea><br>' +
					_('API proxy')+':<br><textarea cols="30" rows="4" name="api_proxy">' + api_proxy + '</textarea><br>' +
					_('memcached server')+': <input name="memcached_server" size="25" value="' + memcached_server + '"><br>' +
					'<input type="submit" value="'+_('Save')+'"></form></div><hr class="spacer">';
	callPlugins("miscTab", $("tw2h"));
	xds.load_for_tab(twitterAPI + 'application/rate_limit_status.json' +
				'?suppress_response_codes=true&resources='+api_resources.join(','), twRateLimit);
}
function togglePreps() {
	$('preps').style.display = $('preps').style.display == 'block' ? 'none' : 'block';
}
function setPreps(frm) {
	var ps = frm.list.value.split("\n");
	for (var i = 0; i < ps.length; i++) {
		if (ps[i].indexOf("/") >= 0) {
			if (ps[i].indexOf("https") != 0) {
				alert(_('An insecure external plugin is prohibited. Use HTTPS.'));
				return;
			}
			if (!confirm(_('An external plugin is specified. This plugin can fully access to your account and Firefox.\nAre you sure to load this?')+"\n\n" + ps[i])) {
				return;
			}
		}
	}
	
	user_lang = frm.user_lang.value;
	nr_limit = frm.limit.value;
	max_count = frm.maxc.value;
	max_count_u = frm.maxu.value;
	updateInterval = Math.max(parseInt(frm.interval.value), 60);
	no_since_id = !frm.since_check.checked;
	no_counter = !frm.counter.checked;
	no_resize_fst = !frm.resize_fst.checked;
	replies_in_tl = frm.replies_in_tl.checked;
	reply_to_all = frm.reply_to_all.checked;
	display_as_rt = frm.display_as_rt.checked;
	confirm_close = frm.confirm_close.checked;
	footer = new String(frm.footer.value);
	decr_enter = frm.decr_enter.checked;
	no_geotag = !frm.geotag.checked;
	use_ssl = frm.use_ssl.checked?1:0;
	show_header_img = frm.show_header_img.checked;
	resetUpdateTimer();
	writeCookie('ver', currentCookieVer, 3652);
	writeCookie('user_lang', user_lang, 3652);
	writeCookie('limit', nr_limit, 3652);
	writeCookie('max_count', max_count, 3652);
	writeCookie('max_count_u', max_count_u, 3652);
	writeCookie('update_interval', updateInterval, 3652);
	writeCookie('no_since_id', no_since_id?1:0, 3652);
	writeCookie('no_counter', no_counter?1:0, 3652);
	writeCookie('no_resize_fst', no_resize_fst?1:0, 3652);
	writeCookie('replies_in_tl', replies_in_tl?1:0, 3652);
	writeCookie('reply_to_all', reply_to_all?1:0, 3652);
	writeCookie('display_as_rt', display_as_rt?1:0, 3652);
	writeCookie('footer', footer, 3652);
	writeCookie('decr_enter', decr_enter?1:0, 3652);
	writeCookie('confirm_close', confirm_close?1:0, 3652);
	writeCookie('no_geotag', no_geotag?1:0, 3652);
	writeCookie('use_ssl', use_ssl?1:0, 3652);
	writeCookie('show_header_img', show_header_img?1:0, 3652);
	writeCookie('tw_plugins', new String(" " + frm.list.value), 3652);
	writeCookie('user_style', new String(frm.user_style.value), 3652);
	writeCookie('api_proxy', new String(frm.api_proxy.value), 3652);
	writeCookie('memcached_server', new String(frm.memcached_server.value), 3652);
	callPlugins('savePrefs', frm);
	alert(_("Your settings are saved. Please reload to apply plugins and CSS and API proxy."));
	if (use_ssl)
		twitterAPI = twitterAPI.replace('http', 'https');
	else
		twitterAPI = twitterAPI.replace('https', 'http');
}

// Maristar
// コマンド
var commands = [];
function registerCommand(name, func) {
	commands.push([name, func]);
}
function callCommand(name, args) {
	commands.map(function (v) {
		if (v[0] == name && typeof v[1] == 'function') {
			try {
				(v[1])(args);
			} catch (e) {
				alert(_('Command error')+'('+v[0]+'): ' + e);
			}
		}
	});
}
function parseCommand(cmd) {
	if (cmd.match(/!!!\s*(\S+)(?:\s+(.+))*/)) {
		cmdName = RegExp.$1;
		cmdArgs = RegExp.$2;
		callCommand(cmdName, ((cmdArgs.length) ? cmdArgs.split(/\s/) : []));
	}
}
//example
/*
registerCommand('test', function(args) {
	alert('hogehoge: ' + args[0]);
});
*/
//end

// 標準コマンド
registerCommand('marisa', function(args) {
	enqueuePost(twitterAPI + 'statuses/update.xml?status=' + encodeURIComponent(['まりさ', 'まさり', 'りまさ', 'りさま', 'さりま', 'さまり'].sample()));
});
registerCommand('exec', function(args) {
	alert(eval(args.join(' ')));
});
registerCommand('fib', function(args) {
	if (args.length == 1 && isFinite(n = Math.floor(+(args[0]))) && n >= 0) {
		result = function (n) {
			switch (n) {
				case 0:
					return 0;
				case 1:
					return 1;
				default:
					return arguments.callee(n - 2) + arguments.callee(n - 1);
			}
		}(n);
		if (confirm('post : fib(' + n + ') = ' + result)) {
			enqueuePost(twitterAPI + 'statuses/update.xml?status=' + encodeURIComponent('fib(' + n + ') = ' + result));
		}
	}
});
registerCommand('favstar', function(args) {
	switch (args.length) {
	case 0:
		screen_name = myname;
		page = 'recent';
		break;
	case 1:
		screen_name = myname;
		page = args[0];
		break;
	default:
		screen_name = args[0];
		page = args[1];
		break;
	}
	
	var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
				.getInterface(Components.interfaces.nsIWebNavigation)
				.QueryInterface(Components.interfaces.nsIDocShellTreeItem)
				.rootTreeItem
				.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
				.getInterface(Components.interfaces.nsIDOMWindow);
	
	mainWindow.gBrowser.selectedTab = mainWindow.gBrowser.addTab('http://favstar.fm/users/' + screen_name + '/' + page);
});
registerCommand('88224646ba', function(args) {
	hidden_setting = (hidden_setting == '1') ? '0' : '1';
	writeCookie('hidden_setting', hidden_setting);
	if (hidden_setting == '1') {
		enqueuePost(twitterAPI + 'statuses/update.xml?status=' + encodeURIComponent(['まりさ', 'まさり', 'りまさ', 'りさま', 'さりま', 'さまり'].sample()+'ちゃんうふふ'));
	}
});

// パクる
function copyStatus(id, user, ele) {
	id = id || popup_id;
	user = user || popup_user;
	ele = ele || popup_ele;
	if (!id) return false;
	// if ($('lock-' + ele.id) && !confirm(_("This tweet is protected; Are you sure to retweet?"))) return false;
	var tw = !display_as_rt && ele.tw.retweeted_status || ele.tw;
	$('fst').value = charRef(tw.text);
	$('fst').focus(); $('fst').select();
	return false;
}

// 初期化
function init() {
	init_api_proxy();
	popup_init();
	selected_menu = $("TL");
	setTimeout(function(){scrollTo(0, 1)}, 0);
	setFstHeight(min_fst_height, true);
	// 初回アップデート
	callPlugins("init");
	setTimeout(auth, 0);
}
// プラグイン
var plugin_name;
function registerPlugin(obj) {
	plugins.push([plugin_name,obj]);
}
function callPlugins(name) {
	var args = [].slice.apply(arguments);
	args.shift();
	for (var i = 0; i < plugins.length; i++)
		if (typeof plugins[i][1][name] == "function")
			try {
				plugins[i][1][name].apply(plugins[i][1], args);
			} catch (e) {
				alert(_('Plugin error')+'('+plugins[i][0]+'): ' + e);
			}
}
function loadPlugins() {
	if (pluginstr) {
		var ps = pluginstr.split(/[\r\n]+/);
		var pss = "";
		for (var i = 0; i < ps.length; i++) {
			pss += '<scr'+'ipt type="text/javascript">plugin_name="'+ps[i].replace(/[\\\"]/g,'')+'"</scr'+'ipt>';
			pss += '<scr'+'ipt type="text/javascript" src="' + (ps[i].indexOf("/") >= 0 ? ps[i] : 'plugins/'+ps[i]+'?'+document.maristar_js_ver) + '"></scr'+'ipt>';
		}
		document.write(pss);
	}
}

// エラーコンソールにログ出力
console_service = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
function console_log(value) {
	console_service.logStringMessage(JSON.stringify(value));
}
