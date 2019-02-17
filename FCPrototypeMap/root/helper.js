"use strict";

Math.clamp = (value, min, max) => {
	return Math.min(max, Math.max(min, value));
};

Math.lerp = (src, dst, amount) => {
	return (1 - amount) * src + amount * dst;
};

function createVector2(x, y) {
	return { x, y };
}

function cloneVector2(vec) {
	return createVector2(vec.x, vec.y);
}

function coordsToSegmentKey(x, y) {
	return x + "," + y;
}

function segmentKeyToCoords(key) {
	const split = key.split(",");
	return createVector2(parseInt(split[0]), parseInt(split[1]));
}

// options:
//  * method
//  * url
//  * headers
//  * type
//  * body
async function doHttpRequest(options) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const method = options.method || "GET";
		xhr.open(method, options.url);

		if(options.type)
			xhr.responseType = options.type;
		
		if (options.headers) {
			Object.keys(options.headers).forEach(key => {
				xhr.setRequestHeader(key, options.headers[key]);
			});
		}

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve({
					data: xhr.response,
					status: xhr.status
				});
			} else {
				reject(xhr.statusText);
			}
		};
		xhr.onerror = () => reject(xhr.statusText);
		xhr.send(options.body);
	});
}