require('./db');
const dotenv = require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const Handlebars = require('hbs');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const passport = require('passport'), LocalStrategy = require('passport-local').Strategy;

// TODO: still need to update your calendars page once videos are added
// TODO: why is this not using req.login?
// TODO: (server side) input validation for forms
// TODO: check out passport-local-mongoose?

const sessionOptions = {
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true
};

const app = express();
app.use(session(sessionOptions));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// body parser setup
app.use(bodyParser.urlencoded({ extended: false }));

// serve static files
app.use(express.static(path.join(__dirname, 'public')));

Handlebars.registerHelper('displayDays', function(n) {
    // creates header row of days
    let accum = '<tr>';
    // make + fill arr
    // doesn't really matter what we fill it with, just doing this so we can use map
    const tempArr = new Array(n).fill(0);
    tempArr.map((ele, i) => {
        accum += `<th> Day ${i+1} </th>`;
    });
    accum +='</tr>';
    return accum;
});

Handlebars.registerHelper('displayVideos', function(arr) {
    // creates table row of videos
    let accum = '<tr>';
    arr.map(ele => {
        if (ele) {
            accum += `<td> <a href="${ele.link}">${ele.name}</a> </td>`;
        } else {
            accum += '<td> </td>';
        }
    });
    accum +='</tr>';
    return accum;
});

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    User.findOne({ username: username }, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, {message: 'Incorrect username.'});
      } else {
        bcrypt.compare(password, user.password, (err, passwordMatch) => {
            if (err) {
                console.log(err);
                return;
            } else if (!passwordMatch) {
                return done(null, false, {message:'Incorrect password.'});
            } else {
                return done(null, user);
            }
        });
      }
    });
  }
));

const User = mongoose.model('User');
const Calendar = mongoose.model('Calendar');

app.get('/', (req, res) => {
    res.redirect('home');
});

app.get('/home', (req, res) => {
    const defaultCalendars =  [ 
        {name: "Sample Calendar 1",
        days: 7,
        videos: [{name: "Full Body workout", link: 'https://youtu.be/abP8Qlee7lg'}, 
                {name: 'Ab workout', link: 'https://youtu.be/xUkMec47Wqw'}, 
                {name: 'Ab & Arm workout', link: 'https://youtu.be/P3HKHN2M72M'},
                {name: 'Lower Body workout', link: 'https://youtu.be/WSqYBU_6agQ'},
                {name: 'Arms & Upper Body workout', link: 'https://youtu.be/iN-AEOs9rzc'},
                {name: '25 min Full Body workout', link: 'https://youtu.be/szRPTqEiIWE'},
                {name: 'HIIT workout', link: 'https://youtu.be/9rQ5wxssQss'}]
        }
    ];
    res.render('home', {
        user: req.session.user || null,
        calendar: defaultCalendars
    });
});

app.get('/calendars', (req, res) => {
    if (!req.session.user) {
        res.render('calendars', {message: 'not logged in'});
    } else {
        let obj = {
            user: req.session.user,
            calendar: req.session.user.calendars
        }; 
        res.render('calendars', obj);
    }
});

app.get('/calendars/add', (req, res) => {
    if (req.session.user) {
        res.render('add-calendars', {user: req.session.user});
    } else {
        res.render('add-calendars');
    }
});

app.post('/calendars/add', (req, res) => {
    User.findOne({_id: req.session.user}, (err, user) => {
        if (err) {
            console.log(err);
            res.send('Error occured, try again.');
        } else if (user) {
            new Calendar({
                name: req.body.calendarName,
                creator: req.session.user,
                users: [],
                days: req.body.days,
                videos: new Array(parseInt(req.body.days))
            }).save(function(err, cal) {
                if (err) {
                    console.log(err);
                    res.render('add-calendars', {message: 'An error occurred saving calendar, please try again'});
                } else {
                    const calendarArr = user.calendars;
                    calendarArr.push(cal);
                    User.findOneAndUpdate({_id: req.session.user}, {calendars: calendarArr}, (err, result) => {
                        if (err) {
                            console.log(err);
                            res.send('An error occured, check server output.');
                        } else {
                            res.redirect('/calendars/add/video/?id=' + cal._id);
                        }
                    });
                }
            });
        } else {
            res.redirect('/calendars/add');
        }
    });
});

app.get('/calendars/add/video', (req, res) => {
    Calendar.findOne({_id: req.query.id}, (err, cal) => {
        if (err) {
            console.log(err);
            res.send('An error occured, check the server output');
        } else {
            const newObj = Object.assign(cal, req.session.user);
            res.render('add-videos', newObj);
        }
    });
});

app.post('/calendars/add/video', (req, res) => {

    const newVideo = {
        name: req.body.name,
        link: req.body.link
    };
    Calendar.findOne({_id: req.query.id}, (err, foundCal) => {
        if (err) {
            console.log(err);
            res.send('An error occured, check the server output');
        } else {
            if (req.body.day > foundCal.days || isNaN(req.body.day) || req.body.name.includes('<')) {
                res.redirect('/calendars/add/video/?id=' + foundCal._id);
            } else {
                const videoArr = foundCal.videos;
                videoArr[parseInt(req.body.day)-1] = newVideo; // TODO LATER: make it so multiple videos can be under one day
                Calendar.findOneAndUpdate({_id: req.query.id}, {videos: videoArr}, (err, cal) => {
                    if(err) {
                        console.log(err);
                        res.send('An error occured, check the server output');
                    } else {
                        res.redirect('/calendars/add/video/?id=' + cal._id);
                    }
                });
            }
        }
    });
});

app.route('/login')
    .get((req, res) => {
        if (!req.session.user) {
            res.render('login');
        } else {
            res.render('login', {message: 'Already logged in.'});
        }
    })
    .post(passport.authenticate('local', {failureRedirect: '/login'}), function (req, res) {
        req.session.regenerate((err) => {
            if (err) {
                console.log(err);
                res.render('login', {message: 'An error occurred, please try again'});
            } else {
                req.session.user = req.user;
                res.redirect('/home');
            }
        });
    });

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/logout', (req, res) => {
    req.session.destroy(function(err) {
        if (err) {
            console.log(err);
            res.send('An error occured, please check the server output');
        } else {
            res.redirect('/');
        }
    });
});

app.post('/register', (req, res) => {
    if (!req.body.password || req.body.password.length<8) {
        res.render('register', {message:'Password must be at least 8 characters!'});
    } else {
        User.findOne({username: req.body.username}, (err, result) => {
            if (err) {
                console.log(err);
                res.render('register', {message: 'An error occurred, please try again'});
            } else if (result){
                res.render('register', {message: "Username taken, please try again."});
            } else {
                hashPassword(req.body.password).then(function(hashedPassword) {
                    new User({
                        username: req.body.username,
                        password: hashedPassword,
                        calendars: []
                    }).save(function(err, user) {
                        if (err) {
                            console.log(err);
                            res.render('register', {message: 'An error occurred, please try again'});
                        } else {
                            req.session.regenerate((err) => {
                                if (err) {
                                    console.log(err);
                                    res.render('register', {message: 'An error occurred, please try again'});
                                } else {
                                    req.session.user = user;
                                    res.redirect('/home');
                                }
                            });
                        }
                    });
                });
            }
        });
    }
});

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, function(err, hash) {
            if (err) {
                reject(err);
            } else {
                resolve(hash);
            }
        });
    });
}
app.listen(process.env.PORT || 3000);