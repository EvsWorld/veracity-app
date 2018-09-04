const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const facilitySchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    builtSince: String,
    commissioningDate: String,
    lat: String,
    long: String,
    country: String,
    continent: String,
    region: String,
    timeZone: String,
    pvModuleTech: String,
    pvModuleModel: String,
    typeOfFacility: String,
    inverterTech: String,
    inverterModel: String,
    mountingStructure: String,
    irradianceSensor: String,
    revenueType: String,
    price: String,
    remainingYears: String,
    expectedIrr: String,
    totalOpex: String,
    oAndM: String,
    taxes: String,
    budgetedProduction: String,
    budgetedPr: String,
    guaranteedAvailability: String,
    mountingSystem: String,
    visible: Boolean
  },
  { autoIndex: false }
);

const Facility = mongoose.model('Facility', facilitySchema);
module.exports = Facility;

