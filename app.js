var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

//DB connection code
var mongoskin = require('mongoskin');
var loremIpsum = require('lorem-ipsum'),
    output = loremIpsum();

mongoskin.connect('mongodb://localhost/geo', {
    safe: true
}, function(err, database) {
    db = database;
    db.collection('places', {}, function(err, coll) {
        db.ensureIndex('places', {
            title: "text",
            description: "text"
        }, function(err, index) {
            if (err)
                throw err;
        });
    });
});

var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use('/public', express.static(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'views')));

app.use(function(req, res, next) {
    req.db = db;
    next();
});

app.get('/', function(req, res) {
     db.collection('places').find().sort().limit(30).toArray(function(err, items) {
        if (err)
            throw err;
        res.render('index', {
            items: items
        });
    });
});

app.get('/map', function(req, res) {
    db.collection('places').find().sort().limit(30).toArray(function(err, items) {
        if (err)
            throw err;
        res.render('map', {
            items: items
        });
    });
});

app.get('/add', function(req, res) {
    num = 0;

    function addTodb(row) {

        var x = parseFloat((Math.random() * -360.0) + 180.0);
        var y = parseFloat((Math.random() * -180.0) + 90.0);

        var lon = x;
        var lat = y;

        var struct = {
            title: loremIpsum({
                count: 3,
                units: 'words',
                format: 'plain'
            }),
            description: loremIpsum({
                count: 4,
                units: 'words',
                format: 'plain'
            }),

            location: [parseFloat(lon), parseFloat(lat)]

        };
        db.collection('places').insert(struct, {
            safe: true,
        }, function(err, result) {
            if (err) throw err;
            num++;
            if (result)
            // num++;
                if (num < 10000)
                addTodb(row);
        });
    };

    addTodb();
    db.collection('places').find().sort().limit(30).toArray(function(err, items) {
        if (err)
            throw err;
        res.render('dash', {
            items: items
        });
    });

});

app.get('/search', function(req, res) {
    db.collection('places').find().limit(30).toArray(function(err, items) {
        if (err)
            throw err;
        res.render('search', {
            items: items
        });
    });

});

app.post('/search', function(req, res) {

    req.body.lon = req.body.lon || 76.61677449999999;
    req.body.lat = req.body.lat || 12.2991691;
    db.collection('places').find({
        "location": {
            $geoWithin: {
                $center: [
                    [parseFloat(req.body.lon), parseFloat(req.body.lat)], // longitude, latitude
                    0.5 / 6371 // 500m radius 6371
                ]
            }
        },
        $text: {
            $search: req.body.msg
        }
    }).toArray(function(err, items) {
        if (err)
            throw err
        console.log(items);
        res.render('search', {
            items: items
        });

    });
});

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.listen(3050);
console.log('Express server listening on port 3050');
module.exports = app;
