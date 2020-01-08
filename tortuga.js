// TODO :: Fix frontend footer so text is always centered.
// TODO :: Put previews to the 10 most recent uploads on homepage.
// TODO :: Make search results look not like shit.

const express = require('express');
const pgp = require('pg-promise')();
const multer = require('multer');
const mime = require('mime');
const jade = require('jade');

// PostgreSQL configuration
const cn = {
};
const db = pgp(cn);

// Multer Configuration
const uploads = multer({
  dest: __dirname + '/public/uploads',
  limits: {fileSize: 1000000000, files:1},
  fileFilter: function(req, file, cb) {
    let mimeType = mime.getType(file.originalname);
    if (!['audio/ogg', 'audio/mpeg'].includes(mimeType)) {
      return cb(new Error('We do not currently support this file type'))
    }
    cb(null, true)
  }
})
const app = express();

app.use(express.static('public'));
app.set('view engine', 'jade');
app.set('views', __dirname + "/public/views")

app.get('/', function(req, res) {
  db.any('SELECT * FROM uploads ORDER BY time DESC LIMIT 8')
  .then(function(data) {
    console.log(data);
    res.render('index', {data: data});
  })
  .catch(function() {
    res.redirect('/404');
  })
})

app.get('/about', function(req, res) {
  res.render('about')
})

app.get('/files/:filename', function(req, res) {
  db.one('SELECT * FROM uploads WHERE filename = $1', req.params['filename'])
    .then(function(data) {
      res.render('content', {data: data});
    })
    .catch(function(data) {
      res.redirect('/404');
    });
})

app.get('/files/:filename/download', function(req, res) {
  db.one('SELECT * FROM uploads WHERE filename = $1', req.params['filename'])
    .then(function(data) {
      res.download(__dirname + "/public/uploads/" + req.params['filename']);
    })
    .catch(function() {
      res.redirect('/404');
    });
})

app.get('/search_query', function(req, res) {
  db.any("SELECT * FROM uploads WHERE title ILIKE $1 LIMIT 10;", "%" + req.query.search + "%")
    .then(function(results) {
      res.render('search', {results: results});
    })
    .catch(function() {
      res.redirect('/500');
    });
})

app.post('/upload', uploads.single('upload'), function(req, res) {
  db.none('INSERT INTO uploads (title, description, filename, time) VALUES ($<title>, $<description>, $<filename>, $<time>)', {
    title: req.body['title'],
    description: req.body['description'],
    filename: req.file.filename,
    time: Math.floor(Date.now())
  });
  res.redirect("/files/" + req.file.filename);
})

app.use(function(req, res, next) {
  res.status(404).render('404');
});

app.use(function(err, req, res, next) {
  res.status(500).render('500')
})

var server = app.listen(8002, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log("App is running at http://%s:%s", host, port);
})
