const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.set('trust proxy', true);

const animals = ['Panda', 'Tiger', 'Falcon', 'Cheetah', 'Fox', 'Eagle', 'Otter', 'Wolf', 'Panther', 'Bear'];
const colors = ['Blue', 'Red', 'Green', 'Crimson', 'Neon', 'Shadow', 'Golden', 'Silver', 'Cosmic', 'Amber'];

function generateRandomUsername() {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${color}${animal}#${num}`;
}

io.on('connection', (socket) => {
    let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    
    if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
        clientIp = '127.0.0.1';
    } else if (clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
    }

    socket.join(clientIp);
    const assignedUsername = generateRandomUsername();
    socket.username = assignedUsername;

    socket.emit('init-chat', {
        ip: clientIp,
        username: assignedUsername
    });

    const updateRoomUserCount = () => {
        const roomClients = io.sockets.adapter.rooms.get(clientIp);
        const count = roomClients ? roomClients.size : 0;
        io.to(clientIp).emit('room-user-count', count);
    };

    updateRoomUserCount();
    io.to(clientIp).emit('system-message', `${socket.username} joined the chat.`);

    socket.on('chat-message', (msgText) => {
        if (!msgText || !msgText.trim()) return;

        const messageData = {
            sender: socket.username,
            text: msgText.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            socketId: socket.id
        };

        io.to(clientIp).emit('receive-message', messageData);
    });

    socket.on('change-username', (newUsername) => {
        const sanitizedName = newUsername.trim().substring(0, 20);
        if (sanitizedName && sanitizedName !== socket.username) {
            const oldName = socket.username;
            socket.username = sanitizedName;
            io.to(clientIp).emit('system-message', `${oldName} changed name to ${socket.username}`);
            socket.emit('username-updated', socket.username);
        }
    });

    socket.on('disconnect', () => {
        io.to(clientIp).emit('system-message', `${socket.username} left the chat.`);
        updateRoomUserCount();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`IPChat Server active on port ${PORT}`);
});
