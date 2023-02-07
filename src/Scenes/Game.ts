import BaseScene, { IBaseSoundState, IBaseTextState } from './BaseScene';

type ISoundState = IBaseSoundState & {
  launcher?: Game.Sound;
  boomHit?: Game.Sound;
  bgm?: Game.Sound;
};

type ITextState = IBaseTextState & {
  scoreText?: Game.Text;
  roundText?: Game.Text;
  gameOverText?: Game.Text;
};

type IState = {
  cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  player?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  bombs?: Phaser.Physics.Arcade.Group;
  stars?: Phaser.Physics.Arcade.Group;
  aircraft?: Game.Sprite;
  level: number;
  // 生命数量
  liveNum: number;
  score: number;

  // 游戏结束
  isGameOver: boolean;

  // 是否正在触摸屏幕
  isTaping: boolean;
  // 飞机速度
  aircraftSpeed: number;
  // 子弹速度
  bulletSpeed: number;
  enemySpeed: number;

  camera?: Phaser.Cameras.Scene2D.Camera;
  bulletGroup?: Phaser.Physics.Arcade.Group;
  enemyGroup?: Phaser.Physics.Arcade.Group;
  timer: {
    makeBullet?: Phaser.Time.TimerEvent;
    makeEnemy?: Phaser.Time.TimerEvent;
  };
};

type RequiredState = {
  state: Required<IState>;
  textState: Required<ITextState>;
  soundState: Required<ISoundState>;
};
class GameScene extends BaseScene {
  sceneName = '游戏场景';
  sceneKey = 'Game';
  soundState: ISoundState = {};
  textState: ITextState = {};
  state: IState = {
    bulletSpeed: 500,
    aircraftSpeed: 200,
    enemySpeed: 200,
    isTaping: false,
    isGameOver: false,
    score: 0,
    liveNum: 1,
    level: 1,
    timer: {}
  };

  create() {
    this.state.camera = this.cameras.main;
    this.addSounds();
    this.makeAircraft();
    this.makeBullet();
    this.makeEnemy();
    this.addText();
    this.createAnimates();
    this.handleColliders();
    this.handleRestart();

    // 绑定按键
    this.state.cursors = this.input.keyboard.createCursorKeys();

    const { soundState, textState, state } = this as RequiredState;

    // 背景音乐
    soundState.bgm.play({ volume: 0.6, loop: true });
  }

  update(): void {
    const { textState, state } = this as unknown as RequiredState;
    const { aircraft, cursors, aircraftSpeed, bulletGroup, enemyGroup } = state;
    const moveSpeed = this.calcMoveSpeed();
    if (cursors.left.isDown) {
      aircraft.setVelocityX(-moveSpeed);
    } else if (cursors.right.isDown) {
      aircraft.setVelocityX(moveSpeed);
    } else if (cursors.up.isDown) {
      aircraft.setVelocityY(-moveSpeed);
    } else if (cursors.down.isDown) {
      aircraft.setVelocityY(moveSpeed);
    } else {
      aircraft.setVelocity(0, 0);
    }

    this.state.aircraftSpeed += 0.01;

    // 子弹出界禁用
    bulletGroup.getChildren().map((bullet: any) => {
      const _bullet = bullet as Game.Sprite;
      if (_bullet.active && _bullet.y < 0) {
        bulletGroup.killAndHide(bullet);
      }
    });

    // 敌机出界禁用
    enemyGroup.getChildren().map((enemy: any) => {
      const _enemy = enemy as Game.Sprite;

      if (_enemy.active && _enemy.y > this.worldHeight) {
        enemyGroup.killAndHide(enemy);
      }
    });
  }

  // 添加音乐
  addSounds() {
    // Add Sounds
    this.soundState.launcher = this.sound.add('launcher');
    this.soundState.boomHit = this.sound.add('boomHit');
    this.soundState.bgm = this.sound.add('bgm');
  }

  // 创造飞机
  makeAircraft() {
    this.state.aircraft = this.physics.add.sprite(
      Number(this.game.config.width) / 2,
      Number(this.game.config.height) - 50,
      'aircraft'
    );

    this.state.aircraft.setCollideWorldBounds(true);
  }

