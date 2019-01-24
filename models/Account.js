import mongoose, { Schema } from 'mongoose';

// Define movie schema
var accountSchema = new Schema({
  name: {
    first: String,
    last: String,
  },
  email: String,
  password: String,
  phone: String,
});

// Export Mongoose model
export default mongoose.model('Users', accountSchema);