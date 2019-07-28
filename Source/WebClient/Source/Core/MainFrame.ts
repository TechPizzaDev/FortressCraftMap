import MapSegmentRenderer from "../Graphics/Renderers/MapSegmentRenderer";
import ChannelSocket, { ChannelMessage } from "../Utility/ChannelSocket";
import TimeEvent from "../Utility/TimeEvent";
import FrameDispatcher from "../Utility/FrameDispatcher";
import { Rectangle } from "../Utility/Shapes";
import AppContent from "../Content/AppContent";
import MapSegment, { MapSegmentPos } from "./World/MapSegment";
import * as Content from "../Namespaces/Content";
import RenderSegment from "../Graphics/RenderSegment";
import RenderSegmentCollection from "../Graphics/RenderSegmentCollection";

/**
 * Loads components and handles document events (input, resizing).
 * */
export default class MainFrame {
	private _glCtx: WebGLRenderingContext;
	private _drawCtx: CanvasRenderingContext2D;
	private _content: AppContent;
	private _frameDispatcher: FrameDispatcher;
	private _segmentRenderer: MapSegmentRenderer;

	// move networking into a NetworkManager class
	private _mapChannel: ChannelSocket;

	private _fpsAverage: number[] = [];
	private _fpsAverageIndex = 0;
	private _fpsAverageCount = 10;
	private _lastFps = -1;
	private _fpsUpdateTime = 0;
	private _fpsCounter: HTMLDivElement;
	private _fpsCounterSpan: HTMLSpanElement;

	constructor(glCtx: WebGLRenderingContext, drawCtx: CanvasRenderingContext2D, onLoad?: Content.LoadCallback) {
		if (glCtx == null)
			throw new TypeError("GL context is undefined.");
		if (drawCtx == null)
			throw new TypeError("GL context is undefined.");

		this._glCtx = glCtx;
		this._drawCtx = drawCtx;

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

		this._content = new AppContent(this._glCtx, loadCallback);
		this._frameDispatcher = new FrameDispatcher(this.update, this.draw);
		this._segmentRenderer = new MapSegmentRenderer(this);
		
		this._mapChannel = ChannelSocket.create("map", false);
		this._mapChannel.subscribeToEvent("ready", this.onMapChannelReady);
		this._mapChannel.subscribeToEvent("message", this.onMapChannelMessage);
		this._mapChannel.connect();

		this._fpsCounter = document.getElementById("fpsCounter") as HTMLDivElement;
		this._fpsCounterSpan = this._fpsCounter.firstChild as HTMLSpanElement;
	}

	public get glCtx(): WebGLRenderingContext {
		return this._glCtx;
	}

	public get drawCtx(): CanvasRenderingContext2D {
		return this._drawCtx;
	}

	public get content(): AppContent {
		return this._content;
	}

	private onMapChannelReady = (ev: Event) => {
		//this._mapChannel.sendMessage(ClientMessageCode.GetSegment, [0, -2]);
		//this._mapChannel.sendMessage(ClientMessageCode.GetSegment, [0, -1]);
		//this._mapChannel.sendMessage(ClientMessageCode.GetSegment, [0, 0]);
		//this._mapChannel.sendMessage(ClientMessageCode.GetSegment, [0, 1]);

		for (let z = 0; z < 40; z++) {
			for (let x = 0; x < 80; x++) {
				this._mapChannel.sendMessage(ClientMessageCode.GetSegment, [x - 40, z - 20]); //[x - 21, z - 21]);
			}
		}
	}

	private onMapChannelMessage = (message: ChannelMessage) => {
		switch (message.code.number) {
			case ServerMessageCode.BlockOrder:
			case ServerMessageCode.BlockOrders:
				// TODO FIXME
				break;

			case ServerMessageCode.Segment:
				const pos = new MapSegmentPos(message.body[0]);
				const tiles = new Uint16Array(message.body[1] as ArrayLike<number>);
				const segment = new MapSegment(pos, tiles);

				let renderSegment = this._segmentRenderer.renderSegments.get(pos);
				if (renderSegment == null) {
					renderSegment = new RenderSegment(this.glCtx, pos);
					this._segmentRenderer.renderSegments.set(renderSegment, pos);
				}

				//console.log(
				//	"got mesh [" + RenderSegment.createCoordKey(renderSegment.x, renderSegment.z) +
				//	"] for segment [" + RenderSegment.createCoordKey(pos.x, pos.z) + "]");

				renderSegment.setSegment(segment, pos);
				break;
		}
		//console.log("%c" + message.code.name, "color: pink", message.body);
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

	public update = (time: TimeEvent) => {

	}

	public draw = (time: TimeEvent) => {
		if (this._fpsCounterSpan)
			this.updateFpsCounter(time);
		this._segmentRenderer.draw(time);
	}

	private updateFpsCounter(time: TimeEvent) {
		this._fpsUpdateTime += time.delta;
		if (this._fpsUpdateTime >= 1 / this._fpsAverageCount) {
			this._fpsUpdateTime = 0;

			this._fpsAverage[this._fpsAverageIndex++] = 1 / time.delta;
			if (this._fpsAverageIndex >= this._fpsAverageCount)
				this._fpsAverageIndex = 0;

			const fpsSum = this._fpsAverage.reduce((p, c) => p + c);
			const fps = Math.round(fpsSum / this._fpsAverage.length);
			if (fps != this._lastFps) {
				this._fpsCounterSpan.textContent = fps.toString();
				this._lastFps = fps;
			}
		}
	}

	/**
	 * The event triggered by a window resize. Use this to update viewports.
	 * */
	private onWindowResize = () => {
		const dpr = window.devicePixelRatio || 1;
		const viewport = new Rectangle(
			0, 0,
			Math.floor(window.innerWidth * dpr),
			Math.floor(window.innerHeight * dpr));

		this.glCtx.canvas.width = viewport.width;
		this.glCtx.canvas.height = viewport.height;

		this._drawCtx.canvas.width = viewport.width;
		this._drawCtx.canvas.height = viewport.height;

		this._segmentRenderer.onViewportChanged(viewport);
	}
}