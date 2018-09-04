#! /usr/bin/env node

require('dotenv').config({
	path: '/Users/evanhendrix1/programming/code/green-power-monitor/experiment-instatrust/veracity-app/services/.env'
});
// http://robdodson.me/how-to-run-a-node-script-from-the-command-line/
const memwatch = require('memwatch-next');
memwatch.on('leak', function (info) {
	console.log('memwatch info event = ', info);
});
// to connect to db..
// requiring the db like this is executing the code right here.
require('./db/db');

// to include db models...
const plantPower = require('./db/model/plantPower');
const inverterPower = require('./db/model/inverterPower');
const plantIrradiance = require('./db/model/plantIrradiance');
const staticValsPlant = require('./db/model/staticValsPlant');


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
	const authString = await getAuthString(username, password, authUrl);

	const arrayofFacilitysData = await getArrayOfFacilities(authString)

	const oneFacilityData = arrayofFacilitysData.filter(facility => {
		return (facility.Id === optionalFacId)
	})


	const plantName = oneFacilityData[0].Descriptions.filter(param => {
		return (param.Name === 'PlantName')
	})[0].Value;
	const plantNominalPower = oneFacilityData[0].Descriptions.filter(param => {
		return (param.Name === 'Potencia Nominal')
	})[0].Value;
	const country = oneFacilityData[0].Descriptions.filter(param => {
		return (param.Name === 'Country')
	})[0].Value;
	const timeZone = oneFacilityData[0].Descriptions.filter(param => {
		return (param.Name === 'Time Zone')
	})[0].Value;
	const latAndLong = oneFacilityData[0].Descriptions.filter(param => {
		return (param.Name === 'PlantLatitud_Longitud')
	})[0].Value;
	const peakPower = oneFacilityData[0].Descriptions.filter(param => {
		return (param.DescriptionType === 'PeakPower')
	})[0].Value;

	// facility_s will be an array of facilitys' data, or one facility data object
	const facility_s = optionalFacId ? oneFacilityData : arrayofFacilitysData;
	// make array of facility ids
	const facilityIdArray = [];
	facility_s.forEach(facility => {
		if (facility && facility.Parameters[0]) {
			facilityIdArray.push(facility.Parameters[0].Key.FacilityId);
		}
	});

	// to have all info for each inverter
	// based on inverterOrPlant and powerOrIrradiance, we call for the
	// appropriate parameterId
	let invertersArray = await getInverterInfo(facilityIdArray, authString, inverterOrPlant, powerOrIrradiance)
		.catch((err) => {
			throw new CustomErrorHandler({
				code: 104,
				message: "invertersArray/getInverterInfo failed",
				error: err
			})
		});
	// variablesIds become an array of objects which have a VariableId key
	// console.log('invertersArray = ', await JSON.stringify(invertersArray, null, 2))

	let variableIds = (inverterOrPlant === 'inverter') ?
		await callInverterVars(invertersArray, authString, 'inverter', powerOrIrradiance):
			await callFacilityVars(facility_s, authString, 'plant', powerOrIrradiance)
	// console.log('variableIds = ', await JSON.stringify(variableIds, null, 2))

	const dataFromIngest = await getValues(inverterOrPlant, powerOrIrradiance, optionalFacId, variableIds, authString, startDate, endDate)
		.catch((err) => {
			throw new CustomErrorHandlerEx({
				code: 104,
				message: "dataArray/getValues failed",
				error: err
			})
		});
	// let dataFromIngestFlat = [].concat.apply([], dataFromIngest);
	// console.log('valueof dataFromIngest = ', dataFromIngest)
	// console.log(`to be returned from ingest(${inverterOrPlant},${powerOrIrradiance}) = `, (optionalFacId && inverterOrPlant === 'plant'
	// && powerOrIrradiance === 'power') ? dataFromIngest[0] : dataFromIngest)
	// return await (optionalFacId && inverterOrPlant === 'plant' && powerOrIrradiance === 'power') ? dataFromIngest[0] : dataFromIngest;

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
				.catch((err) => {
					throw new CustomErrorHandler({
						code: 101,
						message: "invertersArrayNotFlat failed",
						error: err
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
			const facilityPowerObj = facility.Parameters.filter(param => param.Name ==
				'Power')[0];
			const irradianceObj = facility.Parameters.filter(param => param.Name ==
				'Irradiance')[0];
			// Static info
			const budgetedPRObj = facility.Parameters.filter(param => param.Name ==
				'Budgeted PR')[0];
			const plantNameObj = facility.Descriptions.filter(param => {
				return (param.Name === 'PlantName')
			})[0];
			const plantNominalPowerObj = facility.Descriptions.filter(param => {
				return (param.Name === 'Potencia Nominal')
			})[0];
			const countryObj = facility.Descriptions.filter(param => {
				return (param.Name === 'Country')
			})[0];
			const timeZoneObj = facility.Descriptions.filter(param => {
				return (param.Name === 'Time Zone')
			})[0];
			const latAndLongObj = facility.Descriptions.filter(param => {
				return (param.Name === 'PlantLatitud_Longitud')
			})[0];
			const peakPowerObj = facility.Descriptions.filter(param => {
				return (param.DescriptionType === 'PeakPower')
			})[0];

			if (powerOrIrradianceParam === 'power') {
				requestData = {
					"FacilityId": facility.Id,
					"ParameterId": facilityPowerObj.Key.ParameterId,
				}
			} else if (powerOrIrradianceParam === 'irradiance') {
				requestData = {
					"FacilityId": facility.Id,
					"ParameterId": irradianceObj.Key.ParameterId,
				}
			} else if (powerOrIrradianceParam === 'staticInfo') {
				// Maybe in here we should Promise.map through this, and make a request
				// for the variable for each parameter, (ie one for budgeted PR and one
				// for plant irradiance)
				requestData = {
					"FacilityId": facility.Id,
					// "ParameterId": irradianceObj.Key.ParameterId,
					"ParameterId": budgetedPRObj.Key.ParameterId

					// "PlantName": plantNameObj.Value,
					// "PlantNominalPower": plantNominalPowerObj.Value,
					// "Country": countryObj.Value,
					// "TimeZone": timeZoneObj.Value,
					// "LatAndLong": latAndLongObj.Value
				}
			}

			const facVarIdResponse = await axios({
					method: 'post',
					url: varUrlParam,
					data: requestData,
					headers: {
						'Authorization': authStringParam
					}
				})
				.catch((err) => {
					throw new CustomErrorHandlerEx({
						code: 105,
						message: "facVarIdResponse failed",
						error: err
					})
				});

			let respObj = {};
			// in this respObj, we must get all properties from previous request in
			// here it seems here we can only call for one variable at a time.
			// or I could make this object conditional, depending on what argument is
			// passed to powerOrIrradiance
			if (facVarIdResponse.data) {
				// respObj.varId_Inv_Power =
				// respObj.varId_Inv_Irr =
				// respObj.varId_Plant_Power =
				// respObj.varId_Plant_Irradiance =
				// respObj.FacilityId = facVarIdResponse.data.Key.FacilityId;
				// respObj.DeviceId = facVarIdResponse.data.Key.DeviceId;

				// Very important. Using VariableId to get the value
				respObj.VariableId = facVarIdResponse.data.Key.VariableId;
				respObj.DataName = facVarIdResponse.data.Name;
				respObj.Unit = facVarIdResponse.data.Unit;
				respObj.PlantName = plantNameObj.Value;
				respObj.PlantNominalPower = plantNominalPowerObj.Value;
				respObj.Country = countryObj.Value;
				respObj.TimeZone = timeZoneObj.Value;
				respObj.LatAndLong = latAndLongObj.Value;
				respObj.PeakPower = peakPowerObj.Value;
			}
			// console.log( 'In callFacilityVars, facility = ', facility);
			// console.log('respObj = ', respObj)
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
	// For testing purposes: uncomment arrSlice variable to limit number of
	// inverters to 4 per plant
	let arrSlice;
	// const arrSlice = arr.slice(0, 4)
	arr = (arrSlice !== undefined) ? arrSlice : arr;
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
				.catch((err) => {
					throw new CustomErrorHandler({
						code: 102,
						message: "variableIdResponse failed",
						error: err
					})
				});

			// in this respObj, we must get all properties from previous request in
			// here it seems here we can only call for one variable at a time.
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
 * @param {Promise.<Object,Error>[]} arr - inverter  or facility info
 * @param {string} authStringParam
 */
async function getValues(inverterOrPlant, powerOrIrradiance, optionalFacId,
	arr, authStringParam, startDate, endDate) {
	const counter = 0;
	console.log('Input to getValues() = ', JSON.stringify(arr, null, 2))
	const dataListUrl = `${baseUrl}/DataList`
	console.time('save-collection-to-db')
	return Promise.map(arr, async (variableObj, index) => {
			console.log(`In 'getValues(), we just entered` +
				` Promise.map() for the ${index} time. \nFor this loop, variableObj = ${JSON.stringify(variableObj)}`);
			console.time('time-1');
			console.time('time-2');
			console.timeEnd('time-6')
			const dataResponse = await axios({
					method: 'get',
					url: dataListUrl,
					headers: {
						'Authorization': authStringParam
					},
					params: {
						datasourceId: variableObj.VariableId,
						startDate: startDate,
						endDate: endDate,
						aggregationType: 0,
						grouping: 'raw'
					}
				})
				.catch((err) => {
					throw new CustomErrorHandlerEx({
						code: 106,
						message: "dataResponse failed",
						error: err
					})
				});
			// let resultObj = {DeviceId: variable.DeviceId, Name:
			// variable.Name, FacilityId: variable.FacilityId, VariableId:
			// variable.VariableId, Unit: variable.Unit, data: dataResponse.data
			// // array of datapoints for inverter for time period
			//   }
			// console.log(`# of data pnts for inverter w variableId:
			// ${variable.VariableId} = ${resultObj.data.length}`) maybe await
			// would be better here, but it at least works with a simple return
			// if (dataResponse.data) return resultObj;
			const arrayOfTimeStamps = dataResponse.data ? dataResponse.data : undefined;

			try {
				if (optionalFacId && inverterOrPlant === 'plant' &&
					powerOrIrradiance === 'power') {
					console.time('time-4')
					// saves many instances of the plantPower model using
					// arrayOfTimeStamps' data
					console.log(`length of 'arrayOfTimeStamps' for plant power = `,
						arrayOfTimeStamps.length)

					// break up array OfTimeStamps into smaller arrays so it doesn't
					// overflow the heap limit
					const tempArrayOfArraysToInsert = chunkArray(arrayOfTimeStamps, 1000);
					console.time('save-plant-power-to-db-1')
					console.time('time-6')
					console.time('time-5');
					tempArrayOfArraysToInsert.forEach(chunk => {
						plantPower.insertMany(chunk, function (err, arrayOfInsertedModels) {

							console.time('save-plant-power-to-db-2')
							if (err) {
								console.timeEnd('save-plant-power-to-db')
								throw new CustomErrorHandler({
									code: 111,
									message: "Some problem saving tempPlantPower",
									error: err
								});
							}
							console.timeEnd('save-plant-power-to-db-1')
							console.log(`we just saved 'arrayOfInsertedModels' for 'plant power'. ` +
								`Heres the first timestamp of that group: `, arrayOfInsertedModels[0])
						}, {
							ordered: true
						});
					})
					console.timeEnd('save-plant-power-to-db-2')
					console.timeEnd('save-plant-power-to-db-3')


				} else if (optionalFacId && inverterOrPlant === 'plant' &&
					powerOrIrradiance === 'irradiance') {
					// saves many instances of the plantIrradiance model using
					// arrayOfTimeStamps' data
					console.log(`length of 'arrayOfTimeStamps' for plant irradiance = `, arrayOfTimeStamps.length)
					// break up array OfTimeStamps into smaller arrays so it doesn't
					// overflow the heap limit
					const tempArrayOfArraysToInsert = chunkArray(arrayOfTimeStamps, 1000);
					// TODO: this should be converted to promise.map()
					tempArrayOfArraysToInsert.forEach(async chunk => {
						console.time('time-6')
						await plantIrradiance.insertMany(chunk, function (err, arrayOfInsertedModels) {
							console.time('save-plant-irradiance-to-db')
							if (err) {
								console.timeEnd('save-plant-irradiance-to-db')
								throw new CustomErrorHandler({
									code: 112,
									message: "Some problem saving tempPlantIrradiance",
									error: err
								});
							} else {
								console.log(`we just saved 'arrayOfInsertedModels' for 'plant irradiance'. ` +
									`Heres the first timestamp of that group: `, arrayOfInsertedModels[0])
							}
							console.timeEnd('time-5')
							console.timeEnd('time-6')
						}, {
							ordered: true
						});
					});
					console.timeEnd('save-plant-irradiance-to-db')
				} else if (optionalFacId && inverterOrPlant === 'inverter' &&
					powerOrIrradiance === 'power') {
					// saves many instances of the inverterPower model using
					// arrayOfTimeStamps' data
					console.log(`length of 'arrayOfTimeStamps' for inverter power = `, arrayOfTimeStamps.length)

					// break up array OfTimeStamps into smaller arrays so it doesn't
					// overflow the heap limit
					const tempArrayOfArraysToInsert = chunkArray(arrayOfTimeStamps, 100);
					console.timeEnd('save-inverter-power-to-db')
					await Promise.map(tempArrayOfArraysToInsert, async (chunk, index) => {
							console.log(`In 'getValues(), we just entered` +
								` Promise.map() for the ${index} time.`);
							if (!chunk) return;
							inverterPower.insertMany(chunk, function (err, arrayOfInsertedModels) {
								console.time('save-plant-irradiance-to-db')
								if (err) {
									console.timeEnd('save-plant-irradiance-to-db')
									throw new CustomErrorHandler({
										code: 112,
										message: "Some problem saving tempPlantIrradiance",
										error: err
									});
								} else {
									console.log(`we just saved 'arrayOfInsertedModels' for 'inverter power'. ` +
										`Heres the first timestamp of that group: `, arrayOfInsertedModels[0])
								}
							}, {
								ordered: true
							});
						}, {
							concurrency: 2
						})
						.then(values => {
							console.timeEnd('save-inverter-power-to-db') // Not seen
							console.log('From getValues() inner Promise.map(), outputing Array of ' +
								'datapoints = ', values);
							// return values;
						}, function () {
							console.log('Inner Promise.map() failed in getValues')
						});
				} else if (optionalFacId && inverterOrPlant === 'staticInfo' &&
					powerOrIrradiance === 'staticInfo') {
					console.log(`From static method of getValues(), 'arrayOfTimeStamps[0]' = `, arrayOfTimeStamps[0])
					let staticValsPlantInstance = new staticValsPlant({
						// FacilityId: '???,'
						FacilityName: variableObj.PlantName,
						PeakPower: variableObj.PeakPower,
						NominalPower: variableObj.PlantNominalPower,
						LatAndLong: variableObj.LatAndLong,
						TimeZone: variableObj.TimeZone,
						Country: variableObj.Country,
						PVmoduleTechnology: '???',
						PVmoduleModel: '???',
						InverterTechnology: '???',
						InverterModel: '???',
						MountingStructure: '???',
						IrradianceSensor: '???',
						RevenueType: '???',
						Price: 99999999,
						RemainingYears: 99999999,
						ExpectedIRR: 99999999,
						TotalOPEX: 99999999,
						OandM: 99999999,
						Taxes: 99999999,
						P50Production: 99999999,
						BudgetedPR: arrayOfTimeStamps[0].Value,
						GuaranteedAvailability: 99999999
					});
					// console.log(`From ingest(${inverterOrPlant},${powerOrIrradiance}),
					// \n dataFromIngest = `, JSON.stringify( dataFromIngest,null, 2));
					staticValsPlantInstance.save(function (err, staticValsPlantInstance) {
						if (err) {
							console.timeEnd('save-plant-power-to-db')
							throw new CustomErrorHandler({
								code: 111,
								message: "Some problem saving tempPlantPower",
								error: err
							});
						}
						console.log(`Great success! Saved 'staticValsPlantInstance'= `, staticValsPlantInstance);
					});

				} else {
					console.log(`getValues() was not called with valid parameters so you didn't ` +
						`hit one of the if else blocks`);
					throw new CustomErrorHandler({
						code: 111,
						message: `getValues() was not called with valid parameters so you didn't ` +
							`hit one of the if else blocks`,
						// error: err
					});
				}
				console.timeEnd('save-collection-to-db') // Not seen

			} catch (err) {
				if (err.name === 'MongoError' && err.code === 11000) {
					throw new CustomErrorHandlerEx({
						code: err.code,
						message: "duplicate key error",
						error: err
					})
				}
			}
			console.timeEnd('time-1') // Is seen
		}, {
			concurrency: 2
		})
		.then(values => {
			console.timeEnd('time-2') // Is seen
			// we're returning here just to keep the functionality of returning
			// everything back in the form of an arr which could later be acted on
			// (in this case it would be ingest that would be acting on it. ) if
			// (dataResponse.data) return dataResponse.data; console.log('From
			// getValues(), outputing Array of datapoints = ',
			// JSON.stringify(values, null, 2));
			return values;
		}, function (err) {
			throw new CustomErrorHandlerEx({
				code: 117,
				message: 'Promise.map() failed in getValues',
				error: JSON.stringify(err, null, 2)
			})
		});
	console.timeEnd('time-3'); // Not seen
	console.timeEnd('time-4')
}

/** This gets the bearer string**
 * @constructor
 * @param {string} authUrlParam -  Url from which to get Bearer Token
 * @param {string} usernameParam - username
 * @param {string} passwordParam - password
 * @returns {Promise.<string, Error>} - Bearer token
 */
async function getAuthString(usernameParam, passwordParam, authUrlParam) {
	const creds = {
		'username': usernameParam,
		'password': passwordParam
	}
	console.log('creds = ', creds)
	let getTokenPromise = {}
	// console.log('credsParam = ', credsParam, 'authUrlParam = ', authUrlParam);
	getTokenPromise = await axios.post(authUrlParam, creds)
		.catch((err) => {
			throw new CustomErrorHandler({
				code: 107,
				message: "getAuthString/getTokenPromise failed",
				error: err
			})
		});
	console.log('bearer string = ', 'Bearer '.concat(getTokenPromise.data.AccessToken));
	return 'Bearer '.concat(getTokenPromise.data.AccessToken);
};

function CustomErrorHandler(someObject) {
	console.trace(someObject)
}
class CustomErrorHandlerEx extends Error {
	constructor(...args) {
		super(...args)
		Error.captureStackTrace(this, CustomErrorHandlerEx)
	}
}
/**
 * @param  {string} authString
 */
async function getArrayOfFacilities(authString) {
	const facilitiesUrl = `${baseUrl}/horizon/facilities`;
	console.log(`ingest called for the ${ingestCounter++} time.`)

	// ********   1. get array of facility data
	const facilityIdsResponse = await axios(facilitiesUrl, {
		headers: {
			Authorization: authString
		}
	}).catch((err) => {
		throw new CustomErrorHandlerEx({
			code: 109,
			message: "facilityIdsResponse failed",
			error: err
		})
	});
	// array of facilities
	return facilityIdsResponse.data;
}

let ingestThenAgr = async (startDate, endDate, facId) => {
	try {
		const authString = await getAuthString(username, password, authUrl);
		// TODO: Refactor to take the 'save to temporary db' part into another
		// function.
		// TODO: Refactor to take the things in the beginning of ingest into its
		// own function which would just run once, right here.
		// Now these functions will just be called and save to db from 'ingest' directly
		await ingest('staticInfo', 'staticInfo', facId, startDate, endDate)
		await ingest('plant', 'power', facId, startDate, endDate);
		await ingest('plant', 'irradiance', facId, startDate, endDate);
		await ingest('inverter', 'power', facId, startDate, endDate)

		// && console.log('is this loaded, then the ingestion script is done.');
		// TODO: query the permenant db, then save those user input static values
		// into this temp db which we well pass to gerardo's script next

		// TODO: Call gerardo's aggragation script here, which will access the data
		// we've just saved in the temp db.

		// TODO: recieve kpi's returned from aggregation script then save in
		// instatrust permanent db.

		// TODO: Delete temp db
	} catch (err) {
		if (err.response) {
			// The request was made and the server responded with a status code that
			// falls out of the range of 2xx
			console.log('\nError, request made, but server responded with ...', err.response.data);
			console.log('\nError.response.status = ', err.response.status);
			console.log('\nError.response.headers = ', err.response.headers);
		} else if (err.request) {
			// The request was made but no response was received `err.request` is
			// an instance of XMLHttpRequest in the browser and an instance of
			// http.ClientRequest in node.js
			console.log('Error. Request made but no response received....', err.request);
		} else {
			// Something happened in setting up the request that triggered an Error
			console.log('Error in setting up request....', err.message);
		}
		console.log('error.config = \n', err.config);
		console.error('\n\n\n console.error = \n', err)
	}
}

/**
 * Returns an array with arrays of the given size.
 *
 * @param myArray {Array} Array to split
 * @param chunkSize {Integer} Size of every group
 */
function chunkArray(myArray, chunk_size) {
	var results = [];
	while (myArray.length) {
		results.push(myArray.splice(0, chunk_size));
	}
	return results;
}
// Split in group of 3 items
var result = chunkArray([1, 2, 3, 4, 5, 6, 7, 8], 3);
// Outputs : [ [1,2,3] , [4,5,6] ,[7,8] ]
console.log(result);

ingestThenAgr(1529452800, 1529539200, 6); // 1 día
// ingestThenAgr(1526860800, 1529539200, 6); // ???
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