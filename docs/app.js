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

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var t;const i$1=globalThis.trustedTypes,s=i$1?i$1.createPolicy("lit-html",{createHTML:t=>t}):void 0,e=`lit$${(Math.random()+"").slice(9)}$`,o="?"+e,n=`<${o}>`,l=document,h=(t="")=>l.createComment(t),r=t=>null===t||"object"!=typeof t&&"function"!=typeof t,d=Array.isArray,u=t=>{var i;return d(t)||"function"==typeof(null===(i=t)||void 0===i?void 0:i[Symbol.iterator])},c=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,v=/-->/g,a$1=/>/g,f=/>|[ 	\n\r](?:([^\s"'>=/]+)([ 	\n\r]*=[ 	\n\r]*(?:[^ 	\n\r"'`<>=]|("|')|))|$)/g,_=/'/g,m=/"/g,g=/^(?:script|style|textarea|title)$/i,p=t=>(i,...s)=>({_$litType$:t,strings:i,values:s}),$=p(1),b=Symbol.for("lit-noChange"),w=Symbol.for("lit-nothing"),T=new WeakMap,x=(t,i,s)=>{var e,o;const n=null!==(e=null==s?void 0:s.renderBefore)&&void 0!==e?e:i;let l=n._$litPart$;if(void 0===l){const t=null!==(o=null==s?void 0:s.renderBefore)&&void 0!==o?o:null;n._$litPart$=l=new N(i.insertBefore(h(),t),t,void 0,null!=s?s:{});}return l._$AI(t),l},A=l.createTreeWalker(l,129,null,!1),C=(t,i)=>{const o=t.length-1,l=[];let h,r=2===i?"<svg>":"",d=c;for(let i=0;i<o;i++){const s=t[i];let o,u,p=-1,$=0;for(;$<s.length&&(d.lastIndex=$,u=d.exec(s),null!==u);)$=d.lastIndex,d===c?"!--"===u[1]?d=v:void 0!==u[1]?d=a$1:void 0!==u[2]?(g.test(u[2])&&(h=RegExp("</"+u[2],"g")),d=f):void 0!==u[3]&&(d=f):d===f?">"===u[0]?(d=null!=h?h:c,p=-1):void 0===u[1]?p=-2:(p=d.lastIndex-u[2].length,o=u[1],d=void 0===u[3]?f:'"'===u[3]?m:_):d===m||d===_?d=f:d===v||d===a$1?d=c:(d=f,h=void 0);const y=d===f&&t[i+1].startsWith("/>")?" ":"";r+=d===c?s+n:p>=0?(l.push(o),s.slice(0,p)+"$lit$"+s.slice(p)+e+y):s+e+(-2===p?(l.push(void 0),i):y);}const u=r+(t[o]||"<?>")+(2===i?"</svg>":"");if(!Array.isArray(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return [void 0!==s?s.createHTML(u):u,l]};class E{constructor({strings:t,_$litType$:s},n){let l;this.parts=[];let r=0,d=0;const u=t.length-1,c=this.parts,[v,a]=C(t,s);if(this.el=E.createElement(v,n),A.currentNode=this.el.content,2===s){const t=this.el.content,i=t.firstChild;i.remove(),t.append(...i.childNodes);}for(;null!==(l=A.nextNode())&&c.length<u;){if(1===l.nodeType){if(l.hasAttributes()){const t=[];for(const i of l.getAttributeNames())if(i.endsWith("$lit$")||i.startsWith(e)){const s=a[d++];if(t.push(i),void 0!==s){const t=l.getAttribute(s.toLowerCase()+"$lit$").split(e),i=/([.?@])?(.*)/.exec(s);c.push({type:1,index:r,name:i[2],strings:t,ctor:"."===i[1]?M:"?"===i[1]?H$1:"@"===i[1]?I:S$1});}else c.push({type:6,index:r});}for(const i of t)l.removeAttribute(i);}if(g.test(l.tagName)){const t=l.textContent.split(e),s=t.length-1;if(s>0){l.textContent=i$1?i$1.emptyScript:"";for(let i=0;i<s;i++)l.append(t[i],h()),A.nextNode(),c.push({type:2,index:++r});l.append(t[s],h());}}}else if(8===l.nodeType)if(l.data===o)c.push({type:2,index:r});else {let t=-1;for(;-1!==(t=l.data.indexOf(e,t+1));)c.push({type:7,index:r}),t+=e.length-1;}r++;}}static createElement(t,i){const s=l.createElement("template");return s.innerHTML=t,s}}function P(t,i,s=t,e){var o,n,l,h;if(i===b)return i;let d=void 0!==e?null===(o=s._$Cl)||void 0===o?void 0:o[e]:s._$Cu;const u=r(i)?void 0:i._$litDirective$;return (null==d?void 0:d.constructor)!==u&&(null===(n=null==d?void 0:d._$AO)||void 0===n||n.call(d,!1),void 0===u?d=void 0:(d=new u(t),d._$AT(t,s,e)),void 0!==e?(null!==(l=(h=s)._$Cl)&&void 0!==l?l:h._$Cl=[])[e]=d:s._$Cu=d),void 0!==d&&(i=P(t,d._$AS(t,i.values),d,e)),i}class V{constructor(t,i){this.v=[],this._$AN=void 0,this._$AD=t,this._$AM=i;}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}p(t){var i;const{el:{content:s},parts:e}=this._$AD,o=(null!==(i=null==t?void 0:t.creationScope)&&void 0!==i?i:l).importNode(s,!0);A.currentNode=o;let n=A.nextNode(),h=0,r=0,d=e[0];for(;void 0!==d;){if(h===d.index){let i;2===d.type?i=new N(n,n.nextSibling,this,t):1===d.type?i=new d.ctor(n,d.name,d.strings,this,t):6===d.type&&(i=new L(n,this,t)),this.v.push(i),d=e[++r];}h!==(null==d?void 0:d.index)&&(n=A.nextNode(),h++);}return o}m(t){let i=0;for(const s of this.v)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++;}}class N{constructor(t,i,s,e){var o;this.type=2,this._$AH=w,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=s,this.options=e,this._$Cg=null===(o=null==e?void 0:e.isConnected)||void 0===o||o;}get _$AU(){var t,i;return null!==(i=null===(t=this._$AM)||void 0===t?void 0:t._$AU)&&void 0!==i?i:this._$Cg}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return void 0!==i&&11===t.nodeType&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=P(this,t,i),r(t)?t===w||null==t||""===t?(this._$AH!==w&&this._$AR(),this._$AH=w):t!==this._$AH&&t!==b&&this.$(t):void 0!==t._$litType$?this.T(t):void 0!==t.nodeType?this.k(t):u(t)?this.S(t):this.$(t);}M(t,i=this._$AB){return this._$AA.parentNode.insertBefore(t,i)}k(t){this._$AH!==t&&(this._$AR(),this._$AH=this.M(t));}$(t){this._$AH!==w&&r(this._$AH)?this._$AA.nextSibling.data=t:this.k(l.createTextNode(t)),this._$AH=t;}T(t){var i;const{values:s,_$litType$:e}=t,o="number"==typeof e?this._$AC(t):(void 0===e.el&&(e.el=E.createElement(e.h,this.options)),e);if((null===(i=this._$AH)||void 0===i?void 0:i._$AD)===o)this._$AH.m(s);else {const t=new V(o,this),i=t.p(this.options);t.m(s),this.k(i),this._$AH=t;}}_$AC(t){let i=T.get(t.strings);return void 0===i&&T.set(t.strings,i=new E(t)),i}S(t){d(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,e=0;for(const o of t)e===i.length?i.push(s=new N(this.M(h()),this.M(h()),this,this.options)):s=i[e],s._$AI(o),e++;e<i.length&&(this._$AR(s&&s._$AB.nextSibling,e),i.length=e);}_$AR(t=this._$AA.nextSibling,i){var s;for(null===(s=this._$AP)||void 0===s||s.call(this,!1,!0,i);t&&t!==this._$AB;){const i=t.nextSibling;t.remove(),t=i;}}setConnected(t){var i;void 0===this._$AM&&(this._$Cg=t,null===(i=this._$AP)||void 0===i||i.call(this,t));}}class S$1{constructor(t,i,s,e,o){this.type=1,this._$AH=w,this._$AN=void 0,this.element=t,this.name=i,this._$AM=e,this.options=o,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=w;}get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}_$AI(t,i=this,s,e){const o=this.strings;let n=!1;if(void 0===o)t=P(this,t,i,0),n=!r(t)||t!==this._$AH&&t!==b,n&&(this._$AH=t);else {const e=t;let l,h;for(t=o[0],l=0;l<o.length-1;l++)h=P(this,e[s+l],i,l),h===b&&(h=this._$AH[l]),n||(n=!r(h)||h!==this._$AH[l]),h===w?t=w:t!==w&&(t+=(null!=h?h:"")+o[l+1]),this._$AH[l]=h;}n&&!e&&this.C(t);}C(t){t===w?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,null!=t?t:"");}}class M extends S$1{constructor(){super(...arguments),this.type=3;}C(t){this.element[this.name]=t===w?void 0:t;}}const k=i$1?i$1.emptyScript:"";class H$1 extends S$1{constructor(){super(...arguments),this.type=4;}C(t){t&&t!==w?this.element.setAttribute(this.name,k):this.element.removeAttribute(this.name);}}class I extends S$1{constructor(t,i,s,e,o){super(t,i,s,e,o),this.type=5;}_$AI(t,i=this){var s;if((t=null!==(s=P(this,t,i,0))&&void 0!==s?s:w)===b)return;const e=this._$AH,o=t===w&&e!==w||t.capture!==e.capture||t.once!==e.once||t.passive!==e.passive,n=t!==w&&(e===w||o);o&&this.element.removeEventListener(this.name,this,e),n&&this.element.addEventListener(this.name,this,t),this._$AH=t;}handleEvent(t){var i,s;"function"==typeof this._$AH?this._$AH.call(null!==(s=null===(i=this.options)||void 0===i?void 0:i.host)&&void 0!==s?s:this.element,t):this._$AH.handleEvent(t);}}class L{constructor(t,i,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s;}get _$AU(){return this._$AM._$AU}_$AI(t){P(this,t);}}const z=window.litHtmlPolyfillSupport;null==z||z(E,N),(null!==(t=globalThis.litHtmlVersions)&&void 0!==t?t:globalThis.litHtmlVersions=[]).push("2.2.6");

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

