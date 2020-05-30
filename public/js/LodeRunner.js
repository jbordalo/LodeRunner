/*     Lode Runner

Jacinta Sousa 55075
Joao Bordalo 55697

TODO
CHANGED HTML SCRIPT SOURCE FOR DIRECTORY STRUCTURE, POSSIBLY REVERT TO ORIGINAL

-We have decided to let the animation for shot continue even if we recoil into a
ladder since we're still holding the gun and it doesn't mean we'll have to go up
the ladder.
- We assumed a type of Actor can't move against one of its own type
- The Robots are programmed to find the closest ladder that allows them to get on our
level, then move towards us

01234567890123456789012345678901234567890123456789012345678901234567890123456789
*/

// CONSTANTS
const GOLD_SCORE = 250;
const ROBOT_SCORE = 75;
const ROBOT_TRAP_SCORE = 75;
const LEVEL_UP_SCORE = 1500;
const DEFAULT_MAX_LIVES = 9;
// ROBOT_SPEED is like a global constant to have hardcoding, however we allowed users to change it so it has to be 'let'
let ROBOT_SPEED = 2;
const ROBOT_TRAP_TIME = 15;
const TRAP_RESTORE_TIME = 40;
const GOLD_HOLD_TIME = 10;

// For handling falling situations
const FALL_THROUGH = -1;
const FALL_ON = 0;
const FALL_IN = 1;

// For better readability
const RIGHT = 1;
const LEFT = -1;

// GLOBAL VARIABLES

// tente não definir mais nenhuma variável global

let gui; // For the interface
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
		const next = control.get(this.x + dx, this.y + dy);
		return !(next instanceof Solid)
			// We are assuming a Hero can't go against another hero, Robot against another Robot, etc 
			&& !(next.constructor == control.get(this.x, this.y).constructor);
	}

	move(dx, dy) {
		if (!this.validMove(dx, dy)) {
			return;
		}

		this.hide();
		this.x += dx;
		this.y += dy;

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
			const trap = new Trap(this.x, this.y, this);
			control.world[this.x][this.y] = trap;
			trap.draw(this.x, this.y);
			// Timeout has the objects that will respawn/restore
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


	isFalling() {
		const behind = control.getBehind(this.x, this.y);
		const under = control.get(this.x, this.y + 1);
		// One falls if:
		return ((behind.fallMode() == FALL_THROUGH // the block we're at allows you to fall through
			&& (under.fallMode() !== FALL_ON))	// the block under you isn't a block you fall on i.e. platform, ladder...
			// OR if we're on a trap AND we don't fall in it by default and underneath us isn't a platform like block
			|| (behind instanceof Trap && this.trapMode() !== FALL_IN && under.fallMode() !== FALL_ON)
		);
	}

	fall() {
		if (this.isFalling()) {
			const current = control.getBehind(this.x, this.y);

			// Allow loot to be catchable mid-air
			if (current instanceof Loot) {
				this.catchLoot();
			}
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

		// Set the direction the actor is pointing at
		if (dx !== 0)
			this.direction = dx / Math.abs(dx); // fancy

		this.move(dx, dy);
	}

	show() {
		// Time is starting as undefined even if we redefine this.time = 0 in hero so we're testing for undefined
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
			return;
		}

		// We know next is valid since it was checked in validMove()
		const next = control.getBehind(this.x + dx, this.y + dy);
		const current = control.getBehind(this.x, this.y);

		if (current instanceof Loot) {
			this.catchLoot();
		}

		// dy bigger than zero stops Actors from jumping onto a ladder without being on one
		if (!((next instanceof Vertical && dy > 0) || current instanceof Vertical)) {
			if (!(dy > 0 && current instanceof Horizontal)) {
				dy = 0;
			}
		}
		super.move(dx, dy);

	}


}

// Active actors not controlled by humans, marker class
class NPC extends ActiveActor {
}

//Bad NPC
class Villain extends NPC {
	constructor(x, y, imageName) {
		super(x, y, imageName);
		this.timeTrap = -1;
		this.loot = null;
		this.pickedUpTime = -1;
		this.score = 0;
		this.trapScore = 0;
	}

	catchLoot() {

		const behind = control.getBehind(this.x, this.y);

		console.assert(behind instanceof Loot);

		this.loot = behind.pickup();

	}

