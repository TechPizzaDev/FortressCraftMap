Make sure you have the prerequisites before building:
  * 'wasm-pack' installed

### How to build:
1. Download/update packages with `npm update` at the commandline inside 'WebClient'.
2. Use "npm start" at the commandline inside 'WebClient'.
3. Use "wasm-pack" at the commandline inside 'fcmap-speedy'.

### How to run:
1. Make sure that the project is built and [copied to the game mods folder](https://steamcommunity.com/app/254200/discussions/1/371919771743766319/).
2. Launch a web server instance by;
  * starting the `WebSocketServer` (custom world data will be used).
  * starting a *FortressCraft* world with the `WebMapMod` enabled.
 
3. Connect to the web page (the URL should be logged at startup, the default being "http://localhost:1337").
