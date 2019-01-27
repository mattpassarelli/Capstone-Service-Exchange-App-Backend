import pymongo
from flask import Flask, request, jsonify, json, render_template
from flask_socketio import SocketIO, send, emit
from flask_cors import CORS

myclient = pymongo.MongoClient("mongodb+srv://mattpassarelli:Barisax24@uexchange-db-7skbv.mongodb.net/test?retryWrites=true")

app = Flask(__name__)
app.config['SECRET_KEY'] = 'Barisax24'
socketio = SocketIO(app)
CORS(app)


if __name__ == '__main__':
    socketio.run(app, debug=True)


mydb = myclient["UExchange"]
accounts = mydb["Accounts"]
requests = mydb["Requests"]

# testAccount = {"_id": "0" , "name" : "Tester", "phone" : "555-555-5555", "email" : "school@edu.edu", "password" : "password",}
# testRequest = {"_id": "0", "title" : "REQUEST", "subtitle" : "This is a request for xyz", "assignedUser" : "0", "pickedUpUser": "TBD", "pickedUp" : False}

# x = accounts.insert_one(testAccount)
# y = requests.insert_one(testRequest)
# print(x.inserted_id)
# print(y.inserted_id)


@socketio.on("connect")
def test_connection():
    data = {"user" : "General Kenobi!"}
    socketio.emit("connect", "General" + data)