// favstar.js v1.00 by NV
// favstarへのリンクを追加します。
// 必要に応じて、favotter.jsの代わりにロードしてください。

var favstarPlugin = {
	popup: function(ele, user, id) {
		$('favstar_link_popular').href = 'http://favstar.fm/users/' + user;
		$('favstar_link_recent').href = 'http://favstar.fm/users/' + user + '/recent';
		$('favstar_link_status').href = 'http://favstar.fm/users/' + user + '/status/' + id;
		$('favstar_link_given').href = 'http://favstar.fm/users/' + user + '/given';
	}
};
registerPlugin(favstarPlugin);

var a = document.createElement("hr");
$('popup').appendChild(a)

a = document.createElement("a");
a.target = 'favstar';
a.id = 'favstar_link_popular';
a.innerHTML = 'favstar / Popular';
$('popup').appendChild(a)

a = document.createElement("a");
a.target = 'favstar';
a.id = 'favstar_link_recent';
a.innerHTML = 'favstar / Recent';
$('popup').appendChild(a)

a = document.createElement("a");
a.target = 'favstar';
a.id = 'favstar_link_status';
a.innerHTML = 'favstar / Status';
$('popup').appendChild(a)

a = document.createElement("a");
a.target = 'favstar';
a.id = 'favstar_link_given';
a.innerHTML = 'favstar / Given';
$('popup').appendChild(a)
