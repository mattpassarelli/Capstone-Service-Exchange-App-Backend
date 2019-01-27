const PORT = process.env.PORT || 3000;

const server = require('http').createServer().listen(PORT);
const io = require('socket.io')(server);

var count = 0;

io.on("connect", (socket) =>
{
	console.log("User connected " + count);
    socket.emit('example', { hello: 'world' });
	count++;

	socket.on("disconnect", () =>
	{
		console.log("User disconnected")
	})
})