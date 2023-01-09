// this file will handle connection logic to the MongoDB database

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
const connection = 'mongodb+srv://mean-vercel:m6g9PB1X8FbDobGX@mean-vercel.rkz4j3l.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(connection, { useNewUrlParser : true }).then(() => {
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

