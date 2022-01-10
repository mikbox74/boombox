export default interface PlaylistStation {
  id: string,
  name: string,
  src: string,
  title?: string,
  nowPlayingParser?: string,
  nowPlayingParams?: any,
  changedByUser?: boolean,
  deleted?: boolean,
}