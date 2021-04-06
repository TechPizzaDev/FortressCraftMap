import MapSegmentRenderer from "../Graphics/Renderers/MapSegmentRenderer";
import TimeEvent from "../Utility/TimeEvent";
import FrameDispatcher from "../Utility/FrameDispatcher";
import AppContent from "../Content/AppContent";
import MapSegment, { MapSegmentPosition } from "./World/MapSegment";
import MapRenderSegment from "../Graphics/MapRenderSegment";
import FramesPerSecondCounter from "./FramesPerSecondCounter";
import ChannelSocket, { ChannelMessage } from "../Utility/ChannelSocket";
import Mathx from "../Utility/Mathx";
import { Rectangle } from "../Utility/Shapes";
import { vec2 } from "gl-matrix";
import * as jDataView from "jdataview";
import * as Content from "../Namespaces/Content";
import * as Debug from "./DebugInformation";
import { isElementVisible } from "./Index";

enum SegmentRequestPickingMethod {
	Simple,
	Nearest
}

/**
 * Loads components and handles document events (input, resizing).
 * */
export default class MainFrame {
	
	// TODO: make this detect device by user-agent or do some performance test
	public static readonly isWeakUserAgent = false;
	
	public readonly gl: WebGLRenderingContext;
	public readonly debugCanvas: CanvasRenderingContext2D;
	public readonly content: AppContent;

	private _frameDispatcher: FrameDispatcher;
	private _segmentRenderer: MapSegmentRenderer;
	private _fpsCounter: FramesPerSecondCounter;

	// move networking into a NetworkManager class
	private _mapChannel: ChannelSocket;

	private MaxSegmentRequestRate = 255;
	private MinSegmentRequestRate = 2;
	private TargetFps = MainFrame.isWeakUserAgent ? 58 : 55;
	private SegmentRequestWindingDuration = 0.25;
	private ViewCullDistance = 50; // 82
	
	private _segmentRequestWindup = MainFrame.isWeakUserAgent ? 0.1 : 0.2;
	private _requestIdleTime = 0;

	private _segmentRequestPickingMethod = SegmentRequestPickingMethod.Nearest;
	private _lastRequestPickingMethod = this._segmentRequestPickingMethod;

	private _segmentViewInterval = MainFrame.isWeakUserAgent ? (1 / 10) : (1 / 20);
	private _segmentViewTick = this._segmentViewInterval;
	private _cachedPosition = vec2.create();

	private _loadCenterPosition = vec2.create();
	
	// TODO: split up _segmentRequestQueue into smaller lists (array chunking)
	private _segmentRequestQueue: number[][] = [];

	private _segmentRequestBuffer: number[][] = [];
	private _segmentRequestedMap = new Map<number, Set<number>>();
	private _segmentLoadedMap = new Map<number, Set<number>>(); 

	private _debugInfoUpdateRate = 5;
	private _debugInfoUpdateTime = 0;
	private _debugInfoUpdateTick = 0;
	public _infrequentPendingDebugInfo: Debug.InfrequentInformation = Object.create(Debug.EmptySlow);
	public _frequentPendingDebugInfo: Debug.FrequentInformation = Object.create(Debug.EmptyFast);
	private _debugInfo: Debug.Information = Object.assign({}, Debug.Empty);
	private _debugInfoDiv: HTMLDivElement;
	private _debugFieldMap: Map<string, HTMLElement>;

	private userOffsetX = 0; // temporary thing

	constructor(
		gl: WebGLRenderingContext,
		debugCanvas: CanvasRenderingContext2D,
		onLoad?: Content.LoadCallback) {

		if (gl == null) throw new SyntaxError("'gl' is null.");
		if (debugCanvas == null) throw new SyntaxError("'debugCanvas' is null.");

		this.gl = gl;
		this.debugCanvas = debugCanvas;

		this._mapChannel = ChannelSocket.create("map", false);
		this._mapChannel.subscribeToEvent("ready", this.onMapChannelReady);
		this._mapChannel.subscribeToEvent("message", this.onMapChannelMessage);
		this._mapChannel.connect();

		this.content = new AppContent(this.gl, (manager) => this.contentLoadCallback(manager, onLoad));
		this._frameDispatcher = new FrameDispatcher(this.update, this.draw);
		this._segmentRenderer = new MapSegmentRenderer(this);

		this.setupDebugInfo();
	}

