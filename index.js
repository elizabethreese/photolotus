var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var db = require('./models');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var seqStore = require('connect-session-sequelize')(session.Store);
var bcrypt = require('bcrypt');
var upload = require('./app/modules/upload');
var download = require('./app/modules/download');

var sessionStorage = new seqStore({
    db: db.sequelize
});

var app = express();
app.use(cookieParser());

// This body parser is needed to access the body of a request cleanly
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Statically host the current (public) directory
app.use(express.static('./public'));

app.use(session({
    secret: 'temporarySecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 100000000 },
    store: sessionStorage
}));
sessionStorage.sync();

// Set the view engine
app.set('view engine', 'ejs');
app.set('views', './app/views');

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
app.get("/", function (req, res, next) {
    if (req.session.User_id == undefined) {
        res.redirect('/sign-up');
        return
    }
    res.render('index');
});

//signup functionality
app.get("/sign-up", function (req, res, next) {
    if (req.session.User_id !== undefined) {
        res.redirect('/index');
        return
    }
    res.render('sign-up');
});

app.post("/sign-up", function (req, res, next) {
    if (req.session.User_id !== undefined) {
        res.redirect("/");
        return
    }
    var name = req.body.name;
    var login = req.body.login;
    var email = req.body.email;
    var password = req.body.password;
    bcrypt.hash(password, 10, function (err, hash) {
        db.User.create({ Name: name, Login: login, PasswordHash: hash, Email: email }).then(function (User) {
            req.session.User_id = User.id;
            res.redirect("/")
        })

    });
})

//Route to photo page
app.get("/photos", function (req, res, next) {
    db.Image.findAll({
        where:
        {
            UserId: req.session.User_id
        }
    }).then(function (images) {
        // Download all the user images from the server
        var downloadedImages = download.downloadImages(images);
        // Render the photo list with the downloaded images
        res.render('photo-list',
            {
                downloadedImages
            }
        );
    })
});

app.post("/upload", function (req, res, next) {
    var images = req.body.images;
    var uploadedImages = upload.uploadImages(images, req.session.User_id);
    uploadedImages.forEach(uploadedImage => {
        db.Image.create({ Name: uploadedImage.name, Path: uploadedImage.path, UserId: req.session.User_id });
    })
    res.status("201").send();
    res.redirect("/");
})

//logging in
app.get("/login", function (req, res, next) {
    res.render('login');
})

app.post("/login", function (req, res, next) {
    // var name = req.body.name;
    var login = req.body.login;
    var email = req.body.email;
    var password = req.body.password;

    db.User.findOne({ where: { Email: email } }).then(function (user) {
        req.session.User_id = user.id;
        if (user === null) {
            res.render('login');
        }
        else {
            bcrypt.compare(password, user.PasswordHash, function (err, same) {
                if (same) {
                    req.session.User_id = user.id;
                    res.redirect("/");
                }
                else {
                    res.render("login");
                }
            })
        }
    })
})

//logging out
app.get("/log-out", function (req, res, next) {
    req.session.destroy();
    res.redirect("/login");
    return
})

app.listen(3000, function () {
    console.log("listening...")
})
