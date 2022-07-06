
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var KEBAB_REGEX = /[A-Z]/g;

var hash$1 = function (str) {
    var h = 5381, i = str.length;

    while (i) h = (h * 33) ^ str.charCodeAt(--i);

    return '_' + (h >>> 0).toString(36);
};

var create = function (config) {
    config = config || {};
    var assign = config.assign || Object.assign;
    var client = typeof window === 'object';

    // Check if we are really in browser environment.
    if (process.env.NODE_ENV !== 'production') {
        if (client) {
            if ((typeof document !== 'object') || !document.getElementsByTagName('HTML')) {
                console.error(
                    'nano-css detected browser environment because of "window" global, but ' +
                    '"document" global seems to be defective.'
                );
            }
        }
    }

    var renderer = assign({
        raw: '',
        pfx: '_',
        client: client,
        assign: assign,
        stringify: JSON.stringify,
        kebab: function (prop) {
            return prop.replace(KEBAB_REGEX, '-$&').toLowerCase();
        },
        decl: function (key, value) {
            key = renderer.kebab(key);
            return key + ':' + value + ';';
        },
        hash: function (obj) {
            return hash$1(renderer.stringify(obj));
        },
        selector: function (parent, selector) {
            return parent + (selector[0] === ':' ? ''  : ' ') + selector;
        },
        putRaw: function (rawCssRule) {
            renderer.raw += rawCssRule;
        }
    }, config);

    if (renderer.client) {
        if (!renderer.sh)
            document.head.appendChild(renderer.sh = document.createElement('style'));

        if (process.env.NODE_ENV !== 'production') {
            renderer.sh.setAttribute('data-nano-css-dev', '');

            // Test style sheet used in DEV mode to test if .insetRule() would throw.
            renderer.shTest = document.createElement('style');
            renderer.shTest.setAttribute('data-nano-css-dev-tests', '');
            document.head.appendChild(renderer.shTest);
        }

        renderer.putRaw = function (rawCssRule) {
            // .insertRule() is faster than .appendChild(), that's why we use it in PROD.
            // But CSS injected using .insertRule() is not displayed in Chrome Devtools,
            // that's why we use .appendChild in DEV.
            if (process.env.NODE_ENV === 'production') {
                var sheet = renderer.sh.sheet;

                // Unknown pseudo-selectors will throw, this try/catch swallows all errors.
                try {
                    sheet.insertRule(rawCssRule, sheet.cssRules.length);
                // eslint-disable-next-line no-empty
                } catch (error) {}
            } else {
                // Test if .insertRule() works in dev mode. Unknown pseudo-selectors will throw when
                // .insertRule() is used, but .appendChild() will not throw.
                try {
                    renderer.shTest.sheet.insertRule(rawCssRule, renderer.shTest.sheet.cssRules.length);
                } catch (error) {
                    if (config.verbose) {
                        console.error(error);
                    }
                }

                // Insert pretty-printed CSS for dev mode.
                renderer.sh.appendChild(document.createTextNode(rawCssRule));
            }
        };
    }

    renderer.put = function (selector, decls, atrule) {
        var str = '';
        var prop, value;
        var postponed = [];

        for (prop in decls) {
            value = decls[prop];

            if ((value instanceof Object) && !(value instanceof Array)) {
                postponed.push(prop);
            } else {
                if ((process.env.NODE_ENV !== 'production') && !renderer.sourcemaps) {
                    str += '    ' + renderer.decl(prop, value, selector, atrule) + '\n';
                } else {
                    str += renderer.decl(prop, value, selector, atrule);
                }
            }
        }

        if (str) {
            if ((process.env.NODE_ENV !== 'production') && !renderer.sourcemaps) {
                str = '\n' + selector + ' {\n' + str + '}\n';
            } else {
                str = selector + '{' + str + '}';
            }
            renderer.putRaw(atrule ? atrule + '{' + str + '}' : str);
        }

        for (var i = 0; i < postponed.length; i++) {
            prop = postponed[i];

            if (prop[0] === '@' && prop !== '@font-face') {
                renderer.putAt(selector, decls[prop], prop);
            } else {
                renderer.put(renderer.selector(selector, prop), decls[prop], atrule);
            }
        }
    };

    renderer.putAt = renderer.put;

    return renderer;
};

