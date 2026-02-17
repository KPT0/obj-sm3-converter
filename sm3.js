const charset = '!\"#$%&\'()*+-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
const base = charset.length;

class ScratchMesh {
    constructor(obj) {
        this.meshes = parseOBJ(obj);
        this.header = { author: "KryptoScratcher", version: "1.0.0" };
    }

    toSM3(options) {
        console.log(options);

        let currentMaterial;
        let exported = [];

        exported.push("*");
        exported.push(options.floatAcc)
        for (const i in this.header) {
            exported.push(this.header[i]);
        }

        // parse meshes
        for (const name in this.meshes) {
            const mesh = this.meshes[name];

            // add mesh object
            exported.push("o");
            exported.push(name);

            // process vertices (v)
            if (options.parsePos && mesh.geometry.v.length > 0) {
                exported.push("v");
                for (const vertex of mesh.geometry.v) {
                    exported.push(vertex.map(v => parseFloat(v)).join(","));
                }
            }

            // process texture coordinates (vt)
            if (options.parseTex && mesh.geometry.vt.length > 0) {
                exported.push("vt");
                for (const texCoord of mesh.geometry.vt) {
                    const compressed = texCoord.map(v =>
                        compressInt(Math.floor(v * options.floatAcc))
                    );
                    exported.push(compressed.join(","));
                }
            }

            // process normals (vn)
            if (options.parseNorm && mesh.geometry.vn.length > 0) {
                exported.push("vn");
                for (const normal of mesh.geometry.vn) {
                    const [x, y, z] = normal.map(v => parseFloat(v));
                    // convert normal to 2 angles compressed to int
                    const PI2 = 2 * Math.PI
                    const pitch = compressInt(Math.floor(((Math.atan2(x, z) / PI2) + 0.5) * options.floatAcc));
                    const yaw = compressInt(Math.floor(((Math.asin(y) / PI2) + 0.5) * options.floatAcc));
                    exported.push([pitch, yaw].join(","));
                }
            }

            // process faces (f)
            if (options.parseFaces && mesh.geometry.f.length > 0) {
                exported.push("f")
                for (const face of mesh.geometry.f) {
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
                        if (index.v && (options.parsePos && mesh.geometry.v.length > 0)) indices.push(compressInt(index.v));
                        if (index.vt && (options.parseTex && mesh.geometry.vt.length > 0)) indices.push(compressInt(index.vt));
                        if (index.vn && (options.parseNorm && mesh.geometry.vn.length > 0)) indices.push(compressInt(index.vn));
                    }
                    exported.push(indices.join(","));
                }
            }
        }

        exported.push("");
        return exported;
    }

}

function parseOBJ(obj) {
    let data = {};
    let state = {};
    let currentObject = null;
    let currentMaterial = null;
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
        result += charset[n % base];
        n = Math.floor(n / base);
    }
    return result;
}

function compressInt(n) {
    n = parseInt(n);
    if (n === 0) { return charset[0]; }
    let result = "";
    while (n > 0) {
        result += charset[n % base];
        n = Math.floor(n / base);
    }
    return result;
}