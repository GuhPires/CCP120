/**
 * ============================================
 *                 COIN HUNT
 * ============================================
 * Author: Gustavo G. Pires
 * RA: 11.219.056-6
 * Course: Engenharia de Robôs
 *
 * About: Jogo desenvolvido em HTML5 Canvas, com temática
 * pirata, onde o jogador deve mover um barril
 * para coletar moedas e evitar bombas.
 *
 * Official HTML Canvas documentation: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
 * ============================================
 */

// CANVAS DEFINITION
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ENUMS
const Color = {
	BLACK: "black",
	BROWN: "brown",
	YELLOW: "yellow",
	GRAY: "gray",
	RED: "red",
	BACKGROUND: "#87ceeb",
};

const GameStatus = {
	WAITING: "WAITING", // before playing
	PLAYING: "PLAYING", // during play
	PAUSED: "PAUSED", // during pause
	FINISHED: "FINISHED", // after playing (game over)
};

const FallingObjectType = {
	COIN: "COIN",
	BOMB: "BOMB",
};

// GAME CONSTANTS
const GAME_CONFIG = {
	debug: false,
	showImages: true,
	spawnRate: 60,
	speedRate: 0.5,
};

const MARGINS = {
	canvas: {
		start: {
			x: 100,
			y: 0,
		},
		end: {
			x: canvas.width - 100,
			y: canvas.height - 150,
		},
	},
	barrel: {
		x: 10,
		y: 5,
	},
	fallingObject: {
		x: 5,
		y: 5,
	},
};

const backgroundImg = new Image();
backgroundImg.src = "images/game-background.png";

const barrelImg = new Image();
barrelImg.src = "images/barrel.png";

const coinImg = new Image();
coinImg.src = "images/coin.png";

const bombImg = new Image();
bombImg.src = "images/bomb.png";

const gameOverScreen = document.getElementById("game-over");
const startScreen = document.getElementById("start-screen");
const pauseScreen = document.getElementById("pause-screen");
const howtoScreen = document.getElementById("howto-screen");
const aboutScreen = document.getElementById("about-screen");
const scoreboard = document.getElementById("scoreboard");
const lives = document.querySelector("#lives span");
const score = document.querySelector("#score span");
const speed = document.querySelector("#speed span");
const missedCoins = document.querySelector("#missed span");
const finalScore = document.querySelector("#game-over p span");

// HELPER FUNCTIONS
function cleanState() {
	return {
		status: GameStatus.WAITING,
		currentFrame: 0,
		lives: 3,
		score: 0,
		speed: 1.5,
		missedCoins: 0,
		fallingObjects: [],
		cursorX: null,
	};
}

const drawCoordinates = ({ currentX, currentY, labelX, labelY }) => {
	ctx.fillStyle = Color.BLACK;
	ctx.font = "12px Arial";
	ctx.fillText(
		`x:${Math.floor(currentX)}, y:${Math.floor(currentY)}`,
		labelX,
		labelY
	);
};

const drawCollisionMargins = (collision) => {
	ctx.fillStyle = Color.RED;
	ctx.fillRect(collision.x, collision.y, collision.width, collision.height);
};

