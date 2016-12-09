#!/usr/bin/env node

var app = require('express')();
var WebSocketServer = require('websocket').server;
var http = require('http');
var server = http.Server(app);

var browserConnections = [];   // Variable to hold connections to browsers
var arduinoConnection = [];    // Variable to hold connection to espresso machine
 
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production 
    // applications, as it defeats all standard cross-origin protection 
    // facilities built into the protocol and the browser.  You should 
    // *always* verify the connection's origin and decide whether or not 
    // to accept it. 
    autoAcceptConnections: false
});
 
function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed. 
  return true;
}
 
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin 
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
	if (request.requestedProtocols == 'arduino') {
		arduinoConnection = request.accept('arduino', request.origin);
		console.log((new Date()) + ' Arduino connection accepted.');
		
		arduinoConnection.on('message', function(message) {
			if (message.type === 'utf8') {
				console.log('Received Message: ' + message.utf8Data);
				browserConnections.forEach(function(client){
					client.sendUTF(message.utf8Data);
				});
			}
		});
		
		arduinoConnection.on('close', function(reasonCode, description) {
			console.log((new Date()) + ' Peer ' + arduinoConnection.remoteAddress + ' disconnected.');
		});
	}
	
    if (request.requestedProtocols == 'browser') {
		var connection = request.accept('browser', request.origin);
		browserConnections.push(connection);
		console.log((new Date()) + ' Browser connection accepted.');
		
		connection.on('message', function(message) {
			if (message.type === 'utf8') {
				console.log('Received Message: ' + message.utf8Data);
				arduinoConnection.sendUTF(message.utf8Data);
			}
		});
		
		connection.on('close', function(reasonCode, description) {
			console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
		});
	}    
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});