export default abstract class EmitterEventTarget extends EventTarget {

  protected emit(event: string, data?: any): boolean {
    return this.dispatchEvent(new CustomEvent(event, {detail: data}));
  }

}