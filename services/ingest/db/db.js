'use strict';

const path = require('path'); // Used to resolve paths properly.
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});


const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');


// const baseDbConnectionString = process.env.MONGODB_LOCAL_CON_STRING;
const baseDbConnectionString = process.env.COSMOSDB_CON_STRING_1;
// const baseDbConnectionString = process.env.COSMOSDB_CON_STRING_2;
// const baseDbConnectionString = process.env.MLABDB_CON_STRING;

const dbName = 'instatrust-temp';
const dbConnectionString = `${baseDbConnectionString}/${dbName}?ssl=true&replicaSet=globaldb`;

// works w mlab
const mongooseOptions1 = {
  socketTimeoutMS: 100000,
  keepAlive: true,
  reconnectTries: 100000,
  useNewUrlParser: true
};

const mongooseOptions2 = {
  auto_reconnect: true,
  poolSize: 10,
  socketOptions: {
    keepAlive: 1
  },
  numberOfRetries: 10,
  retryMiliSeconds: 1000,
  useNewUrlParser: true
};

const mongooseOptions3 = {
  // useNewUrlParser: true,
  auto_reconnect: true,
  connectTimeoutMS: 3600000,
  keepAlive: 3600000,
  socketTimeoutMS: 3600000,
  useNewUrlParser: true
};
// NOTE:
// .createConnection() returns a Connection instance
// .connect() returns the global mongoose instance

// const db = mongoose.createConnection(`${baseDbConnectionString}/${dbName}?ssl=true&replicaSet=globaldb`, mongooseOptions1);

// const Schema = mongoose.Schema;

// opens connection to mongodb
mongoose.connect(dbConnectionString, mongooseOptions3);
const db = mongoose.connection;

console.log('our connection string is...', `${dbConnectionString}/${dbName}?ssl=true&replicaSet=globaldb`)

db.on('error', console.error.bind(console, 'connection error:'));
// db.on('error', function (err) {
//   console.log("DB connection Error: " + err);
// });
// db.on('open', function () {
//   console.log("DB connected");
// });
// db.on('close', function (str) {
//   console.log("DB disconnected: " + str);
// });

db.once('open', async () => {
  // were connected???  do things here??
  console.log("Connected to DB");


  const Family = mongoose.model('Family', new mongoose.Schema({
    lastName: String,
    parents: [{
      familyName: String,
      firstName: String,
      gender: String
    }],
    children: [{
      familyName: String,
      firstName: String,
      gender: String,
      grade: Number
    }],
    pets: [{
      givenName: String
    }],
    address: {
      country: String,
      state: String,
      city: String
    }
  }));
  const family = new Family({
    lastName: "Volum",
    parents: [{
        firstName: "Thomas"
      },
      {
        firstName: "Mary Kay"
      }
    ],
    children: [{
        firstName: "Ryan",
        gender: "male",
        grade: 8
      },
      {
        firstName: "Patrick",
        gender: "male",
        grade: 7
      }
    ],
    pets: [{
      givenName: "Blackie"
    }],
    address: {
      country: "USA",
      state: "WA",
      city: "Seattle"
    }
  });
  family.save((err, saveFamily) => {
    console.log(JSON.stringify(saveFamily));
  });
});

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