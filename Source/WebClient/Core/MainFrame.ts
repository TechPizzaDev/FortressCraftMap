import SegmentRenderer from "../Graphics/SegmentRenderer";
import ChannelSocket from "../Helpers/ChannelSocket";
import TimingEvent from "../Helpers/TimingEvent";
import { FrameDispatcher } from "../Helpers/FrameDispatcher";
import { Size } from "../Helpers/Size";
import { vec3 } from "gl-matrix";

export default class MainFrame {
	private _gl: GLContext;
	private _frameDispatcher: FrameDispatcher;
	private _segmentRenderer: SegmentRenderer;
	private _mapSocket: ChannelSocket;

	constructor(gl: GLContext) {
		if (!gl)
			throw new TypeError("GL Context is undefined.");

		this._gl = gl;
		this._frameDispatcher = new FrameDispatcher(this.update, this.draw);
		this._segmentRenderer = new SegmentRenderer(this);
		
		this._mapSocket = new ChannelSocket("map");
		this._mapSocket.subscribeToEvent("open", this.onMapSocketOpen);
		this._mapSocket.subscribeToEvent("message", this.onMapSocketMessage);
		this._mapSocket.connect();
	}

	public get gl(): GLContext {
		return this._gl;
	}

	private onMapSocketOpen = (ev: Event) => {
		console.log("Map socket open, sending hello");
		this._mapSocket.sendMessage("hello", "on you u smexy boi");
		this._mapSocket.sendMessage("GetSegment", { p: [0, 2] });
	}

	private onMapSocketMessage = (ev: MessageEvent) => {
		console.log(ev.data);


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