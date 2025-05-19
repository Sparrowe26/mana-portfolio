"use strict";
const app = new PIXI.Application({
    width: 1000,
    height: 800,
    backgroundColor: 0x3a4f7c
});
document.body.appendChild(app.view);

// constants
const sceneWidth = app.view.width;
const sceneHeight = app.view.height;
const etchWidth = app.view.width - 100;
const etchHeight = app.view.height - 100;

// pre-load the images
app.loader.
    add([
        "images/star.png",
        "images/Etch-A-Fetch.png",
        "images/knob.png"
    ]);
app.loader.onProgress.add(e => { console.log(`progress=${e.progress}`) });
app.loader.onComplete.add(setup);
app.loader.load();

// game variables
let stage;
let etchScreen;
let gameBorder;
let leftKnob;
let rightKnob;
let speed = 140;
let keys = {};
let line = [];
let stars = [];
let stopwatch = 0.0;
let timer = 10;
let score = 0;
let paused = false;
let levelNum = 1;
let startScene, gameScene, gameOverScene, freeScene;
let scoreLabel, timerLabel, gameOverScoreLabel;
let clickSound, starSound, shakeSound;
let playerBox;
let isSpaceDown = false;


//setup();

function setup() {
    stage = app.stage;
    
    // load sounds
    clickSound = new Howl({
        src: ['sounds/click.mp3']
    });
    starSound = new Howl({
        src: ['sounds/ding.mp3']
    });
    shakeSound = new Howl({
        src: ['sounds/shake.mp3']
    });

    //create etch-a-sketch screen
    etchScreen = new PIXI.Graphics();
    etchScreen.beginFill(0xD6D6D6);
    etchScreen.drawRect(90, 100, etchWidth - 90, etchHeight - 90);
    etchScreen.endFill();
    stage.addChild(etchScreen);

    //create game border
    gameBorder = new PIXI.Sprite.from("images/Etch-A-Fetch.png");
    gameBorder.anchor.set(0.5);
    gameBorder.x = sceneWidth / 2;
    gameBorder.y = sceneHeight / 2;
    stage.addChild(gameBorder);

    //create knobs
    leftKnob = new PIXI.Sprite.from("images/knob.png");
    leftKnob.anchor.set(0.5);
    leftKnob.x = 60;
    leftKnob.y = sceneHeight - 66;
    stage.addChild(leftKnob);

    rightKnob = new PIXI.Sprite.from("images/knob.png");
    rightKnob.anchor.set(0.5);
    rightKnob.x = sceneWidth - 60;
    rightKnob.y = sceneHeight - 66;
    stage.addChild(rightKnob);

    // create the `start` scene
    startScene = new PIXI.Container();
    stage.addChild(startScene);

    // create the main `game` scene and make it invisible
    gameScene = new PIXI.Container();
    gameScene.visible = false;
    stage.addChild(gameScene);

    // create free draw scene
    freeScene = new PIXI.Container();
    freeScene.visible = false;
    stage.addChild(freeScene);

    // create the `gameOver` scene and make it invisible
    gameOverScene = new PIXI.Container();
    gameOverScene.visible = false;
    stage.addChild(gameOverScene);

    // create labels for all 3 scenes
    createLabelsAndButtons();

    // create player cursor
    playerBox = new Cursor();
    playerBox.x = sceneWidth / 2;
    playerBox.y = sceneHeight / 2;
    gameScene.addChild(playerBox);


    //add gameloop
    app.ticker.add(gameLoop);
}