	move(dx, dy) {
		const current = control.getBehind(this.x, this.y);

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

// Marker class
class Solid extends PassiveActor { }

// Marker class
class Passage extends PassiveActor { }

// Vertical passages that allow vertical movement
class Vertical extends Passage {
	// To check if this Vertical allows going in the direction given
	canGoDir(lambda) {
		return control.getBehind(this.x, this.y + lambda) instanceof Vertical;
	}

}

// Horizontal passages that allow horizontal movement
class Horizontal extends Passage { fallMode() { return FALL_IN }; }

// Passive actors which you can't stand on, almost a marker class
// Objects which extend this don't have to redefine their default fallmode
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

	fallMode() { return FALL_THROUGH };
}

class Brick extends Solid {
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
	isVisible() {
		return false;
	}
}

class Trap extends PassiveActor {
	constructor(x, y, object) {
		super(x, y, "empty");
		this.before = object;
		this.created = control.time;
	}
	isVisible() {
		return false;
	}
	fallMode() {
		return FALL_IN;
	}

	// Restores trap block without trap restore time passing, i.e. when villain leaves before restore time of trap
	switch() {
		const active = control.get(this.x, this.y);
		let posToFall = control.getBehind(this.x, 0);

		// This loop ensures Actors won't spawn inside a block and be lost to the game
		for (let i = 1; posToFall instanceof Solid; i++)
			posToFall = control.getBehind(this.x, i);

		if (active instanceof ActiveActor) active.respawn(0, -this.y - posToFall.y);
		this.before.show();
	}
	restore() {
		if (control.time - this.created > TRAP_RESTORE_TIME) {
			this.switch();
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

// Marks the spots where the victory ladder will appear
class HiddenLadder extends PassiveActor {
	constructor(x, y) {
		super(x, y, "empty");
	}
	isVisible() {
		return false;
	}
	fallMode() {
		return FALL_THROUGH;
	}

	showLadder() {
		const newLadder = new Ladder(this.x, this.y);
		newLadder.makeVisible();
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
		gui.setGoldCount(n);
	}

	caughtAllGold() {
		return this.goldCount === 0;
	}

	fallMode() {
		return FALL_IN;
	}

	checkWin() {
		return (this.caughtAllGold() && this.y == 0 && (control.getBehind(this.x, this.y) instanceof Vertical));
	}

	caughtLoot(loot) {

		// We need to know if it's actually Gold since it's what the game is about
		if (loot instanceof Gold) {
			this.goldCount--;
			gui.caughtGold();
		}
		// However we have functionality to include other loot, just add personalized behavior here if needed

		// We add the score the loot gives to our patrimony, independent of loot type
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
		const behind = control.getBehind(this.x, this.y);
		const aboveTarget = control.get(this.x + this.direction, this.y);
		const target = control.getBehind(this.x + this.direction, this.y + 1);
		const recoilTarget = control.get(this.x - this.direction, this.y);

		if (!aboveTarget.isVisible()
			&& (behind.fallMode() === FALL_THROUGH || !behind.isVisible())) {
			target.destroy();
			this.shot = true;
			this.show(); //?? maybe keep this here
		}
		if (!(recoilTarget instanceof Solid)) {
			const recoilFloor = control.get(this.x - this.direction, this.y + 1);
			if (recoilFloor instanceof Solid || recoilFloor instanceof Vertical) {
				this.shot = true;
				this.move(-(this.direction), 0);
			}
		}
	}

	// Redefine trap respawn to actually die when it's a hero
	respawn() {
		this.die();
	}

	die() {
		// If it's the hero's last life and he died, it's game over
		if (patrimony.lives === 1) {
			console.log("Game over");
			patrimony.reset();
			control.restartGame();
			gui.resetStats()
		} else {
			patrimony.decLives();
			control.restartLevel();
			gui.died();
		}
	}

	animation(dx, dy) {
		if (this.checkWin()) {
			patrimony.updateScore(LEVEL_UP_SCORE);
			if (control.level !== MAPS.length) {
				control.nextLevel();
				gui.nextLevel();
			}
			else {
				gui.wonGame();
			}
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

			// Animation
			if (this.direction > 0)
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
		if (k == null) return;
		return k;
	}

}

class Robot extends Villain {
	constructor(x, y) {
		super(x, y, "robot_runs_right");
		this.dx = 1;
		this.dy = 0;
		this.score = ROBOT_SCORE; // Score the robot gives when killed
		this.trapScore = ROBOT_TRAP_SCORE; // Score the robot gives when trapped
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

		// Bigger than it could get
		let dist = 999999;
		let ladder = -1;

		for (let i = 0; i < WORLD_WIDTH; i++) {
			let a = control.getBehind(i, y);
			let b = control.getBehind(i, y + 1);
			if (a instanceof Vertical && a.canGoDir(lambda)) {
				if (Math.abs(x - i) < dist) {
					dist = Math.abs(x - i);
					ladder = i;
				}
			}
			if (b instanceof Vertical && b.canGoDir(lambda)) {
				if (Math.abs(x - i) < dist) {
					dist = Math.abs(x - i);
					ladder = i;
				}
			}
		}
		return ladder;
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
		}

		// If they're on the same Y
		if (this.y == hero.y) {
			// Robot walks in x direction if on same level with the hero
			return [xDir, 0];
		}
		// If they're not on the same Y
		else {

			// If we can and need to go down, go down
			// Needed for ropes and jumping off of ladders when they end midair
			if ((!(under instanceof Solid)) && yDir > 0) {
				// Removing solid makes it try to jump and get stuck
				return [0, 1];
			}

			// Find the closest stairs which go in yDir
			const closestVerticalPosition = this.findClosestVertical(this.x, this.y, yDir);

			// If we're on the ladder's column
			if (this.x == closestVerticalPosition) {
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
				// Unless we can't go, in which case we must try to go towards the hero
				// Since there might be a way to fall that's not a Vertical

				const ladderDir = this.x > closestVerticalPosition ? LEFT : RIGHT;

				if (!this.validMove(ladderDir, 0) || closestVerticalPosition == -1) {
					return [xDir, 0];
				}
				return [ladderDir, 0];
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
		gui.updateScore(n);
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
		empty = new Empty(); // only one empty actor needed
		this.boundary = new Boundary(); // only one boundary actor needed
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
		control.changeLevelFlag = true;
	}

	restartGame() {
		control.level = 1;
		control.changeLevelFlag = true;
	}

	nextLevel() {
		if (control.level + 1 > MAPS.length) {
			return false;
		}
		control.level += 1;
		control.changeLevelFlag = true;
		return true;
	}

	previousLevel() {
		if (control.level - 1 < 1) {
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

		// So we don't access the hero more times than we need.
		let gc = 0;

		for (let x = 0; x < WORLD_WIDTH; x++)
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				// x/y reversed because map stored by lines
				let o = GameFactory.actorFromCode(map[y][x], x, y);
				// Count how many golds there are, must be golds 
				// exactly, not loot, since it's what matters for winning the game
				if (o instanceof Gold) gc++;
				// Dealing with the invisible ladders
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

		// If the change level flag is set we change level
		if (control.changeLevelFlag) {
			control.changeLevelFlag = false;
			control.changeLevel();
			return;
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
	gui = new GUI();
}

class GUI {
	constructor() {
		this.audio = null;
		this.scoreBoard = document.getElementById("score");
		this.goldCount = document.getElementById("gold");
		this.lodeRunners = document.getElementById("loderunners");
		this.robotSpeedSlider = document.getElementById("robot-speed");
		this.currentLevel = document.getElementById("current-level");
		this.resetStats();
	}

	slider() {
		// +1 so that 0 becomes 1 and robots are stopped
		ROBOT_SPEED = parseInt(this.robotSpeedSlider.value, 10) + 1;

	}

	died() {
		this.lodeRunners.value = parseInt(this.lodeRunners.value, 10) - 1;
	}

	resetStats() {
		this.currentLevel.value = 1;
		this.scoreBoard.value = 0;
		this.lodeRunners.value = DEFAULT_MAX_LIVES;
	}

	// Reset level button
	resetLevel() {
		control.restartLevel();
	}

	previousLevel() {
		if (control.previousLevel())
			this.currentLevel.value = parseInt(this.currentLevel.value, 10) - 1;
		else {
			alert("Invalid level " + (control.level - 1));
		}
	}

	nextLevel() {
		if (control.nextLevel())
			this.currentLevel.value = parseInt(this.currentLevel.value, 10) + 1;
		else {
			alert("Invalid level " + (control.level + 1));
		}
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

	wonGame() {
		alert("Good job, you've beat the game. Go study LAP!");
		control.restartGame();
		this.resetStats();
	}

	playSound() {
		if (this.audio == null)
			this.audio = new Audio("http://ctp.di.fct.unl.pt/miei/lap/projs/proj2020-3/files/louiscole.m4a");
		this.audio.loop = true;
		this.audio.play();
	}

	stopSound() {
		if (this.audio != null) {
			this.audio.pause();
			// Restart audio
			this.audio = null;
		}
	}

}




