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
console.log("Listening on port " + port);

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
		endWithInternalError(response, err);
	}
}

function endWithInternalError(response, err) {
	console.log(err);
	response.writeHead(500);
	response.end();
}

function endWithBadRequest(response) {
	response.writeHead(400);
	response.end();
}

// serves 16*16 random numbers between 0 to 2 as (uint16) binary data
// serves 16*16 numbers based on passed position
// 16*16 = one layer of an FCE segment
function serveRandomDataBuffer(request, response) {
	streamToString(request).then((requestStr) => {
		try {
			let requestData;
			try {
				requestData = JSON.parse(requestStr);
			}
			catch (err) {
				endWithBadRequest(response);
				return;
			}

			const position = requestData.position;
			if (position && !isNaN(position.x) && !isNaN(position.y)) {
				response.writeHead(200, { "Content-Type": "application/octet-stream" });

				const value = (position.x + position.y) % 3;

				const data = new Uint16Array(16 * 16);
				for (let i = 0; i < data.length; i++) {
					//data[i] = Math.round(Math.random() * 2);
					data[i] = value;
				}
				response.end(new Buffer(data.buffer));
			}
			else {
				endWithBadRequest(response);
			}
		}
		catch (err) {
			endWithInternalError(response, err);
		}
	}).catch((err) => endWithInternalError(response, err));
}

function streamToString(stream, maxBytes) {
	const chunks = [];
	let bytesPulled = 0;

	if (!maxBytes)
		maxBytes = 1024 * 64;

	return new Promise((resolve, reject) => {
		stream.on('data', chunk => {
			bytesPulled += chunk.length;
			if (bytesPulled > maxBytes)
				reject("Request body exceeded size limit.");
			else
				chunks.push(chunk);
		});
		stream.on('error', reject);
		stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
	});
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