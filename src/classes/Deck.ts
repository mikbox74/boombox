import {DeckStates} from "@/types/DeckStates";
import {DeckMode} from "@/types/DeckMode";
import AudioSource from "@/abstracts/AudioSource";
import Playlist from "@/classes/DeckPlaylist";

declare global {
  interface Window {
    showOpenFilePicker: any;
    webkitAudioContext: any;
    showDirectoryPicker: any;
  }
}

interface Codec {
  name: string,
  type: string,
  extensions: string[],
  available: boolean,
}

export default class Deck extends AudioSource {

  public playbackMode: DeckMode = DeckMode.default;
  public autoplay: boolean = false;
  
  protected fallbackInputElement?: HTMLInputElement;
  protected state: DeckStates = DeckStates.stopped;
  protected paused: boolean = false;
  protected node: MediaElementAudioSourceNode;
  protected fileReader: FileReader;
  protected playlist: Playlist;
  protected regExp: RegExp;
  protected startTime: number;
  protected timer: any;
  protected loadedIndex: number = -1;
  protected extensions: string[];
  protected codecs: Codec[] = [
    {
      name: '3GP',
      type: 'audio/3gpp',
      extensions: [
        '3gp',
        '3g2', //?
      ],
      available: false,
    },
    {
      name: 'ADTS',
      type: 'audio/aac',
      extensions: [
        'aac',
      ],
      available: false,
    },
    {
      name: 'FLAC',
      type: 'audio/flac',
      extensions: [
        'flac',
      ],
      available: false,
    },
    {
      name: 'MPEG',
      type: 'audio/mpeg',
      extensions: [
        'mpg',
        'mpeg',
      ],
      available: false,
    },
    {
      name: 'MP3',
      type: 'audio/mp3',
      extensions: [
        'mp3',
      ],
      available: false,
    },
    {
      name: 'MP4',
      type: 'audio/mp4',
      extensions: [
        'mp4',
        'm4a',
      ],
      available: false,
    },
    {
      name: 'OGG',
      type: 'audio/ogg',
      extensions: [
        'oga',
        'ogg',
      ],
      available: false,
    },
    {
      name: 'WAV',
      type: 'audio/wav',
      extensions: [
        'wav',
      ],
      available: false,
    },
    {
      name: 'WebM',
      type: 'audio/webm',
      extensions: [
        'webm',
      ],
      available: false,
    },
  ];

  constructor(audioContext: AudioContext) {
    super();
    this.init(audioContext);
  }

  public async load(dirMode: Boolean = false): Promise<void> {
    this.emit('open');
    return await this.playlist.load(dirMode);
  }

  public stop(): boolean {
    // adding a callback on stop
    this.audioElement.addEventListener('pause', async () => {
      // console.log('PAUSE ONCE')
      this.state = DeckStates.stopped;
      this.audioElement.currentTime = 0;
      this.updateMediaPlaybackState();
      this.emit('stop', {position: this.playlist.Position});
    }, {once: true});
    if (this.state === DeckStates.paused) {
      this.audioElement.dispatchEvent(new Event('pause'));
    }
    // stop track and run events chain
    this.audioElement.pause();
    return true;
  }

  public pause(): boolean {
    if (this.state === DeckStates.playing) {
      this.state = DeckStates.busy;
      this.audioElement.addEventListener('pause', () => {
        this.state = DeckStates.paused;
        this.emit('pause-on', {position: this.playlist.Position});
      }, {once: true});
      this.audioElement.pause();
      return true;
    } else if (this.state === DeckStates.paused) {
      this.state = DeckStates.busy;
      this.audioElement.addEventListener('playing', () => {
        this.state = DeckStates.playing;
        this.emit('pause-off', {position: this.playlist.Position});
      }, {once: true});
      this.audioElement.play();
      return true;
    }
    return false;
  }

  public previous(): boolean {
    if (this.state === DeckStates.paused || this.playlist.Empty) {
      return false;
    }
    //stop -> previous -> start
    const oldPosition = this.playlist.Position;
    if (!this.playlist.cursorToPreviousPlayable()) {
      this.playlist.Position = oldPosition;
    }
    // scheduled stop and start
    this.jumpFrom(oldPosition);
    return true;
  }

  public next(): boolean {
    if (this.state === DeckStates.paused || this.playlist.Empty) {
      return false;
    }
    // stop -> next -> start
    const oldPosition = this.playlist.Position;
    if (!this.playlist.cursorToNextPlayable()) {
      this.playlist.Position = oldPosition;
    }
    // scheduled stop and start
    this.jumpFrom(oldPosition);
    return true;
  }

