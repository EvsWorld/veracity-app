#! /usr/bin/env node
// a silly thing to test wip 1

require('dotenv').config({path:'/Users/evanhendrix1/programming/code/green-power-monitor/experiment-instatrust/veracity-app/services/.env'});

// http://robdodson.me/how-to-run-a-node-script-from-the-command-line/


const Promise = require('bluebird');
const axios = require('axios');

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
}) */ // ************** End Database Config **********************



console.log('you. are. AWESOME!');  

// Uncomment variables for your desired environment:
// EPP2
const username = process.env.USERNAME_EPP2;
const password = process.env.PASSWORD_EPP2;
const authUrl = process.env.AUTH_URL_EPP2;
const baseUrl = process.env.BASE_URL_EPP2;

// DEMO
// const username = process.env.USERNAME_DEMO;
// const password = process.env.PASSWORD_DEMO;
// const authUrl = process.env.AUTH_URL_DEMO;
// const baseUrl = process.env.BASE_URL_DEMO;

console.log('username = ', username, '\npassword = ', password, '\nauthUrl = ',
 authUrl, '\nbaseUrl = ', baseUrl);
  /**
 * @typedef localObject
 * @property {string} DeviceId True if the token is valid.
 * @property {string} Name description
 * @property {string} Unit description
 * @property {string} VariableId description
 * @property {string} data description
 * 
 * spits out array of objects; each object has inverter info and a field for data  
 * @param {string} inverterOrPlant 
 * @param {string} powerOrIrradiance 
 * @returns {Promise.<Array.<Promise.<localObject,Error>>>} - inverter metadata and
 * timestamped data at eith plant or inverter level, and power or irradiance 
 */
// NOTE: This is another way to do the pattern I'm using: 
// https: //hackernoon.com/concurrency-control-in-promises-with-bluebird-977249520f23

