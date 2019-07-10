import MapSegmentRenderer from "../Graphics/Renderers/MapSegmentRenderer";
import ChannelSocket, { ChannelMessage } from "../Utility/ChannelSocket";
import TimedEvent from "../Utility/TimingEvent";
import FrameDispatcher from "../Utility/FrameDispatcher";
import { Rectangle } from "../Utility/Shapes";
import AppContent from "../Content/AppContent";
import * as Map from "./World/Map";
import * as Content from "../Namespaces/Content";

/**
 * Loads components and handles document events (input, resizing).
 * */
export default class MainFrame {
	private _gl: WebGLRenderingContext;
	private _content: AppContent;
	private _frameDispatcher: FrameDispatcher;
	private _segmentRenderer: MapSegmentRenderer;

	// move networking into a NetworkManager class
	private _mapChannel: ChannelSocket;

	constructor(gl: WebGLRenderingContext, onLoad?: Content.LoadCallback) {
		if (gl == null)
			throw new TypeError("GL context is undefined.");
		this._gl = gl;

		const loadCallback = (manager: Content.Manager) => {
			let prepareErrored = false;
			try {
				this._segmentRenderer.prepare(manager);
			}
			catch (e) {
				prepareErrored = true;
				console.error("Failed to prepare renderers:\n", e);
			}

			if (!prepareErrored) {
				if (onLoad)
					onLoad(manager);
			}
			else {
				// TODO: add some kind of error message for the user
				throw new Error("Prepare Errored (TODO: Add an error message box for the user)");
			}
		};

		this._content = new AppContent(gl, loadCallback);
		this._frameDispatcher = new FrameDispatcher(this.update, this.draw);
		this._segmentRenderer = new MapSegmentRenderer(this);
		
		this._mapChannel = ChannelSocket.create("map", false);
		this._mapChannel.subscribeToEvent("ready", this.onMapChannelReady);
		this._mapChannel.subscribeToEvent("message", this.onMapChannelMessage);
		this._mapChannel.connect();
	}

	public get glContext(): WebGLRenderingContext {
		return this._gl;
	}

	public get content(): AppContent {
		return this._content;
	}

	private onMapChannelReady = (ev: Event) => {

		this._mapChannel.sendMessage(ClientMessageCode.GetSegment, [0, 2]);
	}

	private onMapChannelMessage = (message: ChannelMessage) => {
		switch (message.code.number) {
			case ServerMessageCode.BlockOrder:
			case ServerMessageCode.BlockOrders:
				return;

			case ServerMessageCode.Segment:
				const position = new Map.SegmentPosition(message.body[0]);
				const tiles = new Uint16Array(message.body[1]);
				const segment = new Map.Segment(position, tiles);
				this._segmentRenderer.segments.set(segment, position);
				break;
		}
		console.log("%c" + message.code.name, "color: pink", message.body);
	}

	/**
	 * Calls onWindowResize() once and starts the frame dispatcher.
	 * */
	public run() {
		this.onWindowResize();
		window.addEventListener("resize", this.onWindowResize, false);
		window.addEventListener("orientationchange", this.onWindowResize, false);

		this._frameDispatcher.run();
	}

	public update = (time: TimedEvent) => {

	}

	public draw = (time: TimedEvent) => {
		this._segmentRenderer.draw(time);
	}

	/**
	 * The event triggered by a window resize. Use this to update viewports.
	 * */
	private onWindowResize = () => {
		let dpr = window.devicePixelRatio || 1;

		const viewport = new Rectangle(
			0, 0,
			Math.floor(window.innerWidth * dpr),
			Math.floor(window.innerHeight * dpr));

		this.glContext.canvas.width = viewport.width;
		this.glContext.canvas.height = viewport.height;

		this._segmentRenderer.onViewportChanged(viewport);
	}
}