'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlantIrradianceSchema = new Schema({
  Date: Date,
  Value: Number
});

module.exports = mongoose.model('PlantIrradiance', PlantIrradianceSchema);