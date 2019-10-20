type CodeType = string | number;

import EventEmitter from "./EventEmitter";
import { SpeedyModule } from "../Core/Index";
import * as jDataView from "jdataview";
import jDataViewExtensions from "./Extensions/jDataViewExtensions";

interface KeyValuePair {
    key: string;
    value: number;
}

function readPairCodeMap(message: jDataView): MessageCodeMap {
    const pairs = new Array<KeyValuePair>(message.getInt32());
    for (let i = 0; i < pairs.length; i++) {
        const key = jDataViewExtensions.getDotNetString(message);
        const value = message.getUint16();
        pairs[i] = { key, value };
    }
    return MessageCodeMap.fromPairs(pairs);
}

/** 
 * Wrapper of WebSocket for reading MessagePack messages.
 * Available events are "open", "ready", "close", "error" and "message".
 * */
export default class ChannelSocket extends EventEmitter {
	private _channel: string;
	private _url: string;
	private _speedyModule: SpeedyModule;
	private _socket: WebSocket;
	private _isReady: boolean;

	private _useNumericCodes: boolean;
	private _clientCodeMap: MessageCodeMap;
	private _serverCodeMap: MessageCodeMap;

	/**
	 * Constructs the ChannelSocket.
	 * @param channelUrl The channel URL used for communication.
	 */
	constructor(channelUrl: string, speedyModule: SpeedyModule) {
		super();
		this.registerEvent("open");
		this.registerEvent("ready");
		this.registerEvent("close");
		this.registerEvent("error");
		this.registerEvent("message");

		this._channel = ChannelSocket.nameFromUrl(channelUrl);
		this._url = channelUrl;
		this._speedyModule = speedyModule;
	}

	public get isConnected(): boolean {
		if (!this._socket)
			return false;
		return this._socket.readyState === this._socket.OPEN;
	}

	public get isReady(): boolean {
		return this._isReady;
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
        const message = new jDataView(ev.data as jDataView.Bytes, 0, ev.data.length, true);
        this.initCodeInfo(message);

		// re-register the "message" event to the new handler
		this._socket.removeEventListener("message", this.onInitMessage);
		this._socket.addEventListener("message", this.onMessage);

		this._isReady = true;
		this.triggerEvent("ready", null);
	};

    private initCodeInfo(message: jDataView) {
        this._useNumericCodes = message.getUint8() == 1 ? true : false;
        if (this._useNumericCodes) {
            this._clientCodeMap = readPairCodeMap(message);
            this._serverCodeMap = readPairCodeMap(message);
        } else {
            throw new Error("not implemented");
        }
	}

	// the actual message handler used after initialization
    private onMessage = (ev: MessageEvent) => {
        const message = new jDataView(ev.data as jDataView.Bytes, 0, ev.data.length, true);
        const code = message.getUint16();

        if (code == MessageCode.error.number) {
            const text = jDataViewExtensions.getDotNetString(message);
            console.warn("Error message: ", text);
			return;
		}

        this.processMessage(ev, code, message);
    };

    private processMessage(ev: MessageEvent, code: CodeType, message: jDataView) {
        const serverCode = this.getServerCode(code);
        if (!serverCode.isValid) {
            console.warn("Server sent a message with an unknown code.", ev);
            return;
        }
		
        if (serverCode == MessageCode.stringCode) {
            const code = jDataViewExtensions.getDotNetString(message);
            this.processMessage(ev, code, message);
            return;
        }

        const evData = new ChannelMessage(this, ev, serverCode, message);
        if (!this.tryTriggerEvent("message", evData))
            console.log(`[Channel '${this._channel}'] Message:`, evData);
    }

	/**
	 * Creates a MessagePack message that can be sent later.
	 * @param code The message code.
	 * @param body The object to send along the code.
	 */
	public createMessage(code: CodeType, length: number): jDataView {
		const clientCode = this.getClientCode(code);
		if (!clientCode.isValid)
			throw new Error(`Client code is invalid.`);

        const codeLength = this._useNumericCodes ? 2 : clientCode.nameByteLength;
        const viewLength = length + codeLength;
        const view = new jDataView(viewLength, 0, viewLength, true);
        if (this._useNumericCodes)
            view.writeUint16(clientCode.number);
        else
            jDataViewExtensions.writeDotNetString(view, clientCode.name, "utf8");
        return view;
    }

	public getServerCode(code: CodeType): MessageCode {
		return this.getMessageCode(this._serverCodeMap, code);
	}

	private getClientCode(code: CodeType): MessageCode {
		return this.getMessageCode(this._clientCodeMap, code);
	}

	private getMessageCode(map: MessageCodeMap, code: CodeType) {
		if (map == null)
			return MessageCode.reserved;
		code = map.normalize(code);

		if (!map.has(code))
			return MessageCode.reserved;
		return map.get(code);
	}

	/**
	 * Sends data through the underlying socket.
	 * @param data The data to send.
	 */
    public send(data: string | ArrayBufferLike | Blob | ArrayBufferView | jDataView) {
		if (!this.isConnected)
            throw new Error(`[Channel '${this.channel}'] Failed to send data; channel is disconnected.`);

        if (data instanceof jDataView)
            data = new Uint8Array(data.buffer as ArrayBuffer);
		this._socket.send(data);
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

	public static create(channelName: string, speedyModule: SpeedyModule, secure: boolean = true): ChannelSocket {
		const url = ChannelSocket.createUrl(channelName, secure);
		return new ChannelSocket(url, speedyModule);
	}
}

class MessageCodeMap {
	public readonly byName: Map<string, MessageCode>;
	public readonly byValue: Map<number, MessageCode>;

    constructor() {
		this.byName = new Map<string, MessageCode>();
		this.byValue = new Map<number, MessageCode>();
    }

    public static fromNames(names: string[]): MessageCodeMap {
        if (names == null)
            throw new SyntaxError("'names' may not be null.");
		
        const map = new MessageCodeMap();
        for (const name of names) {
            const msgCode = new MessageCode(name, 0);
            map.byName.set(name, msgCode);
        }
        return map;
    }

    public static fromPairs(pairs: KeyValuePair[]): MessageCodeMap {
        if (pairs == null)
            throw new SyntaxError("'pairs' may not be null.");

        const map = new MessageCodeMap();
        for (const pair of pairs) {
            const msgCode = new MessageCode(pair.key, pair.value);
            map.byName.set(pair.key, msgCode);
            map.byValue.set(pair.value, msgCode);
        }
        return map;
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
    public static reserved = new MessageCode(null, 0);
    public static stringCode = new MessageCode("stringCode", 1);
	public static error = new MessageCode("error", 2);

	/** The name of the code. */
	public readonly name: string;

	/** The numeric representation of this code. */
    public readonly number: number;

    public readonly nameByteLength: number;

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

        if (name)
            this.nameByteLength = 0;
        else
            this.nameByteLength = -1;
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
    public readonly body: jDataView;

    constructor(channel: ChannelSocket, event: MessageEvent, code: MessageCode, body: jDataView) {
		this.channel = channel;
		this.event = event;
		this.code = code;
		this.body = body;
	}
}