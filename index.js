const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

console.log("Servidor Socket.io iniciado en puerto 3000");

const rooms = {};


function isPositionOccupied(x, y, players, scale = 1) {
  for (let id in players) {
    const player = players[id];
    const playerSize = 20 * player.size * scale;
    const playerX = player.x * 20 * scale;
    const playerY = player.y * 20 * scale;

    if (
      x >= playerX &&
      x <= playerX + playerSize &&
      y >= playerY &&
      y <= playerY + playerSize
    ) {
      return true;
    }
  }
  return false;
}


function createFoodItems(num, maxX, maxY, players, existingFood) {
  const food = [];
  const scale = 1; // Usa el mismo scale que el cliente

  for (let i = 0; i < num; i++) {
    let tries = 0;
    let position;
    do {
      const fx = Math.floor(Math.random() * maxX);
      const fy = Math.floor(Math.random() * maxY);
      position = { x: fx, y: fy };
      tries++;
    } while (
      (existingFood.some(f => f.x === position.x && f.y === position.y) ||
        isPositionOccupied(position.x * 20 * scale, position.y * 20 * scale, players, scale)) &&
      tries < 100
    );

    food.push({
      id: `food_${Date.now()}_${i}`,
      x: position.x,
      y: position.y,
    });
  }

  return food;
}



io.on("connection", (socket) => {
  const room = "defaultRoom";

  if (!rooms[room]) {
    rooms[room] = { players: {}, food: [] };
    console.log(`Sala creada: ${room}`);
  }

  const playerCountBefore = Object.keys(rooms[room].players).length;

  rooms[room].players[socket.id] = {
    id: socket.id,
    name: "Player" + Math.floor(Math.random() * 1000),
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1,
  };

  if (playerCountBefore === 0) {
    rooms[room].food = createFoodItems(
      100, 99, 99,
      rooms[room].players,
      rooms[room].food
    );
    console.log(`Comida generada para la sala ${room}`);
  }

  rooms[room].players[socket.id] = {
    id: socket.id,
    name: "Player" + Math.floor(Math.random() * 1000),
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1,
  };

  socket.join(room);

  console.log(`Jugador conectado: ${socket.id}`);
  printPlayers(room);

  io.to(room).emit("playersUpdate", Object.values(rooms[room].players));

  socket.on("move", ({ dx, dy }) => {
  const player = rooms[room].players[socket.id];
  if (!player) return;

  player.x += dx;
  player.y += dy;

  // Limitar dentro del mapa
  player.x = Math.max(0, Math.min(99, player.x));
  player.y = Math.max(0, Math.min(99, player.y));

  // Detectar colisiones con comida
  const food = rooms[room].food;
  const radius = 1.5; // Área de recogida
  for (let i = food.length - 1; i >= 0; i--) {
    const fx = food[i].x;
    const fy = food[i].y;
    const dist = Math.sqrt((player.x - fx) ** 2 + (player.y - fy) ** 2);
    if (dist < radius) {
      // Comer comida
      food.splice(i, 1);
      if (food.length < 80) {
        food.push(...createFoodItems(20, 99, 99, rooms[room].players, food));
      }
      player.size += 0.2;
    }
  }

  io.to(room).emit("playersUpdate", Object.values(rooms[room].players));
  io.to(room).emit("foodUpdate", food);
});

socket.on("requestFood", () => {
  io.to(room).emit("foodUpdate", rooms[room].food);
});

socket.on("eatFood", (foodId) => {
  const index = rooms[room].food.findIndex(f => f.id === foodId);
  if (index !== -1) {
    rooms[room].food.splice(index, 1);
    const player = rooms[room].players[socket.id];
    if (player) {
      player.size += 0.1;
    }

    // Regenerar comida si es poca
    if (rooms[room].food.length < 80) {
      rooms[room].food.push(...createFoodItems(20, 99, 99, rooms[room].players, rooms[room].food));
    }

    io.to(room).emit("foodUpdate", rooms[room].food);
    io.to(room).emit("playersUpdate", Object.values(rooms[room].players));
  }
});

  socket.on("disconnect", () => {
    console.log(`Jugador desconectado: ${socket.id}`);
    delete rooms[room].players[socket.id];
    printPlayers(room);
    io.to(room).emit("playersUpdate", Object.values(rooms[room].players));
  });
});

function printPlayers(room) {
  const players = rooms[room]?.players || {};
  console.log("Jugadores actuales:");
  for (const id in players) {
    const p = players[id];
  }
  console.log("------");
}
