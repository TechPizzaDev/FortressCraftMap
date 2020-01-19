import TimeEvent from "../../Utility/TimeEvent";
import { Rectangle } from "../../Utility/Shapes";
import GLResource from "../GLResource";
import * as Content from "../../Namespaces/Content";

/**
 * The base for various renderers.
 * */
export default abstract class RendererBase extends GLResource {

	/**
	 * Constructs the renderer.
	 * @param gl The GL context.
	 */
	constructor(gl: WebGLRenderingContext) {
		super(gl);
	}

	/**
	 * Used to prepare data needed for rendering.
	 * @param content The manager used to get loaded content.
	 */
	public abstract loadContent(content: Content.Manager): void;

	/**
	 * Called every time the viewport is changed.
	 * @param rectangle The new viewport.
	 */
	public abstract onViewportChanged(rectangle: Rectangle): void;

	/**
	 * Called for every frame. Not called if the browser tab is not visible.
	 * @param time The time information for the current frame.
	 */
	public abstract draw(time: TimeEvent): void;
}