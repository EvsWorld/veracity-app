'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InverterPowerSchema = new Schema({
  Date: Date,
  Value: Number,
  DataSourceId: Number
});

module.exports = mongoose.model('InverterPower', InverterPowerSchema);