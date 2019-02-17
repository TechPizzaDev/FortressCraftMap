"use strict";
const HTTP = require("http");
const FS = require("fs");
const PATH = require("path");

const port = process.env.PORT || 1337;

const mimeList = {
	".html": "text/html",
	".js": "application/javascript",
	".png": "image/png"
};

HTTP.createServer(serveResponse).listen(port);

function serveResponse(request, response) {
	try {
		if (request.url.startsWith("/randombuffer")) {
			serveRandomDataBuffer(request, response);
		}
		else {
			const path = serveFile(request, response);
			console.log(`"${request.url}" (${path})`);
		}
	}
	catch (err) {
		console.log(err);
	}
}

// serves 16*16 random numbers between 0 to 2 as (uint16) binary data
// 16*16 = one layer of an FCE segment
function serveRandomDataBuffer(request, response) {
	response.writeHead(200, { "Content-Type": "application/octet-stream" });

	const data = new Uint16Array(16 * 16);
	for (let i = 0; i < data.length; i++) {
		data[i] = Math.round(Math.random() * 2);
	}

	response.end(new Buffer(data.buffer));
}

function serveFile(request, response) {
	function endNotFound() {
		response.writeHead(404);
		response.end();
	}

	let path = request.url;
	if (path === "/")
		path = "/index.html";
	path = "./root" + path;
	
	FS.stat(path, (err, stats) => {
		if (err) {
			if (err.code === "ENOENT")
				endNotFound();
			else {
				response.writeHead(500);
				response.end("Error: " + err);
			}
		}
		else if (stats && stats.isFile()) {
			const mimeType = getMimeType(path);
			response.writeHead(200, { "Content-Type": mimeType });

			const fileStream = FS.createReadStream(path);
			fileStream.pipe(response, { end: true });
		}
		else
			endNotFound();
	});

	return path;
}

function getMimeType(path) {
	const extension = PATH.extname(path);
	const mimeType = mimeList[extension];
	if (mimeType)
		return mimeType;
	return "application/octet-stream";
}