const nano = create();

nano.put("*,*::after,*::before", {
  boxSizing: "border-box",
  fontSize: "inherit",
  fontFamily: "inherit",
  color: "inherit",
  margin: 0,
  padding: 0,
  border: "0 solid",
});

nano.put("body", {
  backgroundImage: "url(./logo.png)",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "contain",
  height: "100vh",
  margin: "20px",
});

// See "precomputation" in notes
var i = 18,
  j,
  K = [],
  H = [];

// Construct list of primes < 320
// K[x] === 1 if x is composite, unset if prime
for (; i > 1; i--) {
  for (j = i; j < 320; ) {
    K[(j += i)] = 1;
  }
}

// See "`a` reassignment" in notes
function a(num, root) {
  return (Math.pow(num, 1 / root) /* % 1 */ * 4294967296) | 0;
}

// i === 1
for (j = 0; j < 64; ) {
  if (!K[++i]) {
    H[j] = a(i, 2);
    K[j++] = a(i, 3);
  }
}

function S(X, n) {
  return (X >>> n) | (X << -n);
}

function sha256(b) {
  var h = H.slice((i = j = 0), 8),
    words = [],
    s = unescape(encodeURI(b)) + "\x80",
    W = s.length;

  // See "Length bits" in notes
  words[(b = (--W / 4 + 2) | 15)] = W * 8;

  for (; ~W; ) {
    // W !== -1
    words[W >> 2] |= s.charCodeAt(W) << (8 * ~W--);
    // words[W >> 2] |= s.charCodeAt(W) << 24 - 8 * W--;
  }

  for (W = []; i < b; i += 16) {
    // See "`a` reassignment" in notes
    a = h.slice();

    for (
      ;
      j < 64;
      a.unshift(
        s +
          (S((s = a[0]), 2) ^ S(s, 13) ^ S(s, 22)) +
          ((s & a[1]) ^ (a[1] & a[2]) ^ (a[2] & s))
      )
    ) {
      a[3] += s =
        0 |
        ((W[j] =
          j < 16
            ? ~~words[j + i]
            : (S((s = W[j - 2]), 17) ^ S(s, 19) ^ (s >>> 10)) +
              W[j - 7] +
              (S((s = W[j - 15]), 7) ^ S(s, 18) ^ (s >>> 3)) +
              W[j - 16]) +
          a.pop() +
          (S((s = a[4]), 6) ^ S(s, 11) ^ S(s, 25)) +
          ((s & a[5]) ^ (~s & a[6])) +
          K[j++]);
    }

    // See "Integer safety" in notes
    for (j = 8; j; ) h[--j] += a[j];

    // j === 0
  }

  for (s = ""; j < 64; ) {
    // s += ((h[j >> 3] >> 4 * ~j++) & 15).toString(16);
    s += ((h[j >> 3] >> (4 * (7 - j++))) & 15).toString(16);
    // s += ((h[j >> 3] >> -4 * ++j) & 15).toString(16);
  }

  return s;
}

class WeakValue extends Map {
  // https://github.com/WebReflection/weak-value/blob/fbeb5955e99488d83d5c77f722b81bb6ca8dc006/esm/index.js

  // ISC License

  // Copyright (c) 2020, Andrea Giammarchi, @WebReflection

  // Permission to use, copy, modify, and/or distribute this software for any
  // purpose with or without fee is hereby granted, provided that the above
  // copyright notice and this permission notice appear in all copies.

  // THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  // REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  // AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  // INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  // LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
  // OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  // PERFORMANCE OF THIS SOFTWARE.
  #delete = (key) => {
    this.#registry.unregister(super.get(key) );
    return super.delete(key);
  };
  #registry = new FinalizationRegistry((key) => {
    super.delete(key);
  });
  delete(key) {
    return super.has(key) && !this.#delete(key);
  }
  has(key) {
    let has = super.has(key);
    if (has && !(super.get(key) ).deref())
      has = !!this.#delete(key);
    return has;
  }
  get(key) {
    const ref = super.get(key) ;
    return ref && ref.deref();
  }
  set(key, value) {
    this.delete(key);
    const ref = new WeakRef(value);
    this.#registry.register(value, key, ref);
    return super.set(key, ref );
  }
}

function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }












const config


 = {};

const { hash, lookup, stats } = (() => {
  const hashCache = new WeakMap();
  const singletonForHash = new WeakValue();

  function lookupHash(hash) {
    if (!singletonForHash.has(hash)) {
      const result = _optionalChain([config, 'access', _ => _.load, 'optionalCall', _2 => _2(hash)]);
      if (result === undefined) throw new HashNotFoundError();
      singletonForHash.set(hash, result);
    }
    return singletonForHash.get(hash);
  }

  function transform(source) {
    if (typeof source !== "object" || source == null) return source;

    if (Array.isArray(source)) return [source.map((item) => transform(item))];

    return [hash(source)[0]];
  }

  function transformObject(source) {
    return Object.fromEntries(
      Object.entries(source).map(([k, v]) => [k, transform(v)])
    );
  }

  const handlersForObject = new WeakMap


();

  const hashResolver = {
    get(target, key) {
      return untransform(Reflect.get(target, key));
    },
    set(target, p, value) {
      if (typeof p === "string") {
        const nextHash = rawHash(
          // Object.assign(Object.create(target),
          {
            ...target,
            [p]: transform(value),
          }
        )[0];

        for (const handler of _nullishCoalesce(handlersForObject.get(target), () => ( [])))
          handler(nextHash, p);
      } else {
        return Reflect.set(target, p, value);
      }
      return true;
    },
    apply(
      target,
      thisArg,
      argArray
    ) {
      if (typeof argArray !== "function" || (argArray ).length !== 2)
        throw new Error("must provide handler function");

      let handlers;
      if (!handlersForObject.has(target))
        handlersForObject.set(target, (handlers = new Set()));
      handlers = handlers || handlersForObject.get(target);

      handlers.add(argArray[0]);
      return () => handlers.delete(argArray[0]);
    },
  };

  // JSON.stringify(Object.assign(Object.create({a: 'A', toJSON() {
  //     const keys = new Set();
  //     for (let current = this; current; current = Object.getPrototypeOf(current))
  //       for (const key of Object.getOwnPropertyNames(current)) keys.add(key);
  //     return Object.fromEntries([...keys].sort().filter(k => k !== '__proto__').map(k => [k, this[k]]));
  // } }), {b:'B'}))

  const proxyCache = new WeakMap();
  let proxyCount = 0;
  function createProxy(source) {
    if (!proxyCache.has(source)) {
      proxyCount++;
      proxyCache.set(source, new Proxy(source, hashResolver));
    }
    return proxyCache.get(source);
  }

  function untransform(
    source
  ) {
    if (typeof source !== "object" || source == null) return source;

    const firstItem = source[0];

    if (typeof firstItem === "string") {
      return lookupHash(firstItem);
    }

    return createProxy(firstItem);
  }

  function createSingleton(
    source
  ) {
    return createProxy(source);
  }

  function rawHash(
    transformed
  )


 {
    if (hashCache.has(transformed)) return hashCache.get(transformed) ;

    const hash = sha256(JSON.stringify(transformed)) ;

    const singleton =
      singletonForHash.get(hash) || createSingleton(transformed);
    const result = [hash, singleton ] ;

    if (!singletonForHash.has(hash)) {
      _optionalChain([config, 'access', _3 => _3.persist, 'optionalCall', _4 => _4(transformed, hash)]);
      singletonForHash.set(hash, singleton);
      hashCache.set(singleton, result);
    }

    hashCache.set(transformed, result);
    return result;
  }

  function hash(source) {
    // if (hashCache.has(source)) return hashCache.get(source)! as any;

    const transformed = transformObject(source);

    const result = rawHash(transformed) ;

    hashCache.set(source, result);
    return result;
  }

  function lookup(hash) {
    const result = singletonForHash.get(hash);
    if (result == null) throw new HashNotFoundError(hash);
    if (Array.isArray(result)) throw new HashIsArrayError(hash);
    return result;
  }

  return {
    hash,
    lookup,
    stats() {
      return {
        singletonCount: singletonForHash.size,
        proxyCount,
      };
    },
  };
})();