// move cursor based on etch-a-sketch controls
function gameLoop() {
    if (paused) return;
    if (!gameScene.visible && !freeScene.visible) return;

    let dt = 1 / app.ticker.FPS;
    if (dt > 1 / 12) dt = 1 / 12;

    stopwatch += 1;
    if (gameScene.visible) {
        timer -= 1 * dt;
        timerLabel.text = `Time Remaining: ${timer.toFixed(2)}`;
    }

    let previousPos;

    // save position if any controls are pressed
    if (keys["39"] || keys["37"] || keys["65"] || keys["68"]) {
        previousPos = playerBox.position;
    }

    // Right arrow is 39
    if (keys["39"]) {
        // If the right arrow is pressed, move the player up.
        if (playerBox.position.y > sceneHeight - etchHeight + 5) {
            playerBox.position.y -= speed * dt;
            rightKnob.rotation += Math.PI/40;
        }
    }

    // Left arrow is 37
    if (keys["37"]) {
        // If the Left arrow is pressed, move the player down.
        if (playerBox.position.y < etchHeight - 10) {
            playerBox.position.y += speed * dt;
            rightKnob.rotation -= Math.PI/40;
        }
    }

    // A Key is 65
    if (keys["65"]) {
        // If the A key is pressed, move the player to the left.
        if (playerBox.position.x > sceneWidth - etchWidth + 5) {
            playerBox.position.x -= speed * dt;
            leftKnob.rotation -= Math.PI/40;
        }
    }

    // D Key is 68
    if (keys["68"]) {
        // If the D key is pressed, move the player to the right.
        if (playerBox.position.x < etchWidth - 10) {
            playerBox.position.x += speed * dt;
            leftKnob.rotation += Math.PI/40;
        }
    }

    //space to shake the board (-20points)
    if (keys["32"] && !isSpaceDown) {
        isSpaceDown = true;
        shakeBoard();
    }
    if (!keys["32"]) {
        isSpaceDown = false;
    }

    // spawn pixel if any controls are pressed
    if (keys["39"] || keys["37"] || keys["65"] || keys["68"]) {
        createPixel(previousPos);
    }

    if (gameScene.visible) {
        // Check for star Collisions
        for (let s of stars) {

            //star fade in
            s.alpha += 0.1;

            //check collisions with playerBox
            if (rectsIntersect(s, playerBox)) {
                gameScene.removeChild(s);
                s.isActive = false;
                timer += 2;
                starSound.play();
                increaseScoreBy(1);
            }

            //check collisions with pixel line
            for (let pixel of line) {
                if (rectsIntersect(s, pixel)) {
                    gameScene.removeChild(s);
                    s.isActive = false;
                }
            }

        }

        //get rid of inactive stars
        stars = stars.filter(s => s.isActive);

        // load next level
        if (stars.length == 0) {
            if (levelNum < 3){
                levelNum++;
            }
            loadLevel();
        }

        // Is game over?
        if (timer <= 0) {
            end();
        }
    }
}

// creates new pixel and adds it to the line
function createPixel(pos) {
    if (stopwatch % 2 === 0) {
        let newPixel = new Pixel(0x2E2D2A, 5);
        newPixel.x = pos.x;
        newPixel.y = pos.y;
        line.push(newPixel);
        if (gameScene.visible) {
            gameScene.addChild(newPixel);
        }
        if (freeScene.visible) {
            freeScene.addChild(newPixel);
        }

    }
}

// clears the board for the cost of 20 stars
function shakeBoard() {
    if (score >= 20) {
        shakeSound.play();
        line.forEach(p => gameScene.removeChild(p));
        line = [];
        increaseScoreBy(-20);
    }
    if (freeScene.visible) {
        shakeSound.play();
        line.forEach(p => freeScene.removeChild(p));
        line = [];
    }
}

// create collectibles
function createStars(numStars) {
    for (let i = 0; i < numStars; i++) {
        let star = new Star();
        star.x = getRandom(100, etchWidth - 10);
        star.y = getRandom(100, etchHeight - 10);
        stars.push(star);
        gameScene.addChild(star);
    }
}

function loadLevel() {
    createStars(levelNum * 5);
    paused = false;
}

// detect when keys are pressed
let onKeysDown = (key) => {

    keys[key.keyCode] = true;
}

// detect when keys are released
let onKeysUp = (key) => {

    keys[key.keyCode] = false;
}

// Add keyboard event listeners to our document
document.addEventListener('keydown', onKeysDown);
document.addEventListener('keyup', onKeysUp);

