import Mathx from "./Mathx";

/**
 * Time information used by frame dispatchers and renderers.
 * */
export default class TimeEvent {

	/** 
	 * The amount of seconds elapsed since the last frame.
	 * This can be large when a user leaves and comes back to the tab.
	 * */
	public animationDelta: number;

	/** The amount of seconds elapsed since the last frame, capped to a maximum of 200ms. */
	public delta: number;

	/** The amount of seconds elapsed since the frame dispatcher was started. */
	public runtime: number;

	/** The amount of seconds elapsed while the tab was focused since the frame dispatcher was started. */
	public total: number;

	constructor(animationDelta: number, runtime: number, total: number) {
		this.animationDelta = animationDelta;
		this.delta = Mathx.clamp(animationDelta, 0, 0.2);
		this.runtime = runtime;
		this.total = total;
	}
}