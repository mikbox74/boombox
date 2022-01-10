export default interface AudioComponent {

  get Nodes(): AudioNode[];

  get InNode(): AudioNode;

  get OutNode(): AudioNode;
}