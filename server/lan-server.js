import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'node:http';

const PORT = Number(process.env.LAN_PORT || 3001);
const rooms = new Map();

const createCode = () => Math.random().toString(36).slice(2, 6).toUpperCase();

const send = (socket, payload) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

const broadcastRoomState = room => {
  send(room.host, {
    type: 'room_state',
    code: room.code,
    role: 'host',
    peerConnected: Boolean(room.guest),
  });

  if (room.guest) {
    send(room.guest, {
      type: 'room_state',
      code: room.code,
      role: 'guest',
      peerConnected: true,
    });
  }
};

const detachSocket = socket => {
  const roomCode = socket.roomCode;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const isHost = room.host === socket;
  const isGuest = room.guest === socket;

  if (isHost && room.guest) {
    send(room.guest, { type: 'error', message: 'Host disconnected.' });
    room.guest.close();
  }

  if (isGuest && room.host) {
    room.guest = null;
    send(room.host, { type: 'peer_left' });
    broadcastRoomState(room);
    return;
  }

  if (isHost) {
    rooms.delete(roomCode);
  }
};

const server = createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, service: 'arcade-fc-lan', port: PORT }));
});

const wss = new WebSocketServer({ server });

wss.on('connection', socket => {
  send(socket, { type: 'connected' });

  socket.on('message', raw => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === 'create_room') {
        let code = createCode();
        while (rooms.has(code)) code = createCode();

        const room = { code, host: socket, guest: null };
        rooms.set(code, room);
        socket.roomCode = code;
        socket.role = 'host';
        broadcastRoomState(room);
        return;
      }

      if (message.type === 'join_room') {
        const code = String(message.code || '').trim().toUpperCase();
        const room = rooms.get(code);

        if (!room) {
          send(socket, { type: 'error', message: 'Room not found.' });
          return;
        }

        if (room.guest) {
          send(socket, { type: 'error', message: 'Room is full.' });
          return;
        }

        room.guest = socket;
        socket.roomCode = code;
        socket.role = 'guest';
        send(room.host, { type: 'peer_joined' });
        broadcastRoomState(room);
        return;
      }

      const room = rooms.get(socket.roomCode);
      if (!room) {
        send(socket, { type: 'error', message: 'Room is not active.' });
        return;
      }

      if (message.type === 'start_match' && socket.role === 'host') {
        send(room.host, { type: 'start_match' });
        send(room.guest, { type: 'start_match' });
        return;
      }

      if (message.type === 'host_state' && socket.role === 'host' && room.guest) {
        send(room.guest, { type: 'host_state', snapshot: message.snapshot });
        return;
      }

      if (message.type === 'guest_input' && socket.role === 'guest' && room.host) {
        send(room.host, { type: 'guest_input', input: message.input });
      }
    } catch {
      send(socket, { type: 'error', message: 'Bad message payload.' });
    }
  });

  socket.on('close', () => detachSocket(socket));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LAN relay server running on ws://0.0.0.0:${PORT}`);
});
