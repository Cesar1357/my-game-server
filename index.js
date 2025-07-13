const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

console.log("Servidor Socket.io iniciado en puerto 3000");

const rooms = {};

function createFoodItems(num, maxX, maxY) {
  const food = [];
  for(let i=0; i<num; i++) {
    food.push({
      id: `food_${Date.now()}_${i}`,
      x: Math.floor(Math.random() * maxX),
      y: Math.floor(Math.random() * maxY)
    });
  }
  return food;
}

io.on("connection", (socket) => {
  const room = "defaultRoom";

  if (!rooms[room]) {
    rooms[room] = { players: {}, food: createFoodItems(50, 100, 100) };
    console.log(`Sala creada: ${room} con comida generada`);
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

    // Limitar posiciones dentro del mapa
    player.x = Math.max(0, Math.min(99, player.x));
    player.y = Math.max(0, Math.min(99, player.y));

    console.log(`Jugador ${player.id} se movió a x:${player.x.toFixed(2)} y:${player.y.toFixed(2)}`);
    printPlayers(room);

    io.to(room).emit("playersUpdate", Object.values(rooms[room].players));
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
    console.log(`- ${p.id}: x=${p.x.toFixed(2)}, y=${p.y.toFixed(2)}, size=${p.size}`);
  }
  console.log("------");
}
