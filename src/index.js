const path = require('path')
const http = require('http')
const express = require('express')
const socket = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messeges')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/user')
const { getuid } = require('process')

const app = express()
const server = http.createServer(app)
const io = socket(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    console.log('new connection')

    socket.on('join', ({username, room}, callback) => {
        const {error, user} = addUser({id: socket.id, username, room})
        
        if(error){
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Server', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Server', `${user.username} has joined`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if(filter.isProfane(message)){
            return callback('Watch your language!!!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://www.google.com/maps/place/${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', (callback) => {
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message', generateMessage('Server', `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

    })
})


server.listen(port, () => {
    console.log('Server is up on port ' + port);
})
