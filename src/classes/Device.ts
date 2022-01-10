import AudioSource from "@/abstracts/AudioSource";
import AudioComponent from "@/interfaces/AudioComponent";
import EmitterEventTarget from "@/abstracts/EmitterEventTarget";
/**
 * Device abstraction implements easy sources control and single event bus
 */
export default class Device extends EmitterEventTarget {

  protected sources: Map<string, AudioSource & EventTarget>;
  protected components: Map<string, AudioComponent & EventTarget>;
  protected activeSourceName: string;
  protected in: AudioNode;
  protected out: AudioNode;

  constructor(
    sources: [string, AudioSource & EventTarget][], 
    components: [string, AudioComponent & EventTarget][],
    defaultSourseName: string
  ) {
    super();
    this.sources    = new Map(sources);
    this.components = new Map(components);

    this.components.forEach((component, name) => {
      if (!this.in) {
        this.in = component.InNode; 
      }
      if (this.out) {
        this.out.connect(component.InNode);
      }
      this.out = component.OutNode;
    });

    this.plugIn(defaultSourseName);
  }

  /**
   * Plug in a source by name
   * @param newSourceName 
   */
  public plugIn(newSourceName: string) {
    if (!this.sources.has(newSourceName)) {
      throw new Error(`No source named "${newSourceName}"`);
    }

    let oldSourceName = this.activeSourceName;
    let newSource = this.sources.get(newSourceName);
    if (this.sources.has(oldSourceName)) {
      let oldSource = this.sources.get(oldSourceName);
      oldSource.plugOut();
      oldSource.Node.disconnect(this.in);
      this.out.disconnect(oldSource.Node.context.destination);

      this.emit('plugout-' + oldSourceName, {
        oldSourceName,
        newSourceName,
      });
    }

    newSource.plugIn();
    this.activeSourceName = newSourceName;

    newSource.Node.connect(this.in);
    this.out.connect(newSource.Node.context.destination); 

    this.emit('plugin-' + newSourceName, {
      oldSourceName,
      newSourceName,
    });
  }

  /**
   * Plug out current source
   */
  public plugOut() {
    let oldSource = this.sources.get(this.activeSourceName);
    if (oldSource) {
      oldSource.plugOut();
    }
    let oldSourceName = this.activeSourceName;
    let newSourceName = '';
    this.activeSourceName = newSourceName;
    this.emit('plugout-' + oldSourceName, {
      oldSourceName,
      newSourceName,
    });
  }

  /**
   * `addEventListener` alias. Can listen source's and device's events
   * @param eventName SourceName.EventName or just EventName if listener added to device
   * @param callback 
   * @param options 
   * @returns void
   */
  public on(eventName: string, callback: (e?: CustomEvent) => void, options?:any): void {
    const [part1, event] = eventName.split('.');
    if (!event) { //part1 is event name
      return this.addEventListener(part1, callback, options);
    }
    //part1 is source name
    if (!this.sources.has(part1)) {
      throw new Error(`No source named "${part1}"`);
    }
    this.sources.get(part1).addEventListener(event, callback, options);
  }

  /**
   * Get source by name
   * @param name 
   * @returns 
   */
  public getSource(name: string) : AudioSource | false {
    if (!this.sources.has(name)) {
      throw new Error(`No source named "${name}"`);
    }
    return this.sources.get(name);
  }

  /**
   * Get component by name
   * @param name 
   * @returns 
   */
  public getComponent(name: string) : AudioComponent | false {
    if (!this.components.has(name)) {
      throw new Error(`No component named "${name}"`);
    }
    return this.components.get(name);
  }

  /**
   * Current plugged in AudioSource instance
   *
   * @readonly
   * @type {(AudioSource | false)}
   * @memberof Device
   */
  get activeSource() : AudioSource | false {
    if (!this.activeSourceName) {
      false;
    }
    return this.sources.get(this.activeSourceName);
  }

  get ActiveSourceName(): string {
    return this.activeSourceName;
  }

}