import EmitterEventTarget from "@/abstracts/EmitterEventTarget";
import PlaylistEntry from "@/interfaces/PlaylistEntry";
import AudioSource from "@/abstracts/AudioSource";
import Worker from "worker-loader!@/worker.js";

interface HTMLInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

export default class DeckPlaylist extends EmitterEventTarget {

  protected entries: PlaylistEntry[] = [];
  protected file: any;
  protected cursorPos: number = 0;
  protected fallbackInputElement?: HTMLInputElement;
  
  protected extensions: string[];
  protected regExp: RegExp;
  protected source: AudioSource;
  protected playlistWorker: Worker;

  constructor(extensions: string[], source: AudioSource) {
    super();
    this.source = source;
    this.extensions = extensions;
    this.regExp = new RegExp('\.(' + extensions.join('|') + ')$', 'i');
    this.createLoadFallback();
    this.playlistWorker = new Worker();
    this.playlistWorker.addEventListener('message', (e) => {
      if (e.data.type === 'tags') {
        this.setTagsTo(e.data.i, e.data.payload);
      }
    }, false);
  }

  public setTagsTo(i: number, tags: {}) {
    this.entries[i].tags = tags;
    this.source.playlistMessage('trackchanged', {position: i, tags});
  }

  public reset() {
    this.entries = [];
    this.cursorPos = 0;
  }

  public resetPosition() {
    this.cursorPos = 0;
  }

  public async createObjectUrlOf(index: number): Promise<string> {
    if (typeof this.entries[index].instance.getFile === 'function') {
      this.file = await this.entries[index].instance.getFile()
    } else {
      this.file = this.entries[index].instance;
    }
    return URL.createObjectURL(this.file);
  }

  get Entry(): PlaylistEntry | null {
    return this.entries[this.cursorPos] ? this.entries[this.cursorPos]: null;
  }

  get Position(): number {
    return this.cursorPos;
  }

  set Position(position: number) {
    this.cursorPos = position;
  }

  get Empty(): boolean {
    return !this.entries.length;
  }

  public async load(dirMode: Boolean = false): Promise<void> {
    if (!this.fallbackInputElement) {
      let descriptor;
      try {
        if (!dirMode) {
          descriptor = await window.showOpenFilePicker({
            types: [{
              description: 'Audio',
              accept: {
                'audio/*': this.extensions
              }
            }],
            excludeAcceptAllOption: true,
            multiple: true
          });
          this.reset();
          for (let i = 0, l = descriptor.length; i < l; i++) {
            if (this.regExp.test(descriptor[i].name)) {
              this.entries.push({
                name: descriptor[i].name,
                level: 0,
                instance: descriptor[i],
                kind: 'file',
                path: []
              });
            }
          }
          this.entries.sort((a, b) => {
            return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
          });
        } else {
          descriptor = await window.showDirectoryPicker();
          let playlistItem = {
            name: descriptor.name,
            level: 0,
            instance: descriptor,
            kind: 'directory',
            path: [descriptor.name]
          };
          this.reset();
          this.entries.push(playlistItem);
          await this.readDirectory(playlistItem);
        }
        if (!this.isEntryPlayable(this.cursorPos)) {
          if (!this.cursorToNextPlayable()) {
            throw new Error('No playable files selected.');
          }
        }
        this.source.playlistMessage('loaded', {playlist: this.entries});
        this.processEntries();
      } catch (error) {
        if (this.entries.length) {
          return this.source.playlistMessage('notpicked');
        }
        this.source.playlistMessage('cancel', {error});
      }
    } else {
      if (dirMode) {
        this.fallbackInputElement.setAttribute('mozdirectory', 'mozdirectory');
        this.fallbackInputElement.setAttribute('webkitdirectory', 'webkitdirectory');
        this.fallbackInputElement.setAttribute('directory', 'directory');
        this.fallbackInputElement.setAttribute('allowdirs', 'allowdirs');
        this.fallbackInputElement.removeAttribute('multiple');
      } else {
        this.fallbackInputElement.removeAttribute('mozdirectory');
        this.fallbackInputElement.removeAttribute('webkitdirectory');
        this.fallbackInputElement.removeAttribute('directory');
        this.fallbackInputElement.removeAttribute('allowdirs');
        this.fallbackInputElement.setAttribute('multiple', 'multiple');
      }
      this.fallbackInputElement.focus();
      this.fallbackInputElement.click();
      document.addEventListener('focus', () => {
        this.source.playlistMessage('closedbyfallback');
      }, {once: true});
    }
  }

  public isEntryPlayable(index: number) : Boolean {
    return (index < this.entries.length) && 
           (this.entries[index].kind !== 'directory') && 
           (!this.entries[index].error);
  }

  public isEntryExists(index: number) : Boolean {
    return !!this.entries[index];
  }

