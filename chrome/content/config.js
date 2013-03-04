window.maristar_config = null;

function loadCookie() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch('extensions.maristar.');
	
	try {
		window.maristar_config = JSON.parse(prefBranch.getComplexValue('config', Components.interfaces.nsISupportsString).data);
		return true;
	} catch (e) {
	}
	
	return false;
}

function saveCookie() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch('extensions.maristar.');
	var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
	
	try {
		str.data = JSON.stringify(window.maristar_config);
		prefBranch.setComplexValue('config', Components.interfaces.nsISupportsString, str);
	} catch (e) {
	}
}

function readCookie(key) {
	if (window.maristar_config == null && !loadCookie()) {
		return null;
	}
	
	if (typeof window.maristar_config[key] == 'undefined') {
		return null;
	}
	
	return String(window.maristar_config[key]);
}

function writeCookie(key, val) {
	if (window.maristar_config == null && !loadCookie()) {
		return;
	}
	
	window.maristar_config[key] = val;
	saveCookie();
}

function deleteCookie(key) {
	if (window.maristar_config == null && !loadCookie()) {
		return;
	}
	
	delete window.maristar_config[key];
	saveCookie();
}