const name = "world";
const sayHi = $`<h1>Hello ${name}</h1>`;
x(sayHi, document.getElementById("approot"));

 class TestCore {
   static __initStatic() {this.getCache = (() => {
    const caches = new WeakMap();
    return (cls) => {
      if (!caches.has(cls)) caches.set(cls, new WeakMap());
      return caches.get(cls);
    };
  })();}

   __init() {this.handlers = new Set();}
  $(handler) {
    this.handlers.add(handler);
    return this;
    // return () => {
    //   this.handlers.delete(handler);
    // };
  }

   mutate(values) {
    if (this.handlers.size === 0)
      console.error("no handlers, maybe this object already updated");

    const next = new (this.constructor )({
      ...this.s,
      "": this.id,
      ...values,
    }) ;
    for (const handler of this.handlers) {
      if (handler(next)) next.$(handler);
    }
    this.handlers.clear();
  }

  
  

  constructor(source) {TestCore.prototype.__init.call(this);
    const [id, s] = hash(source);
    // const s = source;

    {
      // check if an object already exists, if so, return that one
      const cache = TestCore.getCache(this.constructor);
      // @ts-ignore
      if (cache.has(s)) return cache.get(s);
      cache.set(s, this);
    }

    this.id = id;
    this.s = s;
  }

  
} TestCore.__initStatic();

class Line extends TestCore {constructor(...args) { super(...args); Line.prototype.__init2.call(this); }
  

  append(p) {
    this.mutate({ [Date.now().toString(36)]: p });
    console.log(this.s);
  }

   __init2() {this.coords = Object.values(this.s);}
}

let line = new Line({}).$((next) => (line = next));

// console.log({ test });

// console.log(test.a);
// test.a = 42;
// console.log(test.a);

document.body.addEventListener("mousemove", (e) => {
  line.append({ x: e.clientX, y: e.clientY });
  console.log(line.id, JSON.stringify(line.coords));
  // console.log(JSON.stringify(line));
});
