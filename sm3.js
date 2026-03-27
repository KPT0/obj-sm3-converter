const charset = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ'
const DELIMETER =  "	";
const encoder = new TextEncoder();

const buffer = new ArrayBuffer(4);
const float = new Float32Array(buffer);
const int = new Uint32Array(buffer);

class ScratchMesh {
    constructor(obj) {
        this.header = { author: "KryptoScratcher", version: "1.3.0" };
        this.meshes = parseOBJ(obj);
    }

    toSM3(options) {
        console.log(options);

        let currentMaterial;
        let exported = [];

        exported.push("*");
        exported.push([
            "SM3",
            this.header.author,
            this.header.version, 
            options.floatAcc
        ].join(DELIMETER));
        
        // parse meshes
        for (const [name, mesh] of Object.entries(this.meshes)) {

            const vPosition = options.parsePos ? mesh.geometry.v : [];
            const vTexture = options.parseTex ? mesh.geometry.vt : [];
            const vNormal = options.parseNorm ? mesh.geometry.vn : [];
            const fFaces = options.parseFaces ? mesh.geometry.f : [];

            // add mesh object
            exported.push("o");
            exported.push(name);

            // process vertices (v)
            if (vPosition.length > 0) {
                exported.push("v");
                for (const vertex of vPosition) {
                    const floats = new Float32Array(vertex)
                    const bytes = Array.from(new Uint8Array(floats.buffer).map(byte => byte.toString(10)));
                    console.log(bytes);
                    exported.push(vertex.map(v => {
                        float[0] = v;
                        return compressInt(int[0]);
                    } ).join(DELIMETER));
                }
            }  

            // process texture coordinates (vt)
            if (vTexture.length > 0) {
                exported.push("vt");
                for (const texCoord of vTexture) {
                    const compressed = texCoord.map(v =>
                        compressInt(Math.floor(v * options.floatAcc))
                    );
                    exported.push(compressed.join(DELIMETER));
                }
            }

            // process normals (vn)
            if (vNormal.length > 0) {
                exported.push("vn");
                for (const normal of vNormal) {
                    const [x, y, z] = normal.map(v => parseFloat(v));
                    // convert normal to 2 angles compressed to int
                    const PI2 = 2 * Math.PI
                    const pitch = compressInt(Math.floor(((Math.atan2(x, z) / PI2) + 0.5) * options.floatAcc));
                    const yaw = compressInt(Math.floor(((Math.asin(y) / PI2) + 0.5) * options.floatAcc));
                    exported.push([pitch, yaw].join(DELIMETER));
                }
            }

            // process faces (f)
            if (fFaces.length > 0) {
                exported.push("f")
                for (const face of fFaces) {
                    // parse the material if this one is different
                    if (face.material !== currentMaterial) {
                        currentMaterial = face.material;
                        exported.push("usemtl");
                        exported.push(currentMaterial);
                        exported.push("f");
                    }

                    // add face indices
                    const indices = [];
                    for (const index of face.indices) {
                        if (vPosition.length > 0) indices.push(compressInt(index.v ?? 0));
                        if (vTexture.length > 0) indices.push(compressInt(index.vt ?? 0));
                        if (vNormal.length > 0) indices.push(compressInt(index.vn ?? 0));
                    }
                    exported.push(indices.join(DELIMETER));
                }
            }
        }

        exported.push("");
        return exported;
    }

