// Compiled fragment from ./src/app/modules/shell/modules/shortcuts/modules/gnome-global/utils.ts.
// The original TypeScript and import graph are not restored.




const quoteCommandArgument = (value)=>`'${value.replaceAll("'", "'\\''")}'`;
const createGnomeShortcutCommand = (options, token)=>{
    const args = [];
    if (options.extractAndRun) {
        args.push('env', 'APPIMAGE_EXTRACT_AND_RUN=1');
    }
    args.push(options.executablePath);
    if (options.appPath) {
        args.push(options.appPath);
    }
    if (options.noSandbox) {
        args.push('--no-sandbox');
    }
    if (options.passwordStore) {
        args.push(`--password-store=${options.passwordStore}`);
    }
    if (options.isDevelopment) {
        args.push('--development', `${LINUX_DEV_INSTANCE_ARGUMENT}=${options.executablePath}`);
    }
    args.push('--target=linux', `--environment=${options.environment}`);
    if (options.localProfileId) {
        args.push(`--local-profile-id=${options.localProfileId}`);
    }
    if (options.localWebOrigin) {
        args.push(`--local-web-origin=${options.localWebOrigin}`);
    }
    args.push(`${SHORTCUT_ACTIVATION_ARGUMENT}=${token}`);
    return args.map(quoteCommandArgument).join(' ');
};
const toGnomeAccelerator = (binding)=>{
    if (binding.kind === (/* inlined export .ShortcutBindingKind.ModifierChord */"modifier-chord") || binding.kind === (/* inlined export .ShortcutBindingKind.ModifierDoubleTap */"modifier-double-tap")) {
        return null;
    }
    const namedKeys = {
        ArrowDown: 'Down',
        ArrowLeft: 'Left',
        ArrowRight: 'Right',
        ArrowUp: 'Up',
        Backquote: 'grave',
        Backslash: 'backslash',
        Backspace: 'BackSpace',
        BracketLeft: 'bracketleft',
        BracketRight: 'bracketright',
        Comma: 'comma',
        Delete: 'Delete',
        End: 'End',
        Enter: 'Return',
        Equal: 'equal',
        Escape: 'Escape',
        Home: 'Home',
        Insert: 'Insert',
        Minus: 'minus',
        NumpadAdd: 'KP_Add',
        NumpadDecimal: 'KP_Decimal',
        NumpadDivide: 'KP_Divide',
        NumpadEnter: 'KP_Enter',
        NumpadMultiply: 'KP_Multiply',
        NumpadSubtract: 'KP_Subtract',
        PageDown: 'Page_Down',
        PageUp: 'Page_Up',
        Period: 'period',
        Semicolon: 'semicolon',
        Slash: 'slash',
        Space: 'space',
        Tab: 'Tab'
    };
    let key = namedKeys[binding.code];
    if (/^Key[A-Z]$/u.test(binding.code)) {
        key = binding.code.slice(3).toLowerCase();
    } else if (/^Digit[0-9]$/u.test(binding.code)) {
        key = binding.code.slice(5);
    } else if (/^F(?:[1-9]|1[0-9]|2[0-4])$/u.test(binding.code)) {
        key = binding.code;
    } else if (/^Numpad[0-9]$/u.test(binding.code)) {
        key = `KP_${binding.code.slice(6)}`;
    }
    if (!key) {
        return null;
    }
    const modifiers = new Set(binding.modifiers);
    const parts = [];
    for (const [modifier, name] of [
        [
            (/* inlined export .ShortcutModifier.Control */"control"),
            'Control'
        ],
        [
            (/* inlined export .ShortcutModifier.Alt */"alt"),
            'Alt'
        ],
        [
            (/* inlined export .ShortcutModifier.Shift */"shift"),
            'Shift'
        ],
        [
            (/* inlined export .ShortcutModifier.Meta */"meta"),
            'Super'
        ]
    ]){
        if (modifiers.has(modifier)) {
            parts.push(`<${name}>`);
        }
    }
    return `${parts.join('')}${key}`;
};
const normalizeGnomeAccelerator = (accelerator)=>{
    const modifierNames = {
        control: 'control',
        primary: 'control',
        ctrl: 'control',
        ctl: 'control',
        alt: 'alt',
        mod1: 'alt',
        shift: 'shift',
        shft: 'shift',
        super: 'super',
        mod4: 'super',
        meta: 'super',
        hyper: 'hyper',
        release: 'release',
        mod2: 'mod2',
        mod3: 'mod3',
        mod5: 'mod5'
    };
    const modifiers = new Set();
    let keyOffset = 0;
    // GTK accelerators have consecutive modifier prefixes followed by one key
    // name. Never extract modifiers from the middle of a malformed key name.
    while(accelerator[keyOffset] === '<'){
        const closingOffset = accelerator.indexOf('>', keyOffset + 1);
        if (closingOffset === -1) {
            return null;
        }
        const name = accelerator.slice(keyOffset + 1, closingOffset).toLowerCase();
        if (!Object.hasOwn(modifierNames, name)) {
            return null;
        }
        const modifier = modifierNames[name];
        if (!modifier) {
            return null;
        }
        modifiers.add(modifier);
        keyOffset = closingOffset + 1;
    }
    const key = accelerator.slice(keyOffset);
    if (!/^[A-Za-z0-9_]+$/u.test(key)) {
        return null;
    }
    return `${[
        ...modifiers
    ].sort().join('+')}:${key.toLowerCase()}`;
};
/** GSettings prints GVariant strings, not JSON; never evaluate its output. */ const parseGvariantStrings = (value)=>{
    return [
        ...value.matchAll(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/gu)
    ].map((match)=>{
        return match[0].slice(1, -1).replaceAll(/\\(u[0-9a-fA-F]{4}|.)/gu, (_escape, code)=>{
            if (code.startsWith('u') && code.length === 5) {
                return String.fromCharCode(Number.parseInt(code.slice(1), 16));
            }
            const escapes = {
                n: '\n',
                r: '\r',
                t: '\t',
                b: '\b',
                f: '\f'
            };
            return escapes[code] ?? code;
        });
    });
};
