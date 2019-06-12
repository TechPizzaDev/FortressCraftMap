import Texture2D from "./Texture2D";

export default class TextureImage2D extends Texture2D {
	private _isLoaded: boolean;

	constructor(gl: GLContext) {
		super(gl);
	}

	public get isLoaded(): boolean {
		return this._isLoaded;
	}

	public load(url: string) {

	}
}