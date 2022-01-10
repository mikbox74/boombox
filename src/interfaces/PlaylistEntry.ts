export default interface PlaylistEntry {
  name: string,
  kind: string,
  path: string[], 
  level?: number,
  instance?: any,
  error?: boolean,
  time?: number,
  tags?: any,
}