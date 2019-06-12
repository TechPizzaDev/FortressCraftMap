import EventEmitter from "./EventEmitter";
import * as msgpack5 from "msgpack5";

type CodeType = string | number;

export default class ChannelSocket extends EventEmitter {
	private _channel: string;
	private _url: string;
	private _msgPack: msgpack5.MessagePack;
	private _socket: WebSocket;

	private _useNumericCodes: boolean;
	private _clientCodeMap: MessageCodeMap;
	private _serverCodeMap: MessageCodeMap;

	constructor(channel: string) {
		super();
		this.registerEvent("open");
		this.registerEvent("ready");
		this.registerEvent("close");
		this.registerEvent("error");
		this.registerEvent("message");

		this._channel = channel;
		this._url = ChannelSocket.createSocketUrl(this._channel);
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

	// special case for the first initialization message
	private onInitMessage = (ev: MessageEvent) => {
		const initData = this._msgPack.decode(ev.data);
		this.initCodeInfo(initData.codeInfo);

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
			throw new Error(`Client code '${code}' is invalid.`);

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
			return MessageCode.empty;
		code = map.normalize(code);

		if (!map.has(code))
			return MessageCode.empty;
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
	 * @param channel The channel name.
	 * @returns The complete URL for the channel.
	 */
	public static createSocketUrl(channel: string): string {
		return `ws://${self.location.host}/${channel}`;
	}
}

class MessageCodeMap {
	public readonly byName: Map<string, MessageCode>;
	public readonly byValue: Map<number, MessageCode>;

	constructor(source: any) {
		if (source == null)
			throw new TypeError("Source cannot be null.");

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

export class MessageCode {
	public static empty = new MessageCode(null, 0);
	public static error = new MessageCode("error", -1);

	public readonly name: string;
	public readonly number: number;

	public get isValid(): boolean {
		return this.name != null;
	}

	constructor(name: string, code: number) {
		this.name = name;
		this.number = code;
	}
}

export class ChannelMessage {
	public readonly channel: ChannelSocket;
	public readonly event: MessageEvent;
	public readonly code: MessageCode;
	public readonly body: any;

	constructor(channel: ChannelSocket, event: MessageEvent, code: MessageCode, body: any) {
		this.channel = channel;
		this.event = event;
		this.code = code;
		this.body = body;
	}
}