/* oxlint-disable */
"use strict";
(() => {
  // ../../node_modules/.pnpm/@todayai-labs+tck-bundle-format@7.0.0-snapshot.202609141102.24696cca/node_modules/@todayai-labs/tck-bundle-format/dist/hash.js
  async function sha384Base64Url(bytes) {
    const copy = bytes.slice().buffer;
    const digest = await crypto.subtle.digest("SHA-384", copy);
    return toBase64Url(new Uint8Array(digest));
  }
  function toBase64Url(bytes) {
    let binary = "";
    const chunkSize = 32768;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    return base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  }

  // ../../node_modules/.pnpm/@todayai-labs+tck-bundle-format@7.0.0-snapshot.202609141102.24696cca/node_modules/@todayai-labs/tck-bundle-format/dist/errors.js
  var TckbUnpackError = class extends Error {
    // `: string` widens the literal so the integrity subclass can
    // override with its own discriminator (`'TckbIntegrityError'`)
    // without TypeScript complaining about the narrower literal type.
    name = "TckbUnpackError";
  };
  var TckbIntegrityError = class extends TckbUnpackError {
    name = "TckbIntegrityError";
  };

  // ../../node_modules/.pnpm/@todayai-labs+tck-bundle-format@7.0.0-snapshot.202609141102.24696cca/node_modules/@todayai-labs/tck-bundle-format/dist/manifest.js
  function parseManifestRaw(buf) {
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch (err2) {
      throw new TckbUnpackError(`manifest.json is not valid UTF-8: ${describe(err2)}`);
    }
    try {
      return JSON.parse(text);
    } catch (err2) {
      throw new TckbUnpackError(`manifest.json is not valid JSON: ${describe(err2)}`);
    }
  }
  function describe(err2) {
    return err2 instanceof Error ? err2.message : String(err2);
  }

  // ../../node_modules/.pnpm/@todayai-labs+tck-bundle-format@7.0.0-snapshot.202609141102.24696cca/node_modules/@todayai-labs/tck-bundle-format/dist/entries.js
  var TCKB_ENTRY_MJS = "widget.mjs";
  var TCKB_ENTRY_CSS = "widget.css";
  var TCKB_ENTRY_PROPERTIES_CSS = "widget.properties.css";
  var TCKB_ENTRY_MANIFEST = "manifest.json";
  var TCKB_ENTRY_INTEGRITY = "integrity.json";
  var TCKB_ENTRY_FORMAT = "format.json";
  var TCKB_ENTRY_BUILD = "build.json";

  // ../../node_modules/.pnpm/@todayai-labs+tck-bundle-format@7.0.0-snapshot.202609141102.24696cca/node_modules/@todayai-labs/tck-bundle-format/dist/integrity.js
  function parseIntegrity(buf) {
    if (buf === void 0)
      return null;
    const raw = parseManifestRaw(buf);
    if (raw === null || typeof raw !== "object") {
      throw new TckbUnpackError("integrity.json is not a JSON object");
    }
    return raw;
  }
  async function verifyIntegrity(input) {
    const mjsSha384 = await sha384Base64Url(input.mjsBytes);
    if (input.integrity !== null) {
      const expectedMjs = input.integrity[TCKB_ENTRY_MJS]?.sha384;
      if (typeof expectedMjs === "string" && expectedMjs !== mjsSha384) {
        throw new TckbIntegrityError(`widget.mjs sha384 mismatch (expected ${expectedMjs}, got ${mjsSha384})`);
      }
      await verifyOptionalEntry(TCKB_ENTRY_CSS, input.integrity[TCKB_ENTRY_CSS]?.sha384, input.cssBytes);
      await verifyOptionalEntry(TCKB_ENTRY_PROPERTIES_CSS, input.integrity[TCKB_ENTRY_PROPERTIES_CSS]?.sha384, input.propertiesCssBytes);
    }
    return { mjsSha384 };
  }
  async function verifyOptionalEntry(entryName, expected, bytes) {
    if (typeof expected !== "string")
      return;
    if (bytes === null) {
      throw new TckbUnpackError(`integrity.json declares ${entryName} sha384 but ${entryName} is absent from the zip`);
    }
    const actual = await sha384Base64Url(bytes);
    if (expected !== actual) {
      throw new TckbIntegrityError(`${entryName} sha384 mismatch (expected ${expected}, got ${actual})`);
    }
  }

  // ../../node_modules/.pnpm/@todayai-labs+tck-bundle-format@7.0.0-snapshot.202609141102.24696cca/node_modules/@todayai-labs/tck-bundle-format/dist/build.js
  function parseBuild(buf) {
    if (buf === void 0)
      return null;
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch (err2) {
      throw new TckbUnpackError(`build.json is not valid UTF-8: ${describe2(err2)}`);
    }
    let raw;
    try {
      raw = JSON.parse(text);
    } catch (err2) {
      throw new TckbUnpackError(`build.json is not valid JSON: ${describe2(err2)}`);
    }
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new TckbUnpackError("build.json is not a JSON object");
    }
    const obj = raw;
    const bundler = parseBundlerField(obj["bundler"]);
    const builtAt = obj["builtAt"];
    if (typeof builtAt !== "string" || builtAt.length === 0) {
      throw new TckbUnpackError("build.json is missing a non-empty string `builtAt`");
    }
    const git = parseGitField(obj["git"]);
    return git === void 0 ? { bundler, builtAt } : { bundler, builtAt, git };
  }
  function describe2(err2) {
    return err2 instanceof Error ? err2.message : String(err2);
  }
  function parseBundlerField(raw) {
    if (raw === null || typeof raw !== "object") {
      throw new TckbUnpackError("build.json is missing a `bundler` object");
    }
    const b = raw;
    const name = b["name"];
    const version = b["version"];
    if (typeof name !== "string" || name.length === 0) {
      throw new TckbUnpackError("build.json `bundler.name` must be a non-empty string");
    }
    if (typeof version !== "string" || version.length === 0) {
      throw new TckbUnpackError("build.json `bundler.version` must be a non-empty string");
    }
    return { name, version };
  }
  function parseGitField(raw) {
    if (raw === void 0)
      return void 0;
    if (raw === null || typeof raw !== "object") {
      throw new TckbUnpackError("build.json `git` must be an object when present");
    }
    const g = raw;
    const commit = g["commit"];
    const dirty = g["dirty"];
    if (typeof commit !== "string" || commit.length === 0) {
      throw new TckbUnpackError("build.json `git.commit` must be a non-empty string when `git` is present");
    }
    if (typeof dirty !== "boolean") {
      throw new TckbUnpackError("build.json `git.dirty` must be a boolean when `git` is present");
    }
    return { commit, dirty };
  }

  // ../../node_modules/.pnpm/fflate@0.8.3/node_modules/fflate/esm/browser.js
  var ch2 = {};
  var wk = (function(c, id, msg, transfer, cb) {
    var w = new Worker(ch2[id] || (ch2[id] = URL.createObjectURL(new Blob([
      c + ';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'
    ], { type: "text/javascript" }))));
    w.onmessage = function(e) {
      var d = e.data, ed = d.$e$;
      if (ed) {
        var err2 = new Error(ed[0]);
        err2["code"] = ed[1];
        err2.stack = ed[2];
        cb(err2, null);
      } else
        cb(null, d);
    };
    w.postMessage(msg, transfer);
    return w;
  });
  var u8 = Uint8Array;
  var u16 = Uint16Array;
  var i32 = Int32Array;
  var fleb = new u8([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    4,
    4,
    4,
    4,
    5,
    5,
    5,
    5,
    0,
    /* unused */
    0,
    0,
    /* impossible */
    0
  ]);
  var fdeb = new u8([
    0,
    0,
    0,
    0,
    1,
    1,
    2,
    2,
    3,
    3,
    4,
    4,
    5,
    5,
    6,
    6,
    7,
    7,
    8,
    8,
    9,
    9,
    10,
    10,
    11,
    11,
    12,
    12,
    13,
    13,
    /* unused */
    0,
    0
  ]);
  var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  var freb = function(eb, start) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
      b[i] = start += 1 << eb[i - 1];
    }
    var r = new i32(b[30]);
    for (var i = 1; i < 30; ++i) {
      for (var j = b[i]; j < b[i + 1]; ++j) {
        r[j] = j - b[i] << 5 | i;
      }
    }
    return { b, r };
  };
  var _a = freb(fleb, 2);
  var fl = _a.b;
  var revfl = _a.r;
  fl[28] = 258, revfl[258] = 28;
  var _b = freb(fdeb, 0);
  var fd = _b.b;
  var revfd = _b.r;
  var rev = new u16(32768);
  for (i = 0; i < 32768; ++i) {
    x = (i & 43690) >> 1 | (i & 21845) << 1;
    x = (x & 52428) >> 2 | (x & 13107) << 2;
    x = (x & 61680) >> 4 | (x & 3855) << 4;
    rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
  }
  var x;
  var i;
  var hMap = (function(cd, mb, r) {
    var s = cd.length;
    var i = 0;
    var l = new u16(mb);
    for (; i < s; ++i) {
      if (cd[i])
        ++l[cd[i] - 1];
    }
    var le = new u16(mb);
    for (i = 1; i < mb; ++i) {
      le[i] = le[i - 1] + l[i - 1] << 1;
    }
    var co;
    if (r) {
      co = new u16(1 << mb);
      var rvb = 15 - mb;
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          var sv = i << 4 | cd[i];
          var r_1 = mb - cd[i];
          var v = le[cd[i] - 1]++ << r_1;
          for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
            co[rev[v] >> rvb] = sv;
          }
        }
      }
    } else {
      co = new u16(s);
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
        }
      }
    }
    return co;
  });
  var flt = new u8(288);
  for (i = 0; i < 144; ++i)
    flt[i] = 8;
  var i;
  for (i = 144; i < 256; ++i)
    flt[i] = 9;
  var i;
  for (i = 256; i < 280; ++i)
    flt[i] = 7;
  var i;
  for (i = 280; i < 288; ++i)
    flt[i] = 8;
  var i;
  var fdt = new u8(32);
  for (i = 0; i < 32; ++i)
    fdt[i] = 5;
  var i;
  var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
  var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
  var max = function(a) {
    var m = a[0];
    for (var i = 1; i < a.length; ++i) {
      if (a[i] > m)
        m = a[i];
    }
    return m;
  };
  var bits = function(d, p, m) {
    var o = p / 8 | 0;
    return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
  };
  var bits16 = function(d, p) {
    var o = p / 8 | 0;
    return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
  };
  var shft = function(p) {
    return (p + 7) / 8 | 0;
  };
  var slc = function(v, s, e) {
    if (s == null || s < 0)
      s = 0;
    if (e == null || e > v.length)
      e = v.length;
    return new u8(v.subarray(s, e));
  };
  var ec = [
    "unexpected EOF",
    "invalid block type",
    "invalid length/literal",
    "invalid distance",
    "stream finished",
    "no stream handler",
    ,
    // determined by compression function
    "no callback",
    "invalid UTF-8 data",
    "extra field too long",
    "date not in range 1980-2099",
    "filename too long",
    "stream finishing",
    "invalid zip data"
    // determined by unknown compression method
  ];
  var err = function(ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
      Error.captureStackTrace(e, err);
    if (!nt)
      throw e;
    return e;
  };
  var inflt = function(dat, st, buf, dict) {
    var sl = dat.length, dl = dict ? dict.length : 0;
    if (!sl || st.f && !st.l)
      return buf || new u8(0);
    var noBuf = !buf;
    var resize = noBuf || st.i != 2;
    var noSt = st.i;
    if (noBuf)
      buf = new u8(sl * 3);
    var cbuf = function(l2) {
      var bl = buf.length;
      if (l2 > bl) {
        var nbuf = new u8(Math.max(bl * 2, l2));
        nbuf.set(buf);
        buf = nbuf;
      }
    };
    var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
    var tbts = sl * 8;
    do {
      if (!lm) {
        final = bits(dat, pos, 1);
        var type = bits(dat, pos + 1, 3);
        pos += 3;
        if (!type) {
          var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
          if (t > sl) {
            if (noSt)
              err(0);
            break;
          }
          if (resize)
            cbuf(bt + l);
          buf.set(dat.subarray(s, t), bt);
          st.b = bt += l, st.p = pos = t * 8, st.f = final;
          continue;
        } else if (type == 1)
          lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
        else if (type == 2) {
          var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
          var tl = hLit + bits(dat, pos + 5, 31) + 1;
          pos += 14;
          var ldt = new u8(tl);
          var clt = new u8(19);
          for (var i = 0; i < hcLen; ++i) {
            clt[clim[i]] = bits(dat, pos + i * 3, 7);
          }
          pos += hcLen * 3;
          var clb = max(clt), clbmsk = (1 << clb) - 1;
          var clm = hMap(clt, clb, 1);
          for (var i = 0; i < tl; ) {
            var r = clm[bits(dat, pos, clbmsk)];
            pos += r & 15;
            var s = r >> 4;
            if (s < 16) {
              ldt[i++] = s;
            } else {
              var c = 0, n = 0;
              if (s == 16)
                n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
              else if (s == 17)
                n = 3 + bits(dat, pos, 7), pos += 3;
              else if (s == 18)
                n = 11 + bits(dat, pos, 127), pos += 7;
              while (n--)
                ldt[i++] = c;
            }
          }
          var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
          lbt = max(lt);
          dbt = max(dt);
          lm = hMap(lt, lbt, 1);
          dm = hMap(dt, dbt, 1);
        } else
          err(1);
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
      }
      if (resize)
        cbuf(bt + 131072);
      var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
      var lpos = pos;
      for (; ; lpos = pos) {
        var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
        pos += c & 15;
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (!c)
          err(2);
        if (sym < 256)
          buf[bt++] = sym;
        else if (sym == 256) {
          lpos = pos, lm = null;
          break;
        } else {
          var add = sym - 254;
          if (sym > 264) {
            var i = sym - 257, b = fleb[i];
            add = bits(dat, pos, (1 << b) - 1) + fl[i];
            pos += b;
          }
          var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
          if (!d)
            err(3);
          pos += d & 15;
          var dt = fd[dsym];
          if (dsym > 3) {
            var b = fdeb[dsym];
            dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
          }
          if (pos > tbts) {
            if (noSt)
              err(0);
            break;
          }
          if (resize)
            cbuf(bt + 131072);
          var end = bt + add;
          if (bt < dt) {
            var shift = dl - dt, dend = Math.min(dt, end);
            if (shift + bt < 0)
              err(3);
            for (; bt < dend; ++bt)
              buf[bt] = dict[shift + bt];
          }
          for (; bt < end; ++bt)
            buf[bt] = buf[bt - dt];
        }
      }
      st.l = lm, st.p = lpos, st.b = bt, st.f = final;
      if (lm)
        final = 1, st.m = lbt, st.d = dm, st.n = dbt;
    } while (!final);
    return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
  };
  var et = /* @__PURE__ */ new u8(0);
  var mrg = function(a, b) {
    var o = {};
    for (var k in a)
      o[k] = a[k];
    for (var k in b)
      o[k] = b[k];
    return o;
  };
  var wcln = function(fn, fnStr, td2) {
    var dt = fn();
    var st = fn.toString();
    var ks = st.slice(st.indexOf("[") + 1, st.lastIndexOf("]")).replace(/\s+/g, "").split(",");
    for (var i = 0; i < dt.length; ++i) {
      var v = dt[i], k = ks[i];
      if (typeof v == "function") {
        fnStr += ";" + k + "=";
        var st_1 = v.toString();
        if (v.prototype) {
          if (st_1.indexOf("[native code]") != -1) {
            var spInd = st_1.indexOf(" ", 8) + 1;
            fnStr += st_1.slice(spInd, st_1.indexOf("(", spInd));
          } else {
            fnStr += st_1;
            for (var t in v.prototype)
              fnStr += ";" + k + ".prototype." + t + "=" + v.prototype[t].toString();
          }
        } else
          fnStr += st_1;
      } else
        td2[k] = v;
    }
    return fnStr;
  };
  var ch = [];
  var cbfs = function(v) {
    var tl = [];
    for (var k in v) {
      if (v[k].buffer) {
        tl.push((v[k] = new v[k].constructor(v[k])).buffer);
      }
    }
    return tl;
  };
  var wrkr = function(fns, init, id, cb) {
    if (!ch[id]) {
      var fnStr = "", td_1 = {}, m = fns.length - 1;
      for (var i = 0; i < m; ++i)
        fnStr = wcln(fns[i], fnStr, td_1);
      ch[id] = { c: wcln(fns[m], fnStr, td_1), e: td_1 };
    }
    var td2 = mrg({}, ch[id].e);
    return wk(ch[id].c + ";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=" + init.toString() + "}", id, td2, cbfs(td2), cb);
  };
  var bInflt = function() {
    return [u8, u16, i32, fleb, fdeb, clim, fl, fd, flrm, fdrm, rev, ec, hMap, max, bits, bits16, shft, slc, err, inflt, inflateSync, pbf, gopt];
  };
  var pbf = function(msg) {
    return postMessage(msg, [msg.buffer]);
  };
  var gopt = function(o) {
    return o && {
      out: o.size && new u8(o.size),
      dictionary: o.dictionary
    };
  };
  var cbify = function(dat, opts, fns, init, id, cb) {
    var w = wrkr(fns, init, id, function(err2, dat2) {
      w.terminate();
      cb(err2, dat2);
    });
    w.postMessage([dat, opts], opts.consume ? [dat.buffer] : []);
    return function() {
      w.terminate();
    };
  };
  var b2 = function(d, b) {
    return d[b] | d[b + 1] << 8;
  };
  var b4 = function(d, b) {
    return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
  };
  var b8 = function(d, b) {
    return b4(d, b) + b4(d, b + 4) * 4294967296;
  };
  function inflate(data, opts, cb) {
    if (!cb)
      cb = opts, opts = {};
    if (typeof cb != "function")
      err(7);
    return cbify(data, opts, [
      bInflt
    ], function(ev) {
      return pbf(inflateSync(ev.data[0], gopt(ev.data[1])));
    }, 1, cb);
  }
  function inflateSync(data, opts) {
    return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
  }
  var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
  var tds = 0;
  try {
    td.decode(et, { stream: true });
    tds = 1;
  } catch (e) {
  }
  var dutf8 = function(d) {
    for (var r = "", i = 0; ; ) {
      var c = d[i++];
      var eb = (c > 127) + (c > 223) + (c > 239);
      if (i + eb > d.length)
        return { s: r, r: slc(d, i - 1) };
      if (!eb)
        r += String.fromCharCode(c);
      else if (eb == 3) {
        c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | d[i++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
      } else if (eb & 1)
        r += String.fromCharCode((c & 31) << 6 | d[i++] & 63);
      else
        r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | d[i++] & 63);
    }
  };
  function strFromU8(dat, latin1) {
    if (latin1) {
      var r = "";
      for (var i = 0; i < dat.length; i += 16384)
        r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
      return r;
    } else if (td) {
      return td.decode(dat);
    } else {
      var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
      if (r.length)
        err(8);
      return s;
    }
  }
  var slzh = function(d, b) {
    return b + 30 + b2(d, b + 26) + b2(d, b + 28);
  };
  var zh = function(d, b, z) {
    var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
    var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
    return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
  };
  var z64hs = function(d, b, l, z, sc, su, off) {
    var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
    var nf = nsc + nsu + noff;
    if (z && nf) {
      for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
        if (b2(d, b) == 1) {
          return [
            nsc ? b8(d, b + 4 + 8 * nsu) : sc,
            nsu ? b8(d, b + 4) : su,
            noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
            1
          ];
        }
      }
      if (z < 2)
        err(13);
    }
    return [sc, su, off, 0];
  };
  var mt = typeof queueMicrotask == "function" ? queueMicrotask : typeof setTimeout == "function" ? setTimeout : function(fn) {
    fn();
  };
  function unzip(data, opts, cb) {
    if (!cb)
      cb = opts, opts = {};
    if (typeof cb != "function")
      err(7);
    var term = [];
    var tAll = function() {
      for (var i2 = 0; i2 < term.length; ++i2)
        term[i2]();
    };
    var files = {};
    var cbd = function(a, b) {
      mt(function() {
        cb(a, b);
      });
    };
    mt(function() {
      cbd = cb;
    });
    var e = data.length - 22;
    for (; b4(data, e) != 101010256; --e) {
      if (!e || data.length - e > 65558) {
        cbd(err(13, 0, 1), null);
        return tAll;
      }
    }
    ;
    var lft = b2(data, e + 8);
    if (lft) {
      var c = lft;
      var o = b4(data, e + 16);
      var z = b4(data, e - 20) == 117853008;
      if (z) {
        var ze = b4(data, e - 12);
        z = b4(data, ze) == 101075792;
        if (z) {
          c = lft = b4(data, ze + 32);
          o = b4(data, ze + 48);
        }
      }
      var fltr = opts && opts.filter;
      var _loop_3 = function(i2) {
        var _a2 = zh(data, o, z), c_1 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
        o = no;
        var cbl = function(e2, d) {
          if (e2) {
            tAll();
            cbd(e2, null);
          } else {
            if (d)
              files[fn] = d;
            if (!--lft)
              cbd(null, files);
          }
        };
        if (!fltr || fltr({
          name: fn,
          size: sc,
          originalSize: su,
          compression: c_1
        })) {
          if (!c_1)
            cbl(null, slc(data, b, b + sc));
          else if (c_1 == 8) {
            var infl = data.subarray(b, b + sc);
            if (su < 524288 || sc > 0.8 * su) {
              try {
                cbl(null, inflateSync(infl, { out: new u8(su) }));
              } catch (e2) {
                cbl(e2, null);
              }
            } else
              term.push(inflate(infl, { size: su }, cbl));
          } else
            cbl(err(14, "unknown compression type " + c_1, 1), null);
        } else
          cbl(null, null);
      };
      for (var i = 0; i < c; ++i) {
        _loop_3(i);
      }
    } else
      cbd(null, {});
    return tAll;
  }

  // ../../node_modules/.pnpm/@todayai-labs+tck-bundle-format@7.0.0-snapshot.202609141102.24696cca/node_modules/@todayai-labs/tck-bundle-format/dist/format.js
  var SUPPORTED_TCKB_FORMAT = 2;
  function gateTckbFormat(formatJsonBytes) {
    const declared = readDeclaredFormat(formatJsonBytes);
    if (declared === SUPPORTED_TCKB_FORMAT)
      return;
    const found = declared ?? 1;
    const detail = found < SUPPORTED_TCKB_FORMAT ? `format ${found} predates the Task #57 Shadow-DOM cutover and must be re-baked` : `format ${found} is newer than this host supports \u2014 upgrade the host`;
    throw new TckbUnpackError(`unsupported .tckb envelope format: ${detail}; this host requires format ${SUPPORTED_TCKB_FORMAT}`);
  }
  function readDeclaredFormat(buf) {
    if (buf === void 0)
      return null;
    let raw;
    try {
      raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buf));
    } catch (err2) {
      throw new TckbUnpackError(`format.json is not valid JSON: ${err2 instanceof Error ? err2.message : String(err2)}`);
    }
    if (raw === null || typeof raw !== "object") {
      throw new TckbUnpackError("format.json is not a JSON object");
    }
    const value = raw.tckbFormat;
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new TckbUnpackError("format.json is missing an integer `tckbFormat`");
    }
    return value;
  }

  // ../../node_modules/.pnpm/@todayai-labs+tck-bundle-format@7.0.0-snapshot.202609141102.24696cca/node_modules/@todayai-labs/tck-bundle-format/dist/unpack.js
  async function unpackTckb(bytes, options = {}) {
    const entries = await unzipBuffer(bytes);
    gateTckbFormat(entries[TCKB_ENTRY_FORMAT]);
    const mjsBytes = entries[TCKB_ENTRY_MJS];
    const manifestBytes = entries[TCKB_ENTRY_MANIFEST];
    if (mjsBytes === void 0)
      throw new TckbUnpackError(".tckb is missing `widget.mjs`");
    if (manifestBytes === void 0)
      throw new TckbUnpackError(".tckb is missing `manifest.json`");
    const cssBytes = entries[TCKB_ENTRY_CSS] ?? null;
    const propertiesCssBytes = entries[TCKB_ENTRY_PROPERTIES_CSS] ?? null;
    const manifest = parseManifestRaw(manifestBytes);
    const build = parseBuild(entries[TCKB_ENTRY_BUILD]);
    const integrity = parseIntegrity(entries[TCKB_ENTRY_INTEGRITY]);
    const { mjsSha384 } = await verifyIntegrity({
      integrity,
      mjsBytes,
      cssBytes,
      propertiesCssBytes
    });
    if (options.verifyHash !== void 0 && options.verifyHash !== mjsSha384) {
      throw new TckbIntegrityError(`bundle hash mismatch (expected ${options.verifyHash}, got ${mjsSha384})`);
    }
    return {
      bundleHash: mjsSha384,
      mjs: mjsBytes,
      mjsByteLength: mjsBytes.byteLength,
      css: cssBytes,
      propertiesCss: propertiesCssBytes,
      manifest,
      build,
      integrity
    };
  }
  function unzipBuffer(bytes) {
    return new Promise((resolve, reject) => {
      unzip(bytes, (err2, data) => {
        if (err2) {
          reject(new TckbUnpackError(`failed to unzip .tckb: ${err2.message}`));
          return;
        }
        resolve(data);
      });
    });
  }

  // ../../packages/today-widget-runtime/src/client/tck-widget-virtual-protocol.ts
  var TCK_WIDGET_BUNDLE_SOURCE_QUERY_PARAM = "tck-bundle-source";
  var TODAY_PAGE_V3_WIDGET_BUNDLE_SOURCE = "today-page-v3";

  // ../../packages/today-widget-runtime/src/embed-contract.ts
  var EMBED_API_PREFIX = "/api/embed";
  var EMBED_SESSION_PATH = `${EMBED_API_PREFIX}/auth/session`;
  var EMBED_WIDGET_API_PREFIX = `${EMBED_API_PREFIX}/widgets/v1`;
  var EMBED_TCK_API_PREFIX = `${EMBED_API_PREFIX}/__tck/v1`;
  var EMBED_TODAY_PAGES_API_PREFIX = `${EMBED_API_PREFIX}/today-pages/v2`;
  var EMBED_LIVE_WIDGET_API_PREFIX = `${EMBED_API_PREFIX}/live-widgets/v1`;
  var MAIN_WIDGET_API_PREFIX = "/api/widgets/v1";
  var MAIN_TCK_API_PREFIX = "/api/__tck/v1";

  // ../../packages/today-widget-runtime/src/service-worker/today-widget-cache.ts
  var TCK_BUNDLE_CACHE_NAME = "today-tck-bundles-v1";
  var TCK_UNBUNDLED_CACHE_NAME = "today-tck-unbundled-v2";
  var TCK_RESPONSE_FROM_HEADER = "X-Response-From";
  var TCK_SERVICE_WORKER_RESPONSE_FROM = "service-worker";
  var TRAFFIC_LANE_HEADER = "X-Traffic-Lane";
  var TODAY_WIDGET_CACHE_TTL_MS = 10 * 24 * 60 * 60 * 1e3;
  var TODAY_WIDGET_CACHE_CLEANUP_INTERVAL_MS = 60 * 60 * 1e3;
  var TODAY_WIDGET_STORED_AT_HEADER = "x-today-widget-cache-stored-at";
  var TODAY_WIDGET_HASH_SOURCE = "[A-Za-z0-9_-]{64}";
  var widgetVirtualPrefix = `${MAIN_TCK_API_PREFIX}/widgets`;
  var widgetBundleSourcePrefix = MAIN_WIDGET_API_PREFIX;
  var todayWidgetAssetPathPattern = createAssetPathPattern(widgetVirtualPrefix);
  var todayWidgetBundlePathPattern = createBundlePathPattern(widgetVirtualPrefix);
  function createAssetPathPattern(prefix) {
    return new RegExp(
      `^${prefix}/(${TODAY_WIDGET_HASH_SOURCE})/(widget\\.mjs|widget\\.css|widget\\.properties\\.css)$`
    );
  }
  function createBundlePathPattern(prefix) {
    return new RegExp(`^${prefix}/(${TODAY_WIDGET_HASH_SOURCE})/bundle\\.tckb$`);
  }
  var serviceWorker = self;
  var lastCleanupAt = 0;
  function isSameOriginGetRequest(request) {
    if (request.method !== "GET") return false;
    const url = new URL(request.url);
    return url.origin === serviceWorker.location.origin;
  }
  function parseTodayWidgetAssetRequest(request) {
    if (!isSameOriginGetRequest(request)) return null;
    const url = new URL(request.url);
    const match = todayWidgetAssetPathPattern.exec(url.pathname);
    if (match === null) return null;
    return {
      hash: match[1],
      asset: match[2]
    };
  }
  function isTodayWidgetBundleRequest(request) {
    if (!isSameOriginGetRequest(request)) return false;
    const url = new URL(request.url);
    return todayWidgetBundlePathPattern.test(url.pathname);
  }
  function readStoredAt(response) {
    const raw = response.headers.get(TODAY_WIDGET_STORED_AT_HEADER);
    if (raw === null) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function isFresh(response, now) {
    const storedAt = readStoredAt(response);
    return storedAt > 0 && now - storedAt <= TODAY_WIDGET_CACHE_TTL_MS;
  }
  function withStoredAt(response, now, responseFrom) {
    const headers = new Headers(response.headers);
    headers.set(TODAY_WIDGET_STORED_AT_HEADER, String(now));
    if (responseFrom !== void 0) {
      headers.set(TCK_RESPONSE_FROM_HEADER, responseFrom);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  function arrayBufferFromBytes(bytes) {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }
  function canonicalRequest(pathname) {
    return new Request(new URL(pathname, serviceWorker.location.origin));
  }
  function canonicalAssetRequest(hash, asset) {
    return canonicalRequest(`${widgetVirtualPrefix}/${hash}/${asset}`);
  }
  function canonicalBundleRequest(hash) {
    return canonicalRequest(`${widgetVirtualPrefix}/${hash}/bundle.tckb`);
  }
  function bundleFetchRequest(hash, sourceRequest) {
    const sourceUrl = new URL(sourceRequest.url);
    const headers = new Headers();
    const url = new URL(
      `${widgetBundleSourcePrefix}/${hash}/bundle.tckb`,
      serviceWorker.location.origin
    );
    if (sourceUrl.searchParams.get("mock") === "true") {
      url.searchParams.set("mock", "true");
    }
    if (sourceUrl.searchParams.get(TCK_WIDGET_BUNDLE_SOURCE_QUERY_PARAM) === TODAY_PAGE_V3_WIDGET_BUNDLE_SOURCE) {
      url.searchParams.set(TCK_WIDGET_BUNDLE_SOURCE_QUERY_PARAM, TODAY_PAGE_V3_WIDGET_BUNDLE_SOURCE);
    }
    const trafficLane = sourceRequest.headers.get(TRAFFIC_LANE_HEADER)?.trim();
    if (trafficLane) headers.set(TRAFFIC_LANE_HEADER, trafficLane);
    return new Request(url, { credentials: "same-origin", headers });
  }
  function assetContentType(asset) {
    return asset === "widget.mjs" ? "application/javascript; charset=utf-8" : "text/css; charset=utf-8";
  }
  function assetBytesFor(bundle, asset) {
    switch (asset) {
      case "widget.mjs":
        return bundle.mjs;
      case "widget.css":
        return bundle.css;
      case "widget.properties.css":
        return bundle.propertiesCss;
    }
  }
  function makeAssetResponse(hash, asset, bundle) {
    const bytes = assetBytesFor(bundle, asset);
    if (bytes === null && asset !== "widget.properties.css") {
      return new Response(`bundle ${hash} has no ${asset}`, {
        status: 404,
        headers: { [TCK_RESPONSE_FROM_HEADER]: TCK_SERVICE_WORKER_RESPONSE_FROM }
      });
    }
    const responseBytes = bytes ?? new Uint8Array();
    return new Response(arrayBufferFromBytes(responseBytes), {
      status: 200,
      headers: {
        "content-type": assetContentType(asset),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
        "cross-origin-resource-policy": "same-origin",
        "access-control-allow-origin": "*",
        [TCK_RESPONSE_FROM_HEADER]: TCK_SERVICE_WORKER_RESPONSE_FROM
      }
    });
  }
  function shouldCacheResponse(request, response) {
    if (response.ok) return true;
    const asset = parseTodayWidgetAssetRequest(request);
    return asset !== null && asset.asset !== "widget.mjs" && response.status === 404;
  }
  function isCacheManagedRequest(request) {
    return parseTodayWidgetAssetRequest(request) !== null || isTodayWidgetBundleRequest(request);
  }
  async function cleanupExpiredWidgetAssets(cache, now = Date.now()) {
    const requests = await cache.keys();
    await Promise.all(
      requests.map(async (request) => {
        if (!isCacheManagedRequest(request)) return;
        const response = await cache.match(request);
        if (response === void 0 || !isFresh(response, now)) {
          await cache.delete(request);
        }
      })
    );
  }
  async function cleanupIfDue(bundleCache, unbundledCache) {
    const now = Date.now();
    if (now - lastCleanupAt < TODAY_WIDGET_CACHE_CLEANUP_INTERVAL_MS) return;
    lastCleanupAt = now;
    await Promise.all([
      cleanupExpiredWidgetAssets(bundleCache, now),
      cleanupExpiredWidgetAssets(unbundledCache, now)
    ]);
  }
  async function readCachedVerifiedBundle(cache, hash, now) {
    const request = canonicalBundleRequest(hash);
    const response = await cache.match(request);
    if (response === void 0) return null;
    if (!isFresh(response, now)) {
      await cache.delete(request);
      return null;
    }
    try {
      const bytes = new Uint8Array(await response.arrayBuffer());
      return await unpackTckb(bytes, { verifyHash: hash });
    } catch {
      await cache.delete(request);
      return null;
    }
  }
  async function fetchVerifiedBundle(cache, hash, sourceRequest, now) {
    const response = await fetch(bundleFetchRequest(hash, sourceRequest));
    if (!response.ok) {
      throw new Error(`bundle.tckb returned HTTP ${response.status}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const bundle = await unpackTckb(bytes, { verifyHash: hash });
    await cache.put(
      canonicalBundleRequest(hash),
      withStoredAt(
        new Response(arrayBufferFromBytes(bytes), {
          status: 200,
          headers: {
            "content-type": "application/octet-stream",
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
            "cross-origin-resource-policy": "same-origin",
            "access-control-allow-origin": "*"
          }
        }),
        now
      )
    );
    return bundle;
  }
  async function loadVerifiedBundle(cache, hash, sourceRequest, now) {
    return await readCachedVerifiedBundle(cache, hash, now) ?? fetchVerifiedBundle(cache, hash, sourceRequest, now);
  }
  async function cacheBundleAssets(cache, hash, bundle, now) {
    await Promise.all(
      ["widget.mjs", "widget.css", "widget.properties.css"].map((asset) => {
        const response = makeAssetResponse(hash, asset, bundle);
        return cache.put(canonicalAssetRequest(hash, asset), withStoredAt(response, now));
      })
    );
  }
  var inFlightBundles = /* @__PURE__ */ new Map();
  function bundleCoalesceKey(hash, sourceRequest) {
    const isMock = new URL(sourceRequest.url).searchParams.get("mock") === "true";
    return `${hash}|${isMock ? "mock" : "real"}`;
  }
  async function materializeBundle(bundleCache, unbundledCache, hash, sourceRequest, now) {
    const key = bundleCoalesceKey(hash, sourceRequest);
    const existing = inFlightBundles.get(key);
    if (existing !== void 0) {
      await existing;
      return;
    }
    const work = (async () => {
      const bundle = await loadVerifiedBundle(bundleCache, hash, sourceRequest, now);
      await cacheBundleAssets(unbundledCache, hash, bundle, now);
      return bundle;
    })();
    inFlightBundles.set(key, work);
    try {
      await work;
    } finally {
      inFlightBundles.delete(key);
    }
  }
  async function fetchAndCacheOriginalAsset(cache, request, now) {
    const response = await fetch(request);
    if (shouldCacheResponse(request, response)) {
      const parsed = parseTodayWidgetAssetRequest(request);
      const cacheRequest = parsed === null ? request : canonicalAssetRequest(parsed.hash, parsed.asset);
      await cache.put(
        cacheRequest,
        withStoredAt(response.clone(), now, TCK_SERVICE_WORKER_RESPONSE_FROM)
      );
    }
    return response;
  }
  async function cacheFirstWidgetAsset(request) {
    const parsed = parseTodayWidgetAssetRequest(request);
    if (parsed === null) return fetch(request);
    const [bundleCache, unbundledCache] = await Promise.all([
      caches.open(TCK_BUNDLE_CACHE_NAME),
      caches.open(TCK_UNBUNDLED_CACHE_NAME)
    ]);
    await cleanupIfDue(bundleCache, unbundledCache);
    const now = Date.now();
    const cacheRequest = canonicalAssetRequest(parsed.hash, parsed.asset);
    const cached = await unbundledCache.match(cacheRequest);
    if (cached !== void 0 && isFresh(cached, now)) {
      return cached;
    }
    if (cached !== void 0) {
      await unbundledCache.delete(cacheRequest);
    }
    try {
      await materializeBundle(bundleCache, unbundledCache, parsed.hash, request, now);
      const response = await unbundledCache.match(cacheRequest);
      if (response !== void 0) return response;
    } catch {
    }
    return fetchAndCacheOriginalAsset(unbundledCache, request, now);
  }
  var registerTodayWidgetCacheRoutes = ({
    claimClients,
    skipWaiting,
    surface = "main"
  }) => {
    widgetVirtualPrefix = `${surface === "embed" ? EMBED_TCK_API_PREFIX : MAIN_TCK_API_PREFIX}/widgets`;
    widgetBundleSourcePrefix = surface === "embed" ? EMBED_WIDGET_API_PREFIX : MAIN_WIDGET_API_PREFIX;
    todayWidgetAssetPathPattern = createAssetPathPattern(widgetVirtualPrefix);
    todayWidgetBundlePathPattern = createBundlePathPattern(widgetVirtualPrefix);
    serviceWorker.addEventListener("install", (event) => {
      if (skipWaiting) {
        serviceWorker.skipWaiting();
      }
      event.waitUntil(
        Promise.all([caches.open(TCK_BUNDLE_CACHE_NAME), caches.open(TCK_UNBUNDLED_CACHE_NAME)])
      );
    });
    serviceWorker.addEventListener("activate", (event) => {
      event.waitUntil(
        (async () => {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.filter(
              (cacheName) => cacheName.startsWith("today-widget-assets-") || cacheName.startsWith("today-tck-bundles-") || cacheName.startsWith("today-tck-unbundled-")
            ).filter(
              (cacheName) => cacheName !== TCK_BUNDLE_CACHE_NAME && cacheName !== TCK_UNBUNDLED_CACHE_NAME
            ).map((cacheName) => caches.delete(cacheName))
          );
          const [bundleCache, unbundledCache] = await Promise.all([
            caches.open(TCK_BUNDLE_CACHE_NAME),
            caches.open(TCK_UNBUNDLED_CACHE_NAME)
          ]);
          await Promise.all([
            cleanupExpiredWidgetAssets(bundleCache),
            cleanupExpiredWidgetAssets(unbundledCache)
          ]);
          if (claimClients) {
            await serviceWorker.clients.claim();
          }
        })()
      );
    });
    serviceWorker.addEventListener("fetch", (event) => {
      if (parseTodayWidgetAssetRequest(event.request) === null) return;
      event.respondWith(cacheFirstWidgetAsset(event.request));
    });
  };

  // src/service-worker/today-widget-cache-service-worker.ts
  registerTodayWidgetCacheRoutes({
    claimClients: true,
    skipWaiting: true,
    surface: "main"
  });
})();
