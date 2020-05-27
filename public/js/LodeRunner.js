/*     Lode Runner

Jacinta Sousa 55075
Joao Bordalo 55697

TODO
CHANGED HTML SCRIPT SOURCE FOR DIRECTORY STRUCTURE, POSSIBLY REVERT TO ORIGINAL

01234567890123456789012345678901234567890123456789012345678901234567890123456789
*/

// GLOBAL VARIABLES

// tente não definir mais nenhuma variável global

let html;

let empty, hero, control;


// ACTORS

class Actor {
	constructor(x, y, imageName) {
		const RIGHT = 1;
		const LEFT = -1;
		this.direction = LEFT;
		this.x = x;
		this.y = y;
		this.imageName = imageName;
		this.show();
	}

	fallMode() {
		return FALL_ON;
	}

	draw(x, y) {
		control.ctx.drawImage(GameImages[this.imageName],
			x * ACTOR_PIXELS_X, y * ACTOR_PIXELS_Y);
	}


	validMove(dx, dy) {
		let next = control.get(this.x + dx, this.y + dy);
		return !(next instanceof Solid)
			&& !(next.constructor == control.get(this.x, this.y).constructor);
	}

	move(dx, dy) {
		if (!this.validMove(dx, dy)) {
			console.log("Respect world boundaries");
			return;
		}
		this.hide();
		this.x += dx;
		this.y += dy;

		// if (dx !== 0)
		// 	this.direction = dx / Math.abs(dx);

		this.show();
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
			let trap = new Trap(this.x, this.y, this);
			control.world[this.x][this.y] = trap;
			trap.draw(this.x, this.y);
			control.timeout.push(trap);
		}
	}

}

class ActiveActor extends Actor {

	constructor(x, y, imageName) {
		super(x, y, imageName);
		this.time = 0;	// timestamp used in the control of the animations
	}

	hide() {
		control.worldActive[this.x][this.y] = empty;
		control.world[this.x][this.y].draw(this.x, this.y);
	}
	trapMode() {
		return FALL_IN;
	}
	respawn(dx, dy) {
		super.move(dx, dy);
	}

	// TODO
	isFalling() {
		// TODO One does not fall when on a horizontal passage and when this actor is trapped

		const behind = control.getBehind(this.x, this.y);
		const under = control.get(this.x, this.y + 1);
		return ((behind instanceof Empty && (under.fallMode() !== FALL_ON))
			|| (behind instanceof Trap && this.trapMode() !== FALL_IN)
		);//|| (under instanceof Horizontal && behind instanceof Empty));
	}

	fall() {
		if (this.isFalling()) {
			super.move(0, 1);
			return false;
		}
		return true;
	}

	animation(dx, dy) {

		if (!this.fall()) return;

		[dx, dy] = this.setDirection();

		if (dx !== 0)
			this.direction = dx / Math.abs(dx);
		this.move(dx, dy);


	}

	show() {

		if (this.isFalling()) {
			if (this.direction > 0) {
				this.imageName = this.rightFall();
			} else {
				this.imageName = this.leftFall();
			}
		} else {
			const next = control.getBehind(this.x, this.y);
			if (this.direction >= 0) {
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
		}

		control.worldActive[this.x][this.y] = this;
		this.draw(this.x, this.y);
	}

	move(dx, dy) {

		// Respect world boundaries
		if (!this.validMove(dx, dy)) {
			//console.log("Respect world boundaries");
			return;
		}

		// We know next is valid since it was checked in validMove()
		const next = control.getBehind(this.x + dx, this.y + dy);
		const current = control.getBehind(this.x, this.y);

		if (!(next instanceof Vertical || current instanceof Vertical)) {
			if (!(dy > 0 && current instanceof Horizontal)) {
				dy = 0;
			}
		}

		super.move(dx, dy);

	}


}

// Active actors not controlled by humans
class NPC extends ActiveActor {
	// label?
}

//Bad NPC
class Villain extends NPC {
	constructor(x, y, imageName) {
		super(x, y, imageName);
		this.trapped = 0;
	}

