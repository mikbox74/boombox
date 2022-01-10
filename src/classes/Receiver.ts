import {ReceiverStates} from "@/types/ReceiverStates";
import AudioSource from "@/abstracts/AudioSource";
import ReceiverPlaylist from "@/classes/ReceiverPlaylist";

export default class Receiver extends AudioSource {

  protected node: MediaElementAudioSourceNode;
  protected playlist: ReceiverPlaylist;
  protected src: any;
  protected state: ReceiverStates = ReceiverStates.stopped;
  protected pluggedIn: boolean;

  constructor(audioContext: AudioContext) {
    super();
    this.init(audioContext);
  }

  get Node(): MediaElementAudioSourceNode {
    return this.node;
  }

  get MediaMetadata(): MediaMetadata {
    return new MediaMetadata({
      title: this.playlist.Entry.title,
      artist: '',
      album: '',
    });
  }

  get Playlist(): ReceiverPlaylist {
    return this.playlist;
  }

  public playlistMessage(message: string, data?: any) {
    switch(message) {
      case 'loaded': 
        this.emit('loaded', {...data});
        break;
      case 'stop': this.stop();
        break;
      case 'metadata': 
        this.emit('metadata', {...data});
        this.updateMediaMetadata();
        break;
      case 'metadataerror': 
        this.emit('metadataerror', data);
        break;
      case 'stationselected': 
        this.emit('stationselected', data);
        break;
      default:
        throw new Error('Unknown message from stationlist to receiver');
    }
  }

