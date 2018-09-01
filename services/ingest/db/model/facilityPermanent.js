'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const exampleObjToStore = {
  "PR": [{
    "Date": "2015-6-1",
    "Value": 0.6645976701123069
  }, {
    "Date": "2015-7-1",
    "Value": 0.6573960055787976
  }, {
    "Date": "2015-8-1",
    "Value": 0.6690006765740231
  }, {
    "Date": "2015-9-1",
    "Value": 0.6640767895681832
  }, {
    "Date": "2015-10-1",
    "Value": 0.7031734253592385
  }, {
    "Date": "2015-11-1",
    "Value": 0.724382391577445
  }, {
    "Date": "2015-12-1",
    "Value": 0.7527012104093616
  }, {
    "Date": "2016-1-1",
    "Value": 0.7467105336021523
  }],
  "Availability": [{
    "Date": "2015-6-1",
    "Value": 99.5483288166215
  }, {
    "Date": "2015-7-1",
    "Value": 99.79091995221027
  }, {
    "Date": "2015-8-1",
    "Value": 99.93686868686868
  }, {
    "Date": "2015-9-1",
    "Value": 100.0
  }, {
    "Date": "2015-10-1",
    "Value": 100.0
  }, {
    "Date": "2015-11-1",
    "Value": 97.22222222222221
  }, {
    "Date": "2015-12-1",
    "Value": 100.0
  }, {
    "Date": "2016-1-1",
    "Value": 100.0
  }],
  "Irradiance": [{
    "Date": "2015-6-1",
    "Value": 106.31443939393937
  }, {
    "Date": "2015-7-1",
    "Value": 324.8692537878788
  }, {
    "Date": "2015-8-1",
    "Value": 293.73133207070697
  }, {
    "Date": "2015-9-1",
    "Value": 236.55214898989902
  }, {
    "Date": "2015-10-1",
    "Value": 139.67740151515162
  }, {
    "Date": "2015-11-1",
    "Value": 4.620349747474747
  }, {
    "Date": "2015-12-1",
    "Value": 45.154186868686864
  }, {
    "Date": "2016-1-1",
    "Value": 5.700204545454546
  }],
  "Power Trend": 0.0064,
  "Data Quality": 9.701157249829816,
  "PR12": 0.6723281112733553,
  "PR12 Corrected": 0.701902634553707
}

const facilityPermanentSchema = new Schema({
  PR: [{
    "Date": Date,
    "Value": Number
  }],
  Availability: [{
    "Date": Date,
    "Value": Number
  }],
  Irradiance: [{
    "Date": Date,
    "Value": Number
  }],
  PowerTrend: Number,
  DataQuality: Number,
  PR12: Number,
  PR12Corrected: Number,
});

module.exports = mongoose.model('facilityPermanent', facilityPermanentSchema);