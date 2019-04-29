import EventEmitter from "./EventEmitter";

export default class ChannelSocket extends EventEmitter {
	private _channel: string;
	private _url: string;
	private _socket: WebSocket;

	constructor(channel: string) {
		super();
		this.registerEvent("open");
		this.registerEvent("close");
		this.registerEvent("message");
		this.registerEvent("error");

		this._channel = channel;
		this._url = ChannelSocket.getSocketUrl(this._channel);
		this._socket = null;
	}

	public get isConnected(): boolean {
		if (!this._socket)
			return false;
		return this._socket.readyState === this._socket.OPEN;
	}

	public get channel(): string {
		return this._channel;
	}

	public get url(): string {
		return this._url;
	}

	public connect() {
		this._socket = new WebSocket(this.url);

		this._socket.addEventListener("open", (ev: Event) => {
			console.log(`[Channel '${this._channel}'] Connected`);
			this.triggerEvent("open", ev);
		});

		this._socket.addEventListener("close", (ev: CloseEvent) => {
			console.log(`[Channel '${this._channel}'] Disconnected (code ${ev.code})`);
			this.triggerEvent("close", ev);
		});
		
		this._socket.addEventListener("message", (ev: MessageEvent) => {
			if (this.getEventSubscriberCount("message") <= 0)
				console.log(`[Channel '${this._channel}'] Message:`, ev.data);
			this.triggerEvent("message", ev);
		});

		this._socket.addEventListener("error", (ev: Event) => {
			if (this.getEventSubscriberCount("error") <= 0)
				console.warn(`[Channel '${this._channel}'] Error:`, ev);
			this.triggerEvent("error", ev);
		});
	}

	/**
	 * @param data The object to send.
	 */
	public send(data: string | ArrayBuffer | ArrayBufferView | Blob) {
		if (!this.isConnected) {
			throw new Error(`Channel '${this.channel}' is disconnected`);
		}
		this._socket.send(data);
	}

	/**
	 * Converts the object to JSON and sends it.
	 * @param obj The object to send as JSON.
	 */
	public sendJson(obj: any) {
		const str = JSON.stringify(obj);
		this.send(str);
	}

	/**
	 * Sends a JSON message object with a specific code.
	 * @param code The message code.
	 * @param obj The object to send as JSON.
	 */
	public sendMessage(code: string, obj: any) {
		this.sendJson({ code, message: obj });
	}

	/**
	 * Returns a WebSocket URL for the specified channel.
	 * @param channel The channel name.
	 * @returns The complete URL.
	 */
	public static getSocketUrl(channel: string): string {
		return `ws://${self.location.host}/${channel}`;
	}
}