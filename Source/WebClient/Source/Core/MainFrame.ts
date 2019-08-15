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
import { vec2 } from "gl-matrix";

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

	private static readonly SegmentViewInterval = 1 / 60;
	private _segmentViewTick = MainFrame.SegmentViewInterval;

	constructor(glCtx: WebGLRenderingContext, drawCtx: CanvasRenderingContext2D, onLoad?: Content.LoadCallback) {
		if (glCtx == null) throw new TypeError("GL context is undefined.");
		if (drawCtx == null) throw new TypeError("Canvas rendering context is undefined.");

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
		this._fpsCounterSpan = this._fpsCounter.firstElementChild as HTMLSpanElement;
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

	private loadCenter = [0, 0];
	private requestList: number[][] = [];
	private _segmentRequestedMap = new Map<number, Set<number>>();
	private _segmentLoadedMap = new Map<number, Set<number>>(); 

	private onMapChannelReady = (ev: Event) => {
		//this._mapChannel.sendMessage(ClientMessageCode.GetSegment, [0, -2]);
		//this._mapChannel.sendMessage(ClientMessageCode.GetSegment, [0, -1]);
		//this._mapChannel.sendMessage(ClientMessageCode.GetSegment, [0, 0]);
		//this._mapChannel.sendMessage(ClientMessageCode.GetSegment, [0, 1]);
	}

	private onMapChannelMessage = (message: ChannelMessage) => {
		switch (message.code.number) {
			case ServerMessageCode.BlockOrder:
			case ServerMessageCode.BlockOrders:
				// TODO implement this
				break;

			case ServerMessageCode.Segment:
				const pos = new MapSegmentPos(message.body[0]);
				const tiles = new Uint16Array(message.body[1] as ArrayLike<number>);
				const segment = new MapSegment(pos, tiles);

				let renderSegment = this._segmentRenderer.renderSegments.get(pos.rX, pos.rZ);
				if (renderSegment == null) {
					renderSegment = new RenderSegment(this.glCtx, pos);
					this._segmentRenderer.renderSegments.set(pos.rX, pos.rZ, renderSegment);
				}

				//console.log(
				//	"got mesh [" + RenderSegment.createCoordKey(renderSegment.x, renderSegment.z) +
				//	"] for segment [" + RenderSegment.createCoordKey(pos.x, pos.z) + "]");

				renderSegment.setSegment(pos.x, pos.z, segment);
				this.getCoordMapRow(this._segmentLoadedMap, pos.x, pos.z).add(pos.x);
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

	private requestSegmentsInView(time: TimeEvent) {
		const w = 24; //48;
		const h = 24; //24;
		const hw = Math.round(w / 2);
		const hh = Math.round(h / 2);
		//const timeout = 2;

		const speedX = 40;
		const speedY = 1;
		const sizeY = 38;

		const segX = Math.round(time.total * speedX + 0.5) - hw;
		const segY = Math.round(Math.sin(time.total * speedY) * sizeY + 0.5) - hh;

		this._segmentRenderer._mapTranslation[0] = segX * -16;
		this.loadCenter[0] = segX + hw;
		this.loadCenter[1] = segY + hh;

		for (let z = 0; z < h; z++) {
			for (let x = 0; x < w; x++) {
				const xx = x + segX;
				const zz = z + segY;

				const row = this.getCoordMapRow(this._segmentRequestedMap, xx, zz);
				if (!row.has(xx)) {
					this.requestList.push([xx, zz]);
					row.add(xx);
				}

				//window.setTimeout(() => {
				//}, (1 + x + z * h) * timeout);
			}
		}
	}

	private getCoordMapRow(coordMap: Map<number, Set<number>>, x: number, z: number): Set<number> {
		let row: Set<number>;
		if (!coordMap.has(z)) {
			row = new Set();
			coordMap.set(z, row);
		}
		else {
			row = coordMap.get(z);
		}
		return row;
	}

	private cullSegmentsInView() {
		const tmpPos = vec2.create();
		for (const [z, row] of this._segmentLoadedMap) {
			for (const x of row) {
				tmpPos[0] = x;
				tmpPos[1] = z;

				const maxDist = 128;
				const dist = vec2.sqrDist(tmpPos, this.loadCenter);
				if (dist > maxDist * maxDist) {
					const rX = MapSegmentPos.toRenderCoord(x);
					const rZ = MapSegmentPos.toRenderCoord(z);
					const renderSeg = this._segmentRenderer.renderSegments.get(rX, rZ);
					if (renderSeg != null) {
						renderSeg.setSegment(x, z, null);
						row.delete(x);

						if (renderSeg.segmentCount == 0)
							this._segmentRenderer.renderSegments.delete(rX, rZ);
					}
				}
			}
		}
	}

	private processSegmentRequestQueue() {
		let limit = 64;
		while (this.requestList.length > 0 && limit > 0) {
			let index = 0;
			let lastDist = Number.MAX_VALUE;
			for (let i = 0; i < this.requestList.length; i++) {
				const currentPos = this.requestList[i];
				const offsetedPos = [...currentPos];
				offsetedPos[0] += 0.5;
				offsetedPos[1] += 0.5;

				const currentDist = vec2.sqrDist(offsetedPos, this.loadCenter);
				if (currentDist < lastDist) {
					lastDist = currentDist;
					index = i;
				}
			}

			const requestPos = this.requestList.splice(index, 1)[0];
			this._mapChannel.sendMessage(ClientMessageCode.GetSegment, requestPos);
			limit--;
		}
	}

	public update = (time: TimeEvent) => {
		if (this._mapChannel.isReady) {
			this._segmentViewTick += time.delta;
			if (this._segmentViewTick > MainFrame.SegmentViewInterval) {
				this._segmentViewTick = 0;

				this.cullSegmentsInView();
				this.requestSegmentsInView(time);
			}

			this.processSegmentRequestQueue();
		}
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