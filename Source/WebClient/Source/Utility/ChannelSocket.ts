type CodeType = string | number;

import EventEmitter from "./EventEmitter";
import * as msgpack5 from "msgpack5";

/** 
 * Wrapper of WebSocket for reading MessagePack messages.
 * Available events are "open", "ready", "close", "error" and "message".
 * */
export default class ChannelSocket extends EventEmitter {
	private _channel: string;
	private _url: string;
	private _msgPack: msgpack5.MessagePack;
	private _socket: WebSocket;

	private _useNumericCodes: boolean;
	private _clientCodeMap: MessageCodeMap;
	private _serverCodeMap: MessageCodeMap;

	/**
	 * Constructs the ChannelSocket.
	 * @param channelUrl The channel URL used for communication.
	 */
	constructor(channelUrl: string) {
		super();
		this.registerEvent("open");
		this.registerEvent("ready");
		this.registerEvent("close");
		this.registerEvent("error");
		this.registerEvent("message");

		this._channel = ChannelSocket.nameFromUrl(channelUrl);
		this._url = channelUrl;
		this._msgPack = msgpack5();
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

	/**
	 * Creates the internal WebSocket and binds event listeners.
	 * The "ready" event is triggered after the initialization message is processed.
	 * The "message" and "error" events are logged to the console if they don't have subscribers.
	 * The "open" and "close" events are always logged to the console.
	 * */
	public connect() {
		this._socket = new WebSocket(this.url);
		this._socket.binaryType = "arraybuffer";

		this._socket.addEventListener("open", (ev: Event) => {
			console.log(`[Channel '${this._channel}'] Connected`);
			this.triggerEvent("open", ev);
		});

		this._socket.addEventListener("close", (ev: CloseEvent) => {
			console.log(`[Channel '${this._channel}'] Disconnected (code ${ev.code})`);
			this.triggerEvent("close", ev);
		});

		this._socket.addEventListener("error", (ev: Event) => {
			if (!this.tryTriggerEvent("error", ev))
				console.warn(`[Channel '${this._channel}'] Error:`, ev);
		});

		this._socket.addEventListener("message", this.onInitMessage);
	}

	// special handler for the first initialization message
	private onInitMessage = (ev: MessageEvent) => {
		const initData = this._msgPack.decode(ev.data);
		this.initCodeInfo(initData.codeInfo);

		// re-register the "message" event to the new handler
		this._socket.removeEventListener("message", this.onInitMessage);
		this._socket.addEventListener("message", this.onMessage);
		this.triggerEvent("ready", null);
	};

	private initCodeInfo(codeInfo: any) {
		this._useNumericCodes = codeInfo.numericCodes;

		this._clientCodeMap = new MessageCodeMap(codeInfo.client);
		if (codeInfo.server != null)
			this._serverCodeMap = new MessageCodeMap(codeInfo.server);
	}

	// the actual message handler used after initialization
	private onMessage = (ev: MessageEvent) => {
		const msgData = this._msgPack.decode(ev.data);
		const msgCode = msgData[0];
		const msgBody = msgData[1];
		if (msgCode == MessageCode.error.number) {
			console.warn(msgBody);
			return;
		}

		const serverCode = this.getServerCode(msgCode);
		if (!serverCode.isValid) {
			console.warn("Server sent a message with an unknown code.", ev);
			return;
		}

		const evData = new ChannelMessage(this, ev, serverCode, msgBody);
		if (!this.tryTriggerEvent("message", evData))
			console.log(`[Channel '${this._channel}'] Message:`, evData);
	};

	/**
	 * Creates a MessagePack message that can be sent later.
	 * @param code The message code.
	 * @param body The object to send along the code.
	 */
	public createMessage(code: CodeType, body: any): Buffer {
		const clientCode = this.getClientCode(code);
		if (!clientCode.isValid)
			throw new Error(`Client code is invalid.`);

		const msgCode = this._useNumericCodes ? clientCode.number : clientCode.name;
		return this.encodeMessage([msgCode, body]);
	}

	public getServerCode(code: CodeType): MessageCode {
		return this.getMessageCode(this._serverCodeMap, code);
	}

	private getClientCode(code: CodeType): MessageCode {
		return this.getMessageCode(this._clientCodeMap, code);
	}

	private getMessageCode(map: MessageCodeMap, code: CodeType) {
		if (map == null)
			return MessageCode.invalid;
		code = map.normalize(code);

		if (!map.has(code))
			return MessageCode.invalid;
		return map.get(code);
	}

	/**
	 * Sends data through the underlying socket.
	 * @param data The data to send.
	 */
	public send(data: string | ArrayBuffer | ArrayBufferView | Blob) {
		if (!this.isConnected)
			throw new Error(`[Channel '${this.channel}'] Failed to send data; channel is disconnected.`);
		this._socket.send(data);
	}

	/**
	 * Sends the object encoded with MessagePack.
	 * @param obj The object to send.
	 */
	public sendJson(obj: any) {
		this.send(this.encodeMessage(obj));
	}

	private encodeMessage(obj: any): Buffer {
		const data = this._msgPack.encode(obj);
		return data.slice(0, data.length);
	}

	/**
	 * Sends a code and body encoded with MessagePack.
	 * @param code The message code.
	 * @param body The object to send along the code.
	 */
	public sendMessage(code: CodeType, body: any) {
		this.send(this.createMessage(code, body));
	}

	/**
	 * Returns a WebSocket URL for the specified channel.
	 * @param channelName The channel name.
	 * @param secure true to use the secure "wss" protocol; false to use "ws". Defaults to true.
	 * @returns The complete URL for the channel.
	 */
	public static createUrl(channelName: string, secure: boolean = true): string {
		const protocol = secure ? "wss" : "ws";
		return `${protocol}://${self.location.host}/${channelName}`;
	}

	/**
	 * Get the name from a channel URL.
	 * @param channelUrl The channel URL.
	 * @returns The channel name.
	 */
	public static nameFromUrl(channelUrl: string): string {
		const protocolIndex = channelUrl.indexOf("://");
		if (protocolIndex == -1)
			throw new Error(`Channel URL '${channelUrl}' is missing the protocol.`);
		const location = channelUrl.substring(protocolIndex + 3);

		const lastSlashIndex = location.lastIndexOf('/');
		if (lastSlashIndex == -1)
			throw new Error(`Channel location '${location}' is not valid.`);
		return location.substring(lastSlashIndex + 1);
	}

	public static create(channelName: string, secure: boolean = true): ChannelSocket {
		const url = ChannelSocket.createUrl(channelName, secure);
		return new ChannelSocket(url);
	}
}

class MessageCodeMap {
	public readonly byName: Map<string, MessageCode>;
	public readonly byValue: Map<number, MessageCode>;

