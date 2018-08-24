#! /usr/bin/env node

require('dotenv').config({
  path: '/Users/evanhendrix1/programming/code/green-power-monitor/experiment-instatrust/veracity-app/services/.env'
});
// http://robdodson.me/how-to-run-a-node-script-from-the-command-line/

const mongoose = require("mongoose");
// const dbConnectionString = process.env.MONGO_LOCAL_CON_STRING;
// const dbConnectionString = process.env.COSMOSDB_CON_STRING;
const dbConnectionString = process.env.MLABDB_CON_STRING;



const Promise = require('bluebird');
const axios = require('axios');

// logger example
const log4js = require('log4js');
log4js.configure({
  appenders: {
    cheese: {
      type: 'file',
      filename: 'cheese.log'
    }
  },
  categories: {
    default: {
      appenders: ['cheese'],
      level: 'error'
    }
  }
});

const logger = log4js.getLogger('cheese');
logger.trace('Entering cheese testing');
logger.debug('Got cheese.');
logger.info('Cheese is Gouda.');
logger.warn('Cheese is quite smelly.');
logger.error('Cheese is too ripe!');
logger.fatal('Cheese was breeding ground for listeria.');
// changes to make working tree different than head
console.log('this is from console.log');
process.stdout.write('this is from process.stdout.write\n')

// ******** Database Config (will go in another file) ********
// const Sequelize = require('sequelize');
// const sequelize = new Sequelize('database', 'username', 'password', {
//   host: 'localhost',
//   dialect: 'mysql'|'sqlite'|'postgres'|'mssql',
//   operatorsAliases: false,

//   pool: {
//     max: 5,
//     min: 0,
//     acquire: 30000,
//     idle: 10000
//   },

//   // SQLite only
//   storage: 'path/to/database.sqlite'
// });

// // Or you can simply use a connection uri
// const sequelize = new Sequelize('postgres://user:pass@example.com:5432/dbname');

//   // test our connection
//   sequelize
//   .authenticate()
//   .then(() => {
//     console.log('Connection has been established successfully.');
//   })
//   .catch(err => {
//     console.error('Unable to connect to the database:', err);
//   });


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
// const username = process.env.USERNAME_EPP2;
// const password = process.env.PASSWORD_EPP2;
// const authUrl = process.env.AUTH_URL_EPP2;
// const baseUrl = process.env.BASE_URL_EPP2;

// DEMO
const username = process.env.USERNAME_DEMO;
const password = process.env.PASSWORD_DEMO;
const authUrl = process.env.AUTH_URL_DEMO;
const baseUrl = process.env.BASE_URL_DEMO;

// console.log('username = ', username, '\npassword = ', password, '\nauthUrl = ',
//  authUrl, '\nbaseUrl = ', baseUrl);
/// NOTE: This is another way to do the pattern I'm using:
// https: //hackernoon.com/concurrency-control-in-promises-with-bluebird-977249520f23

/**
 * @typedef localObject
 * @property {string} DeviceId True if the token is valid.
 * @property {string} Name description
 * @property {string} Unit description
 * @property {string} VariableId description
 * @property {string} data description
 *
 * @param  {string} inverterOrPlant
 * @param  {string} powerOrIrradiance
 * @param  {number} [optionalFacId] - specifies if only a single specific
 * facility is desired
 * @returns {Promise.<Array.<Promise.<localObject,Error>>>|<Promise.<localObject,Error>> }  inverter metadata and
 * timestamped data at eith plant or inverter level, and power or irradiance.
 * Returns a promise that resolves to an array of objects (w/ one object per
 * facility) OR if a 'optionalFacId had been supplied, ingest will return just
 * one object for the facility desired.
 */
