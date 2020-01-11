import GLResource from "../Graphics/GLResource";
import * as Content from "../Namespaces/Content";
import Texture2D from "../Graphics/Texture2D";
import Shader from "../Graphics/Shaders/Shader";
import { Web, Common } from "../Namespaces/Helper";
import ShaderProgram from "../Graphics/Shaders/ShaderProgram";
import * as msgpack5 from "msgpack5";
import { ShaderPath } from "../Namespaces/Content";

type ResourceIterator<T> = IterableIterator<[string, T]>;
type ResourceMap<T> = Array<[string, T]>;

/** Callback for a successful content load. */
export type LoadCallback = (content: Manager) => void;

/** Used for easier management of external content. */
export class Manager extends GLResource {

	private _resources = new Map<string, any>();
	private _msgPack: msgpack5.MessagePack;

	/**
	 * Constructs the manager.
	 * @param gl The GL context used for constructing GL resources.
	 */
	constructor(gl: WebGLRenderingContext) {
		super(gl);
		this._msgPack = msgpack5();
	}

	public has(name: string): boolean {
		this.assertNotDisposed();
		return this._resources.has(name);
	}

	public get(name: string): any {
		this.assertNotDisposed();
		return this._resources.get(name);
	}

	public getShader(name: string): ShaderProgram {
		const resource = this.get(`${ShaderPath}/${name}`);
		if (resource instanceof ShaderProgram)
			return resource;
		throw new Error(`Could not find shader program named '${name}'.`);
	}

	public getTexture2D(name: string): Texture2D {
		const resource = this.get(`${Content.getRootPath(Content.Type.Texture)}/${name}`);
		if (resource instanceof Texture2D)
			return resource;
		throw new Error(`Could not find texture named '${name}'.`);
	}

	public getMessagePack(name: string): any {
		const resource = this.get(`${Content.getRootPath(Content.Type.MessagePack)}/${name}`);
		if (resource == null)
			throw new Error(`Could not find message pack named '${name}'.`);
		return resource;
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
	): Promise<Content.DownloadStatus> {

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
		return downloadPromise.then(async (status) => {
			await Promise.all(decoderPromises);
			return status;
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
			const fragShaderPair = Manager.findShader(vertexName, ShaderType.Fragment, fragmentShaders);

			const program = new ShaderProgram(this.glContext);
			program.link(vertexShader, fragShaderPair[1]);
			
			this._resources.delete(vertexUri);
			this._resources.delete(fragShaderPair[0]);
			this._resources.set(`${ShaderPath}/${vertexName}`, program);
		}
	}

	private static findShader(
		name: string,
		type: ShaderType,
		map: ResourceMap<Shader>
	): [string, Shader] {
		for (const pair of map) {
			if (pair[1].type == type && Manager.getShaderName(pair[0], type) == name)
				return pair;
		}
		throw new Error(`Failed to find ${type.toLowerCase()} shader '${name}'.`);
	}

	public static getShaderName(uri: string, type: ShaderType): string {
		const root = type == ShaderType.Vertex
			? Content.getRootPath(Content.Type.VertexShader)
			: Content.getRootPath(Content.Type.FragmentShader);
		return Manager.getResourceName(uri, root);
	}

	public static getResourceName(uri: string, root: string) {
		return uri.substring(root.length + 1);
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

				case Content.Type.MessagePack:
					return this._msgPack.decode(data);

				default:
					throw new Error(`Failed to identify resource type from URI '${uri}'.`);
			}
		};
		const resource = await decode();

		// check state as decode may take a while
		this.assertNotDisposed();

		 // we don't want extensions to be a part of resource names
		const resourceUri = Common.changeExtension(uri, null);

		this._resources.set(resourceUri, resource);
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