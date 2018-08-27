'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InverterPowerSchema = new Schema({
  D: Date,
  V: Number,
  DsId: Number
});

module.exports = mongoose.model('InverterPower', InverterPowerSchema);