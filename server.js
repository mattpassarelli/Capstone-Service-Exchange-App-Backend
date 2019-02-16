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
})

//Scehma for the request Models
//TODO: I could not rely on an array of requests per user, instead having a visible boolean for the requests that determine if
//they get loaded or not. Let's me keep all requests for any reason
var requestSchema = new mongoose.Schema({
	//TODO design and implement request requirements
	title: 'string',
	subtitle: 'string',
	posterName: 'string',
	posterEmail: 'string'
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
		/**
		 * TODO: 
		 * 
		 * Save request to User Account. Either by email or ID
		 */

		var newRequest = new Request({ title: data.title, subtitle: data.subtitle, posterName: data.posterName, posterEmail: data.posterEmail })

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
			else if (doc) {
				console.log("Account found. Duplicate email: " + doc)
				socket.emit("creationReturn", ("Email Already Used"))
			}
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

				transporter.sendMail(confirmationEmailOptions, function(err, info){
					if(err){console.log(err)}
					else{
						console.log(info)
					}
				})
				socket.emit("isAccountVerified", (rtnMessage))
			}
		})
	})

	socket.on("requestLogin", (data) => {
		//console.log(data)

		Account.findOne({email: data.email}, function(err, doc){
			
			if(err){console.log(err)}
			else if(!doc)
			{
				console.log("No account found for email: " + data.email)
				socket.emit("loginReturn", {message:"Email Not Found"})
			}
			else
			{
				//found account
				console.log("Accound found for email: " + data.email)
				console.log(doc)

				if(doc.verified === true)
				{
					console.log("Account is Verified. Checking passwords")

					bcrypt.compare(data.password, doc.password, function (err, res) {
						if (err) { console.log(err) }
						else {
							if(res === true)
							{
								console.log("Passwords Match")
								socket.emit("loginReturn", {message: "Login Accepted", firstName: doc.firstName, lastName: doc.lastName})
							}
							else if(res === false)
							{
								console.log("Passwords do not match")
								socket.emit("loginReturn", {message:"Wrong Password"})
							}
						}
					})
				}
				else
				{
					console.log("Account is not verified")
					socket.emit("loginReturn", {message:"Account Not Verified"})	
				}
			}
		})
	})
})


console.log("Listening on port: " + PORT)