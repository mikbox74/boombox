import EmitterEventTarget from "@/abstracts/EmitterEventTarget";
import PlaylistStation from "@/interfaces/PlaylistStation";
import AudioSource from "@/abstracts/AudioSource";

const DATABASE: string = 'boombox';
const VERSION: number = 1;
const STORAGE: string = 'stations';

export default class ReceiverPlaylist extends EmitterEventTarget {

  protected entries: PlaylistStation[] = [];
  protected cursorPos: number = 0;
  protected source: AudioSource & EmitterEventTarget;
  protected db: IDBDatabase;
  protected fetchMetadataInterval: number = 10;
  protected lastFetchTime: number = 0;
  protected noFetchMetadata: boolean = false;

  constructor(source: AudioSource & EmitterEventTarget) {
    super();
    this.source = source;
    this.initDB();
  }
  
  protected initDB() {
    let openRequest = indexedDB.open(DATABASE, VERSION);
    let upgrade = false;
    openRequest.addEventListener('upgradeneeded', () => {
      console.log('upgradeneeded');
      this.db = openRequest.result;
      switch(this.db.version) {
        case 1:
          this.db.createObjectStore(STORAGE, {keyPath: 'id'});
          upgrade = true;
          break;
        // case 1: 
        //   break;
      }
    });

    openRequest.addEventListener('error', function() {
      console.error("Error", openRequest.error);
    });

    openRequest.addEventListener('success', () => {
      if (!this.db) {
        this.db = openRequest.result;
      }
      this.db.addEventListener('versionchange', () => {
        this.db.close();
        console.error("Error", "База данных устарела, пожалуста, перезагрузите страницу.");
      });

      if (!upgrade) {
        this.loadFromDB();
      } else {
        this.updateFromRemote();
      }

      this.db.addEventListener('complete', () => {
        console.log('DB transaction complete');
      });
      this.db.addEventListener('error', () => {
        console.log('DB transaction error');
      });
      this.db.addEventListener('abort', () => {
        console.log('DB transaction abort');
      });
    });
  }

  get Entry(): PlaylistStation | null {
    return this.entries[this.cursorPos] ? this.entries[this.cursorPos]: null;
  }

  get Size(): number {
    return this.entries.length;
  }

  get Position(): number {
    return this.cursorPos;
  }

  set Position(position: number) {
    this.cursorPos = position;
    this.source.playlistMessage('stationselected', {position});
  }

  public async updateFromRemote() {
    this.source.playlistMessage('stop');
    try {
      const response = await fetch('/data/stations.json');
      const data = await response.json();

      let transaction = this.db.transaction([STORAGE], "readwrite");
      let store = transaction.objectStore(STORAGE);
      
      for (let i = 0, l = data.length; i < l; i++) {
        let entryIdx = this.entries.findIndex(entry => entry.id === data[i].id);
        let existed = this.entries[entryIdx];
        if (existed && existed.changedByUser) {
          continue;
        }
        let request: IDBRequest<IDBValidKey>;
        if (existed) {
          if (existed.deleted) {
            data[i].deleted = true;
          }
          request = store.put(data[i]);
        } else if (data[i].deleted) {
          continue;
        } else {
          request = store.add(data[i]);
        }
        request.addEventListener('success', () => {
          console.log('stored', request.result);
        });  
        request.addEventListener('error', () => {
          console.error("Error", request.error);
        });
      }
      transaction.addEventListener('complete', () => {
        console.log("All records processed");
        this.loadFromDB();
      });
    } catch (e) {
      console.error(e);
    }
  }

  public async addEntry(entry: PlaylistStation): Promise<void> {
    return new Promise((resolve, reject) => {
      this.source.playlistMessage('stop');
      let transaction = this.db.transaction([STORAGE], "readwrite");
      let store = transaction.objectStore(STORAGE);

      let entryIdx = this.entries.findIndex(item => entry.id === item.id);
      let request: IDBRequest<IDBValidKey>;
      if (entryIdx < 0) {
        request = store.add(entry);
      } else {
        request = store.put(entry);
      }
      transaction.addEventListener('error', () => {
        reject(request.error);
      });
      transaction.addEventListener('complete', () => {
        resolve();
        this.loadFromDB();
      });
    });
  }

  public deleteEntry(position: number) {
    if (!this.isEntryExists(position) || !this.isEntryPlayable(position)) {
      return;
    }
    this.entries[position].deleted = true;
    let transaction = this.db.transaction([STORAGE], "readwrite");
    let store = transaction.objectStore(STORAGE);
    let request = store.put(this.entries[position]);
    request.addEventListener('success', () => {
      console.log('deleted', request.result);
    });  
    request.addEventListener('error', () => {
      console.error("Error", request.error);
    });
  }

  public getPositionById(id: string): number {
    let pos = this.entries.findIndex((station: PlaylistStation) => station.id === id);
    if (!Number.isInteger(pos)) {
      throw new Error(`Wrong position number`);
    }
    return pos;
  }

  public cursorToNextPlayable(): Boolean {
    do {
      this.cursorPos++;
    } while (this.isEntryExists(this.cursorPos) && !this.isEntryPlayable(this.cursorPos));
    return this.isEntryExists(this.cursorPos);
  }

