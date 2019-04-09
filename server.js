const PORT = process.env.PORT || 3000;
const server = require('http').createServer().listen(PORT);
const io = require('socket.io')(server);
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');
const Verifier = require("email-verifier");

var nodemailer = require('nodemailer');
var CONSTANTS = require('./constants')
let verifier = new Verifier(CONSTANTS.WHOIS_API_KEY, {
	checkCatchAll: false,
	checkDisposable: false,
	checkFree: false,
	validateDNS: true,
	validateSMTP: true
});


var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: CONSTANTS.APP_EMAIL,
		pass: CONSTANTS.APP_EMAIL_PASSWORD,
	}
})

mongoose.connect(CONSTANTS.MONGO_URL, { useNewUrlParser: true })

var count = 0;
var db = mongoose.connection;

//Scehma for the Nofiications
var notificationSchema = new mongoose.Schema({
	fulFiller_Email: 'string',
	fulFiller_Name: 'string',
	fulfiller_ExpoToken: 'string',
	posterExpoToken: 'string',
	requestTitle: 'string',
	requestBody: 'string',
	dateOfNotification: { type: String, default: new Date() },
	request_ID: mongoose.mongo.ObjectID,
	notification_ID: mongoose.mongo.ObjectID
})

//Schema for my Accounts
var accountSchema = new mongoose.Schema({
	//TODO design and implement Account requirements
	firstName: 'string',
	lastName: 'string',
	email: 'string',
	password: 'string',
	verified: { type: Boolean, default: false },
	verificationCode: { type: Number },
	notifications: [notificationSchema],
	expoNotificationToken: 'string'
})

//Request Schema 
var requestSchema = new mongoose.Schema({
	//TODO design and implement request requirements
	title: 'string',
	subtitle: 'string',
	posterName: 'string',
	posterEmail: 'string',
	fulfiller_Email: 'string',
	fulfiller_Name: 'string',
	dateCreated: { type: String, default: new Date() },
	isPublic: { type: Boolean, default: true },
	posterExpoToken: 'string',
})

