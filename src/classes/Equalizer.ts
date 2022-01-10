import AudioComponent from "@/interfaces/AudioComponent";

interface EqualizerOptions {
  frequency: number;
  q: number;
  type: BiquadFilterType;
}

export default class Equalizer extends EventTarget implements AudioComponent {

  protected nodes: BiquadFilterNode[] = [];

  constructor(
    protected context: AudioContext, 
    protected options: {bands: EqualizerOptions[]}
  ) {
    super();
    this.init(context);
  }

  protected init(context: AudioContext) {
    this.options.bands.forEach((band, index) => {
      const filter = context.createBiquadFilter();
      filter.frequency.value = band.frequency;
      filter.Q.value = band.q;
      filter.type = band.type;
      filter.gain.value = 0;
      this.nodes.push(filter);
    });

    this.nodes.forEach((node, i) => {
      if (i) {
        this.nodes[(i - 1)].connect(node);
      }
    });
  }

  public gain(i: number, value: any) {
    this.nodes[i].gain.value = value;
  }

  get Nodes(): AudioNode[] {
    return this.nodes;
  }

  get InNode(): AudioNode {
    return this.nodes[0];
  }

  get OutNode(): AudioNode {
    return this.nodes[(this.nodes.length - 1)];
  }

}