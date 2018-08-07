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
}) */ // ************** End Database Config **********************


require('dotenv').config({path:'/Users/evanhendrix1/programming/code/green-power-monitor/experiment-instatrust/veracity-app/services/.env'});

console.log('you. are. AWESOME!');  
console.info('AUTH_URL = ', process.env.AUTH_URL)
console.info('BASE_GPM_URL = ', process.env.BASE_GPM_URL)
console.info(`${process.env.BASE_GPM_URL}/parametertovariable/deviceparameter`)

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
const ingest = async (inverterOrPlant, powerOrIrradiance) => {
  try {
    const facilitiesUrl = `${process.env.BASE_GPM_URL}/facilities`;
    const creds = { 'username': process.env.GPM_USERNAME, 'password':
                    process.env.GPM_PASSWORD }
    const authUrl = 'http://192.168.32.124:6600/api/Account/Token?api_key=horizon';
    // const authString = await getBearerString(process.env.AUTH_URL, creds);
    const authString = await getBearerString(authUrl, creds);
    console.log('authString = ', authString)
    // let bearerConfig = { headers: { 'Authorization': authString } }
    
    // ********   1. get facility data	
    const facilityIdsResponse = await axios( facilitiesUrl, { headers: {
      Authorization: authString} });
    
    // make array of facility ids
    const facilityIdArray = []; 
    facilityIdsResponse.data.forEach( facility => {
      if (facility && facility.Parameters[0]) {
      facilityIdArray.push(facility.Parameters[0].Key.FacilityId) ;
    }});
    // to have all info for each inverter
    // based on inverterOrPlant and powerOrIrradiance, we call for the
    // appropriate parameterId
    const invertersArray = await getInverterInfo(facilityIdArray, authString, inverterOrPlant, powerOrIrradiance);
    
    // variablesIds become an array of objects which have a VariableId key
    
    const variableIds = await callForVariables(invertersArray, authString, inverterOrPlant, powerOrIrradiance);
    
    let dataArray =  await getValues(variableIds, authString, inverterOrPlant, powerOrIrradiance);
    console.log('dataArray = ', dataArray)
    return dataArray;

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
async function getInverterInfo (facilityIdArray, authStringParam, inverterOrPlant, powerOrIrradianceParam) {
  const promises = facilityIdArray.map( async facility => {
    /*  const devicesByTypeInverterUrl =
    `${process.env.BASE_GPM_URL}/facilities/${facility}/devices/by-type/INVERTER`;
    */
    const facilityOrInvertersUrl = (inverterOrPlant === 'plant') ? `http://192.168.32.124:6600/api/horizon/facilities/${facility}` 
    : `http://192.168.32.124:6600/api/horizon/facilities/${facility}/devices/by-type/INVERTER`;
    const response = await axios( facilityOrInvertersUrl, { headers: {
    'Authorization': authStringParam} } );
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
  return invertersArrayFiltered.map( inverter => { 
    // console.log('\n\n**************\n inverter: ', inverter, 'indexO: ',
    // indexO);
    let peakPowerObj = inverter.Descriptions.filter( param => param.Name == 'Peak Power')[0];
    let powerObj = inverter.Parameters.filter( param => param.Name == 'Power')[0];
    let irradianceObj = inverter.Parameters.filter( param => param.Name == 'Assigned Irradiance')[0];
    let facilityIrradianceObj = inverter.Parameters.filter( param => param.Name == 'Irradiance')[0];
    let facilityPowerObj = inverter.Parameters.filter( param => param.Name == 'Power')[0];
    // TODO: we have COM status here if we want to get that too. 
    let tempObj = {}
    // add properties you need from the inverter level, then return that
    // object to map the whole object; this will build the 'invertersArray'
    // tempObj.InverterLevelName = peakPowerObj.Name; // not really needed
    // tempObj.InverterLevelId = inverter.Id;
    tempObj.ParameterId_facility_irradiance = facilityIrradianceObj.Key.ParameterId;
    tempObj.ParameterId_facility_power = facilityPowerObj.Key.ParameterId; 
    
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
 async function callForVariables(arr, authStringParam, inverterOrPlantParam, powerOrIrradianceParam) {
   const varUrlParam = (inverterOrPlantParam === 'inverter') ?
   `${process.env.BASE_GPM_URL}/parametertovariable/deviceparameter` :
  // 'http://192.168.32.124:6600/api/horizon/parametertovariable/deviceparameter' :
    `${process.env.BASE_GPM_URL}/parametertovariable/facilityparameter`
// 'http://192.168.32.124:6600/api/horizon/parametertovariable/facilityparameter';
console.log('varUrlParam = ', varUrlParam);


const variableIdPromises = arr.map( async inverter => {
  let requestData = {};
  if (inverterOrPlantParam === 'plant') {
    if (powerOrIrradianceParam === 'power') {
      requestData = { 
        "ParameterId": inverter.ParameterId_facility_power,
        "FacilityId": inverter.FacilityId 
      }
    } else if(powerOrIrradianceParam == 'irradiance')  {
      requestData = { 
        "ParameterId": inverter.ParameterId_facility_irradiance,
        "FacilityId": inverter.FacilityId 
      }

    }
  } else if (powerOrIrradianceParam == 'power') {
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
      try { 
      const variableIdResponse = await axios({
        method: 'post',
        Url: varUrlParam,
        data: requestData,  
        headers: { 'Authorization': authStringParam }
      });
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
      console.log( 'In callForVariables, inverter = ', inverter);
      console.log('respObj = ', respObj)
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
      // console.log('error.config = \n', error.config);
    }
  });

    return Promise.all(variableIdPromises)
      .then((rawValues) => {
        console.log('rawValues', rawValues)
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
  function getValues(arr, authStringParam) {
    //  console.log( 'Array input to callForVariables = ', arr);
    const dataListUrl = 'http://192.168.32.124:6600/api/DataList'
    const Promises = arr.map( async variable => {
      try { 
        // let customDataSourceId = ''; 
        // if (( inverterOrPlantParam === 'inverter' ) && ( powerOrIrradianceParam === 'power')) {
        //   customDataSourceId = variable.varId_Inv_Power
        // } else if (( inverterOrPlantParam === 'inverter' ) && ( powerOrIrradianceParam === 'irradiance')) {
        //   customDataSourceId = variable.varId_Inv_Irr;
        // } else if (( inverterOrPlantParam === 'plant' ) && ( powerOrIrradianceParam === 'power')) {
        //   customDataSourceId = variable.varId_Plant_Power;
        // } else if (( inverterOrPlantParam === 'plant' ) && ( powerOrIrradianceParam === 'irradiance')) {
        //   customDataSourceId = variable.varId_Plant_Irradiance;
        // }

        const variableIdResponse = await axios({
          method: 'get',
          Url: dataListUrl,
          headers: { 'Authorization': authStringParam },
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
        let resultObj = {  
          FacilityId: variable.FacilityId,
          DeviceId: variable.DeviceId,
          Name: variable.Name,
          Unit: variable.Unit,
          VariableId: variable.VariableId,
          data: variableIdResponse.data // array of datapoints
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
      .then(rawValues => {
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
  
  

  /** This gets the bearer string
   * @constructor
   * @param {string} authUrlParam -  Url from which to get Bearer Token
   * @param {Object} credsParam - Object w username and password 
   * @param {string} credsParam.username - username 
   * @param {string} credsParam.password - password 
   * @returns {Promise.<string, Error>} - Bearer token 
   */
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

  // spits out array of objects; each object has inverter info and a field for data  
  // const inverterPowerData = ingest('inverter', 'power');
  // console.log('inverterPowerData = ', inverterPowerData);

  // const inverterIrradianceData = ingest('inverter','irradiance' );
  // console.log('inverterIrradianceData = ', inverterIrradianceData)  

  const plantPowerData = ingest('plant', 'power');
  console.log('plantPowerData = ', plantPowerData);

  // const plantIrradianceData = ingest('plant', 'irradiance');
  // console.log('plantIrradienceData = ', plantIrradianceData);





  