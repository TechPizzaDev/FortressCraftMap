import ShaderDescription from "./ShaderDescription";

export default class VertexShaderDescription extends ShaderDescription {



	constructor(shaderSource: string) {
		super(shaderSource, ShaderType.Vertex);
		console.log(shaderSource);
	}

}