    toSM3B(options) {
        let chunks = [];

        // header
        chunks.push(new Uint8Array(binString("SM3B")).buffer);
        chunks.push(new Uint8Array(binString(this.header.author)).buffer); // author
        chunks.push(new Uint8Array(binString(this.header.version)).buffer); // version

        // mesh count
        chunks.push(new Uint16Array([Object.keys(this.meshes).length]).buffer);
        for (const [meshName, mesh] of Object.entries(this.meshes)) {

            const vPosition = options.parsePos ? mesh.geometry.v : [];
            const vTexture = options.parseTex ? mesh.geometry.vt : [];
            const vNormal = options.parseNorm ? mesh.geometry.vn : [];
            const fFaces = options.parseFaces ? mesh.geometry.f : [];

            // mesh name
            chunks.push(new Uint8Array(binString(meshName)).buffer);

            // vertex positions
            chunks.push(new Uint32Array([vPosition.length]).buffer);
            if (vPosition.length > 0) {
                var vPool = [];
                for (const data of vPosition) {
                    vPool.push(...data);
                }
                chunks.push(new Float32Array(vPool).buffer);
            }

            // vertex texture coordinates
            chunks.push(new Uint32Array([vTexture.length]).buffer);
            if (vTexture.length > 0) {
                var vtPool = [];
                for (const data of vTexture) {
                    vtPool.push(...data);
                }
                chunks.push(new Float32Array(vtPool).buffer);
            }

            // vertex normals
            chunks.push(new Uint32Array([vNormal.length]).buffer);
            if (vNormal.length > 0) {
                var vnPool = [];
                for (const data of vNormal) {
                    vnPool.push(...data);
                }
                chunks.push(new Float32Array(vnPool).buffer);
            }


            // faces
            chunks.push(new Uint32Array([fFaces.length]).buffer);
            if (fFaces.length > 0) {
                for (const face of fFaces) {
                    chunks.push(new Uint8Array(face.material).buffer);
                    chunks.push(new Uint8Array([face.indices.length]).buffer);
                    var indices = [];
                    for (const ind of face.indices) {
                        if (vPosition.length > 0) indices.push(ind.v ?? 0);
                        if (vTexture.length > 0) indices.push(ind.vt ?? 0);
                        if (vNormal.length > 0) indices.push(ind.vn ?? 0);
                    }
                    chunks.push(new Uint32Array(indices).buffer);
                }
            }
        }

        // Combine all chunks
        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const result = new Uint8Array(totalSize);

        let offset = 0;
        for (const chunk of chunks) {
            result.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
        }
        return result.buffer;
    }
}

function parseOBJ(obj) {
    let data = {};
    let state = {};
    let currentObject = "";
    let currentMaterial;
    for (const line of obj) {
        const parts = line.split(/\s+/);
        const cmd = parts.shift();
        switch (cmd) {
            case "o":
                currentObject = parts.join(" ");
                data[currentObject] = { meta: {}, geometry: { v: [], vt: [], vn: [], f: [] } };
                break;
            case "v":
                data[currentObject].geometry.v.push(parts.map(i => parseFloat(i)));
                break;
            case "vt":
                data[currentObject].geometry.vt.push(parts.map(i => parseFloat(i)));
                break;
            case "vn":
                data[currentObject].geometry.vn.push(parts.map(i => parseFloat(i)));
                break;
            case "f":
                const face = { material: currentMaterial, indices: [] };
                parts.forEach(p => {
                    const [v, vt, vn] = p.split("/").map(n => parseInt(n));

                    let ind = {};
                    if (v && (data[currentObject].geometry.v.length > 0)) ind.v = (v - 1); //position
                    if (vt && (data[currentObject].geometry.vt.length > 0)) ind.vt = (vt - 1); //texture
                    if (vn && (data[currentObject].geometry.vn.length > 0)) ind.vn = (vn - 1); //normal
                    face.indices.push(ind);
                });
                data[currentObject].geometry.f.push(face)
                break;
            case "usemtl":
                currentMaterial = parts.join(" ");
                break;
        }

    }
    console.log(data);
    return data;
}

function parseMTL(mtl) {
    let data = {};
    let currentMaterial = null;
    for (const line of mtl) {
        const parts = line.split(" ");
        const cmd = parts.shift();

        switch (cmd) {
            case "newmtl":
                currentMaterial = parts.join(" ");
                data[currentMaterial] = {};
                break;
            case "Ns":
                data[currentMaterial].Ns = parseFloat(parts[0]);
                break;
            case "Ka":
                data[currentMaterial].Ka = parts.map(i => parseFloat(i));
                break;
            case "Kd":
                data[currentMaterial].Kd = parts.map(i => parseFloat(i));
                break;
            case "Ks":
                data[currentMaterial].Ks = parts.map(i => parseFloat(i));
                break;
            case "Ke":
                data[currentMaterial].Ke = parts.map(i => parseFloat(i));
                break;
            case "Ni":
                data[currentMaterial].Ni = parseFloat(parts[0]);
                break;
            case "d":
                data[currentMaterial].d = parseFloat(parts[0]);
                break;
            case "illum":
                data[currentMaterial].illum = parseFloat(parts[0]);
                break;
        }
    }
    return
}

function compressFixedInt(n, d) {
    n = parseInt(n);
    let result = "";
    for (let i = 0; i < d; i++) {
        result += charset[n % charset.length];
        n = Math.floor(n / charset.length);
    }
    return result;
}

function compressInt(n) {
    n = parseInt(n);
    if (n === 0) { return charset[0]; }
    let result = "";
    while (n > 0) {
        result += charset[n % charset.length];
        n = Math.floor(n / charset.length);
    }
    return result;
}

function binString(string) {
    const str = encoder.encode(string);
    return [str.length, ...str]
}