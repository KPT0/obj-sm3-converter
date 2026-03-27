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

function chunkBits(uint8Array, channelBits) {
  const result = [];
  const totalBits = uint8Array.byteLength * 8;
  let bitPos = 0;
  let channelIndex = 0;

  while (bitPos < totalBits) {
    const width = channelBits[channelIndex % channelBits.length];
    let value = 0;

    for (let i = 0; i < width; i++) {
      value <<= 1;

      if (bitPos < totalBits) {
        const byteIndex = Math.floor(bitPos / 8);
        const bitOffset = 7 - (bitPos % 8);
        value |= (uint8Array[byteIndex] >> bitOffset) & 1;
      }

      bitPos++;
    }

    result.push(value);
    channelIndex++;
  }

  return result;
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

	const canvas = document.createElement("canvas");
	const bytes = new Uint8ClampedArray(selectedMesh.toSM3B(getMeshSettings()));
	bitsToImage(bytes, [5, 5, 4], 478, canvas);

	console.log(canvas);
	downloadCanvas(exportName, canvas.toDataURL("image/png"));
});

function bitsToImage(uint8Array, channelBits, maxWidth, canvas) {
  const bitsPerPixel = channelBits.reduce((a, b) => a + b, 0);
  const totalBits = uint8Array.byteLength * 8;
  const totalPixels = Math.floor(totalBits / bitsPerPixel);

  const width = Math.min(Math.ceil(Math.sqrt(totalPixels)), maxWidth);
  const height = Math.ceil(totalPixels / width);

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;

  const channels = chunkBits(uint8Array, channelBits);

  let maxR = 0;
  let maxG = 0;
  let maxB = 0;

  for (let i = 0; i < width * height; i++) {
    const r = channels[i * 3 + 0] ?? 0;
    const g = channels[i * 3 + 1] ?? 0;
    const b = channels[i * 3 + 2] ?? 0;
	if (r > maxR) { maxR = r; }
	if (g > maxG) { maxG = g; }
	if (b > maxB) { maxB = b; }

    const pixelIndex = i * 4;
    pixels[pixelIndex + 0] = Math.floor(r * (2 ** (8 - channelBits[0])));
    pixels[pixelIndex + 1] = Math.floor(g * (2 ** (8 - channelBits[1])));
    pixels[pixelIndex + 2] = Math.floor(b * (2 ** (8 - channelBits[2])));
    pixels[pixelIndex + 3] = 255;
  }
  console.log(maxR, maxG, maxB);

  ctx.putImageData(imageData, 0, 0);
}