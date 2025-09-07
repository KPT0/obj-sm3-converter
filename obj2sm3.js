const charset = '!\"#$%&\'()*+-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
const base = charset.length;

function convertOBJtoSM3(obj, parsePos, parseTex, parseNorm) {
    const blackList = [
        parsePos ? null : "v",
        parseTex ? null : "vt",
        parseNorm ? null : "vn"
    ];
    console.log(blackList);
    const header = [
        "v1.1.0",
        "scratch.mit.edu/users/KryptoScratcher",
    ];
    let exported = ["*SM3", header.join(",")];
    let lastCmd = ""
    const state = {
        currentMaterial: "",
        hasPos: false,
        hasTex: false,
        hasNorm: false
    };
    for (const line of obj) {
        //get parts and commands
        const parts = line.split(" ");
        const cmd = parts.shift();
        //dont parse unknown or blacklisted commands
        if (cmd == undefined) { continue; }
        if (blackList.includes(cmd)) { console.log(cmd); continue; }
        const out = processCmd(cmd, lastCmd, parts, state); //returns a list
        if (out != null) {
            if (cmd != lastCmd) {
                exported.push(cmd);
                lastCmd = cmd;
            }
            exported.push(out.join(","));
        }
    }
    exported.push("");
    console.log(state);
    return { exported, ...state };
}

function processCmd(cmd, previousCmd, data, state) {
    switch (cmd) {
        case "o":
            return data;
        case "v":
            state.hasPos = true;
            return data.map(i => parseFloat(i));
        case "vt":
            state.hasTex = true;
            return data.map(i => parseFloat(i));
        case "vn":
            state.hasNorm = true;
            return data.map(i => parseFloat(i));
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

function parseObj(obj) {
    let info = [];
    let commands = [];
    for (const line of obj) {
        const parts = line.trim().split(/\s+/);
        const cmd = parts.shift();
        if (!commands.indexOf(cmd)) { commands.push(cmd); }
        const out = processCmd(cmd, parts);
        if (out != null) {
            exported.push(out.join(","));
        }
    }
}

function compressInt(n) {
    n = parseInt(n);
    if (n === 0) { return charset[0]; }
    let result = "";
    while (n > 0) {
        let letter = n % base;
        n = Math.floor(n / base);
        result += charset[letter];
    }
    return result;
}