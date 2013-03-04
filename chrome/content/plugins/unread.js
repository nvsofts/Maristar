// unread.js v1.00 by NV
// 未読管理機能を追加します。jQueryが必要です。
// user stylesheetに .unread { background-color: #e1f1fd; } を追加してください。

function unread_js_count_unread() {
	len = jQuery('[class*=unread]').length;
	document.title = ((len) ? ('(' + len + ') ') : '') + 'Maristar';
}

jQuery('#TL').click(function () {
	if (selected_menu.id != "TL") {
		return true;
	}else{
		jQuery('[id^=tw-][class*=unread]').each(function () {
			jQuery(this).toggleClass('unread');
			jQuery.data(this, 'unread_js_unread', false);
		});
		unread_js_count_unread();
		return false;
	}
});

jQuery('#TL').dblclick(function () {
	switchTL();
});

jQuery('#reply').click(function () {
	if (selected_menu.id != "reply") {
		return true;
	}else{
		jQuery('[id^=re-][class*=unread]').each(function () {
			jQuery(this).toggleClass('unread');
			jQuery.data(this, 'unread_js_unread', false);
		});
		unread_js_count_unread();
		return false;
	}
});

jQuery('#reply').dblclick(function () {
	switchReply();
});

var unreadPlugin = {
	newMessageElement: function (el, tw) {
		if (el.id.lastIndexOf('tw-', 0) == 0 || el.id.lastIndexOf('re-', 0) == 0) {
			unread = jQuery.data(el, 'unread_js_unread');
			if (!(jQuery(el).hasClass('fromme')) && (typeof unread != 'boolean' || unread)) {
				jQuery(el).toggleClass('unread');
				jQuery.data(el, 'unread_js_unread', true);
			}
		}
	}, 
	_post_twShowToNode: function () {
		unread_js_count_unread();
	}
};
registerPlugin(unreadPlugin);
