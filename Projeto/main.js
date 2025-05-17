// TODO: add my data
// Done following the official HTML <canvas> documentation: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D

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
	FINISHED: "FINISHED", // after playing (game over)
};

const FallingObjectType = {
	COIN: "COIN",
	BOMB: "BOMB",
};

// GAME CONSTANTS
const GAME_CONFIG = {
	debug: true,
	spawnRate: 60,
	speedRate: 0.5,
};

const GAME_INITIAL_STATE = {
	status: GameStatus.WAITING,
	currentFrame: 0,
	lives: 3,
	score: 0,
	speed: 1.5,
	fallingObjects: [],
};

const MARGINS = {
	canvas: {
		start: {
			x: 50,
			y: 0,
		},
		end: {
			x: canvas.width - 50,
			y: canvas.height - 100,
		},
	},
	barrel: {
		x: 10,
		y: 5,
	},
	fallingObject: {
		x: 5,
		y: 10,
	},
};

// HELPER FUNCTIONS
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

// GAME OBJECTS
const Barrel = {
	height: 60,
	width: 60,
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

		ctx.fillStyle = Color.BROWN;
		// makes sure that the barrel coords will be always the center of the barrel drawing
		ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
	},
	update(cursorX) {
		// move barrel closer to the cursor 10% of the distance at a time
		this.x += (cursorX - this.x) * 0.1;
	},
};

const FallingObject = {
	radius: 20,
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
			console.log(this.collision);
			drawCollisionMargins(this.collision);
		}

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

let cursorX = null;

// WINDOW EVENT LISTENERS
// TODO: register only when starting playing, unregister on game over
document.addEventListener("mousemove", (e) => {
	cursorX = e.clientX;

	if (cursorX < MARGINS.canvas.start.x) cursorX = MARGINS.canvas.start.x;
	if (cursorX > MARGINS.canvas.end.x) cursorX = MARGINS.canvas.end.x;
});

// GAME FUNCTIONS
function start() {
	document.getElementById("game-over").style.display = "none";
	document.getElementById("start-screen").style.display = "none";
	document.getElementById("scoreboard").style.display = "block";

	animate({ ...GAME_INITIAL_STATE, status: GameStatus.PLAYING });
}

function checkCollision(obj, state) {
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
				speed += GAME_CONFIG.speedRate;
		} else {
			state.lives -= 1;
			if (!GAME_CONFIG.debug && state.lives <= 0) gameOver = true;
		}
		return false;
	}

	return objCollisionY < Barrel.y + Barrel.height;
}

function updateScoreboard(state) {
	document.getElementById(
		"scoreboard"
	).innerText = `Lives: ${state.lives} | Score: ${state.score}`;
}

function animate(state) {
	if (state.status === GameStatus.FINISHED) {
		document.getElementById("game-over").style.display = "flex";
		return;
	}

	// clears the canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// add the background
	ctx.fillStyle = Color.BACKGROUND;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// updates the cursor position and draws the barrel
	Barrel.update(cursorX);
	Barrel.draw(ctx);

	// spawn a new random object at the defined rate
	if (state.currentFrame % GAME_CONFIG.spawnRate === 0)
		state.fallingObjects.push(FallingObject.spawn());

	// updates and draws the falling objects
	state.fallingObjects.forEach((obj) => {
		obj.update(state.speed);
		obj.draw(ctx);
	});

	state.fallingObjects = state.fallingObjects.filter((obj) =>
		checkCollision(obj, state)
	);

	updateScoreboard(state);

	// draw a limit line at the end of the barrel when in debug mode
	if (GAME_CONFIG.debug) {
		ctx.fillStyle = Color.RED;
		ctx.fillRect(ENDZONE.x, ENDZONE.y, ENDZONE.width, ENDZONE.height);
	}

	state.currentFrame++;
	requestAnimationFrame(() => animate(state));
}
