import AudioComponent from "@/interfaces/AudioComponent";

export default class Amplifier extends EventTarget implements AudioComponent {

  protected volumeNode: GainNode;
  protected balanceNode: StereoPannerNode;

  constructor(context: AudioContext) {
    super();
    this.init(context);
  }

  protected init(context: AudioContext) {
    this.volumeNode = context.createGain();
    this.balanceNode = new StereoPannerNode(context, {pan: 0});
    this.volumeNode.connect(this.balanceNode);
  }

  public volume(value: any) {
    if (value < 0) {
      value = 0;
    }
    this.volumeNode.gain.value = value;
  }

  public balance(value: any) {
    if (value < -1) {
      value = -1;
    } else if (value > 1) {
      value = 1;
    }
    this.balanceNode.pan.value = value;
  }

  get Nodes(): AudioNode[] {
    return [
      this.volumeNode,
      this.balanceNode,
    ]
  }

  get InNode(): AudioNode {
    return this.volumeNode;
  }

  get OutNode(): AudioNode {
    return this.balanceNode;
  }
}