async function ingest(inverterOrPlant, powerOrIrradiance, optionalFacId, startDate, endDate) {
  try {
    const facilitiesUrl = `${baseUrl}/horizon/facilities`;
    const creds = {
      'username': username,
      'password': password
    }
    const authString = await getBearerString(authUrl, creds);
    // console.log('authString = ', authString)

    // ********   1. get facility data
    const facilityIdsResponse = await axios(facilitiesUrl, {
      headers: {
        Authorization: authString
      }
    });
    const facilityIdsData = facilityIdsResponse.data;
    const oneFacilityData = facilityIdsData.filter(facility => {
      return (facility.Id === optionalFacId)
    })
    const facilities = optionalFacId ? oneFacilityData : facilityIdsData;
    // make array of facility ids
    const facilityIdArray = [];
    facilities.forEach(facility => {
      if (facility && facility.Parameters[0]) {
        facilityIdArray.push(facility.Parameters[0].Key.FacilityId);
      }
    });
    // to have all info for each inverter
    // based on inverterOrPlant and powerOrIrradiance, we call for the
    // appropriate parameterId
    let invertersArray = await getInverterInfo(facilityIdArray, authString, inverterOrPlant, powerOrIrradiance)
      .catch((error) => {
        throw new CustomErrorHandler({
          code: 104,
          message: "invertersArray/getInverterInfo failed",
          error: error
        })
      });
    // variablesIds become an array of objects which have a VariableId key
    // console.log('invertersArray = ', await JSON.stringify(invertersArray, null, 2))

    let variableIds = (inverterOrPlant === 'inverter') ?
      await callInverterVars(invertersArray, authString, 'inverter', powerOrIrradiance) :
      await callFacilityVars(facilities, authString, 'plant', powerOrIrradiance)
    // console.log('variableIds = ', await JSON.stringify(variableIds, null, 2))

    const dataFromIngest = await getValues(variableIds, authString, startDate, endDate )
      .catch((error) => {
        throw new CustomErrorHandler({
          code: 104,
          message: "dataArray/getValues failed",
          error: error
          })
      });
    // console.log('valueof dataFromIngest = ', dataFromIngest)
    // console.log('to be returned from ingest() = ', (optionalFacId && inverterOrPlant !== 'inverter') ? dataFromIngest[0] : dataFromIngest)
    return await (optionalFacId && inverterOrPlant !== 'inverter') ? dataFromIngest[0] : dataFromIngest; // TODO: Question. Is this await necessary?


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
    console.error('\n\n\n console.error = \n', error)
  }
}

