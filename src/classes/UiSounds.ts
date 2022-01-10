export default class UiSounds {

  protected static audioElements: Map<string, HTMLAudioElement> = new Map();

  public static create(name: string, url: string, loop: boolean = false) {
    const element = new Audio(url);
    element.loop = loop;
    this.audioElements.set(name, element);
  }

  public static play(name: string) {
    if (!this.audioElements.has(name)) {
      throw new Error(`Sound ${name} not defined`);
    }
    const sound = this.audioElements.get(name);
    if (sound.paused) {
      sound.play();
    }
  }

  public static stop(name: string) {
    if (!this.audioElements.has(name)) {
      throw new Error(`Sound ${name} not defined`);
    }
    const sound = this.audioElements.get(name);
    if (!sound.paused) {
      sound.currentTime = 0;
      sound.pause();
    }
  }
}