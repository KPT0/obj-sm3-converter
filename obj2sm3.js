const charset = '!"#$%&\'()*+-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_\`abcdefghijklmnopqrstuvwxyz{|}~';
const base = charset.length;

function processCmd(cmd, data) {
    switch (cmd) {
        case "o":
            return data;
        case "v":
            return data.map(i => parseFloat(i));
        case "f":
            return data.map(i => compressInt(parseInt(i.split("/")[0])));
        case "usemtl":
            return data;
        default:
            return null;
    }
}

function convertOBJtoSM3(obj) {
    let exported = [];
    let previous = "";
    for (const line of obj) {
        const parts = line.trim().split(/\s+/);
        const cmd = parts.shift();
        if (cmd === undefined) { continue };
        const out = processCmd(cmd, parts);
        if (out != null) {
            if (cmd !== previous) {
                exported.push(cmd);
                previous = cmd;
            }
            // RLE; unused
            // out = RLE(out);
            exported.push(out.join(","));
        }
    }
    exported.push()
    return exported;
}

function compressInt(n) {
    if (n === 0) { return charset[0]; }
    let result = "";
    while (n > 0) {
        let letter = n % base;
        n = Math.floor(n / base);
        result += charset[letter];
    }
    return result;
}

function RLE(target) {
    const count = target.map(i => String.fromCharCode(i.length + 64));
    const temp = [];
    for (let i = 0; i < target.length; i++) {
        temp.push(count[i], target[i]);
    }
    return temp;
}