  public cursorToPreviousPlayable(): Boolean {
    do {
      this.cursorPos--;
    } while (this.isEntryExists(this.cursorPos) && !this.isEntryPlayable(this.cursorPos));
    return this.isEntryExists(this.cursorPos);
  }

  public isEntryPlayable(position: number) : Boolean {
    return (position < this.entries.length) && 
      !!this.entries[position].src && 
        !this.entries[position].deleted;
  }

  public isEntryExists(position: number) : Boolean {
    return !!this.entries[position];
  }

  public getSrcOf(position: number) : string {
    if (this.isEntryPlayable(position)) {
      return this.entries[position].src;
    }
    return '';
  }

  public getEntryOf(position: number) : PlaylistStation {
    return this.entries[position];
  }

  public async refreshMetadata(forced: boolean = false) {
    if (forced) {
      this.lastFetchTime = 0;
      this.noFetchMetadata = false;
    }
    if (this.noFetchMetadata) {
      return;
    }
    if (!this.Entry) {
      return;
    }
    if (!this.Entry.nowPlayingParser) {
      this.source.playlistMessage('metadata', {title: `${this.Entry.name}: the programm title is not provided`});
      return;
    }
    let refresh = await (this as any)[this.Entry.nowPlayingParser]();
    if (refresh) {
      this.source.playlistMessage('metadata', {title: this.Entry.title});
    }
  }
  
  protected loadFromDB() {
    let transaction = this.db.transaction([STORAGE], 'readonly');
    let getAll = transaction.objectStore(STORAGE).getAll();
    getAll.addEventListener('success', () => {
      getAll.result.sort((a, b) => {
        return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
      });
      this.entries = getAll.result;
      this.source.playlistMessage('loaded', {playlist: this.entries});
    });
  }

  protected async getNowPlayingData(urlGetter: any, resultParser: any) {
    let now = Math.ceil(performance.now() / 1000);
    if (this.lastFetchTime && ((this.lastFetchTime + this.fetchMetadataInterval) > now)) {
      return false;
    }
    this.lastFetchTime = now;
    let response;
    const url: string = await urlGetter();
    try {
      const initPos = this.Position;
      response = await fetch(url);
      this.Entry.title = await resultParser(response);
      return initPos === this.Position;
    } catch (error) {
      this.noFetchMetadata = true;
      this.source.playlistMessage('metadataerror', {url, error, name: this.Entry.name});
    }
  }

  protected async shoutcastTagsParser() {
    return this.getNowPlayingData(async () => {
      let url: string = '';
      if (this.Entry.nowPlayingParams && this.Entry.nowPlayingParams.url) {
        url = this.Entry.nowPlayingParams.url;
      } else {
        url = this.Entry.src.split('?')[0] + '/7.html'
      }
      return url;
    }, async (response: Response) => {
      try {
        const content = await response.text();
        let tmp = document.createElement("div");
        tmp.innerHTML = content;
        let parts = tmp.textContent.split(',');
        let data = {
          listeners: parts.shift(), 
          status: parts.shift(), 
          peak: parts.shift(), 
          max: parts.shift(), 
          unique: parts.shift(), 
          bitrate: parts.shift(), 
          title: parts.join(',')
        };
        return `${this.Entry.name}: ${data.title}, ${data.bitrate}kb/s`;
      } catch {
        return `${this.Entry.name}: Title loading error`;
      }
    });
  }

  protected async jsonTagsParser() {
    return this.getNowPlayingData(async () => {
      return this.Entry.nowPlayingParams.url;
    }, async (response: Response) => {
      try {
        const content = await response.json();
        let data: any = {};
        if (this.Entry.nowPlayingParams.bitrate) {
          data.bitrate = eval('content' + this.Entry.nowPlayingParams.bitrate);
        }
        if (this.Entry.nowPlayingParams.title) {
          data.title = eval('content' + this.Entry.nowPlayingParams.title);
        }
        if (this.Entry.nowPlayingParams.artist) {
          data.artist = eval('content' + this.Entry.nowPlayingParams.artist);
        }
        let title = `${this.Entry.name}`;
        title += data.artist ? `: ${data.artist}` : '';
        title += data.title ? ` - ${data.title}` : '';
        title += data.bitrate ? `, ${data.bitrate}kb/s` : '';
        return title;
      } catch {
        return `${this.Entry.name}: Title loading error`;
      }
    });
  }

  protected async icecast224TagsParser() {
    return this.getNowPlayingData(async () => {
      let url: string = '';
      if (this.Entry.nowPlayingParams && this.Entry.nowPlayingParams.url) {
        url = this.Entry.nowPlayingParams.url;
      } else {
        url = this.Entry.src.split('/', 3).join('/') + '/status-json.xsl'
      }
      return url;
    }, async (response: Response) => {
      try {
        const data = await response.json();
        let title = `${this.Entry.name}`;
        title += data.icestats.source[1].artist ? `: ${data.icestats.source[1].artist}` : '';
        title += data.icestats.source[1].title ? ` - ${data.icestats.source[1].title}` : '';
        title += data.icestats.source[2].bitrate ? `, ${data.icestats.source[2].bitrate}kb/s` : '';
        return title;
      } catch {
        return `${this.Entry.name}: Title loading error`;
      }
    });
  }
}