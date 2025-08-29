import os

def convert_obj(obj):
    exported = []
    previous = ""
    with open(obj, "r") as file:
        for line in file:
            parts = line.split()
            # Get the current command
            cmd = parts.pop(0)
            # Process the command
            out = process_cmd(cmd, parts)
            if out != None:
                # If the current command is different to the previous store it
                if cmd != previous:
                    exported.append(cmd)
                    previous = cmd
                # Run length encode the output list
                #out = RLE(out)
                out = ",".join(out)
                exported.append(out)
    return exported

def process_cmd(cmd, data):
    match cmd:
        case "o":
            return data
        case "v":
            return data
        case "f":
            vp = [int_compression(int(i.split("/")[0])) for i in data]
            return vp

def RLE(target):
    count = [chr(len(i) + 64) for i in target]
    temp = []
    for i in zip(count, target):
        temp.extend(i)
    return temp

def int_compression(n):
    #charset = """!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"""
    charset = """!"#$%&\'()*+-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"""
    base = len(charset)
    if n == 0:
        return charset[0]
    result = ""
    while n > 0:
        n, letter = divmod(n, base)
        result += charset[letter]
    return result

def convert(in_dir, out_dir):
    export = convert_obj(in_dir)
    file_name, file_ext = os.path.splitext(os.path.basename(in_dir))
    with open(out_dir + file_name + ".sm3", "w") as f:
        f.write("\n".join(export))