	move(dx, dy) {
		const current = control.getBehind(this.x, this.y);
		if (current instanceof Trap) {
			if (this.trapped < 20) {
				this.trapped++;
			}
			else {
				this.respawn(this.direction, -1);
				this.trapped = 0;
			}
			return;
		}
		super.move(dx, dy);
	}
}

class Solid extends PassiveActor { }

class Passage extends PassiveActor { }

// Vertical passages that allow vertical movement
class Vertical extends Passage {
	// To check if this Ladder allows going in the direction given
	canGoDir(lambda) {
		// return control.world[this.x][this.y + lambda] instanceof Ladder;
		return control.getBehind(this.x, this.y + lambda) instanceof Vertical;
	}

}

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

// TODO ALLOW HERO TO WALK ON THE HOLES
class Trap extends PassiveActor {
	constructor(x, y, object) {
		super(x, y, "empty");
		this.before = object;
		this.created = control.time;
	}
	fallMode() {
		return FALL_IN;
	}
	restore() {
		if (control.time - this.created > 40) {
			const active = control.get(this.x, this.y);
			if (active instanceof ActiveActor) active.respawn(0, -(this.y));
			this.before.show();
			return true;
		}
		return false;
	}
}
class Gold extends Loot {
	constructor(x, y) { super(x, y, "gold"); }
}

class Invalid extends PassiveActor {
	constructor(x, y) {
		super(x, y, "invalid");
	}
}

class Boundary extends Solid {
	constructor() { super(-1, -1); }
	show() { }
	hide() { }
}

class Ladder extends Vertical {
	constructor(x, y) {
		super(x, y, "empty");
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
		this.shot = false;
		this.goldCount = 0;
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

	setGoldCount(n) {
		this.goldCount = n;
		html.setGoldCount(n);
	}

	shoot() {
		// this.shot = true;
		if (control.get(this.x + this.direction, this.y) instanceof Empty) {
			control.getBehind(this.x + this.direction, this.y + 1).destroy();
			// if (this.direction > 0) //animation
			// 	this.imageName = "hero_shoots_right";
			// else this.imageName = "hero_shoots_left";
			this.show(); //?? maybe keep this here
			if (!(control.get(this.x - this.direction, this.y) /*control.world[this.x - this.direction][this.y]*/ instanceof Solid)) {
				// let recoil = control.world[this.x - this.direction][this.y + 1];
				let recoil = control.get(this.x - this.direction, this.y + 1);

				if (recoil instanceof Solid || recoil instanceof Ladder) {
					this.shot = true;
					this.move(-(this.direction), 0);
				}
			}
		}
	}

	show() {
		if (this.shot) {
			console.log("I was called!");
			this.shot = false;

			if (this.direction > 0) //animation
				this.imageName = "hero_shoots_right";
			else this.imageName = "hero_shoots_left";

			control.worldActive[this.x][this.y] = this;
			this.draw(this.x, this.y);

		} else {
			super.show();
		}
	}

	setDirection() {
		var k = control.getKey();
		if (k == ' ') { this.shoot(); return; }
		// TODO
		if (k == null) return [0, 0];
		return k;
	}

}

class Robot extends Villain {
	constructor(x, y) {
		super(x, y, "robot_runs_right");
		this.dx = 1;
		this.dy = 0;
		this.closestVerticalPosition = -1;
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

	findClosestVertical(y, lambda) {

		// TODO
		/** 
		 * Robot is finding ladders across gaps
		 * Maybe start looking from the robot
		*/

		for (let i = 0; i < WORLD_WIDTH; i++) {
			let a = control.getBehind(i, y);
			let b = control.getBehind(i, y + 1);
			if (a instanceof Vertical && a.canGoDir(lambda)) {
				return i;
			}
			if (b instanceof Vertical && b.canGoDir(lambda)) {
				return i;
			}
		}
		console.log("Didn't find a ladder!");
		return -1;
	}

	setDirection() {

		const current = control.getBehind(this.x, this.y);
		const under = control.getBehind(this.x, this.y + 1);

		const xDir = this.x > hero.x ? -1 : 1;
		const yDir = this.y > hero.y ? -1 : 1;

		// If we touch the hero he dies
		if (this.y == hero.y && this.x == hero.x) {
			console.log("Dead");
			html.resetGame();
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
			if ((current instanceof Horizontal && !(under instanceof Solid)) && yDir > 0) {
				// Removing solid makes it try to jump and get stuck
				return [0, 1];
			}

			// Find the closest stairs which go in yDir
			this.closestVerticalPosition = this.findClosestVertical(this.y, yDir);
			// If we're on the ladder's column
			if (this.x == this.closestVerticalPosition) {
				// We move in yDir except if we can't

				// We can't if:
				// We're going up and current is not a ladder
				// We're going down and under is not a ladder

				// Going down
				if (yDir > 0) {
					if (under instanceof Vertical) return [0, yDir];
				}
				// Going up
				else {
					if (current instanceof Vertical) return [0, yDir];
				}

				return [xDir, 0];
			}
			// If we're not on the ladder's column, go towards it
			else {
				return [this.x > this.closestVerticalPosition ? -1 : 1, 0];
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
		this.ctx = document.getElementById("canvas1").getContext("2d");
		empty = new Empty();	// only one empty actor needed
		this.boundary = new Boundary();
		this.world = this.createMatrix();
		this.worldActive = this.createMatrix();
		this.timeout = [];
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

		let gc = 0;

		for (let x = 0; x < WORLD_WIDTH; x++)
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				// x/y reversed because map stored by lines
				let o = GameFactory.actorFromCode(map[y][x], x, y);
				if (o instanceof Gold) gc++;
			}
		hero.setGoldCount(gc);
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
		for (let x = 0; x < WORLD_WIDTH; x++) {
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				let a = control.worldActive[x][y];
				if (a.time < control.time) {
					a.time = control.time;
					a.animation();
				}
			}
		}
		let len = control.timeout.length;
		console.log("len : " + len);
		for (let x = 0; x < len; x++) {
			if (control.timeout[x].restore()) {
				control.timeout.splice(x, 1);
				console.log("x = " + x);
			}
		}
	}

	keyDownEvent(k) {
		control.key = k.keyCode;
	}

	keyUpEvent(k) {
	}

	isInside(x, y) {
		return 0 <= x && x < WORLD_WIDTH && 0 <= y && y < WORLD_HEIGHT;
	}

	get(x, y) {
		if (!this.isInside(x, y)) {
			return this.boundary;
		}
		return control.worldActive[x][y] !== empty ? control.worldActive[x][y] : control.world[x][y];
	}

	getBehind(x, y) {
		return control.world[x][y];
	}

}


// HTML FORM

function onLoad() {
	// Asynchronously load the images an then run the game
	GameImages.loadAll(function () { new GameControl(); });
	// TODO hero?
	html = new HTMLHandling();
}

class HTMLHandling {

	constructor() {
		this.audio = null;
		this.scoreBoard = document.getElementById("score");
		this.goldCount = document.getElementById("gold");
	}

	resetGame() { location.reload(); }

	b2() { this.updateScore(2); }

	b3() { mesg("button3") }

	updateScore(n) {
		this.scoreBoard.value = parseInt(this.scoreBoard.value, 10) + n;
	}

	setGoldCount(n) {
		this.goldCount.value = n;
	}

	caughtGold() {
		this.goldCount.value = parseInt(this.goldCount.value, 10) - 1;
	}

	playSound() {
		if (this.audio == null)
			this.audio = new Audio("http://ctp.di.fct.unl.pt/miei/lap/projs/proj2020-3/files/louiscole.m4a");
		this.audio.loop = true;
		this.audio.play();  // requires a previous user interaction with the page
	}

	stopSound() {
		if (this.audio != null) {
			this.audio.pause();
			// Restart audio
			this.audio = null;
		}
	}

}




