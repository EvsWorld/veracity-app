
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    profileType: String,
    activeFacilities: [{ id: String }],
    activeProjects: [{ id: String }],
    activeRfp: [{
        id: String,
        pdfUrl: String,
        questionsAndAnswers: [{ id:String, question: String, answer: String }]
    }],
    favouriteProjects: [{ id: String, typeOfFavourite: String, ref: project }],
    favouriteAssets: []

   
  },
  { autoIndex: false }
);

const User1 = mongoose.model('User1', userSchema);
module.exports = User1;
