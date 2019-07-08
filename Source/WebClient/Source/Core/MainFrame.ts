import MapSegmentRenderer from "../Graphics/Renderers/MapSegmentRenderer";
import ChannelSocket, { ChannelMessage } from "../Utility/ChannelSocket";
import TimedEvent from "../Utility/TimingEvent";
import FrameDispatcher from "../Utility/FrameDispatcher";
import { Rectangle } from "../Utility/Shapes";
import * as Map from "./World/Map";
import AppContent from "../Content/AppContent";

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

	constructor(gl: WebGLRenderingContext, onLoad?: () => void) {
		if (gl == null)
			throw new TypeError("GL context is undefined.");
		this._gl = gl;

		this._content = new AppContent(gl, onLoad);
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
		window.addEventListener("resize", this.onWindowResize);

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
		const viewport = new Rectangle(
			0, 0,
			Math.floor(window.innerWidth * window.devicePixelRatio),
			Math.floor(window.innerHeight * window.devicePixelRatio));

		this._segmentRenderer.onViewportChanged(viewport);
	}
}

// this should run in a Worker
//class MeshGenerator {
//}