import initKaplay from './kaplayCtx';
import { io, Socket } from 'socket.io-client';

type PlayerData = {
  id: string;
  x: number;
  y: number;
  direction: { x: number; y: number };
};

type ServerToClientEvents = {
  updatePlayers: (players: Record<string, PlayerData>) => void;
};

type ClientToServerEvents = {
  move: (data: { x: number; y: number; direction: { x: number; y: number } }) => void;
};

export default function initGame() {
  const k = initKaplay();
  const Diagonal = 1 / Math.sqrt(2);
  const mapWidth = 50 * 32;
  const mapHeight = 50 * 31;

  k.loadSprite('background', './map.png');
  k.loadSprite('player1', './hero.png', {
    sliceX: 3,
    sliceY: 4,
    anims: {
      'down-id': { from: 1, to: 1, loop: true },  // Looping idle frame for down movement
      'up-id': { from: 10, to: 10, loop: true },  // Looping idle frame for up movement
      'left-id': { from: 4, to: 4, loop: true },  // Looping idle frame for left movement
      'right-id': { from: 7, to: 7, loop: true }, // Looping idle frame for right movement
      left: { from: 3, to: 5, loop: true },   // Left movement (row 2)
      right: { from: 6, to: 8, loop: true },  // Right movement (row 3)
      up: { from: 9, to: 11, loop: true },    // Up movement (row 4)
      down: { from: 0, to: 2, loop: true },   // Down movement (row 1)
    },
  });

  k.add([
    k.sprite('background'),
    k.pos(0, 0),
    k.scale(1),
  ]);

  const player = k.add([
    k.sprite('player1'),
    k.pos(k.width() / 2, k.height() / 2),
    k.area(),
    k.body(),
    k.scale(1.5),
    'player',
    {
      speed: 500,
      direction: k.vec2(0, 0),
    },
  ]);

  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('https://meta-backend-t2f6.onrender.com');

  const remotePlayers: Record<string, any> = {};

  socket.on('connect', () => {
    console.log('WebSocket Connected');
  });
  let lastUpdateTime = 0;

  const updateInterval = 50;
  socket.on('updatePlayers', (players) => {
    const currentTime = Date.now();
    if (currentTime - lastUpdateTime < updateInterval) return;
    lastUpdateTime = currentTime
    // Update remote players
    Object.keys(remotePlayers).forEach((id) => {
      if (!players[id]) {
        remotePlayers[id].destroy();
        delete remotePlayers[id];
      }
    });

    Object.keys(players).forEach((id) => {
      if (id === socket.id) return;

      if (!remotePlayers[id]) {
        remotePlayers[id] = k.add([
          k.sprite('player1'),
          k.pos(players[id].x, players[id].y),
          k.area(),
          k.scale(1.5),
          'remotePlayer',
        ]);
      } else {
        remotePlayers[id].pos.x = players[id].x;
        remotePlayers[id].pos.y = players[id].y;

        // Play animation
        const dir = players[id].direction;
        if (dir.x < 0) remotePlayers[id].play('left');
        if (dir.x > 0) remotePlayers[id].play('right');
        if (dir.y < 0) remotePlayers[id].play('up');
        if (dir.y > 0) remotePlayers[id].play('down');
        if (dir.x === 0 && dir.y === 0) {
          const currentAnim = remotePlayers[id].getCurAnim()?.name;
          if (currentAnim && !currentAnim.includes('id')) {
            remotePlayers[id].play(`${currentAnim}-id`);
          }
        }
      }
    });
  });

  k.setCamPos(player.pos);
  k.setCamScale(1);

  player.onUpdate(() => {
    player.direction.x = 0;
    player.direction.y = 0;
    let moving = false;
  
    // Check for movement keys
    if (k.isKeyDown('left')) {
      player.direction.x = -1;
      if (player.getCurAnim()?.name !== 'left') {
        player.play('left');
      }
      moving = true;
    }
    if (k.isKeyDown('right')) {
      player.direction.x = 1;
      if (player.getCurAnim()?.name !== 'right') {
        player.play('right');
      }
      moving = true;
    }
    if (k.isKeyDown('up')) {
      player.direction.y = -1;
      if (player.getCurAnim()?.name !== 'up') {
        player.play('up');
      }
      moving = true;
    }
    if (k.isKeyDown('down')) {
      player.direction.y = 1;
      if (player.getCurAnim()?.name !== 'down') {
        player.play('down');
      }
      moving = true;
    }
  
    // Only switch to idle if not moving
    if (!moving) {
      const currentAnim = player.getCurAnim()?.name;
      if (currentAnim && !currentAnim.includes('id')) {
        player.play(`${currentAnim}-id`);
      }
    }
  
    // Calculate new position
    let newPos = player.pos.clone();
    if (player.direction.x && player.direction.y) {
      newPos = newPos.add(player.direction.scale(player.speed * Diagonal * k.dt()));
    } else {
      newPos = newPos.add(player.direction.scale(player.speed * k.dt()));
    }
  
    // Boundary checks
    const playerWidth = player.width;
    const playerHeight = player.height;
  
    newPos.x = Math.min(Math.max(newPos.x, playerWidth), mapWidth - playerWidth);
    newPos.y = Math.min(Math.max(newPos.y, playerHeight), mapHeight - playerHeight);
  
    player.pos = newPos;
  
    // Camera position update
    const camPos = newPos.clone();
    const camWidth = k.width();
    const camHeight = k.height();
  
    camPos.x = Math.min(Math.max(camPos.x, camWidth / 2), mapWidth - camWidth / 2);
    camPos.y = Math.min(Math.max(camPos.y, camHeight / 2), mapHeight - camHeight / 2);
  
    k.setCamPos(camPos);
  
    // Emit player's new position to server
    socket.emit('move', {
      x: player.pos.x,
      y: player.pos.y,
      direction: player.direction.clone(),
    });
  });}