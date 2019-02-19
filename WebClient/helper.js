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

function coordsToSegmentKey(x, y) {
	return x + "," + y;
}

function segmentKeyToCoords(key) {
	const split = key.split(",");
	return createVector2(parseInt(split[0]), parseInt(split[1]));
}

/**
 * Sends a HTTP request.
 * @param {*} options 
 *  "method": controls the HTTP method (defaults to GET)
 *  "url": the request URL
 *  "headers": custom HTTP headers
 *  "type": the XHR response type
 *  "body": an optional request body (ignored if method is GET or HEAD)
 *  
 * @returns {Promise<T>} A Promise that resolves with the response.
 */
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