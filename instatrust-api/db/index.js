// const mongoose = require('mongoose');
// const { databaseConfig } = require('../config');

/* 

const cosmosConnectStringHardCoded =
  'mongodb://azurecosmosdbaccountevan:sA4vaugVTvQbTCCvscsACwRmVTd0ReW6d4b8BaCTb61sOmadCsjDa4UcUaRATeEl2tWOYuXfHZJ7qkWvBXCOaQ==@azurecosmosdbaccountevan.documents.azure.com:10255/?ssl=true&replicaSet=globaldb';

const dbURL = databaseConfig.cosmosConnectString;

mongoose.Promise = global.Promise;
// mongoose.set(‘debug’, true);
// Const mongoUri = `mongodb://${env.dbName}.documents.azure.com:${env.cosmosPort}/?ssl=true`;

 function connect() {
  return mongoose.connect(mongoUri, { auth: { user: env.dbName, pass: env.key }});


function connect () {
  return mongoose.connect(dbURL);
}

const db = mongoose.connection;
db.on('error', function (err) {
  console.error('There was a db connection error');
  return  console.error(err.message);
});
db.once('connected', function () {
  return console.log('Successfully connected to ' + dbURL);
});
db.once('disconnected', function () {
  return console.error('Successfully disconnected from ' + dbURL);
});
module.exports = {
  connect,
  mongoose
};

*/



// EXPERIMENT:

/* Mongo Database
* - this is where we set up our connection to the mongo database
*/

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
let MONGO_URL;
const MONGO_LOCAL_URL = 'mongodb://127.0.0.1';

if (process.env.COSMOSDB_URI) {
	mongoose.connect(process.env.COSMOSDB_URI);
	MONGO_URL = process.env.COSMOSDB_URI;
} else {
	mongoose.connect(MONGO_LOCAL_URL); // local mongo url;
	MONGO_URL = MONGO_LOCAL_URL;
}

// should mongoose.connection be put in the call back of mongoose.connect???
const db = mongoose.connection;
db.on('error', err => {
	console.log(`There was an error connecting to the database: ${err}`);
})
db.once('open', () => {
	console.log(
		`You have successfully connected to your mongo database: ${MONGO_URL}`
	);
});

module.exports = db;