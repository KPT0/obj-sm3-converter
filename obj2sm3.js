const charset = '!\"#$%&\'()*+-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
const base = charset.length;

function convertOBJtoSM3(obj, floatAcc, parsePos, parseTex, parseNorm) {
    const state = {
        accuracy: (base ** floatAcc) - 1,
        currentMaterial: "",
        hasPos: false,
        hasTex: false,
        hasNorm: false
    };
    const blackList = [
        parsePos ? null : "v",
        parseTex ? null : "vt",
        parseNorm ? null : "vn"
    ];
    console.log(blackList);
    let exported = [];
    let lastCmd = ""
    for (const line of obj) {
        //get parts and commands
        const parts = line.split(" ");
        const cmd = parts.shift();
        //dont parse unknown or blacklisted commands
        if (blackList.includes(cmd)) { continue; }
        const out = compressCmd(cmd, parts, state); //returns a list
        if (out != null) {
            if (cmd != lastCmd) {
                exported.push(cmd);
                lastCmd = cmd;
            }
            exported.push(out.join(","));
        }
    }
    exported.push("");
    exported = ["*", ...Object.values(state)].concat(exported);
    console.log(state);
    return { exported, ...state };
}

function compressCmd(cmd, data, state) {
    switch (cmd) {
        case "o":
            return data;
        case "v":
            state.hasPos = true;
            return data.map(i => parseFloat(i));
            //return data.map(i => compressInt(Math.floor(parseFloat(i) * state.accuracy)));
        case "vt":
            state.hasTex = true;
            return data.map(i => compressInt(Math.floor(i * state.accuracy)));
        case "vn":
            state.hasNorm = true;
            //get normal vector
            const [x, y, z] = data.map(i => parseFloat(i));
            //convert normal to 2 angles (0-1) then compress to int
            const alpha = compressInt(Math.floor((Math.atan2(x, z) / (2 * Math.PI) + 0.5) * state.accuracy));
            const beta = compressInt(Math.floor((Math.asin(y) / (2 * Math.PI) + 0.5) * state.accuracy));
            return [alpha, beta];
        case "f":
            return data.flatMap(i => {
                const [v, vt, vn] = i.split("/").map(n => parseInt(n));
                const indices = [];
                if (v && state.hasPos) indices.push(compressInt(v - 1)); //position
                if (vt && state.hasTex) indices.push(compressInt(vt - 1)); //texture
                if (vn && state.hasNorm) indices.push(compressInt(vn - 1)); //normal
                return indices;
            });
        case "usemtl":
            //dont parse materials if nothing changed
            let temp = data[0];
            if (temp == state.currentMaterial) { return null; }
            else {
                state.currentMaterial = temp;
                return [temp];
            }
        default:
            return null;
    }
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