  public async play(): Promise<boolean> {
    if (this.state !== ReceiverStates.stopped) {
      return false;
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    this.schedulePlayOnLoading({position: this.playlist.Position});
    this.loadTrack(this.playlist.Position);
    return true;
  }

  public stop(): boolean {
    // adding a callback on stop
    this.audioElement.addEventListener('pause', async () => {
      // console.log('PAUSE ONCE')
      this.state = ReceiverStates.stopped;
      this.audioElement.removeAttribute('src');
      this.audioElement.load();
      this.updateMediaPlaybackState();
      this.emit('stop', {position: this.playlist.Position});
    }, {once: true});
    // stop track and run events chain
    this.audioElement.pause();
    return true;
  }

  public previous(): boolean {
    if (this.state === ReceiverStates.stopped) {
      return false;
    }
    //stop -> previous -> start
    const oldPosition = this.playlist.Position;
    if (!this.playlist.cursorToPreviousPlayable()) {
      this.playlist.Position = oldPosition;
    }
    this.emit('previous', {position: this.playlist.Position});
    // scheduled stop and start
    this.jumpFrom(oldPosition);
    return true;
  }

  public next(): boolean {
    if (this.state === ReceiverStates.stopped) {
      return false;
    }
    // stop -> next -> start
    const oldPosition = this.playlist.Position;
    if (!this.playlist.cursorToNextPlayable()) {
      this.playlist.Position = oldPosition;
    }
    this.emit('next', {position: this.playlist.Position});
    // scheduled stop and start
    this.jumpFrom(oldPosition);
    return true;
  }

  public playFromPosition(position: number): boolean {
    //stop -> next -> start
    if (!this.playlist.isEntryPlayable(position)) {
      return false;
    }
    const oldPosition = this.playlist.Position;
    this.playlist.Position = position;
    this.emit('jump', {position: this.playlist.Position, oldPosition});
    this.jumpFrom(oldPosition);
    return true;
  }
  
  public plugIn(): void {
    this.play();
    super.plugIn();
    this.pluggedIn = true;
  }

  public plugOut(): void {
    this.stop();
    super.plugOut();
    this.pluggedIn = false;
  }

  protected init(audioContext: AudioContext) {
    this.audioCtx = audioContext;
    this.audioElement = new Audio() as HTMLAudioElement;
    this.audioElement.crossOrigin = "anonymous";
    this.node = this.audioCtx.createMediaElementSource(this.audioElement);
    this.playlist = new ReceiverPlaylist(this);

    this.audioElement.addEventListener('playing', (e: any) => {
      this.updateMediaPlaybackState(); //?
      //
    });
    this.audioElement.addEventListener('pause', (e: any) => {
      this.updateMediaPositionState(); //?
      // console.log('pause', e, this.cursorPos);
      // console.log('RADIO PAUSE')
    });
    // `ended` forwarding && running lpaylist logic
    this.audioElement.addEventListener('ended', (e: any) => {
      this.updateMediaPlaybackState(); //?
      // console.log('RADIO ENDED')
    });

    // `timeupdate` forwarding
    this.audioElement.addEventListener('timeupdate', (e: any) => {
      this.updateMediaPositionState();
      this.emit('timeupdate', {
        time: this.audioElement.currentTime, 
        position: this.playlist.Position, 
        nativeEvent: e,
      });
      if (this.audioElement.currentTime > 0) {
        this.playlist.refreshMetadata();
      }
    });

    // `loadstart` forwarding
    this.audioElement.addEventListener('loadstart', async (e: any) => {
      this.emit('loadstart', {position: this.playlist.Position, nativeEvent: e});
      this.Playlist.refreshMetadata(true);
    });
    // `progress` forwarding
    this.audioElement.addEventListener('progress', (e: any) => {
      // console.log({meta: (this.audioElement as any).captureStream()})
      this.emit('progress', {position: this.playlist.Position, nativeEvent: e});
      
    });
    // `loadend` forwarding
    this.audioElement.addEventListener('loadeddata', (e: any) => {
      // console.log('RADIO LOADEDDATA')
      this.emit('loadeddata', {position: this.playlist.Position, nativeEvent: e});
    });

    // `error` forwarding
    this.audioElement.addEventListener('error', (e: any) => {
      this.emit('trackerror', {position: this.playlist.Position, nativeEvent: e});
    });
    // `abort` forwarding
    this.audioElement.addEventListener('abort', (e: any) => {
      console.log('RADIO ABORT')
      this.emit('trackabort', {position: this.playlist.Position, nativeEvent: e});
    });

    //this may be in other function
    // this.emit('loaded', {playlist: this.playlist});
  }

  protected schedulePlayOnLoading(playEventData: {}) {
    // adding an event on play
    this.audioElement.addEventListener('playing', () => {
      // console.log('PLAYING ONCE')
      this.state = ReceiverStates.playing;
      this.emit('play', playEventData);
    }, {once: true});
    // adding a callback on loading
    this.audioElement.addEventListener('loadeddata', () => {
      // console.log('LOADEDDATA ONCE')
      this.audioElement.play();
    }, {once: true});
  }

  protected async loadTrack(index: number) : Promise<void> {
    // if (this.loadedIndex !== index) {
      this.audioElement.removeAttribute('src');
      this.audioElement.load();
      //this.playlist[index]
      this.audioElement.src = this.playlist.getSrcOf(index);
      // this.loadedIndex = index;
    // } else {
      // this.audioElement.dispatchEvent(new Event('loadeddata'));
    // }
  }

  protected jumpFrom(oldPosition: number) {
    // adding a callback on stop
    this.audioElement.addEventListener('pause', async () => {
      // console.log('PAUSE ONCE')
      this.loadTrack(this.playlist.Position);
    }, {once: true});
    // after all we start a new track
    this.schedulePlayOnLoading({position: this.playlist.Position, oldPosition});
    if (this.audioElement.paused) {
      this.audioElement.dispatchEvent(new Event('pause'));
    } else {
      // stop track and run events chain
      this.audioElement.pause();
    }
  }

  protected commonMediaAction(details: {action: string, fastSeek: boolean, seekOffset: number, seekTime: number}) {
    console.log(`${details.action} called`);
    switch (details.action) {
      case 'play':
        if (this.state === ReceiverStates.stopped) {
          this.plugOut();
        } else if (this.state === ReceiverStates.playing) {
          this.play();
        }
        break;
      case 'pause':
        this.plugOut();
        break;
      case 'stop':
        this.stop();
        break;
      case 'previoustrack':
        this.previous();
        break;
      case 'nexttrack':
        this.next();
        break;
      default:
        console.log(`${details.action} - unsupported action`);
    }
  }

}