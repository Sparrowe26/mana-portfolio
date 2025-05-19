
class Star extends PIXI.Sprite{
    constructor (x=0, y=0){
        super(app.loader.resources["images/star.png"].texture);
        this.anchor.set(.5, .5);
        this.scale.set(1);
        this.x = x;
        this.y = y;
        this.alpha = 0;
        this.isActive = true;
    }
}

class Cursor extends PIXI.Graphics{
    constructor (color = 0x2E2D2A, size = 5, x=0, y=0){
        super();
        this.beginFill(color);
        this.drawRect(0, 0, size, size);
        this.endFill();
        this.x = x;
        this.y = y;
        this.alpha = .8;
        this.size = size;
    }
}

class Pixel extends PIXI.Graphics{
    constructor (color = 0x2E2D2A, size, x=0, y=0){
        super();
        this.beginFill(color);
        this.drawRect(0, 0, size, size);
        this.endFill();
        this.x = x;
        this.y = y;
        this.alpha = .8;
        this.size = size;
        this.isCollidable = false;
    }
}