  public async play(): Promise<boolean> {
    if (this.state !== DeckStates.stopped) {
      return false;
    }
    if (!this.playlist.isEntryPlayable(this.playlist.Position)) {
      if (!this.playlist.cursorToNextPlayable()) {
        return false;
      }
    }
    this.schedulePlayOnLoading({position: this.playlist.Position});
    this.loadTrack(this.playlist.Position);
    return true;
  }

  public nextDirectory(): boolean {
    if (this.state === DeckStates.paused || this.playlist.Empty) {
      return false;
    }
    const oldPosition = this.playlist.Position;
    if (!this.playlist.cursorToNextDirectory()) {
      this.playlist.Position = oldPosition;
    } else if (!this.playlist.cursorToNextPlayable()) {
      this.playlist.Position = oldPosition;
    }
    this.jumpFrom(oldPosition);
    return true;
  }

  public previousDirectory(): boolean {
    if (this.state === DeckStates.paused || this.playlist.Empty) {
      return false;
    }
    const oldPosition = this.playlist.Position;
    if (!this.playlist.cursorToPreviousDirectory()) {
      this.playlist.Position = oldPosition;
    } else if (!this.playlist.cursorToNextPlayable()) {
      this.playlist.Position = oldPosition;
    }
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
    this.jumpFrom(oldPosition);
    return true;
  }
  
  public record() {
    this.emit('record');
  }  

  public setPlaybackMode(playbackMode: DeckMode) {
    this.playbackMode = playbackMode;
  }

  public playlistMessage(message: string, data?: any) {
    switch(message) {
      case 'loaded': 
        if (this.autoplay) {
          this.play();
        } else {
          this.loadTrack(this.playlist.Position);
        }
        this.emit('loaded', {...data});
        break;
      case 'trackchanged': 
        if (data.position === this.Playlist.Position) {
          this.updateMediaMetadata();
        }
        this.emit('trackchanged', {...data});
        break;
      case 'tracktimechanged': this.emit('tracktimechanged', {...data});
        break;
      case 'notpicked': this.emit('notpicked');
        break;
      case 'closedbyfallback': this.emit('closedbyfallback');
        break;
      case 'cancel': this.emit('cancel', {...data});
        break;
      default:
        throw new Error('Unknown message from playlist to deck');
    }
  }

  public plugOut(): void {
    this.stop();
    super.plugOut();
  }
  
  // getters
  get State(): DeckStates {
    return this.state;
  }

  get Playlist(): Playlist {
    return this.playlist;
  }

  get Node(): MediaElementAudioSourceNode {
    return this.node;
  }

  //?
  get Context(): AudioContext  {
    return this.audioCtx;
  }

  get CurrentTime(): number {
    return this.audioElement.currentTime;
  }

  get Track(): HTMLAudioElement {
    return this.audioElement;
  }

  get SupportedCodecs(): Codec[] {
    return this.codecs.filter(codec => codec.available);
  }

  get MediaMetadata(): MediaMetadata {
    let e = this.playlist.Entry;
    return new MediaMetadata({
      artist: e.tags && e.tags.tags ? e.tags.tags.artist : '',
      title: e.tags && e.tags.tags ? e.tags.tags.title : e.name,
      album: e.tags && e.tags.tags ? e.tags.tags.album : e.path.join('/'),
    });
  }

