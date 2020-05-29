/*     Lode Runner

Jacinta Sousa 55075
Joao Bordalo 55697

TODO
CHANGED HTML SCRIPT SOURCE FOR DIRECTORY STRUCTURE, POSSIBLY REVERT TO ORIGINAL

01234567890123456789012345678901234567890123456789012345678901234567890123456789
*/

// GLOBAL VARIABLES

// tente não definir mais nenhuma variável global

const GOLD_SCORE = 250;
const ROBOT_SCORE = 75;
const ROBOT_TRAP_SCORE = 75;
const LEVEL_UP_SCORE = 1500;
const DEFAULT_MAX_LIVES = 2;
// TODO Acts like a constant but it's changed through the GUI.
let ROBOT_SPEED = 2;

const ROBOT_TRAP_TIME = 15;
const TRAP_RESTORE_TIME = 40;
const GOLD_HOLD_TIME = 10;

const FALL_THROUGH = -1;
const FALL_ON = 0;
const FALL_IN = 1;

const RIGHT = 1;
const LEFT = -1;


let interface;
let empty, hero, control, patrimony;


// ACTORS

class Actor {
	constructor(x, y, imageName) {
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
			// We are assuming a Hero can't go agaisnt another hero, Robot against another Robot, etc 
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


class PassiveActor extends Actor {
	show() {
		control.world[this.x][this.y] = this;
		this.draw(this.x, this.y);
	}
	hide() {
		control.world[this.x][this.y] = empty;
		empty.draw(this.x, this.y);
	}

	isVisible() {
		return true;
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
		return ((behind.fallMode() == FALL_THROUGH && (under.fallMode() !== FALL_ON))
			|| (behind instanceof Trap && this.trapMode() !== FALL_IN && under.fallMode() !== FALL_ON)
		);//|| (under instanceof Horizontal && behind instanceof Empty));
	}

	fall() {
		if (this.isFalling()) {
			super.move(0, 1);
			return false;
		}
		return true;
	}

	catchLoot() {
		// Assume ActiveActors don't have to catch loot by default
		// Redefine this for Actors that DO catch Loot
		console.log("I don't catch loot")
		return;
	}

	animation(dx, dy) {
		if (!this.fall()) return;
		try {
			[dx, dy] = this.setDirection();
		} catch (e) {
			// Actor didn't move, stop animation.
			return;
		}

		if (dx !== 0)
			this.direction = dx / Math.abs(dx);

		this.move(dx, dy);
	}

	show() {
		// TODO Fix first animation form falling
		if (this.time !== undefined) {
			if (this.isFalling()) {
				if (this.direction > 0) {
					this.imageName = this.rightFall();
				} else {
					this.imageName = this.leftFall();
				}
			} else {
				const current = control.getBehind(this.x, this.y);
				if (this.direction >= 0) {
					if (current instanceof Ladder) {
						this.imageName = this.rightLadder();
					} else if (current instanceof Rope) {
						this.imageName = this.rightRope();
					} else {
						this.imageName = this.rightRun();
					}
				} else {
					if (current instanceof Ladder) {
						this.imageName = this.leftLadder();
					} else if (current instanceof Rope) {
						this.imageName = this.leftRope();
					} else {
						this.imageName = this.leftRun();
					}
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

		// dy bigger than zero stops Actors from jumping onto a ladder without being on one
		if (current instanceof Loot) {
			this.catchLoot();
		}

		if (!((next instanceof Vertical && dy > 0) || current instanceof Vertical)) {
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
		this.timeTrap = -1;
		this.loot = null;
		this.pickedUpTime = -1;
		// TODO have a score here? or just defined inside each specific villain. or add here AND redefine?
		this.score = 0;
		this.trapScore = 0;
	}

	catchLoot() {

		const behind = control.getBehind(this.x, this.y);

		console.assert(behind instanceof Loot);

		// behind.pickup();
		this.loot = behind.pickup();

	}

	move(dx, dy) {
		const current = control.getBehind(this.x, this.y);

		// TODO maybe this statement should be under trap? cause we know that if we fall in a trap we drop it

		// If we're holding loot
		if (this.loot !== null) {
			if (this.pickedUpTime < 0)
				this.pickedUpTime = control.time;
			else if (control.time - this.pickedUpTime > GOLD_HOLD_TIME
				&& control.get(this.x, this.y + 1) instanceof Solid && current instanceof Empty) {
				this.loot.setDropPosition(this.x, this.y);
				super.move(dx, dy);
				this.loot.show();
				this.loot = null;
				this.pickedUpTime = -1;
				return;
			}

		}

		if (current instanceof Trap) {

			if (this.loot !== null) {
				this.loot.setDropPosition(this.x, this.y - 1);
				this.loot.show();
				this.loot = null;
				this.pickedUpTime = -1;
			}
			if (this.timeTrap < 0) {
				this.timeTrap = control.time;
				patrimony.updateScore(this.trapScore);
				// Villain can't move inside trap.
				return;
			} else if (control.time - this.timeTrap > ROBOT_TRAP_TIME) {
				this.respawn(0, -1);
				current.switch();
				this.timeTrap = -1;
			} else return; // Villain can't move inside trap.
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
		control.world[this.x][this.y] = empty;
		return this;
	}

	setDropPosition(x, y) {
		this.x = x;
		this.y = y;
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
	constructor(x, y, object) {
		super(x, y, "empty");
		this.before = object;
		this.created = control.time;
	}
	fallMode() {
		return FALL_IN;
	}
	switch() {
		const active = control.get(this.x, this.y);
		if (active instanceof ActiveActor) active.respawn(0, -(this.y));
		this.before.show();
	}
	restore() {
		if (control.time - this.created > TRAP_RESTORE_TIME) {
			const active = control.get(this.x, this.y);
			if (active instanceof ActiveActor) active.respawn(0, -(this.y));
			this.before.show();
			return true;
		}
		return false;
	}
}
class Gold extends Loot {
	constructor(x, y) { super(x, y, "gold"); this.score = GOLD_SCORE; }
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
		this.visible = false;
	}
	isVisible() {
		return this.visible;
	}
	makeVisible() {
		this.imageName = "ladder";
		this.show();
		this.visible = true;
	}
}

class HiddenLadder extends PassiveActor {
	constructor(x, y) {
		super(x, y, "empty");
	}

	fallMode() {
		return FALL_THROUGH;
	}

	showLadder() {
		const x = new Ladder(this.x, this.y);
		x.makeVisible();
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
		interface.setGoldCount(n);
	}

	caughtAllGold() {
		return this.goldCount === 0;
	}

	fallMode() {
		return FALL_IN;
	}

	win() {
		//TODO instanceof Vertical
		return (this.caughtAllGold() && this.y == 0 && (control.getBehind(this.x, this.y) instanceof Ladder));
	}

	caughtLoot(loot) {

		// We need to know if it's actually Gold since it's what the game is about
		if (loot instanceof Gold) {
			this.goldCount--;
			interface.caughtGold();
		}
		// However we have functionality to include other loot, just add personalized behavior here if needed

		patrimony.updateScore(loot.score);
	}

	catchLoot() {

		const behind = control.getBehind(this.x, this.y);

		console.assert(behind instanceof Loot);

		// General loot
		this.caughtLoot(behind.pickup());

	}

	killedVillain(villain) {
		patrimony.updateScore(villain.score);
	}

	shoot() {
		// We use Empty - making sure we don't shoot under anything else like chimneys and hidden ladders 
		// This is the case because when robots drop gold we don't override important markers.
		if (control.get(this.x + this.direction, this.y) instanceof Empty
			&& control.getBehind(this.x, this.y).fallMode() === FALL_THROUGH) {
			control.getBehind(this.x + this.direction, this.y + 1).destroy();
			this.show(); //?? maybe keep this here
			if (!(control.get(this.x - this.direction, this.y) instanceof Solid)) {
				let recoil = control.get(this.x - this.direction, this.y + 1);

				if (recoil instanceof Solid || recoil instanceof Ladder) {
					this.shot = true;
					this.move(-(this.direction), 0);
				}
			}
		}
	}

	die() {
		if (patrimony.lives === 1) {
			console.log("Game over");
			patrimony.reset();
			control.restartGame();
			interface.resetScore();
			interface.resetLives();
		} else {
			console.log("Lost a life");
			patrimony.decLives();
			console.log(`I have ${patrimony.getLives()} lives left`);
			control.restartLevel();
			interface.died();
		}

	}

	animation(dx, dy) {
		if (this.win()) {
			patrimony.updateScore(LEVEL_UP_SCORE);
			control.nextLevel();
		}
		super.animation(dx, dy);
	}

	move(dx, dy) {
		if (control.get(this.x + dx, this.y + dy) instanceof Villain) {
			this.die();
		}
		super.move(dx, dy);
	}

	show() {
		if (this.shot) {
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
		if (k == null) return;
		return k;
	}

}

class Robot extends Villain {
	constructor(x, y) {
		super(x, y, "robot_runs_right");
		this.dx = 1;
		this.dy = 0;
		this.closestVerticalPosition = -1;
		this.score = ROBOT_SCORE; // Score the robot gives when killed
		this.trapScore = ROBOT_TRAP_SCORE;

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

	animation(dx, dy) {

		// Reduce robot speed
		if (this.time % ROBOT_SPEED == 0)
			return;

		super.animation(dx, dy);

	}

	findClosestVertical(x, y, lambda) {

		let dist = 999999; // Bigger than it could get
		let ladder = -1;

		for (let i = 0; i < WORLD_WIDTH; i++) {
			let a = control.getBehind(i, y);
			let b = control.getBehind(i, y + 1);
			if (a instanceof Vertical && a.canGoDir(lambda)) {
				if (Math.abs(x - i) < dist) {
					dist = Math.abs(x - i);
					ladder = i;
				}
				// return i;
			}
			if (b instanceof Vertical && b.canGoDir(lambda)) {
				if (Math.abs(x - i) < dist) {
					dist = Math.abs(x - i);
					ladder = i;
				}
				// return i;
			}
		}
		return ladder;
		// console.log("Didn't find a ladder!");
		// return -1;
	}

	setDirection() {

		const current = control.getBehind(this.x, this.y);
		const under = control.getBehind(this.x, this.y + 1);

		const xDir = this.x > hero.x ? -1 : 1;
		const yDir = this.y > hero.y ? -1 : 1;

		// If we touch the hero he dies
		if (this.y == hero.y && this.x == hero.x) {
			console.log("Killed the hero");
			hero.die();
			return;
			// control.restartLevel();
		}

		// If they're on the same Y
		if (this.y == hero.y) {
			// Robot walks in x direction
			// console.log("Going in the x direction!");
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
			this.closestVerticalPosition = this.findClosestVertical(this.x, this.y, yDir);
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

class Patrimony {
	constructor() {
		this.reset();
	}

	getLives() {
		return this.lives;
	}

	getScore() {
		return this.score;
	}

	decLives() {
		this.lives--;
	}

	updateScore(n) {
		this.score += n;
		interface.updateScore(n);
	}

	reset() {
		this.lives = DEFAULT_MAX_LIVES;
		this.score = 0;
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
		this.level = 1;
		this.changeLevelFlag = false;
		this.loadLevel(1);
		this.setupEvents();
		patrimony = new Patrimony();
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

	clearLevel() {
		for (let x = 0; x < WORLD_WIDTH; x++)
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				control.world[x][y].hide();
				control.worldActive[x][y].hide();
			}
	}

	changeLevel() {
		control.clearLevel();
		control.loadLevel(control.level);
	}

	restartLevel() {
		// control.loadLevel(control.level);
		control.changeLevelFlag = true;
	}

	restartGame() {
		control.level = 1;
		// control.restartLevel();
		control.changeLevelFlag = true;
	}

	nextLevel() {
		// control.restartLevel();
		if (control.level + 1 > MAPS.length) {
			alert("Invalid level " + control.level);
			return false;
		}
		control.level += 1;
		control.changeLevelFlag = true;
		return true;
	}

	previousLevel() {
		// control.restartLevel();
		if (control.level - 1 < 1) {
			alert("Invalid level " + control.level);
			return false;
		}
		control.level -= 1;
		control.changeLevelFlag = true;
		return true;
	}

	loadLevel(level) {
		if (level < 1 || level > MAPS.length)
			fatalError("Invalid level " + level)
		let map = MAPS[level - 1];  // -1 because levels start at 1

		let gc = 0; // So we don't access the hero more times than we need.

		for (let x = 0; x < WORLD_WIDTH; x++)
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				// x/y reversed because map stored by lines
				let o = GameFactory.actorFromCode(map[y][x], x, y);
				if (o instanceof Gold) gc++;
				if (o instanceof Ladder && !o.isVisible()) new HiddenLadder(x, y);
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

	showHiddenLadder() {
		if (hero.caughtAllGold()) {
			for (let x = 0; x < WORLD_WIDTH; x++) {
				for (let y = 0; y < WORLD_HEIGHT; y++) {
					let a = control.world[x][y];
					if (a instanceof HiddenLadder) {
						a.showLadder();
					}
				}
			}
		}
	}

	respawnTraps() {
		let len = control.timeout.length;
		//console.log("len : " + len);
		for (let x = 0; x < len; x++) {
			let a = control.timeout[x];
			if (a instanceof Trap) {
				if (a.restore())
					control.timeout.splice(x, 1);
			} else {
				control.timeout.splice(x, 1);
			}
		}
	}

	animationEvent() {

		if (control.changeLevelFlag) {
			control.changeLevelFlag = false;
			control.changeLevel();
		}

		control.showHiddenLadder();

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

		control.respawnTraps();
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
	interface = new Interface();
}

class Interface {

	constructor() {
		this.audio = null;
		this.scoreBoard = document.getElementById("score");
		this.goldCount = document.getElementById("gold");
		this.lodeRunners = document.getElementById("loderunners");
		this.robotSpeedSlider = document.getElementById("robot-speed");
		this.currentLevel = document.getElementById("current-level");
		this.resetLives();
		this.resetScore();
	}

	slider() {
		console.log(this.robotSpeedSlider.value);
		// +1 so that 0 becomes 1 and robots are stopped
		ROBOT_SPEED = parseInt(this.robotSpeedSlider.value, 10) + 1;

	}

	died() {
		this.lodeRunners.value = parseInt(this.lodeRunners.value, 10) - 1;
	}

	resetLives() {
		this.lodeRunners.value = DEFAULT_MAX_LIVES;
	}

	resetGame() {
		control.restartLevel();
	}

	previousLevel() {
		if (control.previousLevel())
			this.currentLevel.value = parseInt(this.currentLevel.value, 10) - 1;
	}

	nextLevel() {
		if (control.nextLevel())
			this.currentLevel.value = parseInt(this.currentLevel.value, 10) + 1;
	}

	resetScore() {
		this.scoreBoard.value = 0;
	}

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