//conversation Schema
var conversationSchema = new mongoose.Schema({
	user1: 'string',
	user2: 'string',
	user1Name: 'string',
	user2Name: 'string',
	user1ExpoToken: 'string',
	user2ExpoToken: 'string',
	messages: { type: Array },
	dateCreated: { type: String, default: new Date() },
	request_ID: mongoose.mongo.ObjectID,
	requestType: 'string',
	isPublic: { type: Boolean, default: true }
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

	//A client has connected
	socket.on("join", (data) => {
		try {
			console.log("User is: " + data.email)
			socket.join(data.email)
		} catch (error) {
			console.error(error)
		}
	})

	//listens for client disconnectes
	socket.on("disconnect", () => {
		count--;
		console.log("User disconnected. User count: " + count)
	})

	/**
	 * Once a user offers to connect, generate
	 * a notification and add it to the OP's
	 * account
	 */
	socket.on("addNotificationTokenToAccount", (data) => {
		try {
			console.log("Notification Data: ", [data.token, data.email])

			Account.findOneAndUpdate({ email: data.email }, { expoNotificationToken: data.token }, function (err, doc) {
				if (err) { console.log(err) }
				else {
					console.log("Notification token added to account")
				}
			})
		}
		catch (error) {
			console.error(error)
		}
	})

	//takes Request data from frontend and adds to database
	socket.on("saveRequest", (data) => {
		try {
			console.log("REQUEST DATA RECEVIED: ", data.posterEmail)

			Account.findOne({ email: data.posterEmail }, function (err, doc) {
				if (err) { console.log(err) }
				else if (doc) {
					var newRequest = new Request({
						title: data.title,
						subtitle: data.subtitle,
						posterName: data.posterName,
						posterEmail: data.posterEmail,
						posterExpoToken: doc.expoNotificationToken
					})

					/**
					 *  Fun fact about the save function below:
					 *  Mongoose automatically looks for the plural version of your model name,
					 *  saves me the trouble of having to figure out how to figure out how to 
					 *  send them to where they need to go
					 */

					//Take the newRequest var and save that to the database
					newRequest.save(function (err, request) {
						if (err) { throw err }

						else {
							console.log("Request added: " + request)
							socket.emit("requestAddCallback", ("success"))
						}
					})
				}
			})
		}
		catch (error) {
			console.log(error)
		}
	})

	//Will gather all requests (that are public/"not deleted") from DB and send to client on connect and on refresh
	socket.on("requestRequests", () => {
		console.log("A user is requesting to download Requests")
		try {
			Request.find({ isPublic: true }, function (err, data) {
				if (!err) {
					socket.emit("requestData", data);
				}
				else {
					throw err
				}
			})
		}
		catch (error) {
			console.error(error)
		}
	})

	/**
	 * Generate new User model and add it to our DB.
	 * This account is eventually cross checked 
	 * with logging in
	 */
	socket.on("newUserRegistration", (data) => {

		try {
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

					/**
					 * TODO: ADD CALLBack for if this whole thing fails
					 */

					//Verify email with WHOIS to make sure it's a valid email
					verifier.verify(data.email, (error, rtn) => {
						if (error) { console.log(error) }
						else {
							console.log(rtn)

							if (rtn.formatCheck === 'true' && rtn.smtpCheck === 'true' && rtn.dnsCheck === 'true') {
								console.log("FORMATING GOOD!!")

								var newUser = new Account({
									firstName: data.firstName, lastName: data.lastName,
									email: data.email, password: hash, verificationCode: verCode,
									expoNotificationToken: data.expoNotificationToken
								})

								const verificationEmailOptions = {
									from: CONSTANTS.APP_EMAIL,
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
							else {
								console.log("Error with email validation")
								socket.emit("creationReturn", ("Error with Email"))
							}
						}
					})

				}

			})
		}


		catch (error) {
			console.error(error)
		}


	})

	/** 
	 * The user submits the 6 digit pin gotten
	 * from their email and is checked against
	 * the pin in their account in order to 
	 * verify it
	 */
	socket.on("verifyNewAccount", (data) => {

		try {
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

						const confirmationEmailOptions = {
							from: CONSTANTS.APP_EMAIL,
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
					}
					else {
						rtnMessage = "Codes do not match"
					}
					console.log(rtnMessage)


					socket.emit("isAccountVerified", (rtnMessage))
				}
			})
		}
		catch (error) {
			console.error(error)
		}
	})

	/**
	 * Cross check the email and password
	 * submitted from the login screen with
	 * what is store in the account with the 
	 * email the user submitted
	 */
	socket.on("requestLogin", (data) => {
		//console.log(data)

		try {
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
		}
		catch (error) {
			console.error(error)
		}
	})

	//Someone has offered to fulfill a request
	socket.on("offerToConnect", (data) => {
		try {
			console.log(data)

			//Find the request the user selected
			Request.findOne({ _id: data.request_ID }, function (err, requestDoc) {
				if (err) { console.log(err) }
				else {
					console.log("Request found: " + requestDoc)

					//Add the fulfiller to the Request under the fulfiller_Email section
					Request.updateOne({ _id: data.request_ID }, { fulfiller_Email: data.fulfiller, fulfiller_Name: data.fulFiller_Name },
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



										/**Find the OP of the request and 
										 * add a new Notification with details
										 * about the fulfiller and the request the selected
										*/
										Account.findOne({ email: requestDoc.posterEmail }, function (err, accountDoc) {
											if (err) { console.log(err) }
											else {
												// var reqID = requestDoc._id
												// console.log(reqID)
												accountDoc.notifications.push({
													fulFiller_Email: data.fulfiller,
													fulFiller_Name: fullName,
													fulfiller_ExpoToken: doc.expoNotificationToken,
													posterExpoToken: accountDoc.expoNotificationToken,
													requestTitle: requestDoc.title,
													requestBody: requestDoc.subtitle,
													request_ID: mongoose.Types.ObjectId(requestDoc._id),
												})
												var subdoc = accountDoc.notifications[0];
												console.log("NOTIFICATION: " + subdoc);
												subdoc.isNew;
												
												accountDoc.save(function(err){
													if(err){console.log(err)}
													else {
														console.log("Notification added!")
													}
												})
											}
										})
									}
								})
							}
						})
				}
			})
		}
		catch (error) {
			console.error(error)
		}
	})

	//Pull notifications for the user requesting
	socket.on("pullNotifications", (data) => {
		try {
			console.log("User is requesting to pull notifications. User is: " + data)

			Account.findOne({ email: data }, function (err, doc) {
				if (err) { console.log(err) }
				else {
					var notes = doc.notifications

					socket.emit("receiveNotifications", (notes))
				}
			})
		}
		catch (error) {
			console.error(error)
		}
	})

	/**
	 * Create a conversation between the 2 accounts
	 * if the request OP accepts the offer to help
	 */
	socket.on("createConversation", (data) => {
		try {
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
						requestType: data.requestType,
						user1ExpoToken: data.user1ExpoToken,
						user2ExpoToken: data.user2ExpoToken
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
		}
		catch (error) {
			console.error(error)
		}
	})

	//Load conversation the user is a part of when loading
	//the conversation tab
	socket.on("requestConversations", (data) => {
		try {
			console.log("User is requesting their conversations. User is: " + data.email)

			Conversation.find({
				$and: [
					{
						$or: [{ user1: data.email }, { user2: data.email }],
					},
					{ isPublic: true }
				]
			}, function (err, docs) {
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
		}
		catch (error) {
			console.error(error)
		}
	})

	/**
	 * When loading a conversation, I need the userID
	 * in order to properly sort the messages and check
	 * who the poster of the request is for closing
	 * properly
	 */
	socket.on("requestUserID", (data) => {
		try {
			console.log("User is requesting their User_ID: " + data.email)

			Account.findOne({ email: data.email }, function (err, doc) {
				console.log("Account Found: " + doc)

				var user_ID = doc._id
				console.log("ID is: " + user_ID)

				socket.emit("userIDGiven", (user_ID))
			})
		} catch (error) {
			console.error(error)
		}
	})

	/**
	 * Add new message to the conversation thread
	 */
	socket.on("addMessageToConvo", (data) => {
		try {
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
		} catch (error) {
			console.error(error)
		}
	})

	//Load the messages in the specific thread when thread is loaded
	socket.on("requestConversationMessages", (data) => {
		try {
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
		} catch (error) {
			console.error(error)
		}
	})

	//Load all active requests the user has made in the
	//Personal Request screen
	socket.on("requestPersonalRequests", (data) => {
		try {
			console.log("User requesting their personal Requests: " + data)

			Request.find({ $and: [{ posterEmail: data }, { isPublic: true }] }, function (err, docs) {
				if (err) { console.log(err) }
				else {
					console.log("Requests found for user: " + docs)
					console.log("Found Requests. Sending to user")

					socket.emit("personalRequestsReceived", (docs))
				}
			})
		} catch (error) {
			console.error(error)
		}
	})

	//Delete the request the user has selected
	socket.on("deletePersonalRequest", (request_ID) => {
		try {
			console.log("Requesting to delete request with ID: " + request_ID)

			Request.findOne({ _id: request_ID }, function (err, doc) {
				if (err) {
					console.log(error)
					socket.emit("deletingRequestCallback", ("error"))
				}
				else {
					console.log("Request found. Deleting...")

					Request.findOneAndUpdate({ _id: request_ID }, { isPublic: false }, function (err, response) {
						if (err) { console.log(err) }
						else {
							Conversation.findOneAndUpdate({ request_ID: request_ID }, { isPublic: false }, function (err, response) {
								if (err) { console.log(err) }
								else {
									socket.emit("deletingRequestCallback", ("success"))
								}
							})
						}
					})
				}
			})
		} catch (error) {
			console.error(error)
		}
	})

	//Remove a specific message thread via it's ID
	socket.on("removeConversationOnly", (convo_ID) => {
		try {
			console.log("Deleting conversation only with ID: " + convo_ID)

			Conversation.findOneAndUpdate({ _id: convo_ID }, { isPublic: false }, function (err, response) {
				if (err) {
					console.log(err)
					socket.emit("removingConversationCallback", ("error"))
				}
				else {
					socket.emit("removingConversationCallback", ("success"))
				}
			})
		} catch (error) {
			console.error(error)
		}
	})

	//Get the creator of a request inside a Conversation
	//so I can limit who can actually close it
	socket.on("requestConversationRequestCreator", (request_ID) => {
		console.log("Getting creator email for request: " + request_ID)

		try {
			Request.findOne({ _id: request_ID }, function (err, doc) {
				if (err) { console.log(err) }
				else {
					socket.emit("requestCreatorEmailReceived", doc.posterEmail)
				}
			})
		}
		catch (error) {
			console.log(error)
		}
	})

	//Remove notification from User's account
	socket.on("DeleteNotification", (data) => {
		try{
			console.log("Deleteing notification. ID Received:" + data.ID)
			console.log("User is: " + data.email)
			
			Account.findOne({email: data.email}, function(err, account){
				if(err){
					console.log(err)
					socket.emit("NoteDeleteCallback", "Error")
				}
				else {
					account.notifications.id(data.ID).remove();
					account.save(function(err){
						if(err){console.log(err)}
						else {
							console.log("Notification Removed");
							socket.emit("NoteDeleteCallback", "Success")
						}
					})
				}
			})
		}
		catch(error){
			console.error(error.message)
		}
	})
})


console.log("Listening on port: " + PORT)