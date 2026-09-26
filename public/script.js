
const socket = io();

const userIpEl = document.getElementById('user-ip');
const onlineUsersEl = document.getElementById('online-users');
const messagesBox = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const usernameInput = document.getElementById('username-input');
const saveUsernameBtn = document.getElementById('save-username-btn');

let currentSocketId = null;

function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 600;
        gain.gain.value = 0.05;
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
}

socket.on('init-chat', (data) => {
    userIpEl.textContent = data.ip;
    usernameInput.value = data.username;
    currentSocketId = socket.id;
});

socket.on('room-user-count', (count) => {
    onlineUsersEl.textContent = count;
});

socket.on('system-message', (text) => {
    const sysDiv = document.createElement('div');
    sysDiv.className = 'system-msg';
    sysDiv.textContent = text;
    messagesBox.appendChild(sysDiv);
    messagesBox.scrollTop = messagesBox.scrollHeight;
});

socket.on('receive-message', (data) => {
    const isMine = data.socketId === currentSocketId;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg-item ${isMine ? 'my-msg' : ''}`;

    msgDiv.innerHTML = `
        <div class="msg-meta">
            <span>${escapeHtml(data.sender)}</span>
            <span>${data.time}</span>
        </div>
        <div class="msg-text">${escapeHtml(data.text)}</div>
    `;

    messagesBox.appendChild(msgDiv);
    messagesBox.scrollTop = messagesBox.scrollHeight;

    if (!isMine) {
        playBeep();
    }
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if (msg) {
        socket.emit('chat-message', msg);
        messageInput.value = '';
    }
});

saveUsernameBtn.addEventListener('click', () => {
    const newName = usernameInput.value.trim();
    if (newName) {
        socket.emit('change-username', newName);
    }
});

socket.on('username-updated', (newName) => {
    usernameInput.value = newName;
});

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}