  public isDirectory(index: number) : Boolean {
    return (index < this.entries.length) && (this.entries[index].kind === 'directory');
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

  public cursorToNextDirectory(): Boolean {
    do {
      this.cursorPos++;
    } while (this.isEntryExists(this.cursorPos) && !this.isDirectory(this.cursorPos));
    return this.isEntryExists(this.cursorPos);
  }

  public cursorToPreviousDirectory(): Boolean {
    let firstPassedBy = false;
    do {
      this.cursorPos--;
      if (this.cursorPos < 0) {
        break;
      }
      if (this.isDirectory(this.cursorPos)) {
        // must bypass a first dir we meet, this is a current track dir
        if (!firstPassedBy) {
          firstPassedBy = true;
          continue;
        }
        // checking whether a found dir contains tracks
        if (this.isEntryPlayable(this.cursorPos+1)) {
          break;
        }
        continue;
      }
      continue;
    } while (1);
    return this.isEntryExists(this.cursorPos);
  }

  public cursorToFirstTrackOf(directory: string): Boolean {
    do {
      this.cursorPos--;
    } while (
      this.isEntryExists(this.cursorPos) && 
      (!this.isEntryPlayable(this.cursorPos) ||
      directory === this.entries[this.cursorPos].path.join('/'))
    );
    this.cursorPos++;
    return this.isEntryExists(this.cursorPos);
  }

  protected createLoadFallback() {
    if (!window.showOpenFilePicker && !window.showDirectoryPicker) {
      this.fallbackInputElement = document.createElement('INPUT') as HTMLInputElement;
      this.fallbackInputElement.setAttribute('type', 'file');
      const getFullPath = (file: File) => {
        const i: any = file;
        return i.webkitRelativePath || `${i.fullPath}/${i.name}`;
      };
      const getDirectory = (file: File) => {
        const i: any = file;
        return (i.fullPath || i.webkitRelativePath.slice(0, i.webkitRelativePath.lastIndexOf("/")))
      };
      const sortByFullPath = (list: File[]) => {
        list.sort((a: File, b: File) => {
          const apath = getFullPath(a);
          const bpath = getFullPath(b);
          return (apath < bpath) ? 
          -1 : (apath > bpath) ? 
          1 : 0;
        });
      };

      this.fallbackInputElement.addEventListener("change", (e: HTMLInputEvent) => {
        this.reset();
        
        let temp = [...e.target.files]
        let lastDir = '';

        sortByFullPath(temp);
        temp.forEach(file => {
          if (this.regExp.test(file.name)) {
            let directory = getDirectory(file);
            if (directory != lastDir) {
              this.entries.push({
                name: directory,
                kind: 'directory',
                level: 0,
                path: [],
              });
              lastDir = directory;
            }
            this.entries.push({
              name: file.name,
              kind: 'file',
              level: 1,
              path: directory.split('/'),
              instance: file,
            });
          }
        });
        if (!this.isEntryPlayable(this.cursorPos)) {
          if (!this.cursorToNextPlayable()) {
            throw new Error('No playable files selected.');
          }
        }
        this.emit('loaded', {playlist: this.entries});
        this.processEntries();
      }, false);
    }
  }

  protected async readDirectory(item: PlaylistEntry): Promise<any> {
    let level = item.level+1;
    let temporaryArray = [];
    for await (const [name, entry] of item.instance.entries()) {
      if (entry.kind === 'directory' || this.regExp.test(name)) {
        let playlistItem = {
          name,
          level,
          kind: entry.kind,
          path: [...item.path],
          instance: entry,
        }
        if (entry.kind === 'directory') {
          playlistItem.path.push(name);
        }
        temporaryArray.push(playlistItem);
      }
    }
    temporaryArray.sort((a, b) => {
      if (a.kind !== b.kind) {
        return (a.kind < b.kind) ? -1 : (a.kind > b.kind) ? 1 : 0;
      }
      return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
    });
    let i = 0, l = temporaryArray.length;
    while (i < l) {
      this.entries.push(temporaryArray[i]);
      if (temporaryArray[i].kind === 'directory') {
        let size = this.entries.length;
        await this.readDirectory(temporaryArray[i]);
        if (size === this.entries.length) {
          // previously added directory is empty so remove it
          this.entries.pop();
        }
      }
      i++;
    }
  }

  protected getAudioDuration(audio: HTMLAudioElement): Promise<any> {
    return new Promise(function (resolve, reject) {
      const load = (e: any) => {
        audio.removeEventListener('loadedmetadata', load);
        audio.removeEventListener('error', error);
        resolve(audio.duration);
      }
      const error = () => {
        audio.removeEventListener('loadedmetadata', load);
        audio.removeEventListener('error', error);
        reject();
      }
      audio.addEventListener('loadedmetadata', load);
      audio.addEventListener('error', error);
    });
  }

  protected async processEntries() {
    this.playlistWorker.postMessage({
      type: 'playlist',
      payload: {
        playlist: this.entries,
      },
    });

    let audio = new Audio();
    for (let i = 0; i < this.entries.length; i++) {
      let item = this.entries[i];
      if (item.kind !== 'directory') {
        let entry = item.instance;
        try {
          if (typeof entry.getFile === 'function') {
            audio.src = URL.createObjectURL(await entry.getFile());
          } else {
            audio.src = URL.createObjectURL(entry);
          }
          const duration = await this.getAudioDuration(audio);
          this.source.playlistMessage('tracktimechanged', {position: i, duration});
        } catch (e) {
          item.error = true;
          this.source.playlistMessage('tracktimechanged', {position: i, duration: 0});
        }
        if (audio.src) {
          URL.revokeObjectURL(audio.src);
        }
      }
    }
    audio = null;
  }
}