  // 创造子弹
  makeBullet() {
    const bulletGroup = this.physics.add.group();
    this.state.bulletGroup = bulletGroup;

    const aircraft = this.state.aircraft!;
    this.state.timer.makeBullet = this.time.addEvent({
      loop: true,
      delay: 300,
      callback: () => {
        const bullet = bulletGroup.get(aircraft.x, aircraft.y, 'bullet') as Game.Sprite;
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.setVelocityY(-this.state.bulletSpeed);
        this.soundState.launcher?.play({ volume: 0.6 });
      }
    });
  }

  // 创造敌人
  makeEnemy() {
    const enemyGroup = this.physics.add.group();
    this.state.enemyGroup = enemyGroup;
    this.state.timer.makeEnemy = this.time.addEvent({
      loop: true,
      delay: 800,
      callback: () => {
        // 随机生成一些敌人
        for (let i = 0; i < Phaser.Math.Between(1, 4); i++) {
          const enemy = enemyGroup.get(
            Phaser.Math.Between(10, this.worldWidth - 10),
            Phaser.Math.Between(-10, -400),
            'enemy'
          ) as Game.Sprite;
          enemy.setVelocityY(300);
          enemy.setVisible(true);
          enemy.setActive(true);
        }
      }
    });
  }

  // 击中敌人
  handleHitEnemy(bullet: Game.Sprite, enemy: Game.Sprite) {
    this.soundState.boomHit?.play();
    this.state.score += 10;

    this.textState!.scoreText?.setText('Score: ' + this.state.score);

    enemy.anims.play('boom', false);

    this.state.bulletGroup?.killAndHide(bullet);

    // 隐藏敌人, 但不禁用, 动画播放完成后再禁用, 否则就会被下一个敌人启用, 动画播放地点错误
    enemy.setVisible(true);
    enemy.on('animationcomplete', () => {
      // 动画播放完成之后禁用敌人
      enemy.disableBody(true, true);
    });
  }

  // 被敌人攻击
  handleBeAttacked(player: Game.Sprite, enemy: Game.Sprite) {
    console.log('游戏结束');
    player.setTint(0xff0000);
    // 场景暂停不能触发 pointerup事件
    // this.scene.pause();
    this.physics.pause();
    this.state.timer.makeBullet?.destroy();
    this.state.timer.makeEnemy?.destroy();
    this.textState.gameOverText?.setVisible(true);
    this.state.isGameOver = true;
  }

  addText() {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '24px',
      color: '#ffffff'
    };
    const roundLabel = 'Round: ' + this.state.level;
    const scoreLabel = 'Score: ' + this.state.score;
    const gameOverLabel = '游戏结束, 点击屏幕重新开始';

    this.textState.scoreText = this.add.text(16, 16, scoreLabel, style);
    this.textState.roundText = this.add.text(this.worldWidth - 140, 16, roundLabel, style);
    this.textState.gameOverText = this.add
      .text(this.worldWidth / 2 - 200, this.worldHeight / 2, gameOverLabel, style)
      .setVisible(false);
  }

  // 创建全局动画
  createAnimates() {
    this.anims.create({
      key: 'boom',
      frameRate: 24,
      repeat: 0,
      frames: this.anims.generateFrameNumbers('boom', { start: 0, end: 19 })
    });
  }

  // 碰撞事件
  handleColliders() {
    const { state } = this as RequiredState;
    // @ts-ignore 击中敌人事件
    this.physics.add.collider(state.bulletGroup, state.enemyGroup, this.handleHitEnemy.bind(this));
    // @ts-2ignore 被攻击事件
    this.physics.add.collider(state.enemyGroup, state.aircraft, this.handleBeAttacked.bind(this));
  }

  // 计算飞机移动速度
  calcMoveSpeed() {
    return this.state.aircraftSpeed;
  }

  // 重置变量
  resetVars() {
    console.log('重新开始');
    this.state.score = 0;
    this.state.level = 1;
    this.state.liveNum = 1;
    this.state.isGameOver = false;
    this.soundState.bgm!.destroy();
  }

  handleRestart() {
    this.input.on(
      'pointerup',
      () => {
        console.log('click screen');

        if (this.state.isGameOver) {
          this.resetVars();
          this.scene.restart();
        }
      },
      this
    );
  }
}

export default GameScene;
