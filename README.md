# FortressCraftMap
Simple web map mod for FortressCraft, written in TypeScript.  
Using WebGL and WebSocket messaging abstractions for modular client development.  

### Main Roadmap
- [ ] Basic rendering (coming very soon)
- [x] Live data/updates
- [ ] Game integration
- [ ] Heightmap shading
- [ ] Inspecting machines
  - [ ] Generic status
  - [ ] Inventory contents
- [ ] Location of entities
  - [ ] Location of players
  - [ ] Location of enemies
  - [ ] Location of mynocks
  - [ ] Location of items (see notes)
- [ ] Following a target
  - [ ] Following player
  - [ ] Following enemy
  - [ ] Following Falcor
  - [ ] Following minecart
- [ ] Visualizing cart routes
- [ ] 3D HoloBase view (mostly identical to in-game)
- [ ] Toggles for most icons (mobs, players, info popups) 
- [ ] Settings for icon sizes/visibility
- [ ] Underground mapping

#### Extras
- [x] Loading indicator
- [ ] Simple sound effects
- [ ] Visualizing info popups (e.g. Ore Extractor missing drill)
- [ ] Visualizing Falcor routes
  - [ ] Surface Falcors
  - [ ] Falcors on any Y level
- [ ] Chart of current research
  - [ ] Scanned blocks
  - [ ] RP projects
  - [ ] Lab projects
- [ ] Only rendering selected blocks
  - [ ] Select by Regex
    - [ ] Search for item in inventories
    - [ ] Search by block name
- [ ] Location of research parts/drop pods
- [ ] Current attack and wave info
- [ ] World statistics (e.g. production)
- [ ] Ore scan/visualization

#### Not on Roadmap
- Special topography rendering based on vertex normals and time of day

#
#### Notes
Researching Hardened Resin will be required to reveal active Hiveminds.  
One active Threat Scanner will be required to reveal enemies. (Slimes will be visible regardless)  
Active CCCCC will be required to reveal Cryo. (Cryo spawners will be visible regardless)  
Searching by block name will require that block to be researched.  
Showing location of research parts should be gated behind something (maybe Basic SpiderBot Defences?).  
Items should probably not be drawn individually (performance should not be a problem because of instancing)
because of clarity, it's better to come up with some system where the user can hover over a group of items (and remember a range setting).
