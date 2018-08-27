'use strict';

const path = require('path'); // Used to resolve paths properly.
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

const dbConnectionString = process.env.MONGODB_LOCAL_CON_STRING;
// const dbConnectionString = process.env.COSMOSDB_CON_STRING_1;
// const dbConnectionString = process.env.COSMOSDB_CON_STRING_2;
// const dbConnectionString = process.env.MLABDB_CON_STRING;

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const mongooseOptions = {
    socketTimeoutMS: 30000,
    keepAlive: true,
    reconnectTries: 30000,
    useNewUrlParser: true  // to handle some error re: deprecated
};

// const Schema = mongoose.Schema;

console.log('our connection string is...', dbConnectionString)
// opens connection to mongodb
mongoose.connect(`${dbConnectionString}/instatrust-temp`, mongooseOptions);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async () => {
  // we're connected!



// TODO: Should this schema be broken into multiple documents? (ie
// seperate documents for PowerAtPlantLevel,
// IrradianceAtPlantLevel,PowerAtInverterLevel, then one document for the
// rest of the statics props?  )
// Or maybe struture it as: each time stamp gets its own doc, but goes in
// different collections (ie collections for
// PowerAtPlantLevel,IrradianceAtPlantLevel,PowerAtInverterLevel).


// Functions added to the methods property of a schema get compiled into
// the Model prototype and exposed on each document instance:
// const tempInputFacility = new Facility(
//   { FacilityId: facId,
//     PowerAtPlantLevel: powerAtPlantLevel,
//     IrradianceAtPlantLevel: irradianceAtPlantLevel,
//     InverterPower: powerAtInverterLevel,
//     RevenueType: 'dollhairs'
//   });
// tempInputFacility.save(function (err, tempInputFacility) {
//   if (err) return console.error(err);
//   tempInputFacility.sayHello();
// });

// Say time goes by and we want to display all the kittens we've seen.
// We can access all of the kitten documents through our Facility model.
// Facility.find(function (err, facilities) {
//   if (err) return console.error(err);
//   console.log(facilities);
// })

// We just logged all of the facilities in our db to the console. If we
// want to filter our facilities by name, Mongoose supports MongoDBs rich
// querying syntax.
// Facility.find({ taxes: /dollhairs/ }, values => {
//   console.log('values from kitten query = ', values)
// });
// This performs a search for all documents with a name property that
// begins with "Fluff" and returns the result as an array of facilities to
// the callback.
});
