const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.promise = Promise;

const FacilitySchema = new Schema({
  monthlyIrradiance: [{
      monthDate: Date,
      power: Number
    }],
  monthlyAvailability: Array,
  peakPower: Number,
  name: String,
  size: Number,
  nominalPower: Number,
  monthlyPR: Array
});

/* const InverterSchema = new Schema({
  DeviceId: String,
  PowerMonthlyAvg: Number,
  IrradianceMonthlyAvg: Number,
  FacilityId: {
    type: Schema.Types.ObjectId,
    ref: 'Facility'
  }
}) */

/* So in our Facility schema, we reference the Inverter/inverter collection, because we want the
user/facility to be tied to the things they inverter (we want the facility to be
tied to its inverters), and we want to be able to easily access
those inverters/inverters without having to create more queries.
*/


const Inverter = mongoose.model('Inverter', InverterSchema, 'inverters');
const Facility = mongoose.model('Facility', FacilitySchema, 'users');

// By providing the ‘inverters’ argument, we’ve told .populate() what property in
// our user document we want it to work with. this populate happens where you'll
// be using the data (ie a controller)
function getFacilityWithInverters(username){
  return Facility.findOne({ username: username })
    .populate('inverters').exec((err, inverters) => {
      console.log("Populated Facility " + inverters);
    })
}
module.exports = {
  Facility, Inverter,
}