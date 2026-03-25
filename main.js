const element = (element) => document.getElementById(element);

function getMeshSettings() {
	return {
		floatAcc: (charset.length ** element("floatAcc").value) - 1,
		parseFaces: element("enableFaces").checked,
		parsePos: element("enablePos").checked,
		parseTex: element("enableTex").checked,
		parseNorm: element("enableNorm").checked
	}
}

function downloadFile(name, content) {
	const a = document.createElement("a");
	a.href = URL.createObjectURL(new Blob([content]));
	a.download = name;
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(a.href);
}

function downloadCanvas(name, content) {
	const a = document.createElement("a");
	a.href = content;
	a.download = name;
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(a.href);
}

var selectedMesh;

element("objFile").addEventListener("change", async function (event) {
	const file = element("objFile").files[0];
	if (!file) { alert("Error: No file chosen"); return; }

	const fileName = file.name;
	const fileContents = await file.text();

	selectedMesh = new ScratchMesh(fileContents.split("\n"));
});

element("downloadSM3").addEventListener("click", async function (event) {
	const file = element("objFile").files[0];
	if (!file) { alert("Error: No file chosen"); return; }

	const fileName = file.name;
	const fileContents = await file.text();

	const exportName = fileName.substring(0, fileName.lastIndexOf(".") + 1) + "sm3";

	downloadFile(exportName, selectedMesh.toSM3(getMeshSettings()).join("\n"));
});

element("downloadSM3B").addEventListener("click", async function (event) {
	const file = element("objFile").files[0];
	if (!file) { alert("Error: No file chosen"); return; }

	const fileName = file.name;
	const fileContents = await file.text();

	const exportName = fileName.substring(0, fileName.lastIndexOf(".") + 1) + "sm3b";

	const content = selectedMesh.toSM3B(getMeshSettings())
	// const content = (new Uint8Array(selectedMesh.toSM3B(getMeshSettings()))).toBase64();
	// const content = Array.from(new Uint8Array(selectedMesh.toSM3B(getMeshSettings())))
	//     .map(byte => byte.toString(10))
    // 	.join("\n");
	downloadFile(exportName, content);
})

element("downloadSM3I").addEventListener("click", async function (event) {
	const file = element("objFile").files[0];
	if (!file) { alert("Error: No file chosen"); return; }

	const fileName = file.name;
	const fileContents = await file.text();

	const exportName = fileName.substring(0, fileName.lastIndexOf(".") + 1) + "sm3i" + ".png";

	const bytes = new Uint8ClampedArray(selectedMesh.toSM3B(getMeshSettings()));

	const rBits = 8;
	const gBits = 8;
	const bBits = 8;
	const aBits = 8;

	const totalBits = rBits + gBits + bBits + aBits;

	const totalPixels = Math.ceil((bytes.length * 8) / totalBits);

	const img = {
		width: 960,
		height: Math.ceil(totalPixels / 960),
		data: bytes
	};

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	canvas.width = img.width;
	canvas.height = img.height;
	const imageData = ctx.createImageData(img.width, img.height);

	for (let i = 0; i < img.width * img.height; i++) {
		imageData.data[i * 4] = img.data[i * 3];
		imageData.data[i * 4 + 1] = img.data[i * 3 + 1];
		imageData.data[i * 4 + 2] = img.data[i * 3 + 2];
		imageData.data[i * 4 + 3] = 255;
	}

	ctx.putImageData(imageData, 0, 0);

	console.log(canvas);
	downloadCanvas(exportName, canvas.toDataURL("image/png"));
});