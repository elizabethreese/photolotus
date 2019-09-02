var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var db = require('./models');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var seqStore = require('connect-session-sequelize')(session.Store);
var bcrypt = require('bcrypt');

var sessionStorage = new seqStore({
    db: db.sequelize
});

var app = express();
app.use(cookieParser());

app.use(session({
    secret: 'temporarySecretKey',
    resave: false, 
    saveUninitialized: true,
    cookie: { maxAge: 100000000},
    store: sessionStorage
}));

//middleware
sessionStorage.sync();
app.set('view engine', 'ejs');
app.set('views', 'app/views');
app.use(bodyParser.urlencoded({ extended: false}));

//saving value to session
app.get("/valuetoSession", function (req, res, next) {
    var param = req.query.param;
    req.session.param = param;
    res.send("Working Properly");
});

//displaying value to session
app.get("/displaytoSession", function (req, res, next) {
 var param = req.session.param; 
 res.send(param);
})

//Route to main page 
app.get("/", function (req, res, next){
    if( req.session.User_id == undefined) {
      res.redirect('/sign-up');
        return
    }
    res.render('index');
});
   

//signup functionality
app.get("/sign-up", function (req, res, next) {
    if(req.session.User_id !== undefined){
        res.redirect('/');
        return
    }
    res.render('sign-up');
});



app.post("/sign-up", function (req, res, next){
    if(req.session.User_id !== undefined){
        res.redirect('/');
        return
    }

    var name = req.body.name;
    var login = req.body.login;
    var email = req.body.email;
    var password = req.body.password;
    bcrypt.hash(password, 10, function (err, hash) {
        db.User.create({ Name: name, Login: login, PasswordHash: hash, Email: email }).then(function(User){
            req.session.User_id = User.id;
            res.redirect('/')
        })
       
    });
})

//Route to photo page
app.get("/photos", function(req, res, next){
    res.render('photo-list');
});


//logging in
app.get("/login", function(req, res, next){
    res.render('login');
})

app.post("/login", function(req, res, next){
    // var name = req.body.name;
    var login = req.body.login;
    var email = req.body.email;
    var password = req.body.password;

    db.User.findOne( {where: {Email: email}}).then(function (user) {
        req.session.User_id = user.id;
            if (user === null) {
            res.render('login');}
            else {
                bcrypt.compare(password, user.PasswordHash, function(err, same){
                    if (same){
                        req.session.User_id = user.id;
                        res.redirect("/");
                    }
                    else{
                        res.render("login"); 
                    }
                })
            }
    })
})

//route to photo list 
app.get("/my-photos", function(req, res, next){
    res.render('photo-list');
})

//route to albums
app.get("/my-albums", function(req, res, next){
    res.render('albums');
})

//logging out
app.get("/log-out", function(req, res, next){
    req.session.destroy();
    res.redirect("/login");
    return
})

app.listen(3000, function(){
    console.log("listening...")
})
