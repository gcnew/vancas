
const modules = {};
let unresolved = [];

function define(moduleName, deps, fn) {
    const res = tryResolve(moduleName, deps, fn);

    if (!res) {
        unresolved.push([ moduleName, deps, fn ]);
        return;
    }

    while (true) {
        // all done, exit
        if (!unresolved.length) {
            return;
        }

        // try to resolve something, our previous success might have resolved all deps
        const rest = unresolved.filter(u => tryResolve(... u));

        // the attempt was unsuccessful, exit
        if (rest.length === unresolved.length) {
            return;
        }

        // success! we resolved a few more modules, slowly chipping away :))
        unresolved = rest;
    }
}

function tryResolve(moduleName, deps, fn) {
    const ud = deps.filter(d => d !== 'exports' && d !== 'require' && !modules[d]);

    // some dependencies cannot be resolved
    if (ud.length) {
        return false;
    }

    // all deps are met
    const _exports = {};
    const resolved = deps.map(d => ({ [d]: modules[d], exports: _exports, require: undefined }[d]));

    // execute the module def
    fn(... resolved);

    // save the resulting exports
    modules[moduleName] = _exports;

    return true;
}
