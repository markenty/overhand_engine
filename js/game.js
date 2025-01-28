
// Grab important DOM elements
const gameContainer = document.getElementById("game-container");
const player = document.getElementById("player");
const toggleButton = document.getElementById("hud-toggle");
const hpBar = document.getElementById("hp-bar");
const levelDisplay = document.getElementById("level");
const xpDisplay = document.getElementById("xp");
const itemGrid = document.getElementById("item-grid");
const hud = document.getElementById("hud");

// Global variables
let bullets = [];
let enemies = [];
let isDragging = false;
let dragOffsetX = 0;
let score = 0;
let isGamePaused = false;

// Player stats
const playerStats = {
  hp: 3,
  maxHp: 3,
  xp: 0,
  level: 1,
  xpToNextLevel: 10,
};

// Update the HUD elements
function updateHUD() {
  const hpPercentage = (playerStats.hp / playerStats.maxHp) * 100;
  hpBar.style.width = `${hpPercentage}%`;
  levelDisplay.textContent = playerStats.level;
  xpDisplay.textContent = `${playerStats.xp}/${playerStats.xpToNextLevel}`;
}

// Increase XP and handle level-ups
function gainXP(amount) {
  playerStats.xp += amount;
  if (playerStats.xp >= playerStats.xpToNextLevel) {
    playerStats.level++;
    playerStats.xp = 0;
    playerStats.xpToNextLevel += 10;
    // Speed up the treadmill as level increases, capped at some minimum
    document.documentElement.style.setProperty(
      "--treadmill-speed",
      `${Math.max(15 - playerStats.level, 5)}s`
    );
  }
  updateHUD();
}

// Slide HUD up/down and pause/resume game
toggleButton.addEventListener("click", () => {
  isGamePaused = !isGamePaused;
  itemGrid.style.display = isGamePaused ? "grid" : "none";
  if (!isGamePaused) requestAnimationFrame(gameLoop);

  hud.classList.toggle("expanded", isGamePaused);
  hud.classList.toggle("docked", !isGamePaused);
});

// Create a particle explosion at x,y
function createExplosion(x, y) {
  for (let i = 0; i < 15; i++) {
    const explosionCircle = document.createElement("div");
    explosionCircle.classList.add("explosion-circle");
    explosionCircle.style.left = `${x}px`;
    explosionCircle.style.top = `${y}px`;
    explosionCircle.style.width = `${Math.random() * 20 + 10}px`;
    explosionCircle.style.height = `${Math.random() * 20 + 10}px`;
    explosionCircle.style.backgroundColor = ["orange", "yellow", "red"][
      Math.floor(Math.random() * 3)
    ];
    gameContainer.appendChild(explosionCircle);

    setTimeout(() => explosionCircle.remove(), 1000);
  }
}

// Spawn enemies at the top in random positions
function spawnEnemy() {
  const randomType = Math.random();
  const enemy = document.createElement("div");
  enemy.classList.add("enemy");

  if (randomType < 0.3) {
    enemy.innerHTML = '<span class="hp-overlay">3</span>👾';
    enemy.dataset.hp = 3;
    enemy.dataset.maxHp = 3;
  } else if (randomType < 0.5) {
    enemy.innerHTML = '<span class="hp-overlay">1</span>⚡';
    enemy.dataset.hp = 1;
    enemy.dataset.maxHp = 1;
    enemy.classList.add("fast");
  } else if (randomType < 0.7) {
    enemy.innerHTML = '<span class="hp-overlay">5</span>🛡️';
    enemy.dataset.hp = 5;
    enemy.dataset.maxHp = 5;
    enemy.classList.add("tank");
  } else {
    enemy.innerHTML = '<span class="hp-overlay">2</span>💥';
    enemy.dataset.hp = 2;
    enemy.dataset.maxHp = 2;
    enemy.classList.add("explosive");
  }

  enemy.style.left = Math.random() * (gameContainer.offsetWidth - 50) + "px";
  enemy.style.top = "0px";
  enemies.push(enemy);
  gameContainer.appendChild(enemy);
}