  // internal methods
  protected init(audioContext: AudioContext) {
    this.audioElement = new Audio() as HTMLAudioElement;
    this.checkCodecs();
    this.playlist = new Playlist(this.extensions, this);

    this.audioCtx = audioContext;
    this.node = this.audioCtx.createMediaElementSource(this.audioElement);

    this.audioElement.addEventListener('playing', (e: any) => {
      // console.log('playing', e, this.cursorPos);
      console.log('PLAYING')
    });
    this.audioElement.addEventListener('pause', (e: any) => {
      // console.log('pause', e, this.cursorPos);
      this.updateMediaPositionState();
      console.log('PAUSE')
    });
    // `ended` forwarding && running lpaylist logic
    this.audioElement.addEventListener('ended', (e: any) => {
      console.log('ended')
      this.state = DeckStates.stopped;
      this.updateMediaPlaybackState();
      if (this.playbackMode === DeckMode.repeatTrack) {
        this.emit('stop', {
          position: this.playlist.Position,
          nativeEvent: e,
          ended: true,
          playlistended: false,
          manual: false,
        });
        return this.play();
      } else if (this.playbackMode === DeckMode.repeatDir) {
        const previousTrackPath = this.playlist.Entry.path.join('/');
        if (
          !this.playlist.cursorToNextPlayable() || 
          (previousTrackPath !== this.playlist.Entry.path.join('/'))
        ) {
          if (this.playlist.cursorToFirstTrackOf(previousTrackPath)) {
            this.emit('stop', {
              position: this.playlist.Position,
              nativeEvent: e,
              ended: true,
              playlistended: false,
              manual: false,
            });
            return this.play();
          }
        }
      }
      if (this.playlist.cursorToNextPlayable()) {
        this.emit('stop', {
          position: this.playlist.Position,
          nativeEvent: e,
          ended: true,
          playlistended: false,
          manual: false,
        });
        return this.play();
      }
      this.playlist.resetPosition();
      if (this.playbackMode === DeckMode.repeatAll) {
        this.play();
      }
      this.emit('stop', {
        position: this.playlist.Position,
        nativeEvent: e,
        ended: true,
        playlistended: true,
        manual: false,
      });
    });

    // `timeupdate` forwarding
    this.audioElement.addEventListener('timeupdate', (e: any) => {
      this.updateMediaPositionState();
      this.emit('timeupdate', {
        time: this.audioElement.currentTime, 
        position: this.playlist.Position, 
        nativeEvent: e,
      });
    });

    // `loadstart` forwarding
    this.audioElement.addEventListener('loadstart', (e: any) => {
      console.log('LOADSTART')
      this.emit('loadstart', {position: this.playlist.Position, nativeEvent: e});
    });
    // `progress` forwarding
    this.audioElement.addEventListener('progress', (e: any) => {
      console.log('PROGRESS')
      this.emit('progress', {position: this.playlist.Position, nativeEvent: e});
    });
    // `loadend` forwarding
    this.audioElement.addEventListener('loadeddata', (e: any) => {
      console.log('LOADEDDATA')
      this.emit('loadeddata', {position: this.playlist.Position, nativeEvent: e});
    });

    // `error` forwarding
    this.audioElement.addEventListener('error', (e: any) => {
      console.log('ERROR')
      this.emit('trackerror', {position: this.playlist.Position, nativeEvent: e});
    });
    // `abort` forwarding
    this.audioElement.addEventListener('abort', (e: any) => {
      console.log('ABORT')
      this.emit('trackabort', {position: this.playlist.Position, nativeEvent: e});
    });
  }

  protected checkCodecs() {
    let extensions: string[] = [];
    this.codecs.forEach(codec => {
      const result = this.audioElement.canPlayType(codec.type);
      if (result === 'maybe' || result === 'probably') {
        codec.available = true;
        extensions = [...extensions, ...codec.extensions];
      }
    });
    this.regExp = new RegExp('\.(' + extensions.join('|') + ')$', 'i'); //remove
    this.extensions = extensions.map(ext => `.${ext}`);
  }

  protected async loadTrack(index: number) : Promise<void> {
    if (this.loadedIndex !== index) {
      URL.revokeObjectURL(this.audioElement.src);
      this.audioElement.removeAttribute('src');
      this.audioElement.load();
      this.audioElement.src = await this.playlist.createObjectUrlOf(index);
      this.loadedIndex = index;
    } else {
      this.audioElement.dispatchEvent(new Event('loadeddata'));
    }
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

  protected schedulePlayOnLoading(playEventData: {}) {
    // adding an event on play
    this.audioElement.addEventListener('playing', () => {
      // console.log('PLAYING ONCE')
      this.state = DeckStates.playing;
      this.updateMediaPlaybackState();
      this.emit('play', playEventData);
    }, {once: true});
    // adding a callback on loading
    this.audioElement.addEventListener('loadeddata', async () => {
      // console.log('LOADEDDATA ONCE')
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      this.audioElement.play();
    }, {once: true});
  }

  protected commonMediaAction(details: {action: string, fastSeek: boolean, seekOffset: number, seekTime: number}) {
    const skipTime = 5;
    switch (details.action) {
      case 'play':
        if (this.state === DeckStates.paused) {
          this.pause();
        } else if (this.state === DeckStates.stopped) {
          this.play();
        }
        break;
      case 'pause':
        this.pause();
        break;
      case 'stop':
        this.stop();
        break;
      case 'seekbackward':
        this.Track.currentTime = Math.max(this.Track.currentTime - skipTime, 0);
        break;
      case 'seekforward':
        this.Track.currentTime = Math.min(
          this.Track.currentTime + skipTime, this.Track.duration
        );
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

