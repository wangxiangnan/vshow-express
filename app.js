const express = require('express'),
  path = require('path'),
  favicon = require('serve-favicon'),
  logger = require('morgan'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  session = require('express-session'),
  MongoStore = require('connect-mongo')(session),
  flash = require('connect-flash'),
  mongoose = require('mongoose'),
  fileUpload = require('express-fileupload'),
  url = require('url'),
  WebSocket = require('ws'),
  config = require('./config.json'),
  http = require('http'),
  index = require('./routes/index'),
  users = require('./routes/users'),
  api = require('./routes/api'),
  tantan = require('./routes/tantan'),
  sessionParser = session({
    name: 'sessionId',
    cookie: {maxAge: 21600000},  //过期时间为6个小时后
    resave: true,             //过期时间为6个小时后，可以重新保存
    secret: '12345',
    store: new MongoStore({   //创建新的mongodb数据库
           url: 'mongodb://wangyuda:Yuda521@localhost:27017/micapp'
       })
  }),
  app = express();

const { User } = require('./dbs/index');
mongoose.connect('mongodb://wangyuda:Yuda521@localhost:27017/micapp');




// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(flash());
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(sessionParser);

app.use(fileUpload());
app.use('/', index);
app.use('/users', users);
app.use('/api', api);
app.use('/tantan', tantan);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.sendFile(process.cwd() + '/public/build/index.html');
  //var err = new Error('Not Found');
  //err.status = 404;
  //next(err);
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

//wss start

/*const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws, req) {
  const location = url.parse(req.url, true);
  const query = location.query;
  ws.id = query.id;
  // You might use location.query.access_token to authenticate or share sessions
  // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

  ws.on('message', function incoming(message) {
    //console.log('received: %s', message);
    var oMsg = JSON.parse(message);
    wss.clients.forEach(function each(client) {
      if (client !==ws && oMsg.to === client.id) {
        if(client.readyState === WebSocket.OPEN){//对方在线
          client.send(message);
        }else{//对方不在线

        }
        
      }
    });
  });

  ws.send('something');
});

server.listen(config.port, function listening() {
  console.log('Listening on %d', server.address().port);
});*/
//wss end
//console.log('end');
if (!module.parent) {
	app.listen(8080);
}
module.exports = app;