// make array of device info, for all facilities
async function getInverterInfo(facilityIdArray, authStringParam, inverterOrPlantParam, powerOrIrradianceParam) {
  // try removing parens on facility
  const invertersArrayNotFlat = await Promise.map(facilityIdArray, async (facility) => {
      /*  const devicesByTypeInverterUrl =
      `${baseUrl}/horizon/facilities/${facility}/devices/by-type/INVERTER`;
      */
      const invertersUrl = `${baseUrl}/horizon/facilities/${facility}/devices/by-type/INVERTER`;
      const response = await axios(invertersUrl, {
          headers: {
            'Authorization': authStringParam
          }
        })
        .catch((error) => {
          throw new CustomErrorHandler({
            code: 101,
            message: "invertersArrayNotFlat failed",
            error: error
          })
        });
      if (response.data) return response.data // array of inverters

    }, {
      concurrency: 2
    })
    .then((rawValues) => {
      let values = rawValues.filter(rawVal => rawVal) // TODO: remove this?
      return values;
    }, function () {
      console.log('stuff failed in getInverterInfo()' +
        'invertersArrayNotFlat');
    });
  // nested Arrays
  let invertersArrayAndZeros = [].concat.apply([], invertersArrayNotFlat);

  // filter out facilitites that don't have inverters in them
  const invertersArrayFiltered = invertersArrayAndZeros.filter(inverter => {
    // console.log( 'inverter.Parameters.length = ', inverter.Parameters.length);
    return inverter.Parameters.length > 0
  });
  // console.log('invertersArrayFiltered = ', invertersArrayFiltered)

  // TODO: find a way to bring along all of these properties to the next array
  // of object with the variableids
  return invertersArrayFiltered.map(inverter => {
    let facilityIrradianceObj = inverter.Parameters.filter(param => param.Name === 'Irradiance')[0];
    let plantRatedPowerObj = inverter.Descriptions.filter(param => param.Name === 'PlantRated_Power')[0];
    let facilityPowerObj = inverter.Parameters.filter(param => param.Name === 'Power')[0];
    let peakPowerObj = inverter.Descriptions.filter(param => param.Name === 'Peak Power')[0];
    let powerObj = inverter.Parameters.filter(param => param.Name === 'Power')[0];
    let irradianceObj = inverter.Parameters.filter(param => param.Name === 'Assigned Irradiance')[0];
    // TODO: we have COM status here if we want to get that too.
    // add properties you need from the inverter level, then return that
    // object to map the whole object; this will build the 'invertersArray'
    // tempObj.InverterLevelName = peakPowerObj.Name; // not really needed
    // tempObj.InverterLevelId = inverter.Id;

    // TODO: do this for inverter level ones so we dont get error when call function with 'plant'
    let tempObj = {
      ParameterId_facility_irradiance: facilityIrradianceObj ?
        facilityIrradianceObj.Key.ParameterId : null,
      ParameterId_facility_power: facilityPowerObj ? facilityPowerObj.Key.ParameterId : null,
      DeviceId_irradiance: irradianceObj.Key.DeviceId,
      ParameterId_irradiance: irradianceObj.Key.ParameterId,

      DeviceId_power: powerObj.Key.DeviceId,
      ParameterId_power: powerObj.Key.ParameterId,

      FacilityId: inverter.FacilityId,
      PeakPower: peakPowerObj.Value,
      ParametersLevelName: (powerObj.Name === 'power') ? powerObj.Name : irradianceObj.ParameterType,
      ParameterType: powerObj.ParameterType,
      Units: (powerOrIrradianceParam === 'power') ? powerObj.Units : irradianceObj.Units,
      Stooge: 'TheStooge'
    }
    return tempObj;
  });
}

/* takes array of facility info and options to specify which variableId
and return array of objects with variableIds for the data specified (eg
inverter level of plant, power or irradiance)  */
/**
 *
 * @param {array} arr - facilities with data needed to get variableIds
 * @param {string} authStringParam
 * @param {string} inverterOrPlantParam
 * @param {string} powerOrIrradianceParam
 */
async function callFacilityVars(arr, authStringParam, inverterOrPlantParam, powerOrIrradianceParam) {
  const varUrlParam =
    `${baseUrl}/horizon/parametertovariable/facilityparameter`

  return Promise.map(arr, async (facility) => {
      let requestData = {};
      let facilityPowerObj = facility.Parameters.filter(param => param.Name ==
        'Power')[0];
        let irradianceObj = facility.Parameters.filter(param => param.Name ==
          'Irradiance')[0];
        let facilityLatLongObj = facility.Descriptions.filter(param => param.Name ==
          'PlantLatitud_Longitud')[0];
        let facilityNomPowerObj = facility.Descriptions.filter(param => param.Name ==
          'Potencia Nominal')[0];
      // let facilityEnergyObj = facility.Parameters.filter(param => param.Name ===
      // 'Energy')[0];
      if (powerOrIrradianceParam === 'power') {
        requestData = {
          "FacilityId": facility.Id,
          "ParameterId": facilityPowerObj.Key.ParameterId,
          "LatLong": facilityLatLongObj.Value
        }
      } else if (powerOrIrradianceParam === 'irradiance') {
        requestData = {
          "FacilityId": facility.Id,
          "ParameterId": irradianceObj.Key.ParameterId,
          "LatLong": facilityLatLongObj.Value
        }
      }
      // else if (powerOrIrradianceParam === 'energy') {
      //   requestData = {
      //     "FacilityId": facility.Id,
      //     "ParameterId": facilityEnergyObj.Key.ParameterId
      //   }
      // }
      const facVarIdResponse = await axios({
          method: 'post',
          url: varUrlParam,
          data: requestData,
          headers: {
            'Authorization': authStringParam
          }
        })
        .catch((error) => {
          throw new CustomErrorHandler({
            code: 105,
            message: "facVarIdResponse failed",
            error: error
          })
        });

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
        // respObj.FacilityId = facVarIdResponse.data.Key.FacilityId;
        // respObj.DeviceId = facVarIdResponse.data.Key.DeviceId;
        respObj.VariableId = facVarIdResponse.data.Key.VariableId;
        // respObj.Name = facVarIdResponse.data.Name;
        // respObj.Unit = facVarIdResponse.data.Unit;
        // respObj.PeakPower = facility.PeakPower;
      }
      // console.log( 'In callFacilityVars, facility = ', facility);
      console.log('respObj = ', respObj)
      if (facVarIdResponse.data) return respObj;
    }, {
      concurrency: 2
    })
    .then(values => {
      console.log(`From callFacilityVars(), The Variable ids for ${inverterOrPlantParam} = `, values)
      return values;
    }, function () {
      console.error('stuff failed in callFacilityVars(), in Promise.map');
    });
}