	constructor(source: any) {
		if (source == null)
			throw new SyntaxError("'source' may not be null.");

		this.byName = new Map<string, MessageCode>();
		this.byValue = new Map<number, MessageCode>();

		if (source instanceof Array) {
			for (let i = 0; i < source.length; i++) {
				const codeName = source[i];
				const msgCode = new MessageCode(codeName, 0);
				this.byName.set(codeName, msgCode);
			}
		}
		for (const codeName in source) {
			const codeValue = source[codeName];

			const msgCode = new MessageCode(codeName, codeValue);
			this.byName.set(codeName, msgCode);
			if (codeValue != null)
				this.byValue.set(codeValue, msgCode);
		}
	}

	public has(code: CodeType): boolean {
		if (MessageCodeMap.isString(code))
			return this.byName.has(code);
		return this.byValue.has(code);
	}

	public get(code: CodeType): MessageCode {
		if (MessageCodeMap.isString(code))
			return this.byName.get(code);
		return this.byValue.get(code);
	}

	/**
	 * Normalizes a code if it is a string.
	 * Normalized string codes are lower-case. Numerical codes are not affected.
	 * @param code The string or number code.
	 */
	public normalize(code: CodeType): CodeType {
		if (MessageCodeMap.isString(code))
			code = code.toLowerCase();
		return code;
	}

	public static isNumber(x: CodeType): x is number {
		return typeof x === "number";
	}

	public static isString(x: CodeType): x is string {
		return typeof x === "string";
	}
}

/**
 * The message code used by client and server messages. 
 * These codes are dictated by an initialization message from the server.
 * */
export class MessageCode {
	public static invalid = new MessageCode(null, 0);
	public static error = new MessageCode("error", -1);

	/** The name of the code. */
	public readonly name: string;

	/** The numeric representation of this code. */
	public readonly number: number;

	/**
	 * Gets if this code is valid. Error codes use the code number -1.
	 * Invalid codes have a null name and use the code number 0.
	 * */
	public get isValid(): boolean {
		return this.name != null;
	}

	constructor(name: string, code: number) {
		this.name = name;
		this.number = code;
	}
}

/**
 * Message data parsed by a ChannelSocket.
 * */
export class ChannelMessage {

	/** The ChannelSocket that this message originates from. */
	public readonly channel: ChannelSocket;

	/** The event from the underlying WebSocket. */
	public readonly event: MessageEvent;

	/** The message code. */
	public readonly code: MessageCode;

	/** The message body. */
	public readonly body: any;

	constructor(channel: ChannelSocket, event: MessageEvent, code: MessageCode, body: any) {
		this.channel = channel;
		this.event = event;
		this.code = code;
		this.body = body;
	}
}