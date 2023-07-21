const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passportLocalMongoose = require('passport-local-mongoose');


// after searching around -- most likely using Bcrypt for hashing pw + passport for authentication
const User = new mongoose.Schema({
    username: {type: String, unique: true}, //TODO: do type checking on input as well, shouldn't be case sensitive 
    password: String, // hashed pw
    calendars: Array //array of calendars the user is currently using
});
User.plugin(passportLocalMongoose);
User.methods.validPassword = function (enteredPassword) {
    bcrypt.compare(enteredPassword, this.password, (err, passwordMatch) => {
        if (err) {
            console.log(err);
            res.send('An error occured, please check the server output'); 
            return;
        } else {
            return passwordMatch;
        }
    });
};

const Calendar = new mongoose.Schema({ 
    name: String, // name of calendar
    creator: String, // creator of this calendar 
    users: Array, // users the creator has chosen to share calendar with 
    days: Number, // number of days in calendar
    videos: Array //an array of an array of video objects, each subarray represents a day
});

// is the environment variable, NODE_ENV, set to PRODUCTION? 
let dbconf;
if (process.env.NODE_ENV === 'PRODUCTION') {
    // if we're in PRODUCTION mode, then read the configration from a file
    // use blocking file io to do this...
    const fs = require('fs');
    const path = require('path');
    const fn = path.join(__dirname, 'config.json');
    const data = fs.readFileSync(fn);

    // our configuration file will be in json, so parse it and set the
    // conenction string appropriately!
    const conf = JSON.parse(data);
    dbconf = conf.dbconf;
} else {
    // if we're not in PRODUCTION mode, then use
    dbconf = 'mongodb://localhost/final-project';
}

mongoose.model('User', User);
mongoose.model('Calendar', Calendar);
mongoose.connect(dbconf);

