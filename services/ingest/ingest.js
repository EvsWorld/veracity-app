#! /usr/bin/env node

// logger example

var log4js = require('log4js');
log4js.configure({
  appenders: { cheese: { type: 'file', filename: 'cheese.log' } },
  categories: { default: { appenders: ['cheese'], level: 'error' } }
});

const logger = log4js.getLogger('cheese');
logger.trace('Entering cheese testing');
logger.debug('Got cheese.');
logger.info('Cheese is Gouda.');
logger.warn('Cheese is quite smelly.');
logger.error('Cheese is too ripe!');
logger.fatal('Cheese was breeding ground for listeria.');

console.log('this is from console.log');
process.stdout.write('this is from process.stdout.write\n')

// http://robdodson.me/how-to-run-a-node-script-from-the-command-line/
const axios = require('axios');
// ******** Database Config (will go in another file) ********
// const mongoose = require("mongoose");
// mongoose.Promise = global.Promise;
// mongoose.connect(process.env.COSMOSDB_URI);
// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', function() {
  // console.log(` we're connected!`);
  
  
  
  
  
  
  /* After connecting to the database in our app.js we need to define our Schema.
  Here are the lines you need to add to the app.js. */
  /* const assetSchema = new mongoose.Schema({
    assetName: String,
    assetAddress: String,
    assetCapacity: Number,
    assetKPIExample1: Number,
    assetKPIExample2: Number
  }); */
  
  /* Once we have built our Schema, we need to create a model from it. I am going
  to call my model “DataInput”. Here is the line you will add next to create our
  model. */
  // const Asset = mongoose.model("Asset", assetSchema);
  
// });

/* We can access all of the asset documents through our Assets model. */
/* Assets.find(function (err, assets) {
  if (err) return console.error(err);
  console.log(assets);
}) */
// ************** End Database Config **********************


require('dotenv').config({path:'/Users/evanhendrix1/programming/code/green-power-monitor/experiment-instatrust/veracity-app/services/.env'});

