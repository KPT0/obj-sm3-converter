const version = "1.0.0";

const element = (element) => document.getElementById(element);

const objFile = document.getElementById("objFile");
const canvas = document.getElementById('canvas');
const versionNum = document.getElementById('versionNum');
// element("versionNum").textContent = version;

function getMeshSettings() {
	return {
		version: version,
		floatAcc: (2 ** (element('floatAcc').value)) - 1,
		parseFaces: element('enableFaces').checked,
		parsePos: element('enablePos').checked,
		parseTex: element('enableTex').checked,
		parseNorm: element('enableNorm').checked
	}
}

element("objFile").addEventListener("change", async function (event) {
	const file = event.files[0];
	const fileContents = file.text();
});

element("downloadSM3").addEventListener("click", async function (event) {
	const file = element("objFile").files[0];
	if (!file) { alert('Error: No file chosen'); return; }

	const fileName = file.name;
	const fileContents = await file.text();

	const dotIndex = fileName.lastIndexOf(".");
	const exportName = fileName.substring(0, dotIndex) + ".sm3";
	const SM3 = new ScratchMesh(fileContents.split("\n"));
	downloadFile(exportName, SM3.toSM3(getMeshSettings()).join("\n"));
});

function downloadFile(name, content) {
	const a = document.createElement("a");
	a.href = URL.createObjectURL(new Blob([content]));
	a.download = name;
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(a.href);
}