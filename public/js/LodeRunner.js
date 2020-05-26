/*     Lode Runner

Jacinta Sousa 55075
Joao Bordalo 55697

TODO
CHANGED HTML SCRIPT SOURCE FOR DIRECTORY STRUCTURE, POSSIBLY REVERT TO ORIGINAL

01234567890123456789012345678901234567890123456789012345678901234567890123456789
*/

// GLOBAL VARIABLES

// tente não definir mais nenhuma variável global

let empty, hero, control;


// ACTORS

class Actor {
	constructor(x, y, imageName) {
		this.x = x;
		this.y = y;
		this.imageName = imageName;
		this.show();
	}
	draw(x, y) {
		control.ctx.drawImage(GameImages[this.imageName],
			x * ACTOR_PIXELS_X, y * ACTOR_PIXELS_Y);
	}
	move(dx, dy) {
		// Respect world boundaries
		if (this.x + dx < WORLD_WIDTH && this.x + dx >= 0 && this.y + dy < WORLD_HEIGHT && this.y + dy >= 0) {
			this.hide();
			this.x += dx;
			this.y += dy;
			this.show();
		} else {
			console.log("Respect world boundaries");
		}

	}
}

const FALL_THROUGH = -1;
const FALL_ON = 0;
const FALL_IN = 1;

class PassiveActor extends Actor {
	show() {
		control.world[this.x][this.y] = this;
		this.draw(this.x, this.y);
	}
	hide() {
		control.world[this.x][this.y] = empty;
		empty.draw(this.x, this.y);
	}

	destructable() {
		return false;
	}

	destroy() {
		if (this.destructable()) {
			this.hide();
			let trap = new Trap(this.x, this.y);
			control.world[this.x][this.y] = trap;
			trap.draw(this.x, this.y);
		}
	}

	fallMode() {
		return FALL_ON;
	}

}

class ActiveActor extends Actor {

	constructor(x, y, imageName) {
		const RIGHT = 1;
		const LEFT = -1;
		super(x, y, imageName);
		this.time = 0;	// timestamp used in the control of the animations
		this.direction = LEFT;
	}
	show() {
		control.worldActive[this.x][this.y] = this;
		this.draw(this.x, this.y);
	}
	hide() {
		control.worldActive[this.x][this.y] = empty;
		control.world[this.x][this.y].draw(this.x, this.y);
	}
	trapMode() {
		return FALL_IN;
	}
	fall() {

		const current = control.world[this.x][this.y];
		let under = control.world[this.x][this.y + 1];
		//one does not fall when on a horizontal passage and when this actor is trapped
		if (!(current instanceof Horizontal) && !(current instanceof Trap && this.trapMode() == FALL_IN)) {
			if (under.fallMode() != FALL_ON) {
				if (this.direction > 0) {
					this.imageName = this.rightFall();
				} else {
					this.imageName = this.leftFall();
				}
				this.move(0, 1);
				return false;
			}
		}
		return true;
	}

	animation(dx, dy) {

		const current = control.world[this.x][this.y];

		if (!this.fall()) return;

		[dx, dy] = this.setDirection();

		// DUCT TAPE
		if (dx == 0 && dy == 0) return;

		// Set the last direction
		this.direction = dx / Math.abs(dx);

		const next = control.world[this.x + dx][this.y + dy];

		if (!(next instanceof Vertical || current instanceof Vertical)) {
			if (!(dy > 0 && current instanceof Horizontal))
				dy = 0;
		}

		if (!(next instanceof Solid)) {
			// super.animation(dx, dy);

			// current = control.world[this.x + dx][this.y + dy];

			if (dx >= 0) {
				if (next instanceof Ladder) {
					this.imageName = this.rightLadder();
				} else if (next instanceof Rope) {
					this.imageName = this.rightRope();
				} else {
					this.imageName = this.rightRun();
				}
			} else {
				if (next instanceof Ladder) {
					this.imageName = this.leftLadder();
				} else if (next instanceof Rope) {
					this.imageName = this.leftRope();
				} else {
					this.imageName = this.leftRun();
				}
			}

			this.move(dx, dy);
			console.log(`dx: ${dx}, dy: ${dy}`);
		}
		else console.log("SOLID!");

	}
}

// Active actors not controlled by humans
class NPC extends ActiveActor {
	// label?
}

// Bad NPC
class Villain extends NPC {
	constructor(x, y, imageName) {
		super(x, y, imageName);
	}
}

class Solid extends PassiveActor { }