console.log('you. are. AWESOME!');  
console.info('AUTH_URL = ', process.env.AUTH_URL)
console.info('BASE_GPM_URL = ', process.env.BASE_GPM_URL)
console.info(`${process.env.BASE_GPM_URL}/parametertovariable/deviceparameter`)
// ingest data with axios 
const ingestEnergy = async (iOp) => {
  try {
    
    const facilitiesURL = `${process.env.BASE_GPM_URL}/facilities`;
    const creds = { 'username': process.env.GPM_USERNAME, 'password': process.env.GPM_PASSWORD }
    const authUrl = 'http://192.168.32.124:6600/api/Account/Token?api_key=horizon';
    const facilityIdArray = []; 
    
    // a test for gitlens 2	
    // const authString = await getBearerString(process.env.AUTH_URL, creds);
    const authString = await getBearerString(authUrl, creds);
    console.log('authString = ', authString)
    // let bearerConfig = { headers: { 'Authorization': authString } }
    
    // ********   1. get facility data	
    const facilityIdsResponse = await axios( facilitiesURL, { headers: { Authorization: authString} });
    
    // make array of facility ids
    facilityIdsResponse.data.forEach( facility => {
      if (facility && facility.Parameters[0]) {
      facilityIdArray.push(facility.Parameters[0].Key.FacilityId) ;
    }});
  
    // ********   2.  Get inverter information for each facility
    const promises = facilityIdArray.map( async facility => {
      // const devicesByTypeInverterURL = `${process.env.BASE_GPM_URL}/facilities/${facility}/devices/by-type/INVERTER`;
      const devicesByTypeInverterURL = `http://192.168.32.124:6600/api/horizon/facilities/${facility}/devices/by-type/INVERTER`;
      const response = await axios( devicesByTypeInverterURL, { headers: { 'Authorization': authString} } );
      if (response.data) return response.data // array of inverters
    });

    // wait until all promises resolve
    // array of arrays. each child array is a list of inverters for a facility  
    const invertersArrayNotFlat = await Promise.all(promises)
    let invertersArrayAndZeros = [].concat.apply([],invertersArrayNotFlat);

    // filter out facilitites that don't have inverters in them
    const invertersArrayFiltered = invertersArrayAndZeros.filter( inverter =>  {
      // console.log( 'inverter.Parameters.length = ', inverter.Parameters.length);
      return inverter.Parameters.length > 0
    });
    // console.log('invertersArrayFiltered = ', invertersArrayFiltered)
    
    // TODO: find a way to bring along all of these properties to the next array
    // of object with the variableids
    const invertersArray = invertersArrayFiltered.map((inverter, indexO) => { 
      // console.log('\n\n**************\n inverter: ', inverter, 'indexO: ',
      // indexO);
      let peakPowerValue = inverter.Descriptions.filter( param => param.Name == 'Peak Power')[0].Value;
      let powerObj = inverter.Parameters.filter( param => param.Name == 'Power')[0];
      let tempObj = {}
        // add properties you need from the inverter level, then return that
        // object to map the whole object; this will build the 'invertersArray'
        tempObj.InverterLevelName = inverter.Name;
        tempObj.InverterLevelFacilityId = inverter.FacilityId;
        tempObj.InverterLevelId = inverter.Id;
        tempObj.PeakPower = peakPowerValue;
        tempObj.DeviceId = powerObj.Key.DeviceId;
        tempObj.ParameterId = powerObj.Key.ParameterId;
        tempObj.parametersLevelName = powerObj.Name;
        tempObj.ParameterType = powerObj.ParameterType;
        tempObj.Units = powerObj.Units;
        tempObj.Stooge = 'TheStooge';
       return tempObj;
      });

      // variablesArray become an array of objects which have a VariableId key
      // in them
      let variablesArray = await callForVariables(invertersArray, authString, iOp)
      getData(variablesArray, authString); // getData should pull data according to variableId

  } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log('\nError, request made, but server responded with ...', error.response.data);
        console.log('\nError.response.status = ', error.response.status);
        console.log('\nError.response.headers = ', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received `error.request` is
        // an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log('Error. Request made but no response received....', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error in setting up request....', error.message);
      }
      console.log('error.config = \n', error.config);
    console.error('\n\n\n console.error = \n',error)
  }
}

async function getBearerString (authUrlParam, credsParam) {
  // console.log('creds = ', credsParam)
  let getTokenPromise = {}
  try {
    console.log('credsParam = ', credsParam, 'authUrlParam = ', authUrlParam);
    getTokenPromise = await axios.post( authUrlParam, credsParam);
  }	catch (error) {
    console.error(error)
  }
  // console.log( 'bearer sting = ', 'Bearer '.concat(getTokenPromise.data.AccessToken));
  return 'Bearer '.concat(getTokenPromise.data.AccessToken);
  
};

