const PORT = process.env.PORT || 3000;
const server = require('http').createServer().listen(PORT);
const io = require('socket.io')(server);
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');

var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: "app.uexchange@gmail.com",
		pass: "qiL9rY!*Hwsj",
	}
})

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
	verified: { type: Boolean, default: false },
	verificationCode: { type: Number },
	notifications: { type: Array }
})

//Scehma for the request Models
//TODO: I could not rely on an array of requests per user, instead having a visible boolean for the requests that determine if
//they get loaded or not. Let's me keep all requests for any reason
var requestSchema = new mongoose.Schema({
	//TODO design and implement request requirements
	title: 'string',
	subtitle: 'string',
	posterName: 'string',
	posterEmail: 'string',
	fulfiller_Email: 'string',
	dateCreated: { type: String, default: new Date() }
})

var conversationSchema = new mongoose.Schema({
	user1: 'string',
	user2: 'string',
	user1Name: 'string',
	user2Name: 'string',
	messages: { type: Array },
	dateCreated: { type: String, default: new Date() },
	request_ID: mongoose.mongo.ObjectID,
	requestType: 'string'
})

var Account = mongoose.model('Account', accountSchema)
var Request = mongoose.model('Request', requestSchema)
var Conversation = mongoose.model('Conversation', conversationSchema)

//Connect to the database in MongoDB Atlas
db.on('error', console.error.bind(console, "connection error: "));
db.once('open', function () {
	console.log("Connected to Database :)!")
})

