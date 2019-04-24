"use strict";

const segmentSize = 16;
const resolution = 64;

// settings constants
const requestDelayMillis = 2;

const chunkUploadsPerFrame = {
	default: 32,
	min: 4,
	max: 512
};

const mapZoom = {
	default: 0.25,
	min: 0.125 / 4,
	max: 1
};