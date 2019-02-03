const PORT = process.env.PORT || 3000;
const server = require('http').createServer().listen(PORT);
const io = require('socket.io')(server);
const mongoose = require('mongoose')

mongoose.connect('mongodb+srv://mattpassarelli:Barisax24@uexchange-db-7skbv.mongodb.net/uexchange?retryWrites=true', { useNewUrlParser: true })

var count = 0;
var db = mongoose.connection;

//Scehma for the account Models
var accountSchema = new mongoose.Schema({
	//TODO design and implement Account requirements
})

//Scehma for the request Models
var requestSchema = new mongoose.Schema({
	//TODO design and implement request requirements
	title: 'string',
	subtitle: 'string',
	posterID: 'Number'
})

var Account = mongoose.model('Account', accountSchema)
var Request = mongoose.model('Request', requestSchema)

//Connect to the database in MongoDB Atlas
db.on('error', console.error.bind(console, "connection error: "));
db.once('open', function () {
	console.log("Connected to Database :)!")
})

//Listen for a client to connect
io.on("connect", (socket) => {
	count++;
	console.log("User connected. User count: " + count);

	//listens for client disconnectes
	socket.on("disconnect", () => {
		count--;
		console.log("User disconnected. User count: " + count)
	})

	//takes Request data from frontend and adds to database
	socket.on("saveRequest", (data) => {
		var newRequest = new Request({ title: data.title, subtitle: data.subtitle, posterID: data.posterID })

		/**
		 *  Fun fact about the save function below:
		 *  Mongoose automatically looks for the plural version of your model name,
		 *  saves me the trouble of having to figure out how to figure out how to 
		 *  send them to where they need to go
		 */

		//Take the newRequest var and save that to the database
		newRequest.save(function (err, request) {
			if (err) throw err;

			console.log("Request added: " + request)
		})
	})

	//Will gather all requests from DB and send to client on connect and refresh
	socket.on("requestRequests", () => {
		console.log("A user is requesting to download Requests")
		Request.find({}, function (err, data) {
			if (!err) {
				socket.emit("requestData", data);
			}
			else {
				throw err
			}
		})
	})
})


console.log("Listening on port: " + PORT)