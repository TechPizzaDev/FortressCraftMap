"use strict";

const segmentSize = 16;
const resolution = 64;

// TODO: change 'drawDistance' behavior
const drawDistance = 32;
const maxChunkUploadsPerFrame = 32;
const threadedUploads = true;

const loadDelayMs = 4;

const minMapZoom = 0.125 / 4;
const maxMapZoom = 1;
const defaultMapZoom = 0.25;