import mongoose from "mongoose"
import Account from "./models/Account"

//node_modules/babel-cli/bin/babel-node.js populate.js

/**
 * as a note, this account below is not to log into the database, that is only stored locally
 * on my machine. It's a testing account for the app once I integrate the front end with the
 * backend here. It's absolutely not meant to be an actual password any account.
 * 
 * They WILL BE HASHED AND SECURED down the line
 */
const accounts = [
    {
        name: {
            first: "Matt",
            last: "Passarelli"  
        },
        email: 'matthew.passarelli.15@cnu.edu',
        password: 'password',
        phone: '559-799-7963'
    }
]

mongoose.connect('mongodb://localhost/accounts');

accounts.map(data => {
    // Initialize a model with movie data
    const account = new Account(data);
    // and save it into the database
    account.save();
  });
