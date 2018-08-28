'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlantPowerSchema = new Schema({
  Date: Date,
  Value: Number,
  : Number
});

module.exports = mongoose.model('PlantPower', PlantPowerSchema);