import GLResource from "../Graphics/GLResource";
import * as Content from "../Namespaces/Content";
import Texture2D from "../Graphics/Texture2D";
import Shader from "../Graphics/Shaders/Shader";
import { Web, Common } from "../Namespaces/Helper";
import ShaderProgram from "../Graphics/Shaders/ShaderProgram";
import ShaderDescription from "../Graphics/Shaders/ShaderDescription";

type ResourceIterator<T> = IterableIterator<[string, T]>;
type ResourceMap<T> = Array<[string, T]>;

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
		const vertexShaders = Manager.filterShaders(this._resources.entries(), ShaderType.Vertex);
		const fragmentShaders = Manager.filterShaders(this._resources.entries(), ShaderType.Fragment);

		if (vertexShaders.length != fragmentShaders.length)
			throw new Error("The amount of vertex and fragment shaders was not equal.");

		// find the shader pairs by vertex shader name
		for (const [vertexUri, vertexShader] of vertexShaders) {
			const vertexName = Manager.getShaderName(vertexUri, ShaderType.Vertex);
			const fragmentShader = Manager.findShader(vertexName, ShaderType.Fragment, fragmentShaders);

			const program = new ShaderProgram(this.glContext);
			program.link(vertexShader, fragmentShader);

			console.log(vertexName, program);
		}
	}

	private static findShader(name: string, type: ShaderType, map: ResourceMap<Shader>): Shader {
		for (const [shaderUri, shader] of map) {
			if (shader.type == type && Manager.getShaderName(shaderUri, type) == name)
				return shader;
		}
		throw new Error(`Failed to find ${type.toLowerCase()} shader '${name}'.`);
	}

	public static getShaderName(uri: string, type: ShaderType): string {
		const root = type == ShaderType.Vertex
			? Content.getPath(Content.Type.VertexShader)
			: Content.getPath(Content.Type.FragmentShader);
		return Manager.getResourceName(uri, root);
	}

	public static getResourceName(uri: string, root: string) {
		const nameWithExtension = uri.substring(root.length + 1);
		return Common.changeExtension(nameWithExtension, null);
	}

	private static filterShaderDescriptions(
		map: ResourceIterator<object>
	): ResourceMap<ShaderDescription> {
		const descriptions = new Array<[string, ShaderDescription]>();
		for (const [uri, resource] of map) {
			if (resource instanceof ShaderDescription)
				descriptions.push([uri, resource]);
		}
		return descriptions;
	}

	private static filterShaders(
		map: ResourceIterator<object>,
		type: ShaderType
	): ResourceMap<Shader> {
		const shaders = new Array<[string, Shader]>();
		for (const [uri, resource] of map) {
			if (resource instanceof Shader && resource.type == type)
				shaders.push([uri, resource]);
		}
		return shaders;
	}

	private async decodeResource(uri: string, data: any) {
		const decode = async () => {
			switch (Content.getType(uri)) {
				case Content.Type.Texture:
					return await this.decodeTexture(data);

				case Content.Type.VertexShader:
					return this.decodeShader(data, ShaderType.Vertex);

				case Content.Type.FragmentShader:
					return this.decodeShader(data, ShaderType.Fragment);

				default:
					throw new Error(`Failed to identify resource type from URI '${uri}'.`);
			}
		};
		const resource = await decode();

		// check state as decode may take a while
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

	private decodeShader(data: string, type: ShaderType) {
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