class HashNotFoundError extends Error {}
class HashIsArrayError extends Error {}

// export const { hash, lookup, stats } = (() => {
//   enum ValueType {
//     Value = 0,
//     HashedArrayItem = 1,
//     HashedObjectValue = 2,
//   }

//   const objForHash = new WeakValue<string, JSONObject | JSONArray>();
//   const hashForObj = new WeakMap<object, string>();

//   function transform(obj: JSONArray | JSONObject): [string] | [string[]] {
//     return Array.isArray(obj)
//       ? [obj.map((v) => hashVal(v)[0])]
//       : Object.fromEntries(
//           Object.entries(obj).map(([k, v]) => [
//             k,
//             [ValueType.HashedObjectValue, hashVal(v)[0]] as const,
//           ])
//         );
//   }

//   function resolve(
//     obj: ReturnType<typeof transform>
//   ): Parameters<typeof transform>[0] {
//     return Object.freeze(
//       Object.fromEntries(
//         Object.entries(obj).map(([k, v]) => {
//           if (typeof v !== "object" || v === null) return [k, v];
//           return [k, objForHash.get(hashForObj.get(v)!)!];
//         })
//       )
//     );
//   }

//   function hashVal<T extends JSONValue>(obj: T): [string, T] {
//     if (typeof obj !== "object" || obj === null)
//       return [sha256(JSON.stringify([ValueType.Value, obj])), obj];

//     let hash: string;
//     if (hashForObj.has(obj)) {
//       hash = hashForObj.get(obj)!;
//     } else {
//       const transformed = transform(obj);
//       hash = sha256(JSON.stringify([ValueType.Value, transformed]));
//       hashForObj.set(obj, hash);
//     }

//     if (!objForHash.has(hash)) {
//       const result = resolve(transform(obj));
//       objForHash.set(hash, result);
//       hashForObj.set(result, hash);
//     }

//     return [hash, objForHash.get(hash)! as T];
//   }

//   function lookup(hash: string): JSONObject {
//     const result = objForHash.get(hash);
//     if (result == null) throw new HashNotFoundError(hash);
//     if (Array.isArray(result)) throw new HashIsArrayError(hash);
//     return result;
//   }

//   return {
//     hash<T extends JSONObject>(value: T): [string, Readonly<T>] {
//       return hashVal(value);
//     },
//     lookup(hash: string): JSONObject {
//       const result = objForHash.get(hash);
//       if (result == null) throw new HashNotFoundError(hash);
//       if (Array.isArray(result)) throw new HashIsArrayError(hash);
//       return result;
//     },
//     stats() {
//       return {
//         hashCount: objForHash.size,
//       };
//     },
//   };
// })();

class TestCore {
  constructor() {
    return new Proxy(this, {
      get(target, p) {
        console.log("get", target, p);
        return Reflect.get(target, p);
      },
      set(target, p, v) {
        console.log("set", target, p, v);
        console.log(hash(target ));
        console.log(JSON.stringify(target));
        const result = Reflect.set(target, p, v);
        console.log(hash(target ));
        console.log(JSON.stringify(target));
        return result;
      },
    });
  }

  
}

const test = new TestCore();
console.log({ test });

console.log(test.a);
test.a = 42;
console.log(test.a);