// takes array of object with parameters and info for elements, and returns
// array of objects with variables
 async function callForVariables(arr, authString, iOp) {
   console.log( 'Array input to callForVariables = ', arr);
   if (!['plant','inverter'].includes(iOp)) {
     console.error('You\'re using callForVariables wrong! It takes plant or string');
   }
   let varUrlParam;
   let facOrDevice;
   if (iOp === 'inverter') {
    // varUrlParam =
    // `${process.env.BASE_GPM_URL}/parametertovariable/deviceparameter`;
    varUrlParam='http://192.168.32.124:6600/api/horizon/parametertovariable/deviceparameter';
    facOrDevice = 'DeviceId';
   } else {
    //  varUrlParam = `${process.env.BASE_GPM_URL}/parametertovariable/facilityparameter`;
    varUrlParam =  'http://192.168.32.124:6600/api/horizon/parametertovariable/facilityparameter';
    facOrDevice = 'FacilityId';
   }
   // TODO: replace the above if statement with something like this:
    /*    const [ legWear, coat ] = (weather === "good") 
    ? [ "shorts", false ]
    : [ "jeans",  true  ] */
   let requestData = {};
    const variableIdPromises = arr.map( async inverter => {
      try { 
      requestData = {
        // [facOrDevice]:  inverter[facOrDevice],
        'DeviceId':  inverter.DeviceId,
        'ParameterId': inverter.ParameterId
      }
      const variableIdResponse = await axios({
        method: 'post',
        url: varUrlParam,
        data: requestData,  
        headers: { 'Authorization': authString }
      });
      let respObj = {}; 
      if (variableIdResponse.data) {
        respObj.FacilityId = variableIdResponse.data.Key.FacilityId;
        respObj.DeviceId = variableIdResponse.data.Key.DeviceId;
        respObj.VariableId = variableIdResponse.data.Key.VariableId;
        respObj.Name = variableIdResponse.data.Name;
        respObj.Unit = variableIdResponse.data.Unit;
      }
      if (variableIdResponse.data) return variableIdResponse.data;
      
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log('\nError, request made, but server responded with ...', error.response.data);
        console.log('\nError.response.status = ', error.response.status);
        console.log('\nError.response.headers = ', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received `error.request` is
        // an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log('Error. Request made but no response recieved....', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error in setting up request....', error.message);
      }
      // console.log('error.config = \n', error.config);
    }
  });
    return Promise.all(variableIdPromises)
      .then((rawValues) => {
        console.log('rawValues', rawValues)
        let values = rawValues.filter(rawVal => rawVal)	
                              // .map( val => ( {
                              //     FacilityId: val.Key.FacilityId,
                              //     DeviceId: val.Key.DeviceId,
                              //     VariableId: val.Key.VariableId,
                              //     Name: val.Name,
                              //     Unit: val.Unit
                              //   } )
                              // );	
        // console.log(`The Variable ids for ${iOp} = `, values)
        return values;
      }, function() {
        console.log('stuff failed')
      }); 
  }
  // takes array of variable ids
  // returns array of data??
  function getData(arr, authString) {
    //  console.log( 'Array input to callForVariables = ', arr);
    const dataListURL = 'http://192.168.32.124:6600/api/DataList'
    const Promises = arr.map( async variable => {
      try { 
        const variableIdResponse = await axios({
          method: 'get',
          url: dataListURL,
          headers: { 'Authorization': authString },
          params: {
            datasourceId: variable.VariableId,
            startDate: 1529452800,
            endDate:   1529539200,
            aggregationType: 0,
            grouping: 'raw'
          }
        });
        variableIdResponse.data.forEach( dp => {
          delete dp.DataSourceId;
          return dp;
        })
        // return variableIdResponse
        // write each to database when they come back, and then save facility Id
        // and such in the callback of the Promise.all. 
        let resultObj = {  
          FacilityId: variable.FacilityId,
          DeviceId: variable.DeviceId,
          Name: variable.Name,
          Unit: variable.Unit,
          VariableId: variable.VariableId,
          data: variableIdResponse.data
        }
        if ( variableIdResponse.data ) return resultObj;
        
      } catch (error) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.log('\nError, request made, but server responded with ...', error.response.data);
          console.log('\nError.response.status = ', error.response.status);
          console.log('\nError.response.headers = ', error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received `error.request` is
          // an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          console.log('Error. Request made but no response recieved....', error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log('Error in setting up request....', error.message);
        }
        // console.log('error.config = \n', error.config);
      }
    });
    
    return Promise.all(Promises)
      .then((rawValues) => {
        console.log('rawValues', rawValues)
        let values = rawValues.filter( val => val);	
        // console.log('Array of energy datapoints = ', JSON.stringify(values, null, 2));
        console.log('Array of energy datapoints = ', values);
        console.log('dummy log')
        return values;
      }, function() {
        console.log('stuff failed')
      }); 
  }

// spits out array of objects  
 ingestEnergy('inverter');
// https://webapidemo.horizon.greenpowermonitor.com/api/Account/Token

 // spits out array of objects that have variable ids
//  ingestEnergy('plant');