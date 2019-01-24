import Account from "../models/Account"
import moment from "moment"

export const index = (req,res,next) => {
    Account.find().lean().exec((err,Account) => res.json(
        {Account: Account.map(account => ({
            ...Account
        }))}
    ))
}