	private contentLoadCallback(manager: Content.Manager, onLoad?: Content.LoadCallback) {
		let prepareErrored = false;
		try {
			this._segmentRenderer.loadContent(manager);
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

	private setupDebugInfo() {
		const fpsCounterDiv = document.getElementById("fps-counter") as HTMLDivElement;
		const fpsCounterSpan = fpsCounterDiv.firstElementChild as HTMLSpanElement;
		this._fpsCounter = new FramesPerSecondCounter(fpsCounterSpan);

		this._debugFieldMap = new Map<string, HTMLElement>();
		this._debugInfoDiv = document.getElementById("debug-info") as HTMLDivElement;
		const debugFieldAttributeName = "data-debugfield";
		const debugFields = this._debugInfoDiv.querySelectorAll(`[${debugFieldAttributeName}]`);
		debugFields.forEach((debugField) => {
			const name = debugField.getAttribute(debugFieldAttributeName);
			this._debugFieldMap.set(name, debugField as HTMLElement);
		});
	}

	private onMapChannelReady = (ev: Event) => {
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
				const count = message.body.getUint8();
				for (let i = 0; i < count; i++)
					this.processSegmentMessage(message.body);
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

	private processSegmentMessage(message: jDataView) {
		const pos = MapSegmentPosition.read(message);
		const tiles = new Uint16Array(16 * 16);
		for (let i = 0; i < tiles.length; i++)
			tiles[i] = message.getUint16();
		const segment = new MapSegment(pos, tiles);
		
		let renderSegment = this._segmentRenderer.segments.get(pos.renderX, pos.renderZ);
		if (renderSegment == null) {
			renderSegment = new MapRenderSegment(this.gl, this._segmentRenderer.bakedSegmentQuads, pos);
			this._segmentRenderer.segments.set(pos.renderX, pos.renderZ, renderSegment);
		}

		//console.log(
		//	"got mesh [" + MapRenderSegment.createCoordKey(renderSegment.x, renderSegment.z) +
		//	"] for segment [" + MapRenderSegment.createCoordKey(pos.x, pos.z) + "]");

		renderSegment.setSegment(pos.x, pos.z, segment);
		this.getCoordMapRow(this._segmentLoadedMap, pos.x, pos.z).add(pos.x);
	}


	// TODO:
	// Create a sort of "priority list";
	// this list will contain list objects with a priority values
	// high priority is requested first, low priority last.
	// This will greatly improve performance in 'sendSegmentRequests' as
	// it won't need to pick requests for optimal visual quality, it will just
	// follow priorities, 'requestSegmentsInView' will determine the priorities instead.
	// This will not be as responsive as the current design, so think about when the
	// user moves the map above a certain length threshold, 
	// update request priorities based on a new distance.
	private requestSegmentsInView(time: TimeEvent) {

		const w = 32 // 118 / 4  //108 - 12 + 16 * 6; //66;
		const h = 32 // 57  / 4 // 48 + 16 * 3; //57;
		const halfW = w / 2;
		const halfH = h / 2;

		this.ViewCullDistance = Math.max(w * w, h * h);
		//const timeout = 2;

		const speedX = 0; // 120
		const speedZ = 2;
		const sizeZ = 0;

		const rawSegX = this.userOffsetX + time.total * speedX - halfW;
		const rawSegZ = Math.sin(time.total * speedZ) * sizeZ - halfH;
		const segX = Math.round(rawSegX);
		const segZ = Math.round(rawSegZ);
		
		this._segmentRenderer._mapTranslation[0] = (rawSegX + halfW) * -16;
		this._segmentRenderer._mapTranslation[1] = -8; //rawSegZ * -16;
		this._loadCenterPosition[0] = segX + halfW;
		this._loadCenterPosition[1] = segZ + halfH;

		for (let z = 0; z < h; z++) {
			for (let x = 0; x < w; x++) {
				const xx = x + segX;
				const zz = z + segZ;

				const row = this.getCoordMapRow(this._segmentRequestedMap, xx, zz);
				if (!row.has(xx)) {
					this._segmentRequestQueue.push([xx, zz]);
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
		// TODO: change cull method to viewport-based instead of range from center
		const cullDist = this.ViewCullDistance;
		const sqrCullDist = cullDist * cullDist;

		for (const [z, row] of this._segmentLoadedMap) {
			for (const x of row) {
				this._cachedPosition[0] = x + 0.5;
				this._cachedPosition[1] = z + 0.5;

				const dist = vec2.sqrDist(this._cachedPosition, this._loadCenterPosition);
				if (dist > sqrCullDist) {
					const rX = MapSegmentPosition.toRenderCoord(x);
					const rZ = MapSegmentPosition.toRenderCoord(z);
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

	private flushSegmentRequestBuffer() {
		if (this._segmentRequestBuffer.length == 0)
			return;
		if (this._segmentRequestBuffer.length > 255)
			throw new Error("Segment request buffer contains too many elements.");
		this._requestIdleTime = 0;

		while (this._segmentRequestBuffer.length > 0) {
			const toRequest = Math.min(this._segmentRequestBuffer.length, 255);
			if (toRequest == 1) {
				const msg = this._mapChannel.createMessage(ClientMessageCode.GetSegment, MapSegmentPosition.byteSize);
				new MapSegmentPosition(this._segmentRequestBuffer[0]).writeTo(msg);

				this._mapChannel.send(msg);
				this._segmentRequestBuffer.length = 0;
				break;
			}

			const positions = this._segmentRequestBuffer.splice(0, toRequest);
			const msg = this._mapChannel.createMessage(
				ClientMessageCode.GetSegmentBatch, 1 + MapSegmentPosition.byteSize * positions.length);

			msg.writeUint8(positions.length);
			for (let i = 0; i < positions.length; i++)
				new MapSegmentPosition(positions[i]).writeTo(msg);

			this._mapChannel.send(msg);
		}
	}

	private getCurrentRequestLimit(): number {
		// exponential windup is way better for weaker devices
		const amount = this._segmentRequestWindup * this._segmentRequestWindup;

		//MainFrame.isWeakUserAgent
		//	? this._segmentRequestWindup * this._segmentRequestWindup
		//	: this._segmentRequestWindup;

		return Math.round(Mathx.lerp(
			this.MinSegmentRequestRate, this.MaxSegmentRequestRate, amount));
	}



	private sendSegmentRequests() {

		this.updateSegmentRequestWindup();
		let requestLimit = this.getCurrentRequestLimit();

		//console.log(this._requestWindup + " | " + requestLimit + " | " + this._requestIdleTime);

		const cullDist = this.ViewCullDistance;
		const sqrCullDist = cullDist * cullDist;

		// adjust 'requestWindup' if the picking method changes so
		// a more expensive picking method doesn't overwhelm the client
		if (this._lastRequestPickingMethod != this._segmentRequestPickingMethod) {
			this._lastRequestPickingMethod = this._segmentRequestPickingMethod;
			this._segmentRequestWindup = Math.min(this._segmentRequestWindup, 0.25);
		}

		const simplePickingThresholdBase = MainFrame.isWeakUserAgent ? 4096 : 8192;
		// taking 'requestWindup' into consideration so weak devices get more processsing
		// for other things instead of sending massive requests
		const simplePickingThreshold = simplePickingThresholdBase * ((this._segmentRequestWindup + 1.0) / 2);

		while (this._segmentRequestQueue.length > 0 && requestLimit > 0) {
			let index = -1;
			if (this._segmentRequestPickingMethod == SegmentRequestPickingMethod.Simple) {
				// use simple queue priority; take out the most recently added request
				index = this._segmentRequestQueue.length - 1;
			}
			else if (this._segmentRequestPickingMethod == SegmentRequestPickingMethod.Nearest) {
				// picking requests closest to 'loadCenter' can get expensive if
				// the queue has a large backlog, use this method sparingly

				let lastSqrDist = Number.MAX_VALUE;
				for (let i = 0; i < this._segmentRequestQueue.length; i++) {
					const requestPos = this._segmentRequestQueue[i];
					this._cachedPosition[0] = requestPos[0] + 0.5;
					this._cachedPosition[1] = requestPos[1] + 0.5;

					// remove requests outside a certain range
					const sqrDist = vec2.sqrDist(this._cachedPosition, this._loadCenterPosition);
					if (sqrDist > sqrCullDist) {
						this._segmentRequestQueue.splice(i, 1);
						i--;
						continue;
					}

					if (sqrDist < lastSqrDist) {
						lastSqrDist = sqrDist;
						index = i;
					}
				}
			}
			else
				throw new Error("Unknown segment request picking method.");

			if (index == -1)
				break;

			const requestPos = this._segmentRequestQueue.splice(index, 1)[0];
			this._segmentRequestBuffer.push(requestPos);
			requestLimit--;

			this._infrequentPendingDebugInfo.segmentRequests++;
		}
		this.flushSegmentRequestBuffer();

		this._segmentRequestPickingMethod = this._segmentRequestQueue.length > simplePickingThreshold ? 0 : 1;
	}

	private updateSegmentRequestWindup() {
		const isIdle = this._requestIdleTime > this.SegmentRequestWindingDuration;
		if (!isIdle) {
			const changeMultiplier = MainFrame.isWeakUserAgent ? 0.75 : 1.25;
			const increaseWindup = this._fpsCounter.averageFps >= this.TargetFps;
			if (increaseWindup)
				this._segmentRequestWindup += this._segmentViewInterval * 0.1 * changeMultiplier;
			else
				this._segmentRequestWindup -= this._segmentViewInterval * 0.05 * changeMultiplier;
		}
		this._segmentRequestWindup = Mathx.clamp(this._segmentRequestWindup, 0, 1);
	}

	public update = (time: TimeEvent) => {
		this._fpsCounter.update(time);

		this._requestIdleTime += time.delta;

		if (this._mapChannel.isReady) {
			this.updateDebugInfoDelayed(time);

			this._segmentViewTick += time.delta;
			if (this._segmentViewTick >= this._segmentViewInterval) {
				this._segmentViewTick = 0;

				//console.time("requestSegmentsInView");
				this.requestSegmentsInView(time);
				//console.timeEnd("requestSegmentsInView");

				//console.time("cullVisibleSegments");
				this.cullVisibleSegments();
				//console.timeEnd("cullVisibleSegments");

				//console.time("sendSegmentRequests");
				this.sendSegmentRequests();
				//console.timeEnd("sendSegmentRequests");
			}
		}
	}

	public clearDebugInfo() {
		Object.assign(this._infrequentPendingDebugInfo, Debug.EmptySlow);
		Object.assign(this._frequentPendingDebugInfo, Debug.EmptyFast);
		Object.assign(this._debugInfo, Debug.Empty);
	}

	private updateDebugInfoDelayed(time: TimeEvent) {
		if (!isElementVisible(this._debugInfoDiv))
			return;

		this._debugInfoUpdateTime += time.delta;
		if (this._debugInfoUpdateTime >= 1 / this._debugInfoUpdateRate) {
			this._debugInfoUpdateTime = 0;
			this._debugInfoUpdateTick++;
			
			this.updateDebugInfo();
		}

		if (this._debugInfoUpdateTick >= this._debugInfoUpdateRate) {
			this._debugInfoUpdateTick = 0;
			Object.assign(this._debugInfo, this._infrequentPendingDebugInfo);
			Object.assign(this._infrequentPendingDebugInfo, Debug.EmptySlow);
		}
	}

	public updateDebugInfo() {
		const di = this._debugInfo;
		const sr = this._segmentRenderer;
		Object.assign(di, this._frequentPendingDebugInfo);
		Object.assign(this._frequentPendingDebugInfo, Debug.EmptyFast);

		const segmentHiddenDiff = sr.segments.segmentCount - sr.segmentsDrawnLastFrame;
		const renderSegmentHiddenDiff = sr.segments.count - sr.renderSegmentsDrawnLastFrame;
		const queuedRequests = this._segmentRequestQueue.length + this._segmentRequestBuffer.length;

		const setDebugFieldValue = (fieldName: string, value: string) => {
			const field = this._debugFieldMap.get(fieldName);
			if (field.textContent != value)
				field.textContent = value;
		};
		
		setDebugFieldValue("segments.queued", queuedRequests.toString());
		setDebugFieldValue("segments.updated", di.segmentsBuilt.toString());
		setDebugFieldValue("segments.loaded", sr.segments.segmentCount.toString());
		setDebugFieldValue("segments.requested", di.segmentRequests.toString());
		setDebugFieldValue("segments.visible", sr.segmentsDrawnLastFrame.toString());
		setDebugFieldValue("segments.hidden", segmentHiddenDiff.toString());

		setDebugFieldValue("segmentBatches.updated", di.segmentBatchesBuilt.toString());
		setDebugFieldValue("segmentBatches.loaded", sr.segments.count.toString());
		setDebugFieldValue("segmentBatches.visible", sr.renderSegmentsDrawnLastFrame.toString());
		setDebugFieldValue("segmentBatches.hidden", renderSegmentHiddenDiff.toString());

		const viewport = this._segmentRenderer.viewport;
		const requestLimit = this.getCurrentRequestLimit();

		setDebugFieldValue("viewport", `${viewport.width}x${viewport.height}`);
		setDebugFieldValue("requestWindup", `${(this._segmentRequestWindup * 100).toFixed(0)}% (${requestLimit})`);
	}

	public draw = (time: TimeEvent) => {
		this._fpsCounter.draw(time);
		this._segmentRenderer.draw(time);
	}

	/**
	 * The event triggered by a window resize. Use this to update viewports.
	 * */
	private onWindowResize = () => {
		const pixlRatio = window.devicePixelRatio || 1;
		const viewport = new Rectangle(
			0, 0,
			Math.floor(window.innerWidth * pixlRatio),
			Math.floor(window.innerHeight * pixlRatio));

		this.gl.canvas.width = viewport.width;
		this.gl.canvas.height = viewport.height;

		this.debugCanvas.canvas.width = viewport.width;
		this.debugCanvas.canvas.height = viewport.height;

		this._segmentRenderer.onViewportChanged(viewport);
	}
}