const clearCanvas = () => {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// add the background
	if (GAME_CONFIG.showImages) {
		ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
	} else {
		ctx.fillStyle = Color.BACKGROUND;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
};

// GAME OBJECTS
const Barrel = {
	height: 150,
	width: 150,
	x: canvas.width / 2,
	y: MARGINS.canvas.end.y,
	get collision() {
		// collision starts in the barrel's top left and not the coordinate center
		return {
			x: this.x - this.width / 2 - MARGINS.barrel.x,
			y: this.y - MARGINS.barrel.y,
			width: this.width + MARGINS.barrel.x * 2,
			height: MARGINS.barrel.y,
		};
	},
	draw(ctx) {
		// add barrel's coordinates if in debug mode
		if (GAME_CONFIG.debug) {
			drawCoordinates({
				currentX: this.x,
				currentY: this.y,
				labelX: this.x - 30,
				labelY: this.y - 10,
			});
			drawCollisionMargins(this.collision);
		}

		if (GAME_CONFIG.showImages) {
			ctx.drawImage(
				barrelImg,
				this.x - this.width / 2,
				this.y,
				this.width,
				this.height
			);
		} else {
			ctx.fillStyle = Color.BROWN;
			// makes sure that the barrel coords will be always the center of the barrel drawing
			ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
		}
	},
	update(cursorX) {
		// move barrel closer to the cursor 10% of the distance at a time
		this.x += (cursorX - this.x) * 0.1;
	},
};

const FallingObject = {
	radius: 30,
	x: null, // will be set on spawn
	y: -20,
	type: null, // will be set on spawn
	draw(ctx) {
		// add object's current coordinates if in debug mode
		if (GAME_CONFIG.debug) {
			drawCoordinates({
				currentX: this.x,
				currentY: this.y,
				labelX: this.x,
				labelY: this.y - 5,
			});
			drawCollisionMargins(this.collision);
		}

		if (GAME_CONFIG.showImages) {
			ctx.drawImage(
				this.type === FallingObjectType.COIN ? coinImg : bombImg,
				this.x,
				this.y,
				this.radius * 2,
				this.radius * 2
			);
		} else {
			ctx.fillStyle =
				this.type === FallingObjectType.COIN ? Color.YELLOW : Color.GRAY;
			// drawing a perfect circle
			ctx.beginPath();
			ctx.arc(
				this.x + this.radius,
				this.y + this.radius,
				this.radius,
				0,
				Math.PI * 2
			);
			ctx.fill();
		}
	},
	update(speed) {
		this.y += speed;
	},
	spawn() {
		// randomize object type to have about 70% chance of being a coin
		const randomObjectType =
			Math.random() > 0.3 ? FallingObjectType.COIN : FallingObjectType.BOMB;
		// randomize object start position within the canvas margins and object size
		const randomStartXPosition =
			MARGINS.canvas.start.x +
			Math.random() * (MARGINS.canvas.end.x - this.radius * 2);
		// creates a new object with randomized data
		return {
			...this,
			x: randomStartXPosition,
			type: randomObjectType,
			// implement the collision getter for each new object
			get collision() {
				// collision starts in the object's top left and not the coordinate center
				return {
					x: this.x - MARGINS.fallingObject.x,
					y: this.y,
					width: this.radius * 2 + MARGINS.fallingObject.x * 2,
					height: this.radius * 2 + MARGINS.fallingObject.y,
				};
			},
		};
	},
};

// GLOBAL VARIABLES
const ENDZONE = {
	x: 0,
	y: Barrel.y + Barrel.height, // always at the bottom of the barrel
	width: canvas.width,
	height: 10,
};

let state = cleanState();
let animationFrameId = null;

// WINDOW EVENT LISTENERS
document.addEventListener("mousemove", (e) => {
	if (state.status !== GameStatus.PLAYING) return;

	state.cursorX = e.clientX;

	if (state.cursorX < MARGINS.canvas.start.x)
		state.cursorX = MARGINS.canvas.start.x;
	if (state.cursorX > MARGINS.canvas.end.x)
		state.cursorX = MARGINS.canvas.end.x;
});

document.addEventListener("keydown", (e) => {
	if (state.status === GameStatus.WAITING) return;

	if (e.key === "Escape") state.status === GameStatus.PAUSED ? play() : pause();
});

// GAME FUNCTIONS
function start() {
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
	}

	state = cleanState();

	play();
	animate();
}

function play() {
	gameOverScreen.style.display = "none";
	startScreen.style.display = "none";
	pauseScreen.style.display = "none";
	howtoScreen.style.display = "none";
	aboutScreen.style.display = "none";

	scoreboard.style.display = "block";

	state.status = GameStatus.PLAYING;
}

function pause() {
	pauseScreen.style.display = "flex";

	state.status = GameStatus.PAUSED;
}

