import GameScene from "./Game";
import BaseScene from "./BaseScene";
import { createLoadingAnimation, removeLoading } from "@/utils/createLoadingAnimation";

class BootLoaderScene extends BaseScene {
  sceneKey = "BootLoader";
  sceneName = "初始化场景";

  preload() {
    this.load.image("aircraft", "assets/aircraft.png");
    this.load.image("bullet", "assets/bullet.png");
    this.load.image("enemy", "assets/enemy_1.png");
    this.load.spritesheet("boom", "assets/boom.png", { frameWidth: 104, frameHeight: 128 });
    this.load.audio("boomHit", "assets/sounds/boom-hit.mp3");
    this.load.audio("bgm", "assets/sounds/bgm.mp3");
    this.load.audio("launcher", "assets/sounds/launcher.mp3");

    createLoadingAnimation(this, 0.5, 0.5);

    const dom = document.querySelector("#phaserGame div")!;
    this.load.once("start", () => {
      document.querySelector("h1")?.remove();
    });
    this.load.on("progress", (progress: number) => {
      dom.innerHTML = "加载中..." + progress * 100 + "%";
    });
    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      dom.innerHTML = "";
      removeLoading();
      console.log("boot load complate");
      // 启动游戏场景
      this.scene.start("Game");
    });
  }
}

export default BootLoaderScene;
