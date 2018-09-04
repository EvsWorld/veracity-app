 /*Start of connection to database*/


 const path = require('path'); // Used to resolve paths properly.
 require('dotenv').config({
   path: path.resolve(__dirname, '../.env')
 });
 
 //const dbConnectionString = process.env.MONGODB_LOCAL_CON_STRING;
 // const dbConnectionString = process.env.COSMOSDB_CON_STRING_1;
 // const dbConnectionString = process.env.COSMOSDB_CON_STRING_2;
  const dbConnectionString = process.env.MLABDB_CON_STRING;
 
 const mongoose = require('mongoose');
 mongoose.Promise = require('bluebird');
 const mongooseOptions = {
     socketTimeoutMS: 60000,
     keepAlive: true,
     reconnectTries: 60000,
     useNewUrlParser: true  // to handle some error re: deprecated
 };
 
 // const Schema = mongoose.Schema;
 
 console.log('our connection string is...', dbConnectionString)
 // opens connection to mongodb
 mongoose.connect(`${dbConnectionString}/mikedatabase`, mongooseOptions);
 const db = mongoose.connection;
 db.on('error', console.error.bind(console, 'connection error:'));
 db.once('open', async () => {
   // we're connected!
   
 });
 