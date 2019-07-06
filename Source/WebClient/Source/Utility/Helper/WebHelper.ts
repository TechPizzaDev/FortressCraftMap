
/**
 * Helper for requesting and sending data through HTTP.
 * */
export class Web {

	/** Request or send resources asynchronously through HTTP.
	 * @param url The resource URL.
	 * @param options Options used to fine-tune the request (change method, add extra headers).
	 * @param body Optional request body, ignored if method is GET or HEAD.
	 * @param handleCallback Optional callback giving the caller access to the request.
	 * */
	static async requestAsync(
		url: string,
		options?: Web.HttpRequestOptions,
		body?: Document | BodyInit,
		handleCallback?: (request: XMLHttpRequest) => void)
		: Promise<Web.HttpResponse>
	{
		if (!options)
			options = new Web.HttpRequestOptions();

		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open(options.method, url);
			xhr.responseType = options.type;
			xhr.timeout = options.timeout;

			for (const [key, value] of options.headers)
				xhr.setRequestHeader(key, value);

			xhr.onload = () => resolve(new Web.HttpResponse(xhr.response, xhr.status));

			const onFailure = (ev: ProgressEvent) => reject(new Web.HttpResponse(ev.type, -1));
			xhr.ontimeout = onFailure;
			xhr.onerror = onFailure;

			if (handleCallback)
				handleCallback(xhr);

			xhr.send(body);
		});
	}
}

export namespace Web {

	/**
	 * Options used by HTTP request functions.
	 * */
	export class HttpRequestOptions {

		/** Controls the HTTP method. (Defaults to GET) */
		public method: string;

		/** The response type of an evaluated request. */
		public type: XMLHttpRequestResponseType;

		/** 
		 * The amount of milliseconds a request can take at most.
		 * Defaults to 30000 (30 seconds).
		 */
		public timeout: number;

		/** Custom HTTP headers for the request. */
		public readonly headers: Map<string, string>;

		/**
		 * Constructs the request options.
		 * @param method The HTTP method used by the request. Defaults to GET. 
		 */
		constructor(method?: string, type?: XMLHttpRequestResponseType, timeout: number = 30000) {
			this.method = method || "GET";
			this.type = type || "";
			this.timeout = timeout;
			this.headers = new Map<string, string>();
		}
	}

	/**
	 * Container for response data and a status code or a failure reason.
	 * */
	export class HttpResponse {

		/**
		 * The response's body.
		 * Is null for failed requests.
		 */
		public readonly data: any;

		/** 
		 * The response's failure reason.
		 * Can be an empty string for failed requests.
		 * Is null for successful requests.
		 */
		public readonly failure: string;

		/**
		 * The response's HTTP status code.
		 * -1 if the response was a failure. 
		 */
		public readonly status: number;

		/**
		 * Gets if the response was a failure. 
		 * (The status code for a failed HttpResponse is -1.)
		 */
		public get isFailure(): boolean {
			return this.status == -1;
		}

		/**
		 * Constructs the response from an evaluated request.
		 * @param data Response data or failure reason for the evaluated request. 
		 * @param data Can be null for failed requests.
		 * @param status Status code for the evaluated request or -1 for failed requests.
		 */
		constructor(data: any, status: number) {
			if (status == -1)
				this.failure = data || "";
			else {
				if (data == null)
					throw new Error("'data' may not be null if 'status' is not -1.");
				this.data = data;
			}
			this.status = status;
		}
	}
}