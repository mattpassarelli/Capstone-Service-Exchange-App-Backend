const PORT = process.env.PORT || 3000;
const server = require('http').createServer().listen(PORT);
const io = require('socket.io')(server);
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');

var nev = require('email-verification')(mongoose);

mongoose.connect('mongodb+srv://mattpassarelli:Barisax24@uexchange-db-7skbv.mongodb.net/uexchange?retryWrites=true', { useNewUrlParser: true })

var count = 0;
var db = mongoose.connection;

//Scehma for the account Models
var accountSchema = new mongoose.Schema({
	//TODO design and implement Account requirements
	firstName: 'string',
	lastName: 'string',
	email: 'string',
	phoneNumber: 'string',
	password: 'string',
	verified: false,
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


nev.configure({
	persistentUserModel: Account,
	tempUserCollection: 'tempUsers',

	transportOptions: {
		service: 'Gmail',
		auth: {
			user: 'app.uexchange@gmail.com',
			pass: 'qiL9rY!*Hwsj'
		}
	},
	verifyMailOptions: {
		from: 'Do Not Reply <mattvpassarelli@gmail.com>',
		subject: 'Please confirm account',
		html: 'Click the following link to confirm your account:</p><p>${URL}</p>',
		text: 'Please confirm your account by clicking the following link: ${URL}'
	},

	shouldSendConfirmation: true,
	confirmMailOptions: {
		from: 'Do Not Reply <mattvpassarelli@gmail.com>',
        subject: 'Successfully verified!',
        html: '<p>Your account has been successfully verified.</p>',
        text: 'Your account has been successfully verified.'
    },


}, function (err, other) {
	if (err) { console.log(err) }
})

nev.generateTempUserModel(Account, function (err, tempUser) {
	if (err) {
		console.log(err)
		return;
	}
	console.log("Temp User: " + tempUser)
});


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

	socket.on("newUserRegistration", (data) => {

		var newUser = new Account({
			firstName: data.firstName, lastName: data.lastName,
			email: data.email, phoneNumber: data.phoneNumber, password: data.password
		})

		nev.createTempUser(newUser, function (err, existingPersistentUser, newTempUser) {
			// some sort of error
			if (err) { console.log(err) }

			if (existingPersistentUser) { console.log("User already exists") }

			if (newTempUser) {
				var URL = newTempUser[nev.options.URLFieldName]

				nev.sendVerificationEmail(newUser.email, URL, function (err, info) {
					if (err) { console.log(err) }

				})
			}
			else {
				console.log("Success?")
			}
		});

		console.log("New user data: " + newUser)

		var url = '...';
		nev.confirmTempUser(url, function (err, user) {
			if (err) { }
			// handle error...

			// user was found!
			if (user) {
				// optional
				nev.sendConfirmationEmail(user.email, function (err, info) {
					console.log("User is now verified")
				});
			}
		});
	})
})


console.log("Listening on port: " + PORT)