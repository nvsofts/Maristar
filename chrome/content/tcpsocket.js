TCPSocket = {};

TCPSocket.connect = function (host, port) {
	var socketTransportService = Components.classes["@mozilla.org/network/socket-transport-service;1"].getService(Components.interfaces.nsISocketTransportService);
	
	return socketTransportService.createTransport(null, 0, host, port, null);
};

TCPSocket.getStreams = function (transport) {
	return [transport.openInputStream(0, 0, 0), transport.openOutputStream(0, 0, 0)];
};

TCPSocket.close = function (transport, streams) {
	streams[0].close();
	streams[1].close();
	transport.close(0);
};

