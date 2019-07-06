import GLResource from "../../Graphics/GLResource";
import * as Content from "../Content";
import Texture2D from "../../Graphics/Texture2D";
import Shader from "../../Graphics/Shaders/Shader";
import { Web, Common } from "../../Utility/Helper";

/** Used for easier management of external content. */
export class Manager extends GLResource {

	private _resources = new Map<string, object>();

	/**
	 * Constructs the manager.
	 * @param gl The GL context used for constructing GL resources.
	 */
	constructor(gl: WebGLRenderingContext) {
		super(gl);
	}

	public has(name: string): boolean {
		this.assertNotDisposed();
		return this._resources.has(name);
	}

	public get(name: string): object {
		this.assertNotDisposed();
		return this._resources.get(name);
	}

	/**
	 * Downloads given content list to this manager.
	 * @param list The list to download.
	 * @param onProgress Callback that gives access to download statistics.
	 * @returns Promise that resolves into the amount of successfully downloaded resources.
	 */
	public async downloadAsync(
		list: Content.List,
		onDownload?: (uri: string) => void,
		onProgress?: Content.StatusCallback
	): Promise<number> {
		this.assertNotDisposed();
		const decoderPromises = new Array<Promise<void>>();

		const downloadCallback = (uri: string, response: Web.HttpResponse) => {
			if (response.isFailure)
				throw new Error(`Failed to download '${uri}'.`);

			if (onDownload)
				onDownload(uri);

			decoderPromises.push(this.decodeResource(uri, response.data));
		};

		const downloadPromise = list.downloadAsync(downloadCallback, onProgress);
		return downloadPromise.then(async (value) => {
			await Promise.all(decoderPromises);
			return value;
		});
	}

	/** Links shader pairs of the same name into shader programs. */
	public linkShaderPairs() {
		const resourcePairs = this._resources.entries();
		const vertexShaders = Manager.filterShaders(resourcePairs, ShaderType.Vertex);
		const fragmentShaders = Manager.filterShaders(resourcePairs, ShaderType.Fragment);

		// find the pairs by name and type
		for (const [vertexUri, vertexShader] of vertexShaders) {
			const vertexName = Manager.getShaderName(vertexUri, ShaderType.Vertex);

			for (const [fragUri, fragShader] of fragmentShaders) {
				const fragName = Manager.getShaderName(fragUri, ShaderType.Fragment);
			}

			console.log(vertexName);
		}
	}

	public static getShaderName(uri: string, type: ShaderType): string {
		const root = type == ShaderType.Vertex ? Content.VertexShaderPath : Content.FragmentShaderPath;
		const nameWithExtension = uri.substring(root.length + 1);
		return Common.changeExtension(nameWithExtension, null);
	}

	private static filterShaders(
		pairs: IterableIterator<[string, object]>,
		type: ShaderType
	): Array<[string, Shader]> {
		const shaders = new Array<[string, Shader]>();
		for (const [uri, resource] of pairs) {
			if (resource instanceof Shader && resource.type == type)
				shaders.push([uri, resource]);
		}
		return shaders;
	}

	private async decodeResource(uri: string, data: any) {
		let resource: any;
		if (uri.startsWith(Content.TexturePath)) {
			resource = await this.decodeTexture(data);
		}
		else if (uri.startsWith(Content.VertexShaderPath)) {
			resource = await this.decodeShader(data, ShaderType.Vertex);
		}
		else if (uri.startsWith(Content.FragmentShaderPath)) {
			resource = await this.decodeShader(data, ShaderType.Fragment);
		}
		else
			throw new Error(`Failed to identify type of '${uri}'.`);

		this.assertNotDisposed();
		this._resources.set(uri, resource);
	}

	private async decodeTexture(data: ImageBitmapSource) {
		const bitmap = await createImageBitmap(data);
		try {
			const texture = new Texture2D(this.glContext, bitmap.width, bitmap.height);
			texture.setData(bitmap);
			return texture;
		}
		finally {
			bitmap.close();
		}
	}

	private async decodeShader(data: string, type: ShaderType) {
		const shader = new Shader(this.glContext, type);
		shader.compile(data);
		return shader;
	}

	/** 
	 * Disposes GL resources and removes all stored resources.
	 * Content needs to be downloaded again after an unload.
	 */
	public unload() {
		for (const resource of this._resources.values())
			if (resource instanceof GLResource)
				resource.dispose();
		this._resources.clear();
	}

	protected destroy() {
		this.unload();
	}
}