const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// https://mongoosejs.com/docs/populate.html#deep-populate
// https://stackoverflow.com/questions/7267102/how-do-i-update-upsert-a-document-in-mongoose?rq=1
// https://stackoverflow.com/questions/29739040/mongoose-odm-findoneandupdate-sub-document
// https://github.com/academind/node-restful-api-tutorial/tree/08-populate-orders-with-products/api
// https://stackoverflow.com/questions/31357745/find-after-populate-mongoose
// http://blog.ocliw.com/2012/11/25/mongoose-add-to-an-existing-array/
const personSchema = new Schema({
  _id: Schema.Types.ObjectId,
  name: { type: String, default: '' },
  age: { type: Number, default: '' },
  facilitiesOwned: [{ type: Schema.Types.ObjectId, ref: 'Facility' }],
  favoriteFacilities: [{ type: Schema.Types.ObjectId, ref: 'Facility' }]
});

const facilitySchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'Person' },
  facilityName: { type: String, default: '' },
  favoritedBy: [{ type: Schema.Types.ObjectId, ref: 'Person' }]  // Actually probabaly not useful
});

const Facility = mongoose.model('Facility', facilitySchema);
const Person = mongoose.model('Person', personSchema);
// So far we've created two Models. Our Person model has its facilitiesOwned field
// set to an array of ObjectIds. The ref option is what tells Mongoose which
// model to use during population, in our case the Story model. All _ids we
// store here must be document _ids from the Facility model.
// you should use ObjectId as refs



// Saving refs Saving refs to other documents works the same way you normally save
// properties, just assign the _id value:
// const personInstance1 = new Person({
//   _id: new mongoose.Types.ObjectId(),
//   name: 'Ian Fleming',
//   age: 50
// });


// const facilityInstance1 = new Facility({
//   facilityName: 'The Casino',
// });

// personInstance1.save(function (err) {
//   facilityInstance1.owner = personInstance1._id;    // assign the _id from the personInstance1
//   if (err) return handleError(err);
//   facilityInstance1.save(function (err) {
//     if (err) return handleError(err);
//     // thats it!
//   });
// });

// // add a facility as a favorite facility

// const personInstance2 = new Person({
//   _id: new mongoose.Types.ObjectId(),
//   name: 'Herbert Hover',
//   age: 73,
// });

// facilityInstance1.save(function (err) {
//   if (err) return handleError(err);
//   personInstance2.favoriteFacilities = personInstance2._id
// });



// const personInstance3 = new Person({
  //   _id: new mongoose.Types.ObjectId(),
  //   name: 'Ian Fleming',
  //   age: 50
  // });

// There are two perspectives here. First, you may want the author know which
// stories are theirs. Usually, your schema should resolve one-to-many
// relationships by having a parent pointer in the 'many' side. But, if you
// have a good reason to want an array of child pointers, you can push()
// documents onto the array as shown below.

app.post('/addFavorite', (req, res, next) => {
  const facility = Facility.create(req.body);
  // The upsert = true option creates the object if it doesn't exist.
  Person.findOneAndUpdate({email: req.userEmail}, {$push: {favoriteFacilities: facility}}, {upsert:true})
  Person.save(done)
});

// This allows us to perform a find and populate combo:

app.get('/user', (req, res, next) => {
  Person.
    findOne({ userId: req.body.usrId }).
    populate('favoriteFacilities'). // only works if we pushed refs to children
    exec(function (err, person) {
      if (err) return handleError(err);
      console.log(person);
    });
});

app.route('/api/person')
    .get(function (req, res, next) {
        Person.find()
          .populate('favoriteFacilities')
          .exec(function (err, person) {
            if (err) {
              return next(err);
            }

            res.json(person);
        });
    })
    .post(function (req, res, next) {
        Person.create(req.body)
        Person.findById(req.params._id)
          .populate('favorites')
          .exec(function (err, person) {
            if (err) {
              return next(err);
            }

          res.json(person);
        });
    });