function createLabelsAndButtons() {
    let buttonStyle = new PIXI.TextStyle({
        fill: 0x2E2D2A,
        fontSize: 48,
        fontFamily: "'Silkscreen', cursive",
        dropShadow: true,
        dropShadowAlpha: 0.3,
        dropShadowAngle: 1.5,
        dropShadowBlur: 5,
        dropShadowDistance: 4
    });

    let textStyle = new PIXI.TextStyle({
        fill: 0x2E2D2A,
        fontSize: 18,
        fontFamily: "'Silkscreen', cursive"
    });

    //set up 'startScene'
    //make top start label
    let startLabel1 = new PIXI.Text("Etch - A - Fetch");
    startLabel1.style = new PIXI.TextStyle({
        fill: 0x2E2D2A,
        fontSize: 65,
        fontFamily: "'Silkscreen', cursive"
    })
    startLabel1.x = 165;
    startLabel1.y = 220;
    startScene.addChild(startLabel1);

    //make info label
    let infoLabel = new PIXI.Text("A nostalgic star-collecting arcade game!");
    infoLabel.style = new PIXI.TextStyle({
        fill: 0x2E2D2A,
        fontSize: 20,
        fontStyle: "italic",
        fontFamily: "'Silkscreen', cursive"
    })
    infoLabel.x = 220;
    infoLabel.y = 330;
    startScene.addChild(infoLabel);

    //make control labels
    let controlLabelL = new PIXI.Text("<-[A] [D]->");
    controlLabelL.style = new PIXI.TextStyle({
        fill: 0x2E2D2A,
        fontSize: 13,
        fontFamily: "'Silkscreen', cursive"
    })
    controlLabelL.x = 18;
    controlLabelL.y = sceneHeight - 90;
    stage.addChild(controlLabelL);
    let controlLabelR = new PIXI.Text("<-[◄] [►]->");
    controlLabelR.style = new PIXI.TextStyle({
        fill: 0x2E2D2A,
        fontSize: 13,
        fontFamily: "'Silkscreen', cursive"
    })
    controlLabelR.x = sceneWidth - 105;
    controlLabelR.y = sceneHeight - 90;
    stage.addChild(controlLabelR);


    //make start game button
    let startButton = new PIXI.Text("Play Game!");
    startButton.style = buttonStyle;
    startButton.x = 325;
    startButton.y = sceneHeight - 350;
    startButton.interactive = true;
    startButton.buttonMode = true;
    startButton.on("pointerup", startGame);
    startButton.on('pointerover', e => e.target.alpha = 0.7);
    startButton.on('pointerout', e => e.currentTarget.alpha = 1.0);
    startScene.addChild(startButton);

    //make free play button
    let freePlayButton = new PIXI.Text("Doodle Mode :)");
    freePlayButton.style = buttonStyle;
    freePlayButton.x = 280;
    freePlayButton.y = sceneHeight - 250;
    freePlayButton.interactive = true;
    freePlayButton.buttonMode = true;
    freePlayButton.on("pointerup", loadFreePlay);
    freePlayButton.on('pointerover', e => e.target.alpha = 0.7);
    freePlayButton.on('pointerout', e => e.currentTarget.alpha = 1.0);
    startScene.addChild(freePlayButton);

    //make freeplay home button
    let homeButton = new PIXI.Text("Return to Menu");
    homeButton.style = new PIXI.TextStyle({
        fill: 0x2E2D2A,
        fontSize: 18,
        fontFamily: "'Silkscreen', cursive",
        dropShadow: true,
        dropShadowAlpha: 0.3,
        dropShadowAngle: 1.5,
        dropShadowBlur: 5,
        dropShadowDistance: 4
    });
    homeButton.x = sceneWidth - 270;
    homeButton.y = 60;
    homeButton.interactive = true;
    homeButton.buttonMode = true;
    homeButton.on("pointerup", goHome);
    homeButton.on('pointerover', e => e.target.alpha = 0.7);
    homeButton.on('pointerout', e => e.currentTarget.alpha = 1.0);
    freeScene.addChild(homeButton);

    //make score label
    scoreLabel = new PIXI.Text();
    scoreLabel.style = textStyle;
    scoreLabel.x = 100;
    scoreLabel.y = 120;
    gameScene.addChild(scoreLabel);
    increaseScoreBy(0);

    //make timer label
    timerLabel = new PIXI.Text();
    timerLabel.style = textStyle;
    timerLabel.x = 100;
    timerLabel.y = 100;
    gameScene.addChild(timerLabel);

    //make SHAKE directions
    let shakeInfo = new PIXI.Text("[SPACE] to SHAKE!!\n(Costs 20 Stars in Game Mode)");
    shakeInfo.style = new PIXI.TextStyle({
        align: "center",
        fill: 0x2E2D2A,
        fontSize: 24,
        fontFamily: "'Silkscreen', cursive"
    });
    shakeInfo.x = 260;
    shakeInfo.y = sceneHeight - 85;
    stage.addChild(shakeInfo);

    // set up `gameOverScene`
    // make game over text
    let gameOverText = new PIXI.Text("Time's up!");
    textStyle = new PIXI.TextStyle({
        fill: 0x2E2D2A,
        fontSize: 64,
        fontFamily: "'Silkscreen', cursive"
    });
    gameOverText.style = textStyle;
    gameOverText.x = 310;
    gameOverText.y = sceneHeight / 2 - 160;
    gameOverScene.addChild(gameOverText);

    gameOverScoreLabel = new PIXI.Text();
    textStyle = new PIXI.TextStyle({
        fill: 0x2E2D2A,
        fontSize: 50,
        fontFamily: "'Silkscreen', cursive"
    });
    gameOverScoreLabel.style = textStyle;
    gameOverScoreLabel.x = 190;
    gameOverScoreLabel.y = sceneHeight / 2;
    gameOverScene.addChild(gameOverScoreLabel);

    // make "play again?" button
    let playAgainButton = new PIXI.Text("Play Again?");
    playAgainButton.style = buttonStyle;
    playAgainButton.x = 320;
    playAgainButton.y = sceneHeight - 300;
    playAgainButton.interactive = true;
    playAgainButton.buttonMode = true;
    playAgainButton.on("pointerup", startGame); // startGame is a function reference
    playAgainButton.on('pointerover', e => e.target.alpha = 0.7); // concise arrow function with no brackets
    playAgainButton.on('pointerout', e => e.currentTarget.alpha = 1.0); // ditto
    gameOverScene.addChild(playAgainButton);

    //make gameOver home button
    let homeButton2 = new PIXI.Text("Return to Menu");
    homeButton2.style = buttonStyle;
    homeButton2.x = 272;
    homeButton2.y = sceneHeight - 240;
    homeButton2.interactive = true;
    homeButton2.buttonMode = true;
    homeButton2.on("pointerup", goHome);
    homeButton2.on('pointerover', e => e.target.alpha = 0.7);
    homeButton2.on('pointerout', e => e.currentTarget.alpha = 1.0);
    gameOverScene.addChild(homeButton2);
}

