import SegmentRenderer from "../Graphics/SegmentRenderer";
import ChannelSocket, { ChannelMessage } from "../Helpers/ChannelSocket";
import TimingEvent from "../Helpers/TimingEvent";
import FrameDispatcher from "../Helpers/FrameDispatcher";
import { Size } from "../Helpers/Size";
import { vec3 } from "gl-matrix";

export default class MainFrame {
	private _gl: GLContext;
	private _frameDispatcher: FrameDispatcher;
	private _segmentRenderer: SegmentRenderer;
	private _mapChannel: ChannelSocket;

	constructor(gl: GLContext) {
		if (!gl)
			throw new TypeError("GL Context is undefined.");

		this._gl = gl;
		this._frameDispatcher = new FrameDispatcher(this.update, this.draw);
		this._segmentRenderer = new SegmentRenderer(this);
		
		this._mapChannel = new ChannelSocket("map");
		this._mapChannel.subscribeToEvent("ready", this.onChannelReady);
		this._mapChannel.subscribeToEvent("message", this.onChannelMessage);
		this._mapChannel.connect();
	}

	public get gl(): GLContext {
		return this._gl;
	}

	private onChannelReady = (ev: Event) => {

		this._mapChannel.sendMessage(ClientMessageCode.GetSegment, [0, 2]);
	}

	private onChannelMessage = (message: ChannelMessage) => {
		switch (message.code.number) {
			case ServerMessageCode.BlockOrder:
			case ServerMessageCode.BlockOrders:
				break;

			default:
				console.log("%c" + message.code.name, "color: pink", message.body);
				break;
		}
	}

	public run() {
		this.onResize();
		window.addEventListener("resize", this.onResize);

		this._frameDispatcher.run();
	}

	public update = (time: TimingEvent) => {

	}

	public draw = (time: TimingEvent) => {
		this._segmentRenderer.draw(time);
	}

	private onResize = () => {
		const size = new Size(
			Math.floor(window.innerWidth * window.devicePixelRatio),
			Math.floor(window.innerHeight * window.devicePixelRatio));

		this._segmentRenderer.onResize(size);
	}
}

// this should run in a Worker
//class MeshGenerator {
//}