
function Math_clamp (value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
};

function Math_lerp (src: number, dst: number, amount: number): number {
	return (1 - amount) * src + amount * dst;
};

function Math_isPowerOf2 (value: number): boolean {
	return (value & (value - 1)) === 0;
}

function coordsToSegmentKey(x: number, y: number): string {
	return x + "," + y;
}

function segmentKeyToCoords(key: string): number[] {
	const split = key.split(",");
	return [parseInt(split[0]), parseInt(split[1])];
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
 * @returns Promise that resolves with the response.
 */
async function doHttpRequest(options: HttpRequestOptions): Promise<HttpResponse> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open(options.method, options.url);

		if (options.type)
			xhr.responseType = options.type;

		if (options.headers) {
			for (const header of options.headers)
				xhr.setRequestHeader(header.key, header.value);
		}

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300)
				resolve(new HttpResponse(xhr.response, xhr.status));
			else
				reject(xhr.statusText);
		};
		xhr.onerror = () => reject(xhr.statusText);
		xhr.send(options.body);
	});
}

class HttpHeader {
	public readonly key: string;
	public readonly value: string;

	constructor(key: string, value: string) {
		this.key = key;
		this.value = value;
	}
}

class HttpRequestOptions {
	public method: string;
	public url: string;
	public readonly headers: HttpHeader[];
}

class HttpResponse {
	public readonly data: any;
	public readonly status: number;

	constructor(data: any, status: number) {
		this.data = data;
		this.status = status;
	}
}