const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

let tileSize = 32;
let gridWidth = 32;
let gridHeight = 32;

let placedObjects = [];
let currentTool = "wall";
let spawnPlaced = false;
let mode = "build"; // "build" or "play"

let player = null;

// Resize canvas
function resizeCanvas() {
  canvas.width = gridWidth * tileSize;
  canvas.height = gridHeight * tileSize;
}
resizeCanvas();

// Toolbox
document.querySelectorAll(".tool").forEach(btn => {
  btn.addEventListener("click", () => {
    currentTool = btn.dataset.type;
  });
});

// Settings
document.getElementById("resizeBtn").addEventListener("click", () => {
  gridWidth = parseInt(document.getElementById("gridWidth").value);
  gridHeight = parseInt(document.getElementById("gridHeight").value);
  resizeCanvas();
  draw();
});

// Place objects
canvas.addEventListener("click", e => {
  if (mode !== "build") return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);

  if (currentTool === "wall") {
    placedObjects.push({ type: "wall", x, y });
  } else if (currentTool === "spawn") {
    if (!spawnPlaced) {
      placedObjects.push({ type: "spawn", x, y });
      spawnPlaced = true;
    }
  } else if (currentTool === "erase") {
    placedObjects = placedObjects.filter(o => !(o.x === x && o.y === y));
    if (placedObjects.find(o => o.type === "spawn")) spawnPlaced = true;
    else spawnPlaced = false;
  }
  draw();
});

// Run / Finish / Cancel
document.getElementById("runBtn").addEventListener("click", () => {
  if (!spawnPlaced) {
    alert("Place a spawn point first!");
    return;
  }
  mode = "play";
  player = { 
    px: placedObjects.find(o => o.type === "spawn").x * tileSize + tileSize/2,
    py: placedObjects.find(o => o.type === "spawn").y * tileSize + tileSize/2,
    speed: 4
  };
  document.getElementById("cancelBtn").style.display = "inline-block";
  document.getElementById("toolbox").style.display = "none";
  document.getElementById("settings").style.display = "none";
  draw();
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  mode = "build";
  player = null;
  document.getElementById("cancelBtn").style.display = "none";
  document.getElementById("toolbox").style.display = "block";
  document.getElementById("settings").style.display = "block";
  draw();
});

// Save system
const saveModal = document.getElementById("saveModal");
document.getElementById("saveBtn").addEventListener("click", () => {
  document.getElementById("saveOutput").value = JSON.stringify(placedObjects);
  saveModal.style.display = "flex";
});
document.getElementById("copySave").addEventListener("click", () => {
  navigator.clipboard.writeText(document.getElementById("saveOutput").value);
});
saveModal.querySelector(".closeModal").addEventListener("click", () => saveModal.style.display = "none");

// Open system
const openModal = document.getElementById("openModal");
document.getElementById("openBtn").addEventListener("click", () => {
  openModal.style.display = "flex";
});
document.getElementById("loadOpen").addEventListener("click", () => {
  try {
    placedObjects = JSON.parse(document.getElementById("openInput").value);
    spawnPlaced = !!placedObjects.find(o => o.type === "spawn");
    draw();
    openModal.style.display = "none";
  } catch {
    alert("Invalid code");
  }
});
openModal.querySelector(".closeModal").addEventListener("click", () => openModal.style.display = "none");

// Movement
let keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

function movePlayer() {
  if (!player) return;
  let dx = 0, dy = 0;
  if (keys["w"]) dy -= player.speed;
  if (keys["s"]) dy += player.speed;
  if (keys["a"]) dx -= player.speed;
  if (keys["d"]) dx += player.speed;

  let newX = player.px + dx;
  let newY = player.py + dy;

  let newTileX = Math.floor(newX / tileSize);
  let newTileY = Math.floor(newY / tileSize);

  const hitWall = placedObjects.find(o => o.type === "wall" && o.x === newTileX && o.y === newTileY);
  if (!hitWall) {
    player.px = newX;
    player.py = newY;
  }
}

// Vision system
function canSeeTile(tileX, tileY) {
  if (!player) return true;
  const sx = player.px;
  const sy = player.py;
  const tx = (tileX + 0.5) * tileSize;
  const ty = (tileY + 0.5) * tileSize;

  const dx = tx - sx, dy = ty - sy;
  const dist = Math.hypot(dx, dy);
  const step = tileSize / 4;
  const steps = Math.max(1, Math.floor(dist / step));

  for (let i = 1; i <= steps; i++) {
    const sxp = sx + (dx * (i / steps));
    const syp = sy + (dy * (i / steps));
    const sampleTx = Math.floor(sxp / tileSize);
    const sampleTy = Math.floor(syp / tileSize);

    const wall = placedObjects.find(o => o.type === "wall" && o.x === sampleTx && o.y === sampleTy);
    if (wall) {
      if (sampleTx === tileX && sampleTy === tileY) return true; // show wall itself
      return false;
    }
  }
  return true;
}

// Draw
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Black out unseen space in play mode
  if (mode === "play") {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw tiles
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (mode === "play" && !canSeeTile(x, y)) continue;

      ctx.strokeStyle = "#ccc";
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);

      const obj = placedObjects.find(o => o.x === x && o.y === y);
      if (obj) {
        if (obj.type === "wall") {
          ctx.fillStyle = "brown";
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        } else if (obj.type === "spawn") {
          ctx.fillStyle = "green";
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }
  }

  // Draw player
  if (player) {
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(player.px, player.py, tileSize/3, 0, Math.PI*2);
    ctx.fill();
  }
}

// Game loop
function loop() {
  if (mode === "play") movePlayer();
  draw();
  requestAnimationFrame(loop);
}
loop();
