const express = require('express');
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

var connCounter = 0;

const server = express()
	.use((req, res) => res.sendFile(INDEX))
	.listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server);


io.on('connect', (socket) => {
	connCounter++;
	console.log('Client connected');
	console.log(connCounter)
	socket.on('disconnect', () => {
		console.log('Client disconnected')
		connCounter--;
		console.log(connCounter)
	});
});

  //setInterval(() => io.emit('time', new Date().toTimeString()), 1000);
