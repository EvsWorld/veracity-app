#! /usr/bin/env node

require('dotenv').config({
  path: '/Users/evanhendrix1/programming/code/green-power-monitor/experiment-instatrust/veracity-app/services/.env'
});
// http://robdodson.me/how-to-run-a-node-script-from-the-command-line/

// to connect to db..
// requiring the db like this is executing the code right here.
require('./db/db');

// to include db models...
const plantPower = require('./db/model/plantPower');
const inverterPower = require('./db/model/inverterPower');
const plantIrradiance = require('./db/model/plantIrradiance');


const Promise = require('bluebird');
const axios = require('axios');

var moment = require('moment');
moment().format();

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
let ingestCounter = 1;
async function ingest(inverterOrPlant, powerOrIrradiance, optionalFacId, startDate, endDate) {
  console.log(`ingest called for the ${ingestCounter++} time.`)
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
  }).catch((error) => {
    throw new CustomErrorHandler({
      code: 109,
      message: "facilityIdsResponse failed",
      error: error
    })
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

  const dataFromIngest = await getValues(inverterOrPlant, powerOrIrradiance, optionalFacId, variableIds, authString, startDate, endDate)
    .catch((error) => {
      throw new CustomErrorHandler({
        code: 104,
        message: "dataArray/getValues failed",
        error: error
      })
    });
  // let dataFromIngestFlat = [].concat.apply([], dataFromIngest);
  // console.log('valueof dataFromIngest = ', dataFromIngest)
  // console.log(`to be returned from ingest(${inverterOrPlant},${powerOrIrradiance}) = `, (optionalFacId && inverterOrPlant === 'plant'
  // && powerOrIrradiance === 'power') ? dataFromIngest[0] : dataFromIngest)
  // return await (optionalFacId && inverterOrPlant === 'plant' && powerOrIrradiance === 'power') ? dataFromIngest[0] : dataFromIngest;

  // try {
  //   if (optionalFacId && inverterOrPlant === 'plant' &&
  //     powerOrIrradiance === 'power') {
  //     console.time('save-plant-power-to-db')

  //     dataFromIngestFlat.forEach(point => {
  //         let tempPlantPowerTimeStamp = new plantPower({
  //           D: point.Date,
  //           V: point.Value,
  //           DsId: point.DataSourceId // TODO: this may not be needed
  //         });
  //         // console.log(` From ingest(${inverterOrPlant},${powerOrIrradiance}),
  //         // \npossible model = `, JSON.stringify(
  //         // tempPlantPowerTimeStamp,null, 2));

  //         tempPlantPowerTimeStamp.save(function (err, tempPlantPowerTimeStamp) {
  //             if (err) {
  //               console.timeEnd('save-plant-power-to-db')
  //               throw new CustomErrorHandler({
  //                 code: 111,
  //                 message: "Some problem saving tempPlantPower",
  //                 error: err
  //               });
  //             } else {
  //               console.log( 'we just saved tempPlantPowerTimeStamp: ', tempPlantPowerTimeStamp)
  //             }

  //           // console.log(` From ingest(${inverterOrPlant},${powerOrIrradiance}),
  //           // \ndataFromIngest = `, JSON.stringify( dataFromIngest,null, 2));
  //         });
  //     });
  //     console.timeEnd('save-plant-power-to-db')
  //   }
  //   else if (optionalFacId && inverterOrPlant === 'plant' &&
  //     powerOrIrradiance === 'irradiance') {
  //     console.time('save-plant-irradiance-to-db')
  //     dataFromIngestFlat.forEach(point => {
  //       let tempPlantIrradianceTimeStamp = new plantIrradiance({
  //         D: point.Date,
  //         V: point.Value,
  //         DsId: point.DataSourceId // TODO: this may not be needed

  //       });
  //       // console.log(` From ingest(${inverterOrPlant},${powerOrIrradiance}),
  //       // \npossible model = `, JSON.stringify( tempPlantIrradianceTimeStamp,null, 2));
  //       tempPlantIrradianceTimeStamp.save(function (err, tempPlantIrradianceTimeStamp) {
  //         if (err) return console.error(err);
  //       });
  //     });
  //     console.timeEnd('save-plant-irradiance-to-db')
  //   } else if (optionalFacId && inverterOrPlant === 'inverter' &&
  //     powerOrIrradiance === 'power') {
  //     console.time('save-inverter-power-to-db')
  //     dataFromIngestFlat.forEach(point => {
  //       let tempInverterPowerTimeStamp = new inverterPower({
  //         D: point.Date,
  //         V: point.Value,
  //         DsId: point.DataSourceId
  //       });
  //       // console.log(`From ingest(${inverterOrPlant},${powerOrIrradiance}),
  //       // \n dataFromIngest = `, JSON.stringify( dataFromIngest,null, 2));
  //       tempInverterPowerTimeStamp.save(function (err, tempInverterPowerTimeStamp) {
  //         if (err) return console.error(err);
  //       });
  //     });
  //     console.timeEnd('save-inverter-power-to-db')
  //   }

  //   // console.log(`Great success! Saved 'tempPlantPowerTimeStamp'= `, tempPlantPowerTimeStamp);
  // } catch (error) {
  //   if (error.name === 'MongoError' && error.code === 11000) {
  //     throw new CustomErrorHandler({
  //       code: code,
  //       message: "duplicate key error",
  //       error: error
  //     })
  //   }
  // }


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
        // console.log('respObj = ', respObj)
        if (facVarIdResponse.data) return respObj;
      }, {
        concurrency: 2
      })
      .then(values => {
        // console.log(`From callFacilityVars(), The Variable ids for ${inverterOrPlantParam} = `, values)
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
    // For testing purposes, limit number of inverters to 4 per plant
    const arrSlice = arr.slice(0, 4)
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

        // console.log('In callInverterVars(), requestData = ', requestData)
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
        // console.log(`The Variable ids for ${inverterOrPlantParam} = `, values)
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
  async function getValues(inverterOrPlant,powerOrIrradiance, optionalFacId, arr,authStringParam,startDate,endDate) {
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
        // dataResponse.data.forEach(dp => {
        //   delete dp.DataSourceId;
        //   return dp;
        // })
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
        const arrayOfTimeStamps = dataResponse.data ? dataResponse.data : undefined;

        try {
          if (optionalFacId && inverterOrPlant === 'plant' &&
          powerOrIrradiance === 'power') {
            // saves many instances of the plantPower model using
            // arrayOfTimeStamps' data
            plantPower.insertMany(arrayOfTimeStamps, function(error, arrayOfInsertedModels) {
              console.time('save-plant-power-to-db')
              if (error) {
                console.timeEnd('save-plant-power-to-db')
                throw new CustomErrorHandler({
                  code: 111,
                  message: "Some problem saving tempPlantPower",
                  error: error
                });
              }
              console.log( `we just saved 'arrayOfInsertedModels' for 'plant power': `, arrayOfInsertedModels)
              console.timeEnd('save-plant-power-to-db')
            }, {ordered: true});

            // // to loop over array and instantiate each model, then save
            // // individually (slower)
            // arrayOfTimeStamps.forEach(point => {
            //   // TODO: capitalize the schemas
            //     let tempPlantPowerTimeStamp = new plantPower({
            //       D: point.Date,
            //       V: point.Value,
            //       DsId: point.DataSourceId // TODO: this may not be needed
            //     });
            //     // console.log(` From ingest(${inverterOrPlant},${powerOrIrradiance}),
            //     // \npossible model = `, JSON.stringify(
            //     // tempPlantPowerTimeStamp,null, 2));
            //     tempPlantPowerTimeStamp.save(function (error, tempPlantPowerTimeStamp) {
            //         if (error) {
            //           console.timeEnd('save-plant-power-to-db')
            //           throw new CustomErrorHandler({
            //             code: 111,
            //             message: "Some problem saving tempPlantPower",
            //             error: error
            //           });
            //         } else {
            //           console.log( 'we just saved tempPlantPowerTimeStamp: ', tempPlantPowerTimeStamp)
            //         }
            //       // console.log(` From ingest(${inverterOrPlant},${powerOrIrradiance}),
            //       // \ndataFromIngest = `, JSON.stringify( dataFromIngest,null, 2));
            //     });
            //   });
          }
          else if (optionalFacId && inverterOrPlant === 'plant' &&
            powerOrIrradiance === 'irradiance') {
              // saves many instances of the plantPower model using
              // arrayOfTimeStamps' data
              plantIrradiance.insertMany(arrayOfTimeStamps, function (error, arrayOfInsertedModels) {
                console.time('save-plant-irradiance-to-db')
              if (error) {
                console.timeEnd('save-plant-irradiance-to-db')
                throw new CustomErrorHandler({
                  code: 112,
                  message: "Some problem saving tempPlantIrradiance",
                  error: error
                });
              } else {
                console.log( `we just saved 'arrayOfInsertedModels' for 'plant irradiance': `, arrayOfInsertedModels)
                console.timeEnd('save-plant-irradiance-to-db')
              }
            }, {ordered: true});

            // // saves many instances of the plantPower model using
            // // arrayOfTimeStamps' data
            // arrayOfTimeStamps.forEach( point => {
            //   let tempPlantIrradianceTimeStamp = new plantIrradiance({
            //     D: point.Date,
            //     V: point.Value,
            //     DsId: point.DataSourceId // TODO: this may not be needed
            //   });
            //   // console.log(` From ingest(${inverterOrPlant},${powerOrIrradiance}),
            //   // \npossible model = `, JSON.stringify( tempPlantIrradianceTimeStamp,null, 2));
            //   tempPlantIrradianceTimeStamp.save(function (error, tempPlantIrradianceTimeStamp) {
            //     if (error) return console.error(error);
            //   });
            // });


          } else if (optionalFacId && inverterOrPlant === 'inverter' &&
            powerOrIrradiance === 'power') {
              // saves many instances of the inverterPower model using
              // arrayOfTimeStamps' data
              inverterPower.insertMany(arrayOfTimeStamps, function (error, arrayOfInsertedModels) {
                console.time('save-inverter-power-to-db')
              if (error) {
                console.timeEnd('save-inverter-power-to-db')
                throw new CustomErrorHandler({
                  code: 113,
                  message: "Some problem saving tempPlantIrradiance",
                  error: error
                });
              } else {
                console.log( `we just saved 'arrayOfInsertedModels' for 'plant irradiance': `, arrayOfInsertedModels)
                console.timeEnd('save-inverter-power-to-db')
              }
            }, {ordered: true});

            // // This is the old school way of looping over array and writing each
            // // one
            // arrayOfTimeStamps.forEach(point => {
            //   let tempInverterPowerTimeStamp = new inverterPower({
            //     Date: point.Date,
            //     Value: point.Value,
            //     DataSourceId: point.DataSourceId
            //   });
            //   // console.log(`From ingest(${inverterOrPlant},${powerOrIrradiance}),
            //   // \n dataFromIngest = `, JSON.stringify( dataFromIngest,null, 2));
            //   tempInverterPowerTimeStamp.save(function (error, tempInverterPowerTimeStamp) {
            //     if (error) return console.error(error);
            //   });
            // });
          }

          // console.log(`Great success! Saved 'tempPlantPowerTimeStamp'= `, tempPlantPowerTimeStamp);
        } catch (error) {
          if (error.name === 'MongoError' && error.code === 11000) {
            throw new CustomErrorHandler({
              code: error.code,
              message: "duplicate key error",
              error: error
            })
          }
        }
        // we're returning here just to keep the functionality of returning
        // everything back in the form of an arr which could later be acted on
        // (in this case it would be ingest that would be acting on it. )
        // if (dataResponse.data) return dataResponse.data;

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
    console.trace(someObject)
  }


  let ingestThenAgr = async (startDate, endDate, facId) => {
    try {
      // Now these functions will just be called and save to db from 'ingest' directly
      const powerAtPlantLevel = await ingest('plant', 'power', facId, startDate, endDate);
      const irradianceAtPlantLevel = await ingest('plant', 'irradiance', facId, startDate, endDate);
      const powerAtInverterLevel = await ingest('inverter', 'power', facId, startDate, endDate);

      // TODO: query the permenant db, then save those user input static values
      // into this temp db which we well pass to gerardo's script next

      // TODO: Call gerardo's aggragation script here, which will access the data
      // we've just saved in the temp db.

      // TODO: recieve kpi's returned from aggregation script then save in
      // instatrust permanent db.

      // TODO: Delete temp db


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

  ingestThenAgr(1529452800, 1529539200, 6); // 1 día
  // ingestThenAgr( 1513857600 , 1529539200, 6); // 6 meses
  // ingestThenAgr(1498046400, 1529539200, 6); // 1 año
  // ingestThenAgr(1434888000, 1529539200, 6); // 3 años
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