/* takes array of inverter info and options to specify which variableId nd
facilityId to get,
and return array of objects with variableIds for the data specified (eg
inverter level of plant, power or irradiance)  */
/**
 *
 * @param {array} arr - inverters with data needed to get variableIds
 * @param {string} authStringParam
 * @param {string} inverterOrPlantParam
 * @param {string} powerOrIrradianceParam
 */
async function callInverterVars(arr, authStringParam, inverterOrPlantParam, powerOrIrradianceParam) {
  const varUrlParam = (inverterOrPlantParam === 'inverter') ?
    `${baseUrl}/horizon/parametertovariable/deviceparameter` :
    `${baseUrl}/parametertovariable/facilityparameter`
  // For testing purposes, limit number of inverters to 5 per plant
  const arrSlice = arr.slice(0,2)
  arr = arrSlice ? arrSlice : arr;
  return Promise.map(arr, async (inverter) => {
      let requestData = {};
      if (inverterOrPlantParam === 'plant') {
        if (powerOrIrradianceParam === 'power') {
          requestData = {
            "ParameterId": 2,
            "FacilityId": inverter.FacilityId
          }
          // Pretty sure this is never needed
          // } else if(powerOrIrradianceParam === 'irradiance')  {
          //   requestData = {
          //     "ParameterId": 8,
          //     "FacilityId": inverter.FacilityId
          //   }
        }
      } else if (inverterOrPlantParam === 'inverter') {
        if (powerOrIrradianceParam === 'power') {
          requestData = {
            "DeviceId": inverter.DeviceId_power,
            "ParameterId": inverter.ParameterId_power,
            "FacilityId": inverter.FacilityId
          }
          // pretty sure this is never needed
          // } else if (powerOrIrradianceParam === 'irradiance') {
          //   requestData = {
          //     "DeviceId": inverter.DeviceId_irradiance,
          //     "ParameterId": inverter.ParameterId_irradiance,
          //     "FacilityId": inverter.FacilityId
          //   }
        }
      }

      console.log('In callInverterVars(), requestData = ', requestData)
      const variableIdResponse = await axios({
          method: 'post',
          url: varUrlParam,
          data: requestData,
          headers: {
            'Authorization': authStringParam
          }
        })
        .catch((error) => {
          throw new CustomErrorHandler({
            code: 102,
            message: "variableIdResponse failed",
            error: error
          })
        });

      // in this respObj, we must get all properties from previous request in
      // here
      // it seems here we can only call for one variable at a time.
      // or I could make this object conditional, depending on what argument is
      // passed to powerOrIrradiance
      let respObj = {
        FacilityId: variableIdResponse.data.Key.FacilityId,
        DeviceId: variableIdResponse.data.Key.DeviceId,
        VariableId: variableIdResponse.data.Key.VariableId,
        Name: variableIdResponse.data.Name,
        Unit: variableIdResponse.data.Unit,
        PeakPower: inverter.PeakPower
      }
      // respObj.varId_Inv_Power = ?
      // respObj.varId_Inv_Irr = ?
      // respObj.varId_Plant_Power = ?
      // respObj.varId_Plant_Irradiance = ?
      // console.log( 'In callInverterVars, inverter = \n', inverter);
      // console.log('respObj = ', respObj)
      if (variableIdResponse.data) return respObj;

    }, {
      concurrency: 2
    })
    .then(values => {
      console.log(`The Variable ids for ${inverterOrPlantParam} = `, values)
      return values;
    }, function () {
      console.error('Something is Promise.map in callInverterVars() FAILED!')
    });
}

