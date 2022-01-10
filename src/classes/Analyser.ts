import AudioComponent from "@/interfaces/AudioComponent";

export default class Analyser extends EventTarget implements AudioComponent {

  protected nodes: AnalyserNode[] = [];

  constructor(context: AudioContext) {
    super();
    this.init(context);
  }

  protected init(context: AudioContext) {
    const analyser = context.createAnalyser();
    this.nodes.push(analyser);
  }

  get Nodes(): AnalyserNode[] {
    return this.nodes;
  }

  get InNode(): AnalyserNode {
    return this.nodes[0];
  }

  get OutNode(): AudioNode {
    return this.nodes[0];
  }
}