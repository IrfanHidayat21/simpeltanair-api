// this file will handle connection logic to the MongoDB database

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/TimeSheet', { useNewUrlParser : true }).then(() => {
console.log("Connected to MongoDB successfully :");
})
.catch((err) => {
    console.log("Error while attempting to connect to MongoDB");
    console.log(err);
})

// To prevent deprectation warnings (from MongoDB native driver)
// mongoose.set('useCreateIndex', true);
// mongoose.set('useFindModify', false);

module.exports = {
    mongoose
};

