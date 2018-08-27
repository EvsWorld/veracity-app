'use strict';
// TODO: take this out of here, and put in controller used to save this into the
// instatrust db
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StaticInfoSchema = new Schema({
  FacilityId: Number,
  FacilityName: String,
  PeakPower: Number,
  NominalPower: Number,
  Longitude: Number,
  Latitude: Number,
  TimeZone: String,
  Country: String,
  PVmoduleTechnology: String,
  PVmoduleModel: String,
  InverterTechnology: String,
  InverterModel: String,
  MountingStructure: String,
  IrradianceSensor: String,
  RevenueType: String,
  Price: Number,
  RemainingYears: Number,
  ExpectedIRR: Number,
  TotalOPEX: Number,
  OandM: Number,
  Taxes: Number,
  P50Production: Number,
  BudgetedPR: Number,
  GuaranteedAvailability: Number
});

module.exports = mongoose.model('StaticInfo', StaticInfoSchema);