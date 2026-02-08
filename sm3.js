"use strict";

const charset = '!\"#$%&\'()*+-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
const base = charset.length;

class SM3Mesh {
    constructor(obj) {
        this.data = { meshes: parseOBJ(obj)};
        console.log(this.data);
    }

    parseSM3(options) {
        console.log(options);

        let currentMaterial = null;
        let exported = [];

        let hasPos, hasTex, hasNorm = false;

        // parse meshes
        for (const name in this.data.meshes) {
            const mesh = this.data.meshes[name];

            // add mesh object
            exported.push("o");
            exported.push(name);

            // process vertices (v)
            if (options.parsePos && mesh.v) {
                hasPos = true;
                exported.push("v");
                for (const vertex of mesh.v) {
                    exported.push(vertex.map(v => parseFloat(v)).join(","));
                }
            }

            // process texture coordinates (vt)
            if (options.parseTex && mesh.vt) {
                hasTex = true;
                exported.push("vt");
                for (const texCoord of mesh.vt) {
                    const compressed = texCoord.map(v =>
                        compressInt(Math.floor(v * options.floatAcc))
                    );
                    exported.push(compressed.join(","));
                }
            }

            // process normals (vn)
            if (options.parseNorm && mesh.vn) {
                hasNorm = true;
                exported.push("vn");
                for (const normal of mesh.vn) {
                    const [x, y, z] = normal.map(v => parseFloat(v));
                    // convert normal to 2 angles compressed to int
                    const PI2 = 2 * Math.PI
                    const pitch = compressInt(Math.floor(((Math.atan2(x, z) / PI2) + 0.5) * options.floatAcc));
                    const yaw = compressInt(Math.floor(((Math.asin(y) / PI2) + 0.5) * options.floatAcc));
                    exported.push([pitch, yaw].join(","));
                }
            }

            // process faces (f)
            if (options.parseFaces && mesh.f) {
                for (const face of mesh.f) {
                    // parse the material if this one is different
                    if (face.material != currentMaterial) {
                        currentMaterial = face.material;
                        exported.push("usemtl");
                        exported.push(currentMaterial);
                        exported.push("f");
                    }

                    // add face indices
                    const indices = [];
                    for (const index of face.indices) {
                        if (index.v && hasPos) indices.push(compressInt(index.v));
                        if (index.vt && hasTex) indices.push(compressInt(index.vt));
                        if (index.vn && hasNorm) indices.push(compressInt(index.vn));
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
        const parts = line.split(" ");
        const cmd = parts.shift();

        switch (cmd) {
            case "o":
                currentObject = parts[0];
                data[currentObject] = { v: [], vt: [], vn: [], f: [] };
                break;
            case "v":
                state.hasPos = true;
                data[currentObject].v.push(parts.map(i => parseFloat(i)));
                break;
            case "vt":
                state.hasTex = true;
                data[currentObject].vt.push(parts.map(i => parseFloat(i)));
                break;
            case "vn":
                state.hasNorm = true;
                data[currentObject].vn.push(parts.map(i => parseFloat(i)));
                break;
            case "f":
                const face = { material: currentMaterial, indices: [] };
                parts.forEach(p => {
                    const [v, vt, vn] = p.split("/").map(n => parseInt(n));

                    let ind = {};
                    if (v && state.hasPos) ind.v = (v - 1); //position
                    if (vt && state.hasTex) ind.vt = (vt - 1); //texture
                    if (vn && state.hasNorm) ind.vn = (vn - 1); //normal
                    face.indices.push(ind);
                });
                data[currentObject].f.push(face)

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