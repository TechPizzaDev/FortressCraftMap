
function coordsToSegmentKey(x: number, y: number): string {
	return x + "," + y;
}

function segmentKeyToCoords(key: string): number[] {
	const split = key.split(",");
	return [parseInt(split[0]), parseInt(split[1])];
}