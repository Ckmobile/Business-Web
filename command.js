var commands = [];

function cmd(info, func) {
    var data = info;

    data.function = func;

    if (!data.dontAddCommandList) data.dontAddCommandList = false;
    if (!info.desc) info.desc = '';

    // ✅ FIX: default values
    data.fromMe = data.fromMe || false;
    data.ownerOnly = data.ownerOnly || false; // ⭐ NEW

    if (!info.category) data.category = 'misc';
    if (!info.filename) data.filename = "Not Provided";

    commands.push(data);
    return data;
}

export {
    cmd,
    cmd as AddCommand,
    cmd as Function,
    cmd as Module,
    commands
};