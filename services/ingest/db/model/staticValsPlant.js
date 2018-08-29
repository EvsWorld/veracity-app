'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StaticValsPlantSchema = new Schema({
  FacilityId: Number,
  FacilityName: String,
  PeakPower: Number,
  NominalPower: Number,
  LatAndLong: String,
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

module.exports = mongoose.model('StaticValsPlant', StaticValsPlantSchema);