function finish() {
	pauseScreen.style.display = "none";

	gameOverScreen.style.display = "flex";
	finalScore.innerText = state.score;

	state.status = GameStatus.FINISHED;
}

function back() {
	gameOverScreen.style.display = "none";
	pauseScreen.style.display = "none";
	scoreboard.style.display = "none";
	aboutScreen.style.display = "none";
	howtoScreen.style.display = "none";

	startScreen.style.display = "flex";

	state.status = GameStatus.WAITING;
}

function howTo() {
	startScreen.style.display = "none";
	aboutScreen.style.display = "none";

	howtoScreen.style.display = "flex";

	state.status = GameStatus.WAITING;
}

function about() {
	startScreen.style.display = "none";
	howtoScreen.style.display = "none";

	aboutScreen.style.display = "flex";

	state.status = GameStatus.WAITING;
}

function subLives() {
	state.lives -= 1;
	if (!GAME_CONFIG.debug && state.lives <= 0)
		state.status = GameStatus.FINISHED;
}

function checkCollision(obj) {
	// TODO: fix collision issues
	const objCollisionY = obj.collision.y + obj.collision.height;
	const objCollisionLeftBorder = obj.collision.x;
	const objCollisionRightBorder = obj.collision.x + obj.collision.width;

	const barrelCollisionY = Barrel.collision.y;
	const barrelCollisionLeftBorder = Barrel.collision.x;
	const barrelCollisionRightBorder =
		Barrel.collision.x + Barrel.collision.width;

	if (
		objCollisionY >= barrelCollisionY &&
		objCollisionLeftBorder > barrelCollisionLeftBorder &&
		objCollisionRightBorder < barrelCollisionRightBorder
	) {
		if (obj.type === FallingObjectType.COIN) {
			state.score += 10;
			if (!GAME_CONFIG.debug && state.score % 50 === 0)
				state.speed += GAME_CONFIG.speedRate;
		} else {
			subLives();
		}
		return false;
	}

	const isFalling = objCollisionY < Barrel.y + Barrel.height;

	if (!isFalling && obj.type === FallingObjectType.COIN) {
		state.missedCoins += 1;
		if (!GAME_CONFIG.debug && state.missedCoins % 3 === 0) {
			subLives();
		}
	}

	return isFalling;
}

function updateScoreboard() {
	lives.innerText = state.lives;
	score.innerText = state.score;
	speed.innerText = state.speed;
	missedCoins.innerText = state.missedCoins % 3;
}

function animate() {
	if (state.status !== GameStatus.PLAYING) {
		if (state.status === GameStatus.FINISHED) return finish();
		return (animationFrameId = requestAnimationFrame(animate));
	}

	clearCanvas();

	// updates the cursor position and draws the barrel
	Barrel.update(state.cursorX);
	Barrel.draw(ctx);

	// spawn a new random object at the defined rate
	if (state.currentFrame % GAME_CONFIG.spawnRate === 0)
		state.fallingObjects.push(FallingObject.spawn());

	// updates and draws the falling objects
	state.fallingObjects.forEach((obj) => {
		obj.update(state.speed);
		obj.draw(ctx);
	});

	state.fallingObjects = state.fallingObjects.filter(checkCollision);

	updateScoreboard();

	// draw a limit line at the end of the barrel and on the screen limits when in debug mode
	if (GAME_CONFIG.debug) {
		ctx.fillStyle = Color.RED;
		ctx.fillRect(ENDZONE.x, ENDZONE.y, ENDZONE.width, ENDZONE.height);

		ctx.fillStyle = Color.RED;
		ctx.fillRect(
			MARGINS.canvas.start.x,
			ENDZONE.y,
			ENDZONE.width,
			ENDZONE.height
		);
		+Math.random() * (MARGINS.canvas.end.x - this.radius * 2);
	}

	state.currentFrame++;
	animationFrameId = requestAnimationFrame(animate);
}
