const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const projectSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    /* Define Schema for project
    (originally composed of ten inputs from a form)
    
    there should be a seperate schema for the RFP mode of the project?
    (when they try to apply to rfp´s we can bring up past submissions
    and give the ability to apply with that one)
    */
    
    companyName: String,
    projectName: String,
    operator: String,
    latitude: Number,
    longitude: Number,
    location: String,
    region: String,
    timeZone: String,
    continent: String,
    COD: String,
    expectedProduction: String,

    technology: String,
    constructionType: String,
    size: String,
    longTermProduction: String,
    deliveryPoint: String,
    settlementPoint: String,
    iso: String,
    rto: String,
    

    turbineManufacturer: String,
    turbineModel: String,
    rotorDiameter: String,
    hubHeight: String,
    quantityOfTurbines: String,
    capacityPerTurbine: String,

    moduleManufacturer: String,
    moduleModel: String,
    quantityOfPanels: String,
    capacityPerPanel: String,
    solarCertification: String,
    maxVoltage: String,

    inverterManufacturer: String,
    inverterModel: String,
    quantityOfInverters: String,
    inverterRating: String,
    inverterCertification: String,

    cellManufacturer: String,
    cellChemistry: String,
    cellModuleManufacturer: String,
    cellModuleModel: String,
    storageCertification: String,

    email: String

},
  { autoIndex: false }
);

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;