function startGame() {
    clickSound.play();
    startScene.visible = false;
    gameOverScene.visible = false;
    freeScene.visible = false;
    gameScene.visible = true;
    levelNum = 1;
    score = 0;
    scoreLabel.text = `Score: 0`;
    playerBox.x = sceneWidth / 2;
    playerBox.y = sceneHeight / 2;
    timer = 10;
    loadLevel();
}

function loadFreePlay() {
    clickSound.play();
    startScene.visible = false;
    gameOverScene.visible = false;
    gameScene.visible = false;
    freeScene.visible = true;
    playerBox.x = sceneWidth / 2;
    playerBox.y = sceneHeight / 2;
    paused = false;
}

function goHome() {
    clickSound.play();
    startScene.visible = true;
    gameOverScene.visible = false;
    gameScene.visible = false;
    freeScene.visible = false;
    paused = true;
}

function increaseScoreBy(value) {
    score += value;
    scoreLabel.text = `Score: ${score}`;
}

function end() {
    paused = true;

    //clear out level
    stars.forEach(s => gameScene.removeChild(s));
    stars = [];

    line.forEach(p => gameScene.removeChild(p));
    line = [];

    gameOverScoreLabel.text = `Your final score: ${score}`;
    gameOverScene.visible = true;
    gameScene.visible = false;
    startScene.visible = false;
}