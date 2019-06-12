
class HttpHelper {

	/** Request or send resources through HTTP.
	 * @param body An optional request body, ignored if method is GET or HEAD. */
	static async request(url: string, options?: HttpRequestOptions, body?: Document | BodyInit): Promise<HttpResponse> {
		return new Promise((resolve, reject) => {
			if (!options)
				options = new HttpRequestOptions();

			const xhr = new XMLHttpRequest();
			xhr.open(options.method, url);
			xhr.responseType = options.type;

			for (const [key, value] of options.headers)
				xhr.setRequestHeader(key, value);

			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300)
					resolve(new HttpResponse(xhr.response, xhr.status));
				else
					reject(xhr.statusText);
			};
			xhr.onerror = () => reject(xhr.statusText);
			xhr.send(body);
		});
	}
}

class HttpRequestOptions {
	/** Controls the HTTP method. (Defaults to GET) */
	public method: string;

	/** The response type of an evaluated request. */
	public type: XMLHttpRequestResponseType;

	/** Custom HTTP headers for the request. */
	public readonly headers: Map<string, string>;

	constructor(method?: string) {
		this.method = method || "GET";
		this.headers = new Map<string, string>();
	}
}

class HttpResponse {
	public readonly data: any;
	public readonly status: number;

	constructor(data: any, status: number) {
		this.data = data;
		this.status = status;
	}
}