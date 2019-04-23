"use strict";

class ChannelSocket extends EventEmitter {
	constructor(channel) {
		super();
		this._registerEvent("open");
		this._registerEvent("close");
		this._registerEvent("message");
		this._registerEvent("error");

		this._channel = channel;
		this._url = ChannelSocket.getSocketUrl(this._channel);
		this._socket = null;
	}

	get isConnected() {
		if (!this._socket)
			return false;
		return this._socket.readyState === this._socket.OPEN;
	}

	get channel() {
		return this._channel;
	}

	get url() {
		return this._url;
	}

	connect() {
		this._socket = new WebSocket(this.url);

		this._socket.addEventListener("open", (ev) => {
			console.log(`[Channel '${this._channel}'] Connected`);
			this._triggerEvent("open", ev);
		});

		this._socket.addEventListener("close", (ev) => {
			console.log(`[Channel '${this._channel}'] Disconnected (code ${ev.code})`);
			this._triggerEvent("close", ev);
		});
		
		this._socket.addEventListener("message", (ev) => {
			if (this.getEventSubscriberCount("message") <= 0) {
				console.log(`[Channel '${this._channel}'] Message:`, ev.data);
			}
			this._triggerEvent("message", ev);
		});

		this._socket.addEventListener("error", (ev) => {
			if (this.getEventSubscriberCount("error") <= 0) {
				console.warn(`[Channel '${this._channel}'] Error:`, ev);
			}
			this._triggerEvent("error", ev);
		});
	}

	/**
	 * @param {string | ArrayBuffer | Blob | ArrayBufferView} data The object to send.
	 */
	send(data) {
		if (!this.isConnected) {
			throw new Error(`ChannelSocket (for channel '${this.channel}') is disconnected`);
		}
		this._socket.send(data);
	}

	/**
	 * Converts the object to JSON and sends it.
	 * @param {*} obj The object to send as JSON.
	 */
	sendJson(obj) {
		const str = JSON.stringify(obj);
		this.send(str);
	}

	/**
	 * Sends a JSON message object with a specific code.
	 * @param {string} code The message code.
	 * @param {*} data The message data object.
	 */
	sendMessage(code, data) {
		this.sendJson({ code, message: data });
	}

	/**
	 * Returns a WebSocket URL for the specified channel.
	 * @param {string} channel The channel name.
	 * @returns {string} The complete URL.
	 */
	static getSocketUrl(channel) {
		return `ws://${self.location.host}/${channel}`;
	}
}