// Move enemies down; damage player if they reach the bottom
function moveEnemies() {
  enemies.forEach((enemy, index) => {
    const currentTop = parseInt(enemy.style.top);
    if (enemy.classList.contains("fast")) {
      enemy.style.top = currentTop + 4 + "px";
    } else if (enemy.classList.contains("tank")) {
      enemy.style.top = currentTop + 1 + "px";
    } else {
      enemy.style.top = currentTop + 2 + "px";
    }

    // If an enemy reaches bottom, player loses HP
    if (currentTop + 50 >= gameContainer.offsetHeight) {
      playerStats.hp -= 1;
      updateHUD();
      enemy.remove();
      enemies.splice(index, 1);

      if (playerStats.hp <= 0) {
        alert("Game Over! Score: " + score);
        location.reload();
      }
    }
  });
}

// Create a bullet centered on the player and add to bullets array
function shootBullet() {
  const bullet = document.createElement("div");
  bullet.classList.add("bullet");
  bullet.textContent = "📍";
  bullet.style.left = player.offsetLeft + player.offsetWidth / 2 - 10 + "px";
  bullet.style.top = player.offsetTop + "px";
  gameContainer.appendChild(bullet);
  bullets.push(bullet);
}

// Move bullets, detect collisions, and remove enemies on hit
function moveBullets() {
  bullets.forEach((bullet, bulletIndex) => {
    const currentTop = parseInt(bullet.style.top);
    bullet.style.top = currentTop - 5 + "px";

    // Remove bullet if it goes off screen
    if (currentTop < 0) {
      bullet.remove();
      bullets.splice(bulletIndex, 1);
    }

    // Collision detection with enemies
    enemies.forEach((enemy, enemyIndex) => {
      const bulletRect = bullet.getBoundingClientRect();
      const enemyRect = enemy.getBoundingClientRect();

      if (
        bulletRect.left < enemyRect.right &&
        bulletRect.right > enemyRect.left &&
        bulletRect.top < enemyRect.bottom &&
        bulletRect.bottom > enemyRect.top
      ) {
        const hp = enemy.dataset.hp - 1;
        enemy.dataset.hp = hp;
        const hpOverlay = enemy.querySelector(".hp-overlay");
        if (hpOverlay) {
          hpOverlay.textContent = hp;
        }
        enemy.classList.add("enemy-damage");

        // Create explosion effect
        createExplosion(enemy.offsetLeft + 25, enemy.offsetTop + 25);

        // Remove enemy if HP <= 0
        if (hp <= 0) {
          enemy.remove();
          enemies.splice(enemyIndex, 1);
          gainXP(5);
          score += 10;
        }

        // Remove bullet after hitting enemy
        bullet.remove();
        bullets.splice(bulletIndex, 1);
      }
    });
  });
}

// Enable drag to move player horizontally, and clicking/touching to shoot
function enablePlayerControls() {
  // Desktop mouse
  player.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragOffsetX = e.clientX - player.offsetLeft;
    player.style.cursor = "grabbing";
  });
  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const newLeft = e.clientX - dragOffsetX;
      player.style.left = `${Math.max(
        0,
        Math.min(newLeft, gameContainer.offsetWidth - player.offsetWidth)
      )}px`;
    }
  });
  document.addEventListener("mouseup", () => {
    isDragging = false;
    player.style.cursor = "grab";
  });

  // Mobile touch
  player.addEventListener("touchstart", (e) => {
    isDragging = true;
    dragOffsetX = e.touches[0].clientX - player.offsetLeft;
  });
  document.addEventListener("touchmove", (e) => {
    if (isDragging) {
      const newLeft = e.touches[0].clientX - dragOffsetX;
      player.style.left = `${Math.max(
        0,
        Math.min(newLeft, gameContainer.offsetWidth - player.offsetWidth)
      )}px`;
    }
  });
  document.addEventListener("touchend", () => {
    isDragging = false;
  });

  // Shooting
  player.addEventListener("click", shootBullet);
  player.addEventListener("touchstart", (e) => {
    // If starting a touch without dragging, shoot
    if (!isDragging) shootBullet();
  });
}

// Main game loop
function gameLoop() {
  if (!isGamePaused) {
    moveEnemies();
    moveBullets();
    requestAnimationFrame(gameLoop);
  }
}

// Init
updateHUD();
enablePlayerControls();
setInterval(spawnEnemy, 2000);
requestAnimationFrame(gameLoop);
 
