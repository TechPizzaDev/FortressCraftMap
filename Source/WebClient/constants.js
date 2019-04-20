"use strict";

// the only real constants
const segmentSize = 16;
const resolution = 64;

// TODO: change 'drawDistance' behavior
const drawDistance = 24;
const immediateUploads = true;
const chunkUploadsPerFrame = 32;
const minChunkUploadsPerFrame = 8;
const maxChunkUploadsPerFrame = 512;
const loadDelayMs = 4;

const minMapZoom = 0.125 / 4;
const maxMapZoom = 1;
const defaultMapZoom = 0.25;