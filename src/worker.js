self.importScripts('jsmediatags.min.js');

self.addEventListener('message', async (event) => {
  let data = event.data;
  if (data.type === 'playlist') {
    for (let i = 0; i < data.payload.playlist.length; i++) {
      let item = data.payload.playlist[i];
      if (item.kind !== 'directory') {
        let entry = item.instance;
        let audioFile;
        try {
          if (typeof entry.getFile === 'function') {
            audioFile = await entry.getFile();
          } else {
            audioFile = entry;
          }
          jsmediatags.read(audioFile, {
            onSuccess: function(payload) {
              self.postMessage({type: 'tags', i, payload});
            },
            // onError: function(error) {
            //   console.log(error);
            // }
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
});