class Passage extends PassiveActor { }

// Vertical passages that allow vertical movement
class Vertical extends Passage { }

// Horizontal passages that allow horizontal movement
class Horizontal extends Passage { fallMode() { return FALL_IN }; }

// Passive actors which you can't stand on
class FallThrough extends PassiveActor {
	fallMode() {
		return FALL_THROUGH;
	}
}

// Label interface for items you can pick up
class Loot extends PassiveActor {
	pickup() {
		this.hide();
	}
	fallMode() { return FALL_IN };
}

class Brick extends Solid { //, Destructible {
	constructor(x, y) { super(x, y, "brick"); }
	destructable() {
		return true;
	}
}

class Chimney extends FallThrough {
	constructor(x, y) { super(x, y, "chimney"); }
}

class Empty extends FallThrough {
	constructor() { super(-1, -1, "empty"); }
	show() { }
	hide() { }
}
class Trap extends PassiveActor {
	constructor(x, y) { super(x, y, "empty"); }
	fallMode() {
		return FALL_IN;
	}
}
class Gold extends Loot {
	constructor(x, y) { super(x, y, "gold"); }
}

class Invalid extends PassiveActor {
	constructor(x, y) { super(x, y, "invalid"); }
}

class Ladder extends Vertical {
	constructor(x, y) {
		super(x, y, "empty");
	}

	// To check if this Ladder allows going in the direction given
	canGoDir(lambda) {
		return control.world[this.x][this.y + lambda] instanceof Ladder;
	}

	makeVisible() {
		this.imageName = "ladder";
		this.show();
	}
}

class Rope extends Horizontal {
	constructor(x, y) { super(x, y, "rope"); }
}

class Stone extends Solid {
	constructor(x, y) { super(x, y, "stone"); }
}

class Hero extends ActiveActor {
	constructor(x, y) {
		super(x, y, "hero_runs_left");
	}

	rightRun() {
		return "hero_runs_right";
	}

	leftRun() {
		return "hero_runs_left";
	}

	leftLadder() {
		return "hero_on_ladder_left";
	}

	rightLadder() {
		return "hero_on_ladder_right";
	}

	leftRope() {
		return "hero_on_rope_left";
	}

	rightRope() {
		return "hero_on_rope_right";
	}

	leftFall() {
		return "hero_falls_left";
	}

	rightFall() {
		return "hero_falls_right";
	}
	trapMode() {
		return FALL_THROUGH;
	}
	shoot() {
		if (control.world[this.x + this.direction][this.y] instanceof Empty) {
			control.world[this.x + this.direction][this.y + 1].destroy();
			if (this.direction > 0) //animation 
				this.imageName = "hero_shoots_right";
			else this.imageName = "hero_shoots_left";
			this.show(); //?? maybe keep this here
			if (!(control.world[this.x - this.direction][this.y] instanceof Solid)) {
				let recoil = control.world[this.x - this.direction][this.y + 1];
				if (recoil instanceof Solid || recoil instanceof Ladder) {
					this.move(-(this.direction), 0);
				}
			}
		}
	}

	setDirection() {
		var k = control.getKey();
		if (k == ' ') { this.shoot(); return; }
		if (k == null) return [0, 0];
		return k;
	}

}

class Robot extends Villain {
	constructor(x, y) {
		super(x, y, "robot_runs_right");
		this.dx = 1;
		this.dy = 0;
		this.closestLadderPosition = -1;
	}

	rightRun() {
		return "robot_runs_right";
	}

	leftRun() {
		return "robot_runs_left";
	}

	leftLadder() {
		return "robot_on_ladder_left";
	}

	rightLadder() {
		return "robot_on_ladder_right";
	}

	leftRope() {
		return "robot_on_rope_left";
	}

	rightRope() {
		return "robot_on_rope_right";
	}

	leftFall() {
		return "robot_falls_left";
	}

	rightFall() {
		return "robot_falls_right";
	}

	findClosestLadder(y, lambda) {
		for (let i = 0; i < WORLD_WIDTH; i++) {
			let a = control.world[i][y];
			let b = control.world[i][y + 1];
			if (a instanceof Ladder && a.canGoDir(lambda)) {
				return i;
			}
			if (b instanceof Ladder && b.canGoDir(lambda)) {
				return i;
			}
		}
		return -1;
	}

