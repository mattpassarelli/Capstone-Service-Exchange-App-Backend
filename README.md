# This Project is now dead.
It served my purpose for a capstone. Should I want to return to it, it will need rebuilding from the ground up with newer experiences and better everything.

# CPSC 498 Capstone - UExchange Backend

UExchange is designed to make it easy for college students to find help with common and uncommon tasks alike, like moving furniture, finding rides, finding old textbooks, and more. Using a simple and responsive UI build with React Native, UExchange will be available on both iOS and Android from the same source code. This makes it easy for college students to connect with each other for a common goal of helping each other thrive. 

## Quick Note

I do understand that this isn't very secure for having a backend on a public site like github. My plan after the semester ended, was to remove this repo entirely so it couldn't be found and change the password that connects to my database. I can't make it private as Professor Kreider doesn't seem to have a github account with his edu email I can add, so I'm not sure how to do that.

This all would've been fine, had Heroku not required my Constants file to be present as well. I will work something out soon.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system. 

If you would like to use a local frontend, you can find my repo for that [here](https://github.com/mattpassarelli/Capstone-Service-Exchange-App)

### Prerequisites

What you need to install the software and how to install them

```
- NodeJS
```

This one is simple :)

### Installing

```
1) Clone the repo with "git clone https://github.com/mattpassarelli/Capstone-Service-Exchange-App-Backend.git"
2) Install the necessary modules with "npm install"
3) Run the server with "npm start"
```

## Follow Up

You'll notice that when you run the server, it'll connect to my database stored in Mongo's Atlas cloud system. That's how this all works. Running it on your local machine is doable if you prefer. Just replace the MONGO.URL in my Constants file with your address to the database (if you installed Mongo locally and created one, it'll be something like "localhost:XXXXX/[yourDatabaseName]" with XXXXX being it's port number, most likely 27017).

## Built With

* [Mongoose](https://mongoosejs.com/)
* [MongoDB](https://www.mongodb.com/)
* [NodeJS](https://nodejs.org/en/)

## Authors

* **Matt Passarelli** - *Everything* - [Matt Passarelli](https://github.com/mattpassarelli)

## Acknowledgments

* The numerous npm modules I've used
* Professor Kreider for the chance to get this off the ground
