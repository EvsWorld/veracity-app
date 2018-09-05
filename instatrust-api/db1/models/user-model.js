const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userName: String,
    email: String,
    profileType: String,
    activeFacilities: [{ type: Schema.Types.ObjectId, ref: 'Facility' }],
    activeProjects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    activeRfp: [{
        id: String,
        pdfUrl: String,
        questionsAndAnswers: [{ id:String, question: String, answer: String }]
    }],
    favouriteProjects: [{ id: String, typeOfFavourite: String }],
    favouriteAssets: [{ id: String, typeOfFavourites: String }]
  },
  { autoIndex: false }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
