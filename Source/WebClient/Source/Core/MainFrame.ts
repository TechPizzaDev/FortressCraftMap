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
import * as Debug from "./DebugInformation";

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

	private MaxSegmentRequestsPerFlush = 64;

	private _fpsAverage: number[] = [];
	private _fpsAverageIndex = 0;
	private _fpsAverageCount = 10;
	private _lastFps = -1;
	private _fpsUpdateTime = 0;
	private _fpsCounterDiv: HTMLDivElement;
	private _fpsCounterSpan: HTMLSpanElement;

	private static readonly SegmentViewInterval = 1 / 60;
	private _segmentViewTick = MainFrame.SegmentViewInterval;
	private _tmpPos = vec2.create();

	private _debugInfoUpdateTime = 0;
	private _debugInfoUpdateTick = 0;
	public _slowPendingDebugInfo: Debug.SlowInformation = Object.create(Debug.EmptySlow);
	public _fastPendingDebugInfo: Debug.FastInformation = Object.create(Debug.EmptyFast);
	private _debugInfo: Debug.Information = Object.assign({}, Debug.Empty);
	private _debugInfoDiv: HTMLDivElement;
	private _debugInfoSegmentTable: HTMLTableElement;
	
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

		this._fpsCounterDiv = document.getElementById("fpsCounter") as HTMLDivElement;
		this._fpsCounterSpan = this._fpsCounterDiv.firstElementChild as HTMLSpanElement;

		this._debugInfoDiv = document.getElementById("debugInfo") as HTMLDivElement;
		this._debugInfoSegmentTable = this._debugInfoDiv.children.item(0) as HTMLTableElement;
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
	private _requestList: number[][] = [];
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
			case ServerMessageCode.BlockOrderBatch:
				// TODO implement this
				break;

			case ServerMessageCode.Segment:
				this.processSegmentMessage(message.body);
				break;

			case ServerMessageCode.SegmentBatch:
				for (const body of message.body)
					this.processSegmentMessage(body);
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

	private processSegmentMessage(body: any) {
		const pos = new MapSegmentPos(body[0]);
		const tiles = new Uint16Array(body[1] as ArrayLike<number>);
		const segment = new MapSegment(pos, tiles);

		let renderSegment = this._segmentRenderer.segments.get(pos.rX, pos.rZ);
		if (renderSegment == null) {
			renderSegment = new RenderSegment(this.glCtx, pos);
			this._segmentRenderer.segments.set(pos.rX, pos.rZ, renderSegment);
		}

		//console.log(
		//	"got mesh [" + RenderSegment.createCoordKey(renderSegment.x, renderSegment.z) +
		//	"] for segment [" + RenderSegment.createCoordKey(pos.x, pos.z) + "]");

		renderSegment.setSegment(pos.x, pos.z, segment);
		this.getCoordMapRow(this._segmentLoadedMap, pos.x, pos.z).add(pos.x);
	}

	private requestSegmentsInView(time: TimeEvent) {
		const w = 12; //48;
		const h = 32; //24;
		const halfW = w / 2;
		const halfH = h / 2;
		//const timeout = 2;

		const speedX = 16;
		const speedY = 4;
		const sizeY = 24;

		const rawSegX = time.total * speedX - halfW;
		const rawSegY = Math.sin(time.total * speedY) * sizeY - halfH;
		const segX = Math.round(rawSegX);
		const segY = Math.round(rawSegY);

		this._segmentRenderer._mapTranslation[0] = rawSegX * -16;
		this._segmentRenderer._mapTranslation[1] = 0; //rawSegY * -16;
		this.loadCenter[0] = segX + halfW;
		this.loadCenter[1] = segY + halfH;

		for (let z = 0; z < h; z++) {
			for (let x = 0; x < w; x++) {
				const xx = x + segX;
				const zz = z + segY;

				const row = this.getCoordMapRow(this._segmentRequestedMap, xx, zz);
				if (!row.has(xx)) {
					this._requestList.push([xx, zz]);
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

	private cullVisibleSegments() {
		for (const [z, row] of this._segmentLoadedMap) {
			for (const x of row) {
				this._tmpPos[0] = x;
				this._tmpPos[1] = z;

				const maxDist = 64;
				const dist = vec2.sqrDist(this._tmpPos, this.loadCenter);
				if (dist > maxDist * maxDist) {
					const rX = MapSegmentPos.toRenderCoord(x);
					const rZ = MapSegmentPos.toRenderCoord(z);
					const renderSeg = this._segmentRenderer.segments.get(rX, rZ);
					if (renderSeg != null) {
						renderSeg.setSegment(x, z, null);
						row.delete(x);

						if (renderSeg.segmentCount == 0)
							this._segmentRenderer.segments.delete(rX, rZ);
					}
				}
			}
		}
	}

	private _segmentRequestBuffer: number[][] = [];

	private flushSegmentRequestBuffer() {
		if (this._segmentRequestBuffer.length == 0)
			return;

		while (this._segmentRequestBuffer.length > 0) {
			const toRequest = Math.min(this._segmentRequestBuffer.length, this.MaxSegmentRequestsPerFlush);
			if (toRequest == 1) {

				this._mapChannel.sendMessage(ClientMessageCode.GetSegment, this._segmentRequestBuffer[0]);
				this._segmentRequestBuffer.length = 0;
				break;
			}

			const requestPositions = this._segmentRequestBuffer.splice(0, toRequest);
			this._mapChannel.sendMessage(ClientMessageCode.GetSegmentBatch, requestPositions);
		}
	}

	private processSegmentRequestQueue() {
		let limit = 800;
		while (this._requestList.length > 0 && limit > 0) {
			let index = -1;
			let lastDist = Number.MAX_VALUE;
			for (let i = 0; i < this._requestList.length; i++) {
				const currentPos = this._requestList[i];
				this._tmpPos[0] = currentPos[0] + 0.5;
				this._tmpPos[1] = currentPos[1] + 0.5;

				const currentDist = vec2.sqrDist(this._tmpPos, this.loadCenter);

				const discardDist = 256;
				if (currentDist > discardDist * discardDist) {
					this._requestList.splice(i, 1);
					i--;
					continue;
				}

				if (currentDist < lastDist) {
					lastDist = currentDist;
					index = i;
				}
			}

			if (index != -1) {
				const requestPos = this._requestList.splice(index, 1)[0];
				this._segmentRequestBuffer.push(requestPos);
				limit--;

				if (this._segmentRequestBuffer.length >= this.MaxSegmentRequestsPerFlush)
					this.flushSegmentRequestBuffer();

				this._slowPendingDebugInfo.segmentRequests++;
			}
		}
		this.flushSegmentRequestBuffer();
	}

	public update = (time: TimeEvent) => {
		if (this._mapChannel.isReady) {
			this.updateDebugInfo(time);

			this._segmentViewTick += time.delta;
			//if (this._segmentViewTick >= MainFrame.SegmentViewInterval) 
			{
				this._segmentViewTick = 0;

				this.cullVisibleSegments();
				this.requestSegmentsInView(time);
			}

			this.processSegmentRequestQueue();
		}
	}

	public clearDebugInfo() {
		Object.assign(this._slowPendingDebugInfo, Debug.EmptySlow);
		Object.assign(this._fastPendingDebugInfo, Debug.EmptyFast);
		Object.assign(this._debugInfo, Debug.Empty);
	}

	public updateDebugInfo(time: TimeEvent, force: boolean = false) {
		if (this._debugInfoDiv.classList.contains("hidden"))
			return;

		if (this._debugInfoUpdateTick >= 5) {
			this._debugInfoUpdateTick = 0;
			Object.assign(this._debugInfo, this._slowPendingDebugInfo);
			Object.assign(this._slowPendingDebugInfo, Debug.EmptySlow);
		}

		this._debugInfoUpdateTime += force ? 0 : time.delta;
		if (this._debugInfoUpdateTime >= 0.25 || force) {
			this._debugInfoUpdateTime = 0;
			this._debugInfoUpdateTick++;

			const di = this._debugInfo;
			const sr = this._segmentRenderer;
			Object.assign(di, this._fastPendingDebugInfo);
			Object.assign(this._fastPendingDebugInfo, Debug.EmptyFast);

			const segmentHiddenDiff =
				sr.segments.segmentCount -
				sr.segmentsDrawnLastFrame;

			const renderSegmentHiddenDiff =
				sr.segments.count -
				sr.renderSegmentsDrawnLastFrame;

			this._debugInfoSegmentTable.innerHTML = `
				<tr>
				    <th></th>
				    <th>Segments</th>
				    <th>Batches</th>
				</tr>
				<tr>
					<td>Requested:</td>
					<td>${di.segmentRequests}</td>
					<td></td>
				</tr>
				<tr>
					<td>Loaded:</td>
					<td>${sr.segments.segmentCount}</td>
					<td>${sr.segments.count}</td>
				</tr>
				<tr>
					<td>Updated:</td>
					<td>${di.segmentsBuilt}</td>
					<td>${di.segmentBatchesBuilt}</td>
				</tr>
				<tr>
					<td>Visible:</td>
					<td>${sr.segmentsDrawnLastFrame}</td>
					<td>${sr.renderSegmentsDrawnLastFrame}</td>
				</tr>
				<tr>
					<td>Hidden:</td>
					<td>${segmentHiddenDiff}</td>
					<td>${renderSegmentHiddenDiff}</td>
				</tr>`;
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