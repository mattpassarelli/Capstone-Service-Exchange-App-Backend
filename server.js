const server = require('http').createServer().listen(3000);
const io = require('socket.io')(server);

var count = 0;

io.on("connect", (socket) =>
{
	console.log("User connected " + count);
	count++;

	socket.on("disconnect", () =>
	{
		console.log("User disconnected")
	})
})