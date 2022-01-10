export default class InfoException extends Error {

  protected actions: any;

  protected type: string;

  get Actions(): any {
    return this.actions
  }
  set Actions(actions: any) {
    this.actions = actions;
  }
  get Type(): string {
    return this.type
  }
  set Type(type: string) {
    this.type = type;
  }
}