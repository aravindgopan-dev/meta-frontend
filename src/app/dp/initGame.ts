import initKaplay from './kaplayCtx';
import { io, Socket } from 'socket.io-client';
import wall from './pos';

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
  const mapWidth = 30 * 32;
  const mapHeight = 30 * 32;

  // Load assets
  k.loadSprite('background', './mini.png');
  k.loadSprite('player1', './hero.png', {
    sliceX: 3,
    sliceY: 4,
    anims: {
      'down-id': { from: 1, to: 1, loop: true },
      'up-id': { from: 10, to: 10, loop: true },
      'left-id': { from: 4, to: 4, loop: true },
      'right-id': { from: 7, to: 7, loop: true },
      left: { from: 3, to: 5, loop: true },
      right: { from: 6, to: 8, loop: true },
      up: { from: 9, to: 11, loop: true },
      down: { from: 0, to: 2, loop: true },
    },
  });

  // Add background
  k.add([
    k.sprite('background'),
    k.pos(0, 0),
    k.scale(1),
  ]);

  // Wall setup
  for (let i = 0; i < 30; i++) {
    for (let j = 0; j < 30; j++) {
      if (wall[i][j] === 1) {
        k.add([
          k.rect(32, 32), // Create a rectangle for the wall
          k.pos(j * 32, i * 32), // Position the wall
          k.opacity(0), // Make the wall fully transparent
          k.area(), // Add area component for collision detection
          'wall', // Tag the object as a wall
        ]);
      }
    }
  }

  // Add player
  const player = k.add([
    k.sprite('player1'),
    k.pos(k.width() / 2, k.height() / 2),
    k.area(), // Add area component for collision detection
    k.body(),
    k.scale(1),
    'player',
    {
      speed: 500,
      direction: k.vec2(0, 0),
    },
  ]);

  // Socket.io setup
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('https://meta-backend-t2f6.onrender.com');

  const remotePlayers: Record<string, any> = {};

  socket.on('connect', () => {
    console.log('WebSocket Connected');
  });



  socket.on('updatePlayers', (players) => {
  
    

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
          k.scale(1),
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

  // Set camera to follow player
  k.setCamPos(player.pos);
  k.setCamScale(1);

  // Collision handling
  player.onCollide('wall', () => {
    // Revert player to previous position
    player.pos.x -= player.direction.x * player.speed * k.dt();
    player.pos.y -= player.direction.y * player.speed * k.dt();
  
    // Stop movement in that direction
    player.direction.x = 0;
    player.direction.y = 0;
  });
  

  // Player update loop
  // Player update loop
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

  // **Custom Wall Collision Check**
  let canMove = true;

  // Get all wall objects
  const walls = k.get('wall');

  // Check if the new position collides with any wall
  for (const wall of walls) {
    if (
      newPos.x < wall.pos.x + wall.width &&
      newPos.x + player.width > wall.pos.x &&
      newPos.y < wall.pos.y + wall.height &&
      newPos.y + player.height > wall.pos.y
    ) {
      canMove = false;
      break;
    }
  }

  // Only move if no wall collision
  if (canMove) {
    player.pos = newPos;
  }

  // **Camera position update**
  const camPos = player.pos.clone();
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