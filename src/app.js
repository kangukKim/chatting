
let express = require('express');
let http = require('http');
let app = express();
let cors = require('cors');
const fs = require('fs');

// const options = { key: fs.readFileSync('./private.pem'), cert: fs.readFileSync('./public.pem') };
let server = http.createServer(app);
let socketio = require('socket.io');
let io = socketio.listen(server);
import v1Route from './routes/v1'




app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/v1', v1Route);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  let apiError = err

  if (!err.status) {
    apiError = createError(err)
  }
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  return res.status(err.status || 500)
      .json(res.locals.error)
});



app.disable('x-powered-by');

app.use(cors());
const PORT = process.env.PORT || 3000;

let users = {};

let socketToRoom = {};



io.on('connection', socket => {
  let room = '';
  // sending to all clients in the room (channel) except sender
  socket.on('message', message => socket.broadcast.to(room).emit('message', message));
  socket.on('find', () => {
    const url = socket.request.headers.referer.split('/');
    room = url[url.length - 1];
    const sr = io.sockets.adapter.rooms[room];
    if (sr === undefined) {
      // no room with such name is found so create it
      socket.join(room);
      socket.emit('create');
    }
    if (sr.length === 1) {
      socket.emit('join');
    } else { // max two clients
      socket.emit('full', room);
    }
  });
  socket.on('random',()=>{
    var rooms = io.sockets.adapter.rooms;
    var a=0;
    for(var key in rooms){
      if(rooms[key].length==1){
        socket.emit('join',key);
        a=1;
        break;
      }
    }
    if(a==0){
      socket.join(room);
      socket.emit('create');
    }
  });
  socket.on('auth', data => {
    data.sid = socket.id;
    // sending to all clients in the room (channel) except sender
    socket.broadcast.to(room).emit('approve', data);
  });
  socket.on('accept', id => {
    io.sockets.connected[id].join(room);
    // sending to all clients in 'game' room(channel), include sender
    io.in(room).emit('bridge');
  });
  socket.on('reject', () => socket.emit('full'));
  socket.on('leave', () => {
    // sending to all clients in the room (channel) except sender
    socket.broadcast.to(room).emit('hangup');
    socket.leave(room);});
});

server.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});

module.exports = app;