const ingest = async (inverterOrPlant, powerOrIrradiance) => {
  try {
    const facilitiesUrl = `${baseUrl}/horizon/facilities`;
    const creds = { 'username': username, 'password': password }
    const authString = await getBearerString(authUrl, creds);
    console.log('authString = ', authString)
    
    // ********   1. get facility data	
    const facilityIdsResponse = await axios( facilitiesUrl, { headers: {
      Authorization: authString} });
    
    // make array of facility ids
    const facilities = facilityIdsResponse.data;
    const facilityIdArray = []; 
    facilities.forEach( facility => {
      if (facility && facility.Parameters[0]) {
      facilityIdArray.push(facility.Parameters[0].Key.FacilityId) ;
    }});
    // to have all info for each inverter
    // based on inverterOrPlant and powerOrIrradiance, we call for the
    // appropriate parameterId
    const invertersArray = await getInverterInfo(facilityIdArray, authString, inverterOrPlant, powerOrIrradiance)
      .catch((error)=> {throw new CustomErrorHandler({code: 104, message:"invertersArray/getInverterInfo failed",error: error})});
    // variablesIds become an array of objects which have a VariableId key
  
    const variableIds = (inverterOrPlant === 'inverter') ? 
        await callInverterVars(invertersArray, authString, inverterOrPlant, powerOrIrradiance) 
      : await callFacilityVars(facilities, authString, inverterOrPlant, powerOrIrradiance)
    
    let dataArray =  await getValues(variableIds, authString, inverterOrPlant, powerOrIrradiance)
      .catch((error)=> {throw new CustomErrorHandler({code: 104, message:"dataArray/getValues failed",error: error})});

    // console.log('dataArray = ', dataArray)
    return await dataArray;

  } catch (error) {
      if (error.response) {
    // The request was made and the server responded with a status code that
    // falls out of the range of 2xx
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

  // make array of device info, for all facilities
async function getInverterInfo (facilityIdArray, authStringParam, inverterOrPlantParam, powerOrIrradianceParam) {
  const promises = facilityIdArray.map( async facility => {
    /*  const devicesByTypeInverterUrl =
    `${baseUrl}/horizon/facilities/${facility}/devices/by-type/INVERTER`;
    */
    const invertersUrl = `${baseUrl}/horizon/facilities/${facility}/devices/by-type/INVERTER`;
    const response = await axios( invertersUrl, { headers: {
    'Authorization': authStringParam} } );
    if (response.data) return response.data // array of inverters
  });
  
  // wait until all promises resolve
  // array of arrays. each child array is a list of inverters for a facility  
  const invertersArrayNotFlat = await Promise.all(promises)
   .catch((error)=> {throw new CustomErrorHandler({code: 101, message:"invertersArrayNotFlat failed",error: error})});
   
  let invertersArrayAndZeros = [].concat.apply([],invertersArrayNotFlat);
  
  // filter out facilitites that don't have inverters in them
  const invertersArrayFiltered = invertersArrayAndZeros.filter( inverter =>  {
    // console.log( 'inverter.Parameters.length = ', inverter.Parameters.length);
    return inverter.Parameters.length > 0
  });
  // console.log('invertersArrayFiltered = ', invertersArrayFiltered)
  
  // TODO: find a way to bring along all of these properties to the next array
  // of object with the variableids
  return invertersArrayFiltered.map( inverter => { 
    // console.log('\n\n**************\n inverter: ', inverter, 'indexO: ',
    // indexO);
    let facilityIrradianceObj = inverter.Parameters.filter( param => param.Name == 'Irradiance')[0];
    let plantRatedPowerObj = inverter.Descriptions.filter( param => param.Name == 'PlantRated_Power')[0];
    let facilityPowerObj = inverter.Parameters.filter( param => param.Name == 'Power')[0];
    let peakPowerObj = inverter.Descriptions.filter( param => param.Name == 'Peak Power')[0];
    let powerObj = inverter.Parameters.filter( param => param.Name == 'Power')[0];
    let irradianceObj = inverter.Parameters.filter( param => param.Name == 'Assigned Irradiance')[0];
    // TODO: we have COM status here if we want to get that too. 
    let tempObj = {}
    // add properties you need from the inverter level, then return that
    // object to map the whole object; this will build the 'invertersArray'
    // tempObj.InverterLevelName = peakPowerObj.Name; // not really needed
    // tempObj.InverterLevelId = inverter.Id;

    // TODO: do this for inverter level ones so we dont get error when call function with 'plant' 
    tempObj.ParameterId_facility_irradiance = facilityIrradianceObj ? 
        facilityIrradianceObj.Key.ParameterId 
      : null;
    tempObj.ParameterId_facility_power = facilityPowerObj ? facilityPowerObj.Key.ParameterId 
      : null; 
    
    tempObj.DeviceId_irradiance = irradianceObj.Key.DeviceId;
    tempObj.ParameterId_irradiance = irradianceObj.Key.ParameterId;

    tempObj.DeviceId_power = powerObj.Key.DeviceId;
    tempObj.ParameterId_power = powerObj.Key.ParameterId;

    tempObj.FacilityId = inverter.FacilityId;
    tempObj.PeakPower = peakPowerObj.Value;
    tempObj.ParametersLevelName = (powerObj.Name === 'power') ? powerObj.Name
                                                : irradianceObj.ParameterType;
    tempObj.ParameterType = powerObj.ParameterType;
    tempObj.Units = (powerOrIrradianceParam === 'power') ? powerObj.Units 
                                                        : irradianceObj.Units;
    tempObj.Stooge = 'TheStooge';
    return tempObj;
  });
}

/* takes array of facility info and options to specify which variableId 
and return array of objects with variableIds for the data specified (eg
inverter level of plant, power or irradiance)  */
/**
 * 
 * @param {Array} arr - facilities with data needed to get variableIds 
 * @param {string} authStringParam
 * @param {string} inverterOrPlantParam 
 * @param {string} powerOrIrradianceParam 
 */
 async function callFacilityVars(arr, authStringParam, inverterOrPlantParam, powerOrIrradianceParam) {
   const varUrlParam = 
    `${baseUrl}/horizon/parametertovariable/facilityparameter`
  console.log('varUrlParam = ', varUrlParam);


const variableIdPromises = arr.map( async inverter => {
  let requestData = {};
    let irradianceObj = inverter.Parameters.filter( param => param.Name == 'Irradiance')[0];
    let facilityPowerObj = inverter.Parameters.filter( param => param.Name == 'Power')[0];
    let facilityEnergyObj = inverter.Parameters.filter( param => param.Name == 'Energy')[0];
    if (powerOrIrradianceParam === 'power') {
      requestData = { 
        "ParameterId": facilityPowerObj.Key.ParameterId,
        "FacilityId": inverter.FacilityId 
      }
    } else if(powerOrIrradianceParam == 'irradiance')  {
      requestData = { 
        "ParameterId": irradianceObj.Key.ParameterId,
        "FacilityId": inverter.FacilityId 
      }
    } else if(powerOrIrradianceParam == 'energy')  {
      requestData = { 
        "ParameterId": facilityEnergyObj.Key.ParameterId,
        "FacilityId": inverter.FacilityId 
      }
    }
      try { 
      const facVarIdResponse = await axios({
        method: 'post',
        url: varUrlParam,
        data: requestData,  
        headers: { 'Authorization': authStringParam }
      })
      .catch((error)=> {throw new CustomErrorHandler({code: 105, message:"facVarIdResponse failed",error: error})});;
      
      let respObj = {}; 
      // in this respObj, we must get all properties from previous request in
      // here
     // it seems here we can only call for one variable at a time.
      // or I could make this object conditional, depending on what argument is
      // passed to powerOrIrradiance 
      if (facVarIdResponse.data) {
        // respObj.varId_Inv_Power = 
        // respObj.varId_Inv_Irr = 
        // respObj.varId_Plant_Power = 
        // respObj.varId_Plant_Irradiance = 
        respObj.FacilityId = facVarIdResponse.data.Key.FacilityId;
        respObj.DeviceId = facVarIdResponse.data.Key.DeviceId;
        respObj.VariableId = facVarIdResponse.data.Key.VariableId;
        respObj.Name = facVarIdResponse.data.Name;
        respObj.Unit = facVarIdResponse.data.Unit;
        respObj.PeakPower = inverter.PeakPower;
      }
      console.log( 'In callFacilityVars, inverter = ', inverter);
      // console.log('respObj = ', respObj)
      if (facVarIdResponse.data) return  respObj
      
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log('\n\n\nError, request made, but server responded with ...', error.response.data);
        console.log('\nError.response.status = ', error.response.status);
        console.log('\nError.response.headers = ', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received `error.request` is
        // an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log('\n\n\nError. Request made but no response recieved....', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('\n\n\nError in setting up request....', error.message);
      }
      console.log('error.config = \n', error.config);
    }
  });
  return Promise.all(variableIdPromises)
    .then((rawValues) => {
      let values = rawValues.filter(rawVal => rawVal)	
      console.log(`The Variable ids for ${inverterOrPlantParam} = `, values)
      console.log('from callFacilityVars, values = ', values)
      return values;
    }, function() {
      console.log('stuff failed')
    }); 
}

/* takes array of inverter info and options to specify which variableId nd
facilityId to get,
and return array of objects with variableIds for the data specified (eg
inverter level of plant, power or irradiance)  */
/**
 * 
 * @param {Array} arr - inverters with data needed to get variableIds 
 * @param {string} authStringParam
 * @param {string} inverterOrPlantParam 
 * @param {string} powerOrIrradianceParam 
 */
 async function callInverterVars(arr, authStringParam, inverterOrPlantParam, powerOrIrradianceParam) {
   const varUrlParam = (inverterOrPlantParam === 'inverter') ?
   `${baseUrl}/horizon/parametertovariable/deviceparameter` :
    `${baseUrl}/parametertovariable/facilityparameter`
  console.log('varUrlParam = ', varUrlParam);
  const variableIdPromises = arr.map( async inverter => {
    let requestData = {};
    if (inverterOrPlantParam === 'plant') {
      if (powerOrIrradianceParam === 'power') {
      //   requestData = { 
      //     "ParameterId": 2,
      //     "FacilityId": inverter.FacilityId 
      //   }
      // } else if(powerOrIrradianceParam == 'irradiance')  {
      //   requestData = { 
      //     "ParameterId": 8,
      //     "FacilityId": inverter.FacilityId 
      //   }
      }
    } else if (inverterOrPlantParam === 'inverter') {
      if (powerOrIrradianceParam == 'power') {
        requestData = { 
          "DeviceId": inverter.DeviceId_power,
          "ParameterId": inverter.ParameterId_power,
          "FacilityId": inverter.FacilityId
        }
      } else if (powerOrIrradianceParam == 'irradiance') {
        requestData = { 
          "DeviceId": inverter.DeviceId_irradiance,
          "ParameterId": inverter.ParameterId_irradiance,
          "FacilityId": inverter.FacilityId
        }
      }
    }
    
        try { 
        const variableIdResponse = await axios({
          method: 'post',
          url: varUrlParam,
          data: requestData,  
          headers: { 'Authorization': authStringParam }
        })
        .catch((error)=> {throw new CustomErrorHandler({code: 102, message:"variableIdResponse failed",error: error})});;
        
        let respObj = {}; 
        // in this respObj, we must get all properties from previous request in
        // here
      // it seems here we can only call for one variable at a time.
      // or I could make this object conditional, depending on what argument is
      // passed to powerOrIrradiance 
      if (variableIdResponse.data) {
        // respObj.varId_Inv_Power = 
        // respObj.varId_Inv_Irr = 
        // respObj.varId_Plant_Power = 
        // respObj.varId_Plant_Irradiance = 
        respObj.FacilityId = variableIdResponse.data.Key.FacilityId;
        respObj.DeviceId = variableIdResponse.data.Key.DeviceId;
        respObj.VariableId = variableIdResponse.data.Key.VariableId;
        respObj.Name = variableIdResponse.data.Name;
        respObj.Unit = variableIdResponse.data.Unit;
        respObj.PeakPower = inverter.PeakPower;
      }
      // console.log( 'In callInverterVars, inverter = \n', inverter);
      // console.log('respObj = ', respObj)
      if (variableIdResponse.data) return respObj
      
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
      console.log('error.config = \n', error.config);
    }
  });
  return Promise.all(variableIdPromises)
    .then((rawValues) => {
      // console.log('rawValues', rawValues)
      let values = rawValues.filter(rawVal => rawVal)	
      // console.log(`The Variable ids for ${inverterOrPlant} = `, values)
      return values;
    }, function() {
      console.log('stuff failed')
    }); 
}

  // returns array of objects. Each object is inverter or facility
  /**
   * @param {Promise.<Object,Error>[]} arr - inverter info 
   * @param {string} authStringParam 
   */
   async function getValues(arr, authStringParam) {
    let totalDataPointsForInterval = 0;
    //  console.log( 'Array input to callFariables = ', arr);
    const dataListUrl = `${baseUrl}/DataList`
      //   customDataSourceId = variable.varId_Plant_Power;
    Promise.map(arr, async (variable) => {
      try { 
        // let customDataSourceId = ''; 
        // if (( inverterOrPlantParam === 'inverter' ) && ( powerOrIrradianceParam === 'power')) {
        //   customDataSourceId = variable.varId_Inv_Power
        // } else if (( inverterOrPlantParam === 'inverter' ) && ( powerOrIrradianceParam === 'irradiance')) {
        //   customDataSourceId = variable.varId_Inv_Irr;
        // } else if (( inverterOrPlantParam === 'plant' ) && ( powerOrIrradianceParam === 'power')) {
        // } else if (( inverterOrPlantParam === 'plant' ) && ( powerOrIrradianceParam === 'irradiance')) {
        //   customDataSourceId = variable.varId_Plant_Irradiance;
        // }

        const dataResponse = await axios({
          method: 'get',
          url: dataListUrl,
          headers: { 'Authorization': authStringParam },
          params: {
            datasourceId: variable.VariableId,
            startDate: 1529452800,
            endDate:   1529539200,
            aggregationType: 0,
            grouping: 'raw'
          }
        })
        .catch((error)=> {throw new CustomErrorHandler({code: 106, message:"dataResponse failed",error: error})});;
        
        dataResponse.data.forEach( dp => {
          delete dp.DataSourceId;
          return dp;
        })
        let resultObj = {  
          FacilityId: variable.FacilityId,
          DeviceId: variable.DeviceId,
          Name: variable.Name,
          Unit: variable.Unit,
          VariableId: variable.VariableId,
          data: dataResponse.data // array of datapoints
        }
        console.log(`# of data pnts for inverter w DeviceId:${variable.DeviceId} = ${resultObj.data.length}`)
        totalDataPointsForInterval+=resultObj.data.length;
        if ( dataResponse.data ) return resultObj; // await here?
        
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
    },{concurrency: 100})
      .then(rawValues => {
        let values = rawValues.filter( val => val);	
        // console.log('Array of energy datapoints = ', JSON.stringify(values, null, 2));
        console.log('dummy log')
        console.log('From getValues(), totalDataPointsForInterval = ', 
        totalDataPointsForInterval);
        // console.log('values = ', JSON.stringify(values, null, 2));
        return values;
      }, function() {
        console.log('stuff failed')
      }); 
  }
  
  /** This gets the bearer string** 
   * @constructor
   * @param {string} authUrlParam -  Url from which to get Bearer Token
   * @param {Object} credsParam - Object w username and password 
   * @param {string} credsParam.username - username 
   * @param {string} credsParam.password - password 
   * @returns {Promise.<string, Error>} - Bearer token 
   */
  async function getBearerString (authUrlParam, credsParam) {
    console.log('creds = ', credsParam)
    let getTokenPromise = {}
    try {
      console.log('credsParam = ', credsParam, 'authUrlParam = ', authUrlParam);
      getTokenPromise = await axios.post( authUrlParam, credsParam);
    }	catch (error) {
      console.error(error)
    }
    console.log( 'bearer sting = ', 'Bearer '.concat(getTokenPromise.data.AccessToken));
    return 'Bearer '.concat(getTokenPromise.data.AccessToken);
  };

  function CustomErrorHandler(someObject){
    console.log(someObject)
  }



  // spits out array of objects; each object has inverter info and a field for data  
  const inverterPowerData = ingest('inverter', 'power');
  // console.log('inverterPowerData = ', inverterPowerData);

  // const inverterIrradianceData = ingest('inverter','irradiance' );
  // console.log('inverterIrradianceData = ', inverterIrradianceData)  

  // const plantPowerData = ingest('plant', 'power');
  // console.log('plantPowerData = ', plantPowerData);

  // const plantIrradianceData = ingest('plant', 'irradiance');
  // console.log('plantIrradienceData = ', plantIrradianceData);

  // Just an experiment
  // const plantEnergyData = ingest('plant', 'energy'); 