	setDirection() {

		const current = control.world[this.x][this.y];
		const under = control.world[this.x][this.y + 1];

		const xDir = this.x > hero.x ? -1 : 1;
		const yDir = this.y > hero.y ? -1 : 1;

		// If we touch the hero he dies
		if (this.y == hero.y && this.x == hero.x) {
			console.log("Dead");
			resetGame();
		}

		// If they're on the same Y
		if (this.y == hero.y) {
			// Robot walks in x direction
			console.log("Going in the x direction!")
			return [xDir, 0];
		}
		// If they're not on the same Y
		else {

			// If we're on a rope and hero is underneath us we just jump
			if (current instanceof Horizontal && yDir > 0) {
				return [0, 1];
			}

			// Find the closest stairs which go in yDir
			this.closestLadderPosition = this.findClosestLadder(this.y, yDir);
			// If we're on the ladder's column
			if (this.x == this.closestLadderPosition) {
				// We move in yDir except if we can't

				// We can't if:
				// We're going up and current is not a ladder
				// We're going down and under is not a ladder

				// Going down
				if (yDir > 0) {
					if (under instanceof Ladder) return [0, yDir];
				}
				// Going up
				else {
					if (current instanceof Ladder) return [0, yDir];
				}

				return [xDir, 0];
			}
			// If we're not on the ladder's column, go towards it
			else {
				return [this.x > this.closestLadderPosition ? -1 : 1, 0];
			}

		}


	}

}


// GAME CONTROL

class GameControl {
	constructor() {
		control = this;
		this.key = 0;
		this.time = 0;
		this.goldCount = 0;
		this.ctx = document.getElementById("canvas1").getContext("2d");
		empty = new Empty();	// only one empty actor needed
		this.world = this.createMatrix();
		this.worldActive = this.createMatrix();
		this.loadLevel(1);
		this.setupEvents();
	}

	createMatrix() { // stored by columns
		let matrix = new Array(WORLD_WIDTH);
		for (let x = 0; x < WORLD_WIDTH; x++) {
			let a = new Array(WORLD_HEIGHT);
			for (let y = 0; y < WORLD_HEIGHT; y++)
				a[y] = empty;
			matrix[x] = a;
		}
		return matrix;
	}

	loadLevel(level) {
		if (level < 1 || level > MAPS.length)
			fatalError("Invalid level " + level)
		let map = MAPS[level - 1];  // -1 because levels start at 1
		for (let x = 0; x < WORLD_WIDTH; x++)
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				// x/y reversed because map stored by lines
				let o = GameFactory.actorFromCode(map[y][x], x, y);
				if (o instanceof Gold) this.goldCount++;
			}
		document.getElementById("gold").value = this.goldCount;
	}

	getKey() {
		let k = control.key;
		control.key = 0;
		switch (k) {
			case 37: case 79: case 74: return [-1, 0]; //  LEFT, O, J
			case 38: case 81: case 73: return [0, -1]; //    UP, Q, I
			case 39: case 80: case 76: return [1, 0];  // RIGHT, P, L
			case 40: case 65: case 75: return [0, 1];  //  DOWN, A, K
			case 0: return null;
			default: return String.fromCharCode(k);
			// http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
		};
	}

	setupEvents() {
		addEventListener("keydown", this.keyDownEvent, false);
		addEventListener("keyup", this.keyUpEvent, false);
		setInterval(this.animationEvent, 1000 / ANIMATION_EVENTS_PER_SECOND);
	}

	animationEvent() {
		control.time++;
		for (let x = 0; x < WORLD_WIDTH; x++)
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				let a = control.worldActive[x][y];
				if (a.time < control.time) {
					a.time = control.time;
					a.animation();
				}
			}
	}
	keyDownEvent(k) {
		control.key = k.keyCode;
	}
	keyUpEvent(k) {
	}
}


// HTML FORM

function onLoad() {
	// Asynchronously load the images an then run the game
	GameImages.loadAll(function () { new GameControl(); });
}

function resetGame() { location.reload(); }
function b2() { updateScore(1); }
function b3() { mesg("button3") }
function updateScore(n) {
	let score = document.getElementById("score");
	score.value = parseInt(score.value, 10) + 1;
}

let audio = null;

function playSound() {
	if (audio == null)
		audio = new Audio("http://ctp.di.fct.unl.pt/miei/lap/projs/proj2020-3/files/louiscole.m4a");
	audio.loop = true;
	audio.play();  // requires a previous user interaction with the page
}

function stopSound() {
	if (audio != null) {
		audio.pause();
		// Restart audio
		audio = null;
	}
}