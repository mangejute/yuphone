Netlify upload folder for LifeTalk mobile standalone.

Upload the full contents of this folder to Netlify.
Use index.html as the default entry.
This Netlify build is the lightweight web release.
It keeps microphone / camera / Web Speech API support, but does not bundle the large local SenseVoice model files.
manifest.webmanifest / sw.js / pwa-icon.svg / pwa-icon-192.png / pwa-icon-512.png are required for fullscreen install and local caching.