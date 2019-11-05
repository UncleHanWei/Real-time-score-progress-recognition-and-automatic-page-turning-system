var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');
var http = require('http');
var https = require('https');
var favicon = require('serve-favicon');
var httpApp = express();

var indexRouter = require('./routes/index');
var searchDB = require('./routes/searchDB');

var app = express();

var httpsOptions = {
  key: fs.readFileSync('./ssl_key/ssl.key'),
  cert: fs.readFileSync('./ssl_key/ssl.crt')
};

httpApp.set('port', process.env.PORT || 80);
httpApp.get("*", function (req, res, next) {
  res.redirect("https://" + req.headers.host + "/" + req.path);
});

app.set('port', process.env.PORT || 443);

app.use(favicon(path.join(__dirname,'public','images','favicon.ico')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 網址列的變化
app.use('/', indexRouter);
app.use('/searchDB', searchDB);


http.createServer(httpApp).listen(httpApp.get('port'), function() {
  console.log('Express HTTP server listening on port ' + httpApp.get('port'));
});

https.createServer(httpsOptions, app).listen(app.get('port'), function() {
  console.log('Express HTTPS server listening on port ' + app.get('port'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;