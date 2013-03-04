function Memcached(host, port) {
	this.transport = null;
	this.streams = null;
	this.input = null;
	this.output = null;
	this.connected = false;
	
	if (typeof host == 'undefined') {
		return;
	}	
	
	this.connect(host, port);
};

Memcached.prototype.connect = function (host, port) {
	if (typeof port == 'undefined') {
		port = 11211;
	}
	
	this.transport = TCPSocket.connect(host, port);
	this.streams = TCPSocket.getStreams(this.transport);
	
	this.transport.setEventSink(this, Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread);
	
	return true;
};

Memcached.prototype.onTransportStatus = function (transport, status, unused, unused2) {
	if (status == Components.interfaces.nsISocketTransport.STATUS_CONNECTED_TO) {
		this.connected = true;
		this.input = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
		this.input.init(this.streams[0], 'UTF-8', 1024, 0xFFFD);
		this.input.QueryInterface(Components.interfaces.nsIUnicharLineInputStream);
		this.output = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
		this.output.init(this.streams[1], 'UTF-8', 0, '?'.charCodeAt(0));
	}
};

Memcached.prototype.get = function (key) {
	if (!this.input || !this.output) {
		return null;
	}
	
	command = 'get ' + key + "\r\n";
	
	this.output.writeString(command);
	this.output.flush();
	
	read_data = '';
	line = {};
	
	do {
		cont = this.input.readLine(line);
		if (typeof line.value != 'undefined' && line.value.length) {
			read_data += line.value;
			read_data += "\n";
		}
	} while (line.value != "END") ;
	
	read_data_array = read_data.split("\n");
	for (i = 0; i < read_data_array.length; i++) {
		if (read_data_array[i].indexOf('VALUE') == 0) {
			return JSON.parse(read_data_array[i + 1]);
		}
	}
	
	return null;
};

Memcached.prototype.set = function (key, obj) {
	if (!this.output) {
		return;
	}
	
	value = JSON.stringify(obj);
	bytes = 0;
	table = [0, 1, 1, 1, 2, 3, 2, 3, 4, 3];
	
	for (i = 0; i < value.length; i++) {
		bytes += table[encodeURIComponent(value.charAt(i)).length];
	}
	
	command = 'set ' + key + ' 0 0 ' + bytes + "\r\n";
	value += "\r\n";
	
	this.output.writeString(command);
	this.output.writeString(value);
	this.output.flush();
};

Memcached.prototype.close = function () {
	this.connected = false;
	
	if (this.input) {
		this.input.close();
	}
	if (this.output) {
		this.output.close();
	}
	
	TCPSocket.close(this.transport, this.streams);
	
	this.input = this.output = null;
	this.transort = this.streams = null;
};