// returns array of objects. Each object is inverter or facility
/**
 * @param {Promise.<Object,Error>[]} arr - inverter info
 * @param {string} authStringParam
 */
async function getValues(arr, authStringParam, startDate, endDate) {
  // console.log('Input to getValues() = ', JSON.stringify(arr, null, 2))
  const dataListUrl = `${baseUrl}/DataList`
  return Promise.map(arr, async (variable, index) => {
      const dataResponse = await axios({
          method: 'get',
          url: dataListUrl,
          headers: {
            'Authorization': authStringParam
          },
          params: {
            datasourceId: variable.VariableId,
            startDate: startDate,
            endDate: endDate,
            aggregationType: 0,
            grouping: 'raw'
          }
        })
        .catch((error) => {
          throw new CustomErrorHandler({
            code: 106,
            message: "dataResponse failed",
            error: error
          })
        });
      dataResponse.data.forEach(dp => {
        delete dp.DataSourceId;
        return dp;
      })
      // let resultObj = {
      // DeviceId: variable.DeviceId,
      // Name: variable.Name,
      // FacilityId: variable.FacilityId,
      // VariableId: variable.VariableId,
      // Unit: variable.Unit,
      // data: dataResponse.data // array of datapoints for inverter for time period
      // }
      // console.log(`# of data pnts for inverter w variableId: ${variable.VariableId} = ${resultObj.data.length}`)
      // maybe await would be better here, but it at least works with a simple return
      // if (dataResponse.data) return resultObj;
      if (dataResponse.data) return dataResponse.data;
      // TODO: insert in db in the array where it goes.


    }, {
      concurrency: 2
    })
    .then(values => {
      // console.log('From getValues(), outputing Array of datapoints = ', JSON.stringify(values, null, 2));
      return values;
    }, function () {
      console.log('Promise.map() failed in getValues')
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
async function getBearerString(authUrlParam, credsParam) {
  // console.log('creds = ', credsParam)
  let getTokenPromise = {}
  // console.log('credsParam = ', credsParam, 'authUrlParam = ', authUrlParam);
  getTokenPromise = await axios.post(authUrlParam, credsParam)
    .catch((error) => {
      throw new CustomErrorHandler({
        code: 107,
        message: "getBearerString/getTokenPromise failed",
        error: error
      })
    });
    console.log('bearer string = ', 'Bearer '.concat(getTokenPromise.data.AccessToken));
  return 'Bearer '.concat(getTokenPromise.data.AccessToken);
};

function CustomErrorHandler(someObject) {
  console.log(someObject)
}


let ingestThenAgr = async (startDate, endDate, facId) => {

  try {
    // opens connection to mongodb
    mongoose.connect(`${dbConnectionString}/instatrust-temp`, { useNewUrlParser: true });
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', async () => {
      // we're connected!

    let objInputToAgg = {};
    const powerAtPlantLevel = await ingest('plant', 'power', facId, startDate, endDate);
    console.log('powerAtPlantLevel =',  powerAtPlantLevel)
    // TODO: save this object to db under corresponding facility id.

    const irradianceAtPlantLevel = await ingest('plant', 'irradiance', facId, startDate, endDate);
    // console.log('irradianceAtPlantLevel =', irradianceAtPlantLevel)
    // TODO: save this object to db under corresponding facility id.

    // outputs array of object. Each object is inverter
    const powerAtInverterLevel = await ingest('inverter', 'power', facId, startDate, endDate);
    // console.log('powerAtInverterLevel =', powerAtInverterLevel)
    // TODO: save this array to db under corresponding facility id.

    // objInputToAgg = {
    //   PowerAtPlantLevel: powerAtPlantLevel,
    //   IrradianceAtPlantLevel: irradianceAtPlantLevel,
    //   PowerAtInverterLevel: powerAtInverterLevel
    // };
    // console.log('objInputToAgg = ', JSON.stringify(objInputToAgg,null, 2));

        const facilitySchema = new mongoose.Schema({
          PowerAtPlantLevel: Array,
          IrradianceAtPlantLevel: Array,
          PowerAtInverterLevel: Array,
          FacilityId: Number,
          FacilityName: String,
          PeakPower: Number,
          NominalPower: Number,
          Longitude: Number,
          Latitude: Number,
          TimeZone: String,
          Country: String,
          PVmoduleTechnology: String,
          PVmoduleModel: String,
          InverterTechnology: String,
          InverterModel: String,
          MountingStructure: String,
          IrradianceSensor: String,
          RevenueType: String,
          Price: Number,
          RemainingYears: Number,
          ExpectedIRR: Number,
          TotalOPEX: Number,
          OandM: Number,
          Taxes: Number,
          P50Production: Number,
          BudgetedPR: Number,
          GuaranteedAvailability: Number
        });
        // So far so good. We've got a schema with one property, name, which
        // will be a String. We will add a sayHello method as well The next step is
        // compiling our schema into a Model.
        facilitySchema.methods.sayHello = function () {
          const greeting = this.PowerAtPlantLevel
            ? "Meow PowerAtPlantLevel is " + this.PowerAtPlantLevel
            : "I don't have a name";
          console.log(greeting);
        }

        const Facility = mongoose.model('Facility', facilitySchema);

        // Functions added to the methods property of a schema get compiled into
        // the Model prototype and exposed on each document instance:
        const tempInputFacility = new Facility(
          { FacilityId: facId,
            PowerAtPlantLevel: powerAtPlantLevel,
            IrradianceAtPlantLevel: irradianceAtPlantLevel,
            PowerAtInverterLevel: powerAtInverterLevel
          });
        tempInputFacility.save(function (err, tempInputFacility) {
          if (err) return console.error(err);
          tempInputFacility.sayHello();
        });

        // Say time goes by and we want to display all the kittens we've seen.
        // We can access all of the kitten documents through our Facility model.
        Facility.find(function (err, facilities) {
          if (err) return console.error(err);
          console.log(facilities);
        })

        // We just logged all of the facilities in our db to the console. If we
        // want to filter our facilities by name, Mongoose supports MongoDBs rich
        // querying syntax.
        Facility.find({ FacilityId: /^6/ }, values => {
          console.log('values from kitten query = ', values)
        });
        // This performs a search for all documents with a name property that
        // begins with "Fluff" and returns the result as an array of facilities to
        // the callback.
      });


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
    console.error('\n\n\n console.error = \n', error)
  }
}

ingestThenAgr(1529452800, 1529539200, 6);

/* Plan for loading in and aggregating all historical data (1 time process)
Run ingest for all time (calling data and saving in in db) then loop over
facilities calling the python script (which does aggregation for historical
data) then outputs back to ingest. Ingest then takes the output of the
aggregated kpis for that facility, then save them back in the db in that
facility document.
*/

// Plan for continuous operation (taking in each months data)
// this script (which calls raw data for the month for each plant, saves it to db)
// should run, then I should lo	op over each plant id, and call the python
// script which will pull data from the db for just that facility, then accept
// the output of the aggregated kpis for that facility, then save them back in
// the db in that facility (bc all kpis are facility level)

// or there is the option to get all the data for each facility, one at a time.