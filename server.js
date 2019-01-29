const PORT = process.env.PORT || 3000;
const server = require('http').createServer().listen(PORT);
const io = require('socket.io')(server);
const mongoose = require('mongoose')

mongoose.connect('mongodb+srv://mattpassarelli:Barisax24@uexchange-db-7skbv.mongodb.net/test?retryWrites=true', {useNewUrlParser: true})

var count = 0;
var db = mongoose.connection;

var accountSchema = new mongoose.Schema({
	//TODO design and implement Account requirements
})

var requestSchema = new mongoose.Schema({
	//TODO design and implement request requirements
})

var Account = mongoose.model('Account', accountSchema)
var request = mongoose.model('Request', requestSchema)


db.on('error', console.error.bind(console, "connection error: "));
db.once('open', function() {
	console.log("Connected to Database :)!")
})

io.on("connect", (socket) =>
{
	console.log("User connected. User count: " + count);
    socket.emit('example', { hello: 'world' });
	count++;

	socket.on("disconnect", () =>
	{
		count--;
		console.log("User disconnected. User count: " + count)
	})
})

console.log("Listening on port: " + PORT)