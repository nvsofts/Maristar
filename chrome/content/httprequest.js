HTTPRequest = {};

HTTPRequest.httpGetOAuth = function (url, proxy, accessor, onload, onerror) {
	var xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
	
	var request_url = url;
	var message = {method: "GET", action: url};
	
	if (proxy != null) {
		message.action = url.replace(proxy[0], proxy[2]);
		request_url = url.replace(proxy[0], proxy[1]);
	}
	
	OAuth.completeRequest(message, accessor);
	
	if (onload) {
		xhr.onload = function (e) {
			onload(xhr, e);
		};
	}
	if (onerror) {
		xhr.onerror = function (e) {
			onerror(xhr, e);
		};
	}
	
	xhr.open(message.method, request_url, true);
	
	var realm = "";
	
	xhr.setRequestHeader("Authorization", OAuth.getAuthorizationHeader(realm, message.parameters));
	xhr.send();
	
	return xhr;
};

HTTPRequest.httpPostOAuth = function (url, proxy, accessor, param, onload, onerror) {
	var xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
	
	var request_url = url;
	var requestBody = OAuth.formEncode(param);
	var message = {method: "POST", action: url, parameters: param};
	
	if (proxy != null) {
		message.action = url.replace(proxy[0], proxy[2]);
		request_url = url.replace(proxy[0], proxy[1]);
	}
	
	OAuth.completeRequest(message, accessor);
	
	if (onload) {
		xhr.onload = function (e) {
			onload(xhr, e);
		};
	}
	if (onerror) {
		xhr.onerror = function (e) {
			onerror(xhr, e);
		};
	}
	
	xhr.open(message.method, request_url, true);
	
	var realm = "";
	
	xhr.setRequestHeader("Authorization", OAuth.getAuthorizationHeader(realm, message.parameters));
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	xhr.send(requestBody);
	
	return xhr;
};

HTTPRequest.startUserStreams = function (onreceived, onerror) {
	var xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
	
	var url = 'https://userstream.twitter.com/2/user.json';
	var agent = 'Maristar';
	var message = {method: "GET", action: url};
	
	OAuth.completeRequest(message, accessor);
	
	if (onreceived) {
		xhr.onreadystatechange = function () {
			if (this.readyState == 3) {
				console_log(this.responseText);
			}
		};
	}
	
	xhr.open(message.method, url, true);
	
	var realm = "";
	
	xhr.setRequestHeader('User-Agent', agent);
	xhr.setRequestHeader("Authorization", OAuth.getAuthorizationHeader(realm, message.parameters));
	xhr.send();
	
	return xhr;
};