//Listen for a client to connect
io.on("connection", (socket) => {

	count++;
	console.log("User connected. User count: " + count);

	socket.on("join", (data) => {
		console.log("User is: " + data.email)
		socket.join(data.email)
	})

	//listens for client disconnectes
	socket.on("disconnect", () => {
		count--;
		console.log("User disconnected. User count: " + count)
	})

	//takes Request data from frontend and adds to database
	socket.on("saveRequest", (data) => {
		/**
		 * TODO: 
		 * 
		 * Save request to User Account. Either by email or ID
		 */

		var newRequest = new Request({
			title: data.title,
			subtitle: data.subtitle,
			posterName: data.posterName,
			posterEmail: data.posterEmail
		})

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

		//Generates a 6 digit pin code. Ensures first digit is never 0
		var verCode = Math.floor(100000 + Math.random() * 900000);
		var salt = bcrypt.genSaltSync(10)
		var hash = bcrypt.hashSync(data.password, salt)


		var verificationEmail = ('Hello there, ' + data.firstName + " " + data.lastName + ',' + "<p>&nbsp; Your verification code is " + verCode + "</p> <p>&nbsp; Please go back to the app and type in this code to verify your account and login.</p> <p>&nbsp;Thank you,</p>	<p>&nbsp;&nbsp; UxEchange creator Matt</p>")

		Account.findOne({ email: data.email }, function (err, doc) {
			if (err) { console.log(err) }
			//Acount already found
			else if (doc) {
				console.log("Account found. Duplicate email: " + doc)
				socket.emit("creationReturn", ("Email Already Used"))
			}
			//No account found
			else {
				var newUser = new Account({
					firstName: data.firstName, lastName: data.lastName,
					email: data.email, phoneNumber: data.phoneNumber, password: hash, verificationCode: verCode
				})

				const verificationEmailOptions = {
					from: 'app.uexchange@gmail.com',
					to: newUser.email,
					subject: "Hello there! UxEchange Account Verification",
					html: (verificationEmail)
				}

				console.log("New user data: " + newUser)

				transporter.sendMail(verificationEmailOptions, function (err, info) {
					if (err) { console.log(err) }

					else { console.log(info) }
				})

				console.log("Email should have been sent")

				newUser.save(function (err, account) {
					if (err) { console.log(err) }
					else {
						console.log("Account has been added. Awaiting verification for user: " + account.email)

						socket.emit("creationReturn", ("Email Not Used"))
					}
				})
			}
		})
	})

	socket.on("verifyNewAccount", (data) => {

		/**
		 * TODO: Delete verification from document instead of setting to NULL
		 * Maybe? Maybe keep it in case it's needed
		 */

		console.log(data)



		Account.findOne({ email: data.email }, function (err, docs) {
			if (err) { console.log(err) }
			else {
				console.log(docs)
				var rtnMessage = "Default Messages"
				var codeFromAccount = docs.verificationCode
				var codeFromUser = data.pinCode

				var confirmationEmail = ("Hello there, " + docs.firstName + " " + docs.lastName + "," + "<p>&nbsp; Your account with UxEchange has been verified! You may now log into the app. </p> <p>&nbsp;Thank you,</p> <p>&nbsp;&nbsp; UxEchange creator Matt</p>")

				console.log("User: " + codeFromUser + " " + "Account: " + codeFromAccount)
				if (codeFromAccount === codeFromUser) {
					console.log("Codes matched. Attempting update...")

					Account.updateOne({ email: data.email }, { verified: true, verificationCode: null },
						{
							upsert: true,
						},
						function (err, response) {
							if (err) { console.log(err) }
						})

					rtnMessage = "Verification successful"
				}
				else {
					rtnMessage = "Codes do not match"
				}
				console.log(rtnMessage)

				const confirmationEmailOptions = {
					from: 'app.uexchange@gmail.com',
					to: data.email,
					subject: "Hello there! UxEchange Account Confirmation",
					html: (confirmationEmail)
				}

				transporter.sendMail(confirmationEmailOptions, function (err, info) {
					if (err) { console.log(err) }
					else {
						console.log(info)
					}
				})
				socket.emit("isAccountVerified", (rtnMessage))
			}
		})
	})

	socket.on("requestLogin", (data) => {
		//console.log(data)

		Account.findOne({ email: data.email }, function (err, doc) {

			if (err) { console.log(err) }
			else if (!doc) {
				console.log("No account found for email: " + data.email)
				socket.emit("loginReturn", { message: "Email Not Found" })
			}
			else {
				//found account
				console.log("Accound found for email: " + data.email)
				console.log(doc)

				if (doc.verified === true) {
					console.log("Account is Verified. Checking passwords")

					bcrypt.compare(data.password, doc.password, function (err, res) {
						if (err) { console.log(err) }
						else {
							if (res === true) {
								console.log("Passwords Match")
								socket.emit("loginReturn", { message: "Login Accepted", firstName: doc.firstName, lastName: doc.lastName })
							}
							else if (res === false) {
								console.log("Passwords do not match")
								socket.emit("loginReturn", { message: "Wrong Password" })
							}
						}
					})
				}
				else {
					console.log("Account is not verified")
					socket.emit("loginReturn", { message: "Account Not Verified" })
				}
			}
		})
	})

	//Someone has offered to fulfill a request
	socket.on("offerToConnect", (data) => {
		console.log(data)

		//Find the request the user selected
		Request.findOne({ _id: data.request_ID }, function (err, requestDoc) {
			if (err) { console.log(err) }
			else {
				console.log("Request found: " + requestDoc)

				//Add the fulfiller to the Request under the fulfiller_Email section
				Request.updateOne({ _id: data.request_ID }, { fulfiller_Email: data.fulfiller },
					{
						upsert: true,
					},
					function (err, response) {
						if (err) { console.log(err) }
						else {

							//Find that user and grab data from them so we can use it
							Account.findOne({ email: data.fulfiller }, function (err, doc) {
								if (err) { console.log(err) }
								else {
									var fullName = doc.firstName + " " + doc.lastName
									console.log("Fulfiller name: " + fullName)

									console.log("Fulfiller added to Request!")

									var notificationData =
									{
										fulFiller_Email: data.fulfiller,
										fulFiller_Name: fullName,
										requestTitle: requestDoc.title,
										requestBody: requestDoc.subtitle,
										dateOfNotification: new Date(),
										request_ID: requestDoc._id
									}

									/**Find the OP of the request and 
									 * add a new Notification with details
									 * about the fulfiller and the request the selected
									*/
									Account.findOne({ email: requestDoc.posterEmail }, function (err, accountDoc) {
										if (err) { console.log(err) }
										else {
											console.log("Poster email: " + requestDoc.posterEmail)
											Account.updateOne({ email: requestDoc.posterEmail }, { $push: { notifications: notificationData } },
												function (err, response) {
													if (err) { console.log(err) }
													else {
														console.log("Added to Account: " + notificationData)
													}
												})
										}
									})


									//console.log(requestDoc.posterEmail)
									//io.sockets.in(requestDoc.posterEmail).emit("newFulfillerNotification", (submitData))
								}
							})
						}
					})
			}
		})
	})

	//Pull notifications for the user requesting
	socket.on("pullNotifications", (data) => {
		console.log("User is requesting to pull notifications. User is: " + data)

		Account.findOne({ email: data }, function (err, doc) {
			if (err) { console.log(err) }
			else {
				var notes = doc.notifications

				socket.emit("receiveNotifications", (notes))
			}
		})
	})

	socket.on("createConversation", (data) => {
		console.log("Convo Data Received: " + (data))

		Conversation.findOne({ request_ID: data.request_ID }, function (err, convoDoc) {
			if (err) { console.log(err) }
			//Conversation related to request found
			else if (convoDoc) {
				socket.emit("convoReturn", (true))
			}
			//no conversation exists
			else {
				var newConversation = new Conversation({
					user1: data.user1,
					user2: data.user2,
					user1Name: data.user1Name,
					user2Name: data.user2Name,
					request_ID: data.request_ID,
					requestType: data.requestType
				})

				console.log("Conversation created")

				newConversation.save(function (err, convo) {
					if (err) { console.log(err) }
					else {
						console.log("Conversation Saved to DB: " + convo)
						socket.emit("convoReturn", (false))
					}
				})
			}
		})
	})

	socket.on("requestConversations", (data) => {
		console.log("User is requesting their conversations. User is: " + data.email)

		Conversation.find({ $or: [{ user1: data.email }, { user2: data.email }] }, function (err, docs) {
			if (err) { console.log(err) }
			//found conversations with that email
			else if (docs) {
				console.log("Potentially Found conversations with that email.")
				console.log(docs)
				socket.emit("conversationsFound", (docs))
			}
			else {
				console.log("User " + data.email + " is not in any conversations")
			}
		})
	})

	socket.on("requestUserID", (data) => {
		console.log("User is requesting their User_ID: " + data.email)

		Account.findOne({ email: data.email }, function (err, doc) {
			console.log("Account Found: " + doc)

			var user_ID = doc._id
			console.log("ID is: " + user_ID)

			socket.emit("userIDGiven", (user_ID))
		})
	})

	socket.on("addMessageToConvo", (data) => {
		console.log("ID: " + data._ID)
		console.log("Messages: " + data.messages)

		Conversation.findOneAndUpdate({ _id: data._ID }, { $push: { messages: data.messages } },
			function (err, reponse) {
				if (err) { console.log(err) }
				else {
					console.log("Added: " + data.messages + " to conversation: " + data._ID)

					//emit the socket to tell the other user to pull the message
					//IF they are actively in the chat screen

					//Does NOT work lmao
					// socket.emit("pullNewMessage")
					socket.broadcast.emit("pullNewMessage")
				}
			})
	})

	socket.on("requestConversationMessages", (data) => {
		console.log("Convo_ID for requesting Messages received is: " + data.convo_ID)
		console.log("Looking for conversation with that ID")

		Conversation.findOne({ _id: data.convo_ID }, function (err, convo) {
			if (err) { console.log(err) }
			else {
				console.log("Conversation found. Grabbing Messages")

				var messages = convo.messages
				console.log("Messages are: " + convo.messages)
				//or because I can't make JSONs work
				console.log("Messages are: " + convo)
				/**
				 * I guess since I have no real contorl over how I'm
				 * pulling the data from the DB, the messages come in
				 * reverse order. No big deal, I'll just flip the array.
				 */

				messages.reverse()

				socket.emit("conversationMessagesReceived", (messages))
			}
		})
	})
})


console.log("Listening on port: " + PORT)