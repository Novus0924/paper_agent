import * as __agnesSharedReact from 'react'; var require = (id) => { if (id === 'react') return __agnesSharedReact; throw Error('Unexpected external require: ' + id) };
import {
  clsx,
  image_default
} from "./chunk-2AM5X6ED.js";
import {
  __commonJS,
  __export,
  __require,
  __toESM
} from "./chunk-PQXTPSN4.js";

// ../../node_modules/.pnpm/secure-json-parse@4.1.0/node_modules/secure-json-parse/index.js
var require_secure_json_parse = __commonJS({
  "../../node_modules/.pnpm/secure-json-parse@4.1.0/node_modules/secure-json-parse/index.js"(exports, module) {
    "use strict";
    var hasBuffer = typeof Buffer !== "undefined";
    var suspectProtoRx = /"(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])"\s*:/;
    var suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
    function _parse(text2, reviver, options2) {
      if (options2 == null) {
        if (reviver !== null && typeof reviver === "object") {
          options2 = reviver;
          reviver = void 0;
        }
      }
      if (hasBuffer && Buffer.isBuffer(text2)) {
        text2 = text2.toString();
      }
      if (text2 && text2.charCodeAt(0) === 65279) {
        text2 = text2.slice(1);
      }
      const obj = JSON.parse(text2, reviver);
      if (obj === null || typeof obj !== "object") {
        return obj;
      }
      const protoAction = options2 && options2.protoAction || "error";
      const constructorAction = options2 && options2.constructorAction || "error";
      if (protoAction === "ignore" && constructorAction === "ignore") {
        return obj;
      }
      if (protoAction !== "ignore" && constructorAction !== "ignore") {
        if (suspectProtoRx.test(text2) === false && suspectConstructorRx.test(text2) === false) {
          return obj;
        }
      } else if (protoAction !== "ignore" && constructorAction === "ignore") {
        if (suspectProtoRx.test(text2) === false) {
          return obj;
        }
      } else {
        if (suspectConstructorRx.test(text2) === false) {
          return obj;
        }
      }
      return filter(obj, { protoAction, constructorAction, safe: options2 && options2.safe });
    }
    function filter(obj, { protoAction = "error", constructorAction = "error", safe } = {}) {
      let next = [obj];
      while (next.length) {
        const nodes = next;
        next = [];
        for (const node of nodes) {
          if (protoAction !== "ignore" && Object.prototype.hasOwnProperty.call(node, "__proto__")) {
            if (safe === true) {
              return null;
            } else if (protoAction === "error") {
              throw new SyntaxError("Object contains forbidden prototype property");
            }
            delete node.__proto__;
          }
          if (constructorAction !== "ignore" && Object.prototype.hasOwnProperty.call(node, "constructor") && node.constructor !== null && typeof node.constructor === "object" && Object.prototype.hasOwnProperty.call(node.constructor, "prototype")) {
            if (safe === true) {
              return null;
            } else if (constructorAction === "error") {
              throw new SyntaxError("Object contains forbidden prototype property");
            }
            delete node.constructor;
          }
          for (const key in node) {
            const value = node[key];
            if (value && typeof value === "object") {
              next.push(value);
            }
          }
        }
      }
      return obj;
    }
    function parse(text2, reviver, options2) {
      const { stackTraceLimit } = Error;
      Error.stackTraceLimit = 0;
      try {
        return _parse(text2, reviver, options2);
      } finally {
        Error.stackTraceLimit = stackTraceLimit;
      }
    }
    function safeParse(text2, reviver) {
      const { stackTraceLimit } = Error;
      Error.stackTraceLimit = 0;
      try {
        return _parse(text2, reviver, { safe: true });
      } catch {
        return void 0;
      } finally {
        Error.stackTraceLimit = stackTraceLimit;
      }
    }
    module.exports = parse;
    module.exports.default = parse;
    module.exports.parse = parse;
    module.exports.safeParse = safeParse;
    module.exports.scan = filter;
  }
});

// ../../node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype/lib/index.js
var require_lib = __commonJS({
  "../../node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Doctype = exports.CDATA = exports.Tag = exports.Style = exports.Script = exports.Comment = exports.Directive = exports.Text = exports.Root = exports.isTag = exports.ElementType = void 0;
    var ElementType;
    (function(ElementType2) {
      ElementType2["Root"] = "root";
      ElementType2["Text"] = "text";
      ElementType2["Directive"] = "directive";
      ElementType2["Comment"] = "comment";
      ElementType2["Script"] = "script";
      ElementType2["Style"] = "style";
      ElementType2["Tag"] = "tag";
      ElementType2["CDATA"] = "cdata";
      ElementType2["Doctype"] = "doctype";
    })(ElementType = exports.ElementType || (exports.ElementType = {}));
    function isTag(elem) {
      return elem.type === ElementType.Tag || elem.type === ElementType.Script || elem.type === ElementType.Style;
    }
    exports.isTag = isTag;
    exports.Root = ElementType.Root;
    exports.Text = ElementType.Text;
    exports.Directive = ElementType.Directive;
    exports.Comment = ElementType.Comment;
    exports.Script = ElementType.Script;
    exports.Style = ElementType.Style;
    exports.Tag = ElementType.Tag;
    exports.CDATA = ElementType.CDATA;
    exports.Doctype = ElementType.Doctype;
  }
});

// ../../node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/lib/node.js
var require_node = __commonJS({
  "../../node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/lib/node.js"(exports) {
    "use strict";
    var __extends = exports && exports.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    var __assign = exports && exports.__assign || function() {
      __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.cloneNode = exports.hasChildren = exports.isDocument = exports.isDirective = exports.isComment = exports.isText = exports.isCDATA = exports.isTag = exports.Element = exports.Document = exports.CDATA = exports.NodeWithChildren = exports.ProcessingInstruction = exports.Comment = exports.Text = exports.DataNode = exports.Node = void 0;
    var domelementtype_1 = require_lib();
    var Node2 = (
      /** @class */
      (function() {
        function Node3() {
          this.parent = null;
          this.prev = null;
          this.next = null;
          this.startIndex = null;
          this.endIndex = null;
        }
        Object.defineProperty(Node3.prototype, "parentNode", {
          // Read-write aliases for properties
          /**
           * Same as {@link parent}.
           * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
           */
          get: function() {
            return this.parent;
          },
          set: function(parent) {
            this.parent = parent;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(Node3.prototype, "previousSibling", {
          /**
           * Same as {@link prev}.
           * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
           */
          get: function() {
            return this.prev;
          },
          set: function(prev) {
            this.prev = prev;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(Node3.prototype, "nextSibling", {
          /**
           * Same as {@link next}.
           * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
           */
          get: function() {
            return this.next;
          },
          set: function(next) {
            this.next = next;
          },
          enumerable: false,
          configurable: true
        });
        Node3.prototype.cloneNode = function(recursive) {
          if (recursive === void 0) {
            recursive = false;
          }
          return cloneNode(this, recursive);
        };
        return Node3;
      })()
    );
    exports.Node = Node2;
    var DataNode = (
      /** @class */
      (function(_super) {
        __extends(DataNode2, _super);
        function DataNode2(data) {
          var _this = _super.call(this) || this;
          _this.data = data;
          return _this;
        }
        Object.defineProperty(DataNode2.prototype, "nodeValue", {
          /**
           * Same as {@link data}.
           * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
           */
          get: function() {
            return this.data;
          },
          set: function(data) {
            this.data = data;
          },
          enumerable: false,
          configurable: true
        });
        return DataNode2;
      })(Node2)
    );
    exports.DataNode = DataNode;
    var Text2 = (
      /** @class */
      (function(_super) {
        __extends(Text3, _super);
        function Text3() {
          var _this = _super !== null && _super.apply(this, arguments) || this;
          _this.type = domelementtype_1.ElementType.Text;
          return _this;
        }
        Object.defineProperty(Text3.prototype, "nodeType", {
          get: function() {
            return 3;
          },
          enumerable: false,
          configurable: true
        });
        return Text3;
      })(DataNode)
    );
    exports.Text = Text2;
    var Comment2 = (
      /** @class */
      (function(_super) {
        __extends(Comment3, _super);
        function Comment3() {
          var _this = _super !== null && _super.apply(this, arguments) || this;
          _this.type = domelementtype_1.ElementType.Comment;
          return _this;
        }
        Object.defineProperty(Comment3.prototype, "nodeType", {
          get: function() {
            return 8;
          },
          enumerable: false,
          configurable: true
        });
        return Comment3;
      })(DataNode)
    );
    exports.Comment = Comment2;
    var ProcessingInstruction2 = (
      /** @class */
      (function(_super) {
        __extends(ProcessingInstruction3, _super);
        function ProcessingInstruction3(name, data) {
          var _this = _super.call(this, data) || this;
          _this.name = name;
          _this.type = domelementtype_1.ElementType.Directive;
          return _this;
        }
        Object.defineProperty(ProcessingInstruction3.prototype, "nodeType", {
          get: function() {
            return 1;
          },
          enumerable: false,
          configurable: true
        });
        return ProcessingInstruction3;
      })(DataNode)
    );
    exports.ProcessingInstruction = ProcessingInstruction2;
    var NodeWithChildren = (
      /** @class */
      (function(_super) {
        __extends(NodeWithChildren2, _super);
        function NodeWithChildren2(children) {
          var _this = _super.call(this) || this;
          _this.children = children;
          return _this;
        }
        Object.defineProperty(NodeWithChildren2.prototype, "firstChild", {
          // Aliases
          /** First child of the node. */
          get: function() {
            var _a;
            return (_a = this.children[0]) !== null && _a !== void 0 ? _a : null;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(NodeWithChildren2.prototype, "lastChild", {
          /** Last child of the node. */
          get: function() {
            return this.children.length > 0 ? this.children[this.children.length - 1] : null;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(NodeWithChildren2.prototype, "childNodes", {
          /**
           * Same as {@link children}.
           * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
           */
          get: function() {
            return this.children;
          },
          set: function(children) {
            this.children = children;
          },
          enumerable: false,
          configurable: true
        });
        return NodeWithChildren2;
      })(Node2)
    );
    exports.NodeWithChildren = NodeWithChildren;
    var CDATA = (
      /** @class */
      (function(_super) {
        __extends(CDATA2, _super);
        function CDATA2() {
          var _this = _super !== null && _super.apply(this, arguments) || this;
          _this.type = domelementtype_1.ElementType.CDATA;
          return _this;
        }
        Object.defineProperty(CDATA2.prototype, "nodeType", {
          get: function() {
            return 4;
          },
          enumerable: false,
          configurable: true
        });
        return CDATA2;
      })(NodeWithChildren)
    );
    exports.CDATA = CDATA;
    var Document = (
      /** @class */
      (function(_super) {
        __extends(Document2, _super);
        function Document2() {
          var _this = _super !== null && _super.apply(this, arguments) || this;
          _this.type = domelementtype_1.ElementType.Root;
          return _this;
        }
        Object.defineProperty(Document2.prototype, "nodeType", {
          get: function() {
            return 9;
          },
          enumerable: false,
          configurable: true
        });
        return Document2;
      })(NodeWithChildren)
    );
    exports.Document = Document;
    var Element2 = (
      /** @class */
      (function(_super) {
        __extends(Element3, _super);
        function Element3(name, attribs, children, type) {
          if (children === void 0) {
            children = [];
          }
          if (type === void 0) {
            type = name === "script" ? domelementtype_1.ElementType.Script : name === "style" ? domelementtype_1.ElementType.Style : domelementtype_1.ElementType.Tag;
          }
          var _this = _super.call(this, children) || this;
          _this.name = name;
          _this.attribs = attribs;
          _this.type = type;
          return _this;
        }
        Object.defineProperty(Element3.prototype, "nodeType", {
          get: function() {
            return 1;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(Element3.prototype, "tagName", {
          // DOM Level 1 aliases
          /**
           * Same as {@link name}.
           * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
           */
          get: function() {
            return this.name;
          },
          set: function(name) {
            this.name = name;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(Element3.prototype, "attributes", {
          get: function() {
            var _this = this;
            return Object.keys(this.attribs).map(function(name) {
              var _a, _b;
              return {
                name,
                value: _this.attribs[name],
                namespace: (_a = _this["x-attribsNamespace"]) === null || _a === void 0 ? void 0 : _a[name],
                prefix: (_b = _this["x-attribsPrefix"]) === null || _b === void 0 ? void 0 : _b[name]
              };
            });
          },
          enumerable: false,
          configurable: true
        });
        return Element3;
      })(NodeWithChildren)
    );
    exports.Element = Element2;
    function isTag(node) {
      return (0, domelementtype_1.isTag)(node);
    }
    exports.isTag = isTag;
    function isCDATA(node) {
      return node.type === domelementtype_1.ElementType.CDATA;
    }
    exports.isCDATA = isCDATA;
    function isText(node) {
      return node.type === domelementtype_1.ElementType.Text;
    }
    exports.isText = isText;
    function isComment(node) {
      return node.type === domelementtype_1.ElementType.Comment;
    }
    exports.isComment = isComment;
    function isDirective(node) {
      return node.type === domelementtype_1.ElementType.Directive;
    }
    exports.isDirective = isDirective;
    function isDocument(node) {
      return node.type === domelementtype_1.ElementType.Root;
    }
    exports.isDocument = isDocument;
    function hasChildren(node) {
      return Object.prototype.hasOwnProperty.call(node, "children");
    }
    exports.hasChildren = hasChildren;
    function cloneNode(node, recursive) {
      if (recursive === void 0) {
        recursive = false;
      }
      var result;
      if (isText(node)) {
        result = new Text2(node.data);
      } else if (isComment(node)) {
        result = new Comment2(node.data);
      } else if (isTag(node)) {
        var children = recursive ? cloneChildren(node.children) : [];
        var clone_1 = new Element2(node.name, __assign({}, node.attribs), children);
        children.forEach(function(child) {
          return child.parent = clone_1;
        });
        if (node.namespace != null) {
          clone_1.namespace = node.namespace;
        }
        if (node["x-attribsNamespace"]) {
          clone_1["x-attribsNamespace"] = __assign({}, node["x-attribsNamespace"]);
        }
        if (node["x-attribsPrefix"]) {
          clone_1["x-attribsPrefix"] = __assign({}, node["x-attribsPrefix"]);
        }
        result = clone_1;
      } else if (isCDATA(node)) {
        var children = recursive ? cloneChildren(node.children) : [];
        var clone_2 = new CDATA(children);
        children.forEach(function(child) {
          return child.parent = clone_2;
        });
        result = clone_2;
      } else if (isDocument(node)) {
        var children = recursive ? cloneChildren(node.children) : [];
        var clone_3 = new Document(children);
        children.forEach(function(child) {
          return child.parent = clone_3;
        });
        if (node["x-mode"]) {
          clone_3["x-mode"] = node["x-mode"];
        }
        result = clone_3;
      } else if (isDirective(node)) {
        var instruction = new ProcessingInstruction2(node.name, node.data);
        if (node["x-name"] != null) {
          instruction["x-name"] = node["x-name"];
          instruction["x-publicId"] = node["x-publicId"];
          instruction["x-systemId"] = node["x-systemId"];
        }
        result = instruction;
      } else {
        throw new Error("Not implemented yet: ".concat(node.type));
      }
      result.startIndex = node.startIndex;
      result.endIndex = node.endIndex;
      if (node.sourceCodeLocation != null) {
        result.sourceCodeLocation = node.sourceCodeLocation;
      }
      return result;
    }
    exports.cloneNode = cloneNode;
    function cloneChildren(childs) {
      var children = childs.map(function(child) {
        return cloneNode(child, true);
      });
      for (var i = 1; i < children.length; i++) {
        children[i].prev = children[i - 1];
        children[i - 1].next = children[i];
      }
      return children;
    }
  }
});

// ../../node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/lib/index.js
var require_lib2 = __commonJS({
  "../../node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/lib/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DomHandler = void 0;
    var domelementtype_1 = require_lib();
    var node_js_1 = require_node();
    __exportStar(require_node(), exports);
    var defaultOpts = {
      withStartIndices: false,
      withEndIndices: false,
      xmlMode: false
    };
    var DomHandler = (
      /** @class */
      (function() {
        function DomHandler2(callback, options2, elementCB) {
          this.dom = [];
          this.root = new node_js_1.Document(this.dom);
          this.done = false;
          this.tagStack = [this.root];
          this.lastNode = null;
          this.parser = null;
          if (typeof options2 === "function") {
            elementCB = options2;
            options2 = defaultOpts;
          }
          if (typeof callback === "object") {
            options2 = callback;
            callback = void 0;
          }
          this.callback = callback !== null && callback !== void 0 ? callback : null;
          this.options = options2 !== null && options2 !== void 0 ? options2 : defaultOpts;
          this.elementCB = elementCB !== null && elementCB !== void 0 ? elementCB : null;
        }
        DomHandler2.prototype.onparserinit = function(parser2) {
          this.parser = parser2;
        };
        DomHandler2.prototype.onreset = function() {
          this.dom = [];
          this.root = new node_js_1.Document(this.dom);
          this.done = false;
          this.tagStack = [this.root];
          this.lastNode = null;
          this.parser = null;
        };
        DomHandler2.prototype.onend = function() {
          if (this.done)
            return;
          this.done = true;
          this.parser = null;
          this.handleCallback(null);
        };
        DomHandler2.prototype.onerror = function(error) {
          this.handleCallback(error);
        };
        DomHandler2.prototype.onclosetag = function() {
          this.lastNode = null;
          var elem = this.tagStack.pop();
          if (this.options.withEndIndices) {
            elem.endIndex = this.parser.endIndex;
          }
          if (this.elementCB)
            this.elementCB(elem);
        };
        DomHandler2.prototype.onopentag = function(name, attribs) {
          var type = this.options.xmlMode ? domelementtype_1.ElementType.Tag : void 0;
          var element = new node_js_1.Element(name, attribs, void 0, type);
          this.addNode(element);
          this.tagStack.push(element);
        };
        DomHandler2.prototype.ontext = function(data) {
          var lastNode = this.lastNode;
          if (lastNode && lastNode.type === domelementtype_1.ElementType.Text) {
            lastNode.data += data;
            if (this.options.withEndIndices) {
              lastNode.endIndex = this.parser.endIndex;
            }
          } else {
            var node = new node_js_1.Text(data);
            this.addNode(node);
            this.lastNode = node;
          }
        };
        DomHandler2.prototype.oncomment = function(data) {
          if (this.lastNode && this.lastNode.type === domelementtype_1.ElementType.Comment) {
            this.lastNode.data += data;
            return;
          }
          var node = new node_js_1.Comment(data);
          this.addNode(node);
          this.lastNode = node;
        };
        DomHandler2.prototype.oncommentend = function() {
          this.lastNode = null;
        };
        DomHandler2.prototype.oncdatastart = function() {
          var text2 = new node_js_1.Text("");
          var node = new node_js_1.CDATA([text2]);
          this.addNode(node);
          text2.parent = node;
          this.lastNode = text2;
        };
        DomHandler2.prototype.oncdataend = function() {
          this.lastNode = null;
        };
        DomHandler2.prototype.onprocessinginstruction = function(name, data) {
          var node = new node_js_1.ProcessingInstruction(name, data);
          this.addNode(node);
        };
        DomHandler2.prototype.handleCallback = function(error) {
          if (typeof this.callback === "function") {
            this.callback(error, this.dom);
          } else if (error) {
            throw error;
          }
        };
        DomHandler2.prototype.addNode = function(node) {
          var parent = this.tagStack[this.tagStack.length - 1];
          var previousSibling = parent.children[parent.children.length - 1];
          if (this.options.withStartIndices) {
            node.startIndex = this.parser.startIndex;
          }
          if (this.options.withEndIndices) {
            node.endIndex = this.parser.endIndex;
          }
          parent.children.push(node);
          if (previousSibling) {
            node.prev = previousSibling;
            previousSibling.next = node;
          }
          node.parent = parent;
          this.lastNode = null;
        };
        return DomHandler2;
      })()
    );
    exports.DomHandler = DomHandler;
    exports.default = DomHandler;
  }
});

// ../../node_modules/.pnpm/html-dom-parser@5.1.8/node_modules/html-dom-parser/lib/client/constants.js
var require_constants = __commonJS({
  "../../node_modules/.pnpm/html-dom-parser@5.1.8/node_modules/html-dom-parser/lib/client/constants.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CARRIAGE_RETURN_PLACEHOLDER_REGEX = exports.CARRIAGE_RETURN_PLACEHOLDER = exports.CARRIAGE_RETURN_REGEX = exports.CARRIAGE_RETURN = exports.CASE_SENSITIVE_TAG_NAMES_MAP = exports.CASE_SENSITIVE_TAG_NAMES = void 0;
    exports.CASE_SENSITIVE_TAG_NAMES = [
      "animateMotion",
      "animateTransform",
      "clipPath",
      "feBlend",
      "feColorMatrix",
      "feComponentTransfer",
      "feComposite",
      "feConvolveMatrix",
      "feDiffuseLighting",
      "feDisplacementMap",
      "feDropShadow",
      "feFlood",
      "feFuncA",
      "feFuncB",
      "feFuncG",
      "feFuncR",
      "feGaussianBlur",
      "feImage",
      "feMerge",
      "feMergeNode",
      "feMorphology",
      "feOffset",
      "fePointLight",
      "feSpecularLighting",
      "feSpotLight",
      "feTile",
      "feTurbulence",
      "foreignObject",
      "linearGradient",
      "radialGradient",
      "textPath"
    ];
    exports.CASE_SENSITIVE_TAG_NAMES_MAP = exports.CASE_SENSITIVE_TAG_NAMES.reduce(function(accumulator, tagName) {
      accumulator[tagName.toLowerCase()] = tagName;
      return accumulator;
    }, {});
    exports.CARRIAGE_RETURN = "\r";
    exports.CARRIAGE_RETURN_REGEX = new RegExp(exports.CARRIAGE_RETURN, "g");
    exports.CARRIAGE_RETURN_PLACEHOLDER = "__HTML_DOM_PARSER_CARRIAGE_RETURN_PLACEHOLDER_".concat(Date.now().toString(), "__");
    exports.CARRIAGE_RETURN_PLACEHOLDER_REGEX = new RegExp(exports.CARRIAGE_RETURN_PLACEHOLDER, "g");
  }
});

// ../../node_modules/.pnpm/html-dom-parser@5.1.8/node_modules/html-dom-parser/lib/client/utilities.js
var require_utilities = __commonJS({
  "../../node_modules/.pnpm/html-dom-parser@5.1.8/node_modules/html-dom-parser/lib/client/utilities.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatAttributes = formatAttributes;
    exports.hasOpenTag = hasOpenTag;
    exports.escapeSpecialCharacters = escapeSpecialCharacters;
    exports.revertEscapedCharacters = revertEscapedCharacters;
    exports.formatDOM = formatDOM;
    var domhandler_1 = require_lib2();
    var constants_1 = require_constants();
    function getCaseSensitiveTagName(tagName) {
      return constants_1.CASE_SENSITIVE_TAG_NAMES_MAP[tagName];
    }
    function formatAttributes(attributes) {
      var map = {};
      var index = 0;
      var attributesLength = attributes.length;
      for (; index < attributesLength; index++) {
        var attribute = attributes[index];
        map[attribute.name] = attribute.value;
      }
      return map;
    }
    function formatTagName(tagName) {
      tagName = tagName.toLowerCase();
      var caseSensitiveTagName = getCaseSensitiveTagName(tagName);
      if (caseSensitiveTagName) {
        return caseSensitiveTagName;
      }
      return tagName;
    }
    function hasOpenTag(html3, tagName) {
      var openTag = "<" + tagName;
      var index = html3.toLowerCase().indexOf(openTag);
      if (index === -1) {
        return false;
      }
      var char = html3[index + openTag.length];
      return char === ">" || char === " " || char === "	" || char === "\n" || char === "\r" || char === "/";
    }
    function escapeSpecialCharacters(html3) {
      return html3.replace(constants_1.CARRIAGE_RETURN_REGEX, constants_1.CARRIAGE_RETURN_PLACEHOLDER);
    }
    function revertEscapedCharacters(text2) {
      return text2.replace(constants_1.CARRIAGE_RETURN_PLACEHOLDER_REGEX, constants_1.CARRIAGE_RETURN);
    }
    function formatDOM(nodes, parent, directive) {
      var _a, _b, _c, _d;
      if (parent === void 0) {
        parent = null;
      }
      var domNodes = [];
      var current;
      var index = 0;
      var nodesLength = nodes.length;
      for (; index < nodesLength; index++) {
        var node = nodes[index];
        switch (node.nodeType) {
          case 1: {
            var tagName = formatTagName(node.nodeName);
            current = new domhandler_1.Element(tagName, formatAttributes(node.attributes));
            current.children = formatDOM(
              // template children are on content
              tagName === "template" ? node.content.childNodes : node.childNodes,
              current
            );
            break;
          }
          case 3:
            current = new domhandler_1.Text(revertEscapedCharacters((_a = node.nodeValue) !== null && _a !== void 0 ? _a : ""));
            break;
          case 8:
            current = new domhandler_1.Comment((_b = node.nodeValue) !== null && _b !== void 0 ? _b : "");
            break;
          default:
            continue;
        }
        var prev = (_c = domNodes[index - 1]) !== null && _c !== void 0 ? _c : null;
        if (prev) {
          prev.next = current;
        }
        current.parent = parent;
        current.prev = prev;
        current.next = null;
        domNodes.push(current);
      }
      if (directive) {
        current = new domhandler_1.ProcessingInstruction(directive.substring(0, directive.indexOf(" ")).toLowerCase(), directive);
        current.next = (_d = domNodes[0]) !== null && _d !== void 0 ? _d : null;
        current.parent = parent;
        domNodes.unshift(current);
        if (domNodes[1]) {
          domNodes[1].prev = domNodes[0];
        }
      }
      return domNodes;
    }
  }
});

// ../../node_modules/.pnpm/html-dom-parser@5.1.8/node_modules/html-dom-parser/lib/client/domparser.js
var require_domparser = __commonJS({
  "../../node_modules/.pnpm/html-dom-parser@5.1.8/node_modules/html-dom-parser/lib/client/domparser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = domparser;
    var utilities_1 = require_utilities();
    var HTML = "html";
    var HEAD = "head";
    var BODY = "body";
    var FIRST_TAG_REGEX = /<([a-zA-Z]+[0-9]?)/;
    var parseFromDocument = function(html3, tagName) {
      throw new Error("This browser does not support `document.implementation.createHTMLDocument`");
    };
    var parseFromString = function(html3, tagName) {
      throw new Error("This browser does not support `DOMParser.prototype.parseFromString`");
    };
    var DOMParser2 = typeof window === "object" && window.DOMParser;
    if (typeof DOMParser2 === "function") {
      domParser_1 = new DOMParser2();
      mimeType_1 = "text/html";
      parseFromString = function(html3, tagName) {
        if (tagName) {
          html3 = "<".concat(tagName, ">").concat(html3, "</").concat(tagName, ">");
        }
        return domParser_1.parseFromString(html3, mimeType_1);
      };
      parseFromDocument = parseFromString;
    }
    var domParser_1;
    var mimeType_1;
    if (typeof document === "object" && document.implementation) {
      htmlDocument_1 = document.implementation.createHTMLDocument();
      parseFromDocument = function(html3, tagName) {
        if (tagName) {
          var element = htmlDocument_1.documentElement.querySelector(tagName);
          if (element) {
            element.innerHTML = html3;
          }
          return htmlDocument_1;
        }
        htmlDocument_1.documentElement.innerHTML = html3;
        return htmlDocument_1;
      };
    }
    var htmlDocument_1;
    var template = typeof document === "object" && document.createElement("template");
    var parseFromTemplate;
    if (template && template.content) {
      parseFromTemplate = function(html3) {
        template.innerHTML = html3;
        return template.content.childNodes;
      };
    }
    var createNodeList = (
      /* istanbul ignore next */
      function() {
        return document.createDocumentFragment().childNodes;
      }
    );
    function domparser(html3) {
      var _a, _b, _c, _d, _e, _f;
      html3 = (0, utilities_1.escapeSpecialCharacters)(html3);
      var match = FIRST_TAG_REGEX.exec(html3);
      var firstTagName = (_a = match === null || match === void 0 ? void 0 : match[1]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
      switch (firstTagName) {
        case HTML: {
          var doc = parseFromString(html3);
          if (!(0, utilities_1.hasOpenTag)(html3, HEAD)) {
            var element = doc.querySelector(HEAD);
            (_b = element === null || element === void 0 ? void 0 : element.parentNode) === null || _b === void 0 ? void 0 : _b.removeChild(element);
          }
          if (!(0, utilities_1.hasOpenTag)(html3, BODY)) {
            var element = doc.querySelector(BODY);
            (_c = element === null || element === void 0 ? void 0 : element.parentNode) === null || _c === void 0 ? void 0 : _c.removeChild(element);
          }
          return doc.querySelectorAll(HTML);
        }
        case HEAD:
        case BODY: {
          var elements = parseFromDocument(html3).querySelectorAll(firstTagName);
          if ((0, utilities_1.hasOpenTag)(html3, BODY) && (0, utilities_1.hasOpenTag)(html3, HEAD)) {
            return (_e = (_d = elements[0].parentNode) === null || _d === void 0 ? void 0 : _d.childNodes) !== null && _e !== void 0 ? _e : createNodeList();
          }
          return elements;
        }
        // low-level tag or text
        default: {
          if (parseFromTemplate) {
            return parseFromTemplate(html3);
          }
          var element = parseFromDocument(html3, BODY).querySelector(BODY);
          return (_f = element === null || element === void 0 ? void 0 : element.childNodes) !== null && _f !== void 0 ? _f : createNodeList();
        }
      }
    }
  }
});

// ../../node_modules/.pnpm/html-dom-parser@5.1.8/node_modules/html-dom-parser/lib/client/html-to-dom.js
var require_html_to_dom = __commonJS({
  "../../node_modules/.pnpm/html-dom-parser@5.1.8/node_modules/html-dom-parser/lib/client/html-to-dom.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = HTMLDOMParser;
    var domparser_1 = __importDefault(require_domparser());
    var utilities_1 = require_utilities();
    var DIRECTIVE_REGEX = /<(![a-zA-Z\s]+)>/;
    function HTMLDOMParser(html3) {
      if (typeof html3 !== "string") {
        throw new TypeError("First argument must be a string");
      }
      if (!html3) {
        return [];
      }
      var match = DIRECTIVE_REGEX.exec(html3);
      var directive = match ? match[1] : void 0;
      return (0, utilities_1.formatDOM)((0, domparser_1.default)(html3), null, directive);
    }
  }
});

// ../../node_modules/.pnpm/react-property@2.0.2/node_modules/react-property/lib/possibleStandardNamesOptimized.js
var require_possibleStandardNamesOptimized = __commonJS({
  "../../node_modules/.pnpm/react-property@2.0.2/node_modules/react-property/lib/possibleStandardNamesOptimized.js"(exports) {
    var SAME = 0;
    exports.SAME = SAME;
    var CAMELCASE = 1;
    exports.CAMELCASE = CAMELCASE;
    exports.possibleStandardNames = {
      accept: 0,
      acceptCharset: 1,
      "accept-charset": "acceptCharset",
      accessKey: 1,
      action: 0,
      allowFullScreen: 1,
      alt: 0,
      as: 0,
      async: 0,
      autoCapitalize: 1,
      autoComplete: 1,
      autoCorrect: 1,
      autoFocus: 1,
      autoPlay: 1,
      autoSave: 1,
      capture: 0,
      cellPadding: 1,
      cellSpacing: 1,
      challenge: 0,
      charSet: 1,
      checked: 0,
      children: 0,
      cite: 0,
      class: "className",
      classID: 1,
      className: 1,
      cols: 0,
      colSpan: 1,
      content: 0,
      contentEditable: 1,
      contextMenu: 1,
      controls: 0,
      controlsList: 1,
      coords: 0,
      crossOrigin: 1,
      dangerouslySetInnerHTML: 1,
      data: 0,
      dateTime: 1,
      default: 0,
      defaultChecked: 1,
      defaultValue: 1,
      defer: 0,
      dir: 0,
      disabled: 0,
      disablePictureInPicture: 1,
      disableRemotePlayback: 1,
      download: 0,
      draggable: 0,
      encType: 1,
      enterKeyHint: 1,
      for: "htmlFor",
      form: 0,
      formMethod: 1,
      formAction: 1,
      formEncType: 1,
      formNoValidate: 1,
      formTarget: 1,
      frameBorder: 1,
      headers: 0,
      height: 0,
      hidden: 0,
      high: 0,
      href: 0,
      hrefLang: 1,
      htmlFor: 1,
      httpEquiv: 1,
      "http-equiv": "httpEquiv",
      icon: 0,
      id: 0,
      innerHTML: 1,
      inputMode: 1,
      integrity: 0,
      is: 0,
      itemID: 1,
      itemProp: 1,
      itemRef: 1,
      itemScope: 1,
      itemType: 1,
      keyParams: 1,
      keyType: 1,
      kind: 0,
      label: 0,
      lang: 0,
      list: 0,
      loop: 0,
      low: 0,
      manifest: 0,
      marginWidth: 1,
      marginHeight: 1,
      max: 0,
      maxLength: 1,
      media: 0,
      mediaGroup: 1,
      method: 0,
      min: 0,
      minLength: 1,
      multiple: 0,
      muted: 0,
      name: 0,
      noModule: 1,
      nonce: 0,
      noValidate: 1,
      open: 0,
      optimum: 0,
      pattern: 0,
      placeholder: 0,
      playsInline: 1,
      poster: 0,
      preload: 0,
      profile: 0,
      radioGroup: 1,
      readOnly: 1,
      referrerPolicy: 1,
      rel: 0,
      required: 0,
      reversed: 0,
      role: 0,
      rows: 0,
      rowSpan: 1,
      sandbox: 0,
      scope: 0,
      scoped: 0,
      scrolling: 0,
      seamless: 0,
      selected: 0,
      shape: 0,
      size: 0,
      sizes: 0,
      span: 0,
      spellCheck: 1,
      src: 0,
      srcDoc: 1,
      srcLang: 1,
      srcSet: 1,
      start: 0,
      step: 0,
      style: 0,
      summary: 0,
      tabIndex: 1,
      target: 0,
      title: 0,
      type: 0,
      useMap: 1,
      value: 0,
      width: 0,
      wmode: 0,
      wrap: 0,
      about: 0,
      accentHeight: 1,
      "accent-height": "accentHeight",
      accumulate: 0,
      additive: 0,
      alignmentBaseline: 1,
      "alignment-baseline": "alignmentBaseline",
      allowReorder: 1,
      alphabetic: 0,
      amplitude: 0,
      arabicForm: 1,
      "arabic-form": "arabicForm",
      ascent: 0,
      attributeName: 1,
      attributeType: 1,
      autoReverse: 1,
      azimuth: 0,
      baseFrequency: 1,
      baselineShift: 1,
      "baseline-shift": "baselineShift",
      baseProfile: 1,
      bbox: 0,
      begin: 0,
      bias: 0,
      by: 0,
      calcMode: 1,
      capHeight: 1,
      "cap-height": "capHeight",
      clip: 0,
      clipPath: 1,
      "clip-path": "clipPath",
      clipPathUnits: 1,
      clipRule: 1,
      "clip-rule": "clipRule",
      color: 0,
      colorInterpolation: 1,
      "color-interpolation": "colorInterpolation",
      colorInterpolationFilters: 1,
      "color-interpolation-filters": "colorInterpolationFilters",
      colorProfile: 1,
      "color-profile": "colorProfile",
      colorRendering: 1,
      "color-rendering": "colorRendering",
      contentScriptType: 1,
      contentStyleType: 1,
      cursor: 0,
      cx: 0,
      cy: 0,
      d: 0,
      datatype: 0,
      decelerate: 0,
      descent: 0,
      diffuseConstant: 1,
      direction: 0,
      display: 0,
      divisor: 0,
      dominantBaseline: 1,
      "dominant-baseline": "dominantBaseline",
      dur: 0,
      dx: 0,
      dy: 0,
      edgeMode: 1,
      elevation: 0,
      enableBackground: 1,
      "enable-background": "enableBackground",
      end: 0,
      exponent: 0,
      externalResourcesRequired: 1,
      fill: 0,
      fillOpacity: 1,
      "fill-opacity": "fillOpacity",
      fillRule: 1,
      "fill-rule": "fillRule",
      filter: 0,
      filterRes: 1,
      filterUnits: 1,
      floodOpacity: 1,
      "flood-opacity": "floodOpacity",
      floodColor: 1,
      "flood-color": "floodColor",
      focusable: 0,
      fontFamily: 1,
      "font-family": "fontFamily",
      fontSize: 1,
      "font-size": "fontSize",
      fontSizeAdjust: 1,
      "font-size-adjust": "fontSizeAdjust",
      fontStretch: 1,
      "font-stretch": "fontStretch",
      fontStyle: 1,
      "font-style": "fontStyle",
      fontVariant: 1,
      "font-variant": "fontVariant",
      fontWeight: 1,
      "font-weight": "fontWeight",
      format: 0,
      from: 0,
      fx: 0,
      fy: 0,
      g1: 0,
      g2: 0,
      glyphName: 1,
      "glyph-name": "glyphName",
      glyphOrientationHorizontal: 1,
      "glyph-orientation-horizontal": "glyphOrientationHorizontal",
      glyphOrientationVertical: 1,
      "glyph-orientation-vertical": "glyphOrientationVertical",
      glyphRef: 1,
      gradientTransform: 1,
      gradientUnits: 1,
      hanging: 0,
      horizAdvX: 1,
      "horiz-adv-x": "horizAdvX",
      horizOriginX: 1,
      "horiz-origin-x": "horizOriginX",
      ideographic: 0,
      imageRendering: 1,
      "image-rendering": "imageRendering",
      in2: 0,
      in: 0,
      inlist: 0,
      intercept: 0,
      k1: 0,
      k2: 0,
      k3: 0,
      k4: 0,
      k: 0,
      kernelMatrix: 1,
      kernelUnitLength: 1,
      kerning: 0,
      keyPoints: 1,
      keySplines: 1,
      keyTimes: 1,
      lengthAdjust: 1,
      letterSpacing: 1,
      "letter-spacing": "letterSpacing",
      lightingColor: 1,
      "lighting-color": "lightingColor",
      limitingConeAngle: 1,
      local: 0,
      markerEnd: 1,
      "marker-end": "markerEnd",
      markerHeight: 1,
      markerMid: 1,
      "marker-mid": "markerMid",
      markerStart: 1,
      "marker-start": "markerStart",
      markerUnits: 1,
      markerWidth: 1,
      mask: 0,
      maskContentUnits: 1,
      maskUnits: 1,
      mathematical: 0,
      mode: 0,
      numOctaves: 1,
      offset: 0,
      opacity: 0,
      operator: 0,
      order: 0,
      orient: 0,
      orientation: 0,
      origin: 0,
      overflow: 0,
      overlinePosition: 1,
      "overline-position": "overlinePosition",
      overlineThickness: 1,
      "overline-thickness": "overlineThickness",
      paintOrder: 1,
      "paint-order": "paintOrder",
      panose1: 0,
      "panose-1": "panose1",
      pathLength: 1,
      patternContentUnits: 1,
      patternTransform: 1,
      patternUnits: 1,
      pointerEvents: 1,
      "pointer-events": "pointerEvents",
      points: 0,
      pointsAtX: 1,
      pointsAtY: 1,
      pointsAtZ: 1,
      prefix: 0,
      preserveAlpha: 1,
      preserveAspectRatio: 1,
      primitiveUnits: 1,
      property: 0,
      r: 0,
      radius: 0,
      refX: 1,
      refY: 1,
      renderingIntent: 1,
      "rendering-intent": "renderingIntent",
      repeatCount: 1,
      repeatDur: 1,
      requiredExtensions: 1,
      requiredFeatures: 1,
      resource: 0,
      restart: 0,
      result: 0,
      results: 0,
      rotate: 0,
      rx: 0,
      ry: 0,
      scale: 0,
      security: 0,
      seed: 0,
      shapeRendering: 1,
      "shape-rendering": "shapeRendering",
      slope: 0,
      spacing: 0,
      specularConstant: 1,
      specularExponent: 1,
      speed: 0,
      spreadMethod: 1,
      startOffset: 1,
      stdDeviation: 1,
      stemh: 0,
      stemv: 0,
      stitchTiles: 1,
      stopColor: 1,
      "stop-color": "stopColor",
      stopOpacity: 1,
      "stop-opacity": "stopOpacity",
      strikethroughPosition: 1,
      "strikethrough-position": "strikethroughPosition",
      strikethroughThickness: 1,
      "strikethrough-thickness": "strikethroughThickness",
      string: 0,
      stroke: 0,
      strokeDasharray: 1,
      "stroke-dasharray": "strokeDasharray",
      strokeDashoffset: 1,
      "stroke-dashoffset": "strokeDashoffset",
      strokeLinecap: 1,
      "stroke-linecap": "strokeLinecap",
      strokeLinejoin: 1,
      "stroke-linejoin": "strokeLinejoin",
      strokeMiterlimit: 1,
      "stroke-miterlimit": "strokeMiterlimit",
      strokeWidth: 1,
      "stroke-width": "strokeWidth",
      strokeOpacity: 1,
      "stroke-opacity": "strokeOpacity",
      suppressContentEditableWarning: 1,
      suppressHydrationWarning: 1,
      surfaceScale: 1,
      systemLanguage: 1,
      tableValues: 1,
      targetX: 1,
      targetY: 1,
      textAnchor: 1,
      "text-anchor": "textAnchor",
      textDecoration: 1,
      "text-decoration": "textDecoration",
      textLength: 1,
      textRendering: 1,
      "text-rendering": "textRendering",
      to: 0,
      transform: 0,
      typeof: 0,
      u1: 0,
      u2: 0,
      underlinePosition: 1,
      "underline-position": "underlinePosition",
      underlineThickness: 1,
      "underline-thickness": "underlineThickness",
      unicode: 0,
      unicodeBidi: 1,
      "unicode-bidi": "unicodeBidi",
      unicodeRange: 1,
      "unicode-range": "unicodeRange",
      unitsPerEm: 1,
      "units-per-em": "unitsPerEm",
      unselectable: 0,
      vAlphabetic: 1,
      "v-alphabetic": "vAlphabetic",
      values: 0,
      vectorEffect: 1,
      "vector-effect": "vectorEffect",
      version: 0,
      vertAdvY: 1,
      "vert-adv-y": "vertAdvY",
      vertOriginX: 1,
      "vert-origin-x": "vertOriginX",
      vertOriginY: 1,
      "vert-origin-y": "vertOriginY",
      vHanging: 1,
      "v-hanging": "vHanging",
      vIdeographic: 1,
      "v-ideographic": "vIdeographic",
      viewBox: 1,
      viewTarget: 1,
      visibility: 0,
      vMathematical: 1,
      "v-mathematical": "vMathematical",
      vocab: 0,
      widths: 0,
      wordSpacing: 1,
      "word-spacing": "wordSpacing",
      writingMode: 1,
      "writing-mode": "writingMode",
      x1: 0,
      x2: 0,
      x: 0,
      xChannelSelector: 1,
      xHeight: 1,
      "x-height": "xHeight",
      xlinkActuate: 1,
      "xlink:actuate": "xlinkActuate",
      xlinkArcrole: 1,
      "xlink:arcrole": "xlinkArcrole",
      xlinkHref: 1,
      "xlink:href": "xlinkHref",
      xlinkRole: 1,
      "xlink:role": "xlinkRole",
      xlinkShow: 1,
      "xlink:show": "xlinkShow",
      xlinkTitle: 1,
      "xlink:title": "xlinkTitle",
      xlinkType: 1,
      "xlink:type": "xlinkType",
      xmlBase: 1,
      "xml:base": "xmlBase",
      xmlLang: 1,
      "xml:lang": "xmlLang",
      xmlns: 0,
      "xml:space": "xmlSpace",
      xmlnsXlink: 1,
      "xmlns:xlink": "xmlnsXlink",
      xmlSpace: 1,
      y1: 0,
      y2: 0,
      y: 0,
      yChannelSelector: 1,
      z: 0,
      zoomAndPan: 1
    };
  }
});

// ../../node_modules/.pnpm/react-property@2.0.2/node_modules/react-property/lib/index.js
var require_lib3 = __commonJS({
  "../../node_modules/.pnpm/react-property@2.0.2/node_modules/react-property/lib/index.js"(exports) {
    "use strict";
    var RESERVED = 0;
    var STRING = 1;
    var BOOLEANISH_STRING = 2;
    var BOOLEAN = 3;
    var OVERLOADED_BOOLEAN = 4;
    var NUMERIC = 5;
    var POSITIVE_NUMERIC = 6;
    function getPropertyInfo(name) {
      return properties.hasOwnProperty(name) ? properties[name] : null;
    }
    function PropertyInfoRecord(name, type, mustUseProperty, attributeName, attributeNamespace, sanitizeURL, removeEmptyString) {
      this.acceptsBooleans = type === BOOLEANISH_STRING || type === BOOLEAN || type === OVERLOADED_BOOLEAN;
      this.attributeName = attributeName;
      this.attributeNamespace = attributeNamespace;
      this.mustUseProperty = mustUseProperty;
      this.propertyName = name;
      this.type = type;
      this.sanitizeURL = sanitizeURL;
      this.removeEmptyString = removeEmptyString;
    }
    var properties = {};
    var reservedProps = [
      "children",
      "dangerouslySetInnerHTML",
      // TODO: This prevents the assignment of defaultValue to regular
      // elements (not just inputs). Now that ReactDOMInput assigns to the
      // defaultValue property -- do we need this?
      "defaultValue",
      "defaultChecked",
      "innerHTML",
      "suppressContentEditableWarning",
      "suppressHydrationWarning",
      "style"
    ];
    reservedProps.forEach((name) => {
      properties[name] = new PropertyInfoRecord(
        name,
        RESERVED,
        false,
        // mustUseProperty
        name,
        // attributeName
        null,
        // attributeNamespace
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    [
      ["acceptCharset", "accept-charset"],
      ["className", "class"],
      ["htmlFor", "for"],
      ["httpEquiv", "http-equiv"]
    ].forEach(([name, attributeName]) => {
      properties[name] = new PropertyInfoRecord(
        name,
        STRING,
        false,
        // mustUseProperty
        attributeName,
        // attributeName
        null,
        // attributeNamespace
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    ["contentEditable", "draggable", "spellCheck", "value"].forEach((name) => {
      properties[name] = new PropertyInfoRecord(
        name,
        BOOLEANISH_STRING,
        false,
        // mustUseProperty
        name.toLowerCase(),
        // attributeName
        null,
        // attributeNamespace
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    [
      "autoReverse",
      "externalResourcesRequired",
      "focusable",
      "preserveAlpha"
    ].forEach((name) => {
      properties[name] = new PropertyInfoRecord(
        name,
        BOOLEANISH_STRING,
        false,
        // mustUseProperty
        name,
        // attributeName
        null,
        // attributeNamespace
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    [
      "allowFullScreen",
      "async",
      // Note: there is a special case that prevents it from being written to the DOM
      // on the client side because the browsers are inconsistent. Instead we call focus().
      "autoFocus",
      "autoPlay",
      "controls",
      "default",
      "defer",
      "disabled",
      "disablePictureInPicture",
      "disableRemotePlayback",
      "formNoValidate",
      "hidden",
      "loop",
      "noModule",
      "noValidate",
      "open",
      "playsInline",
      "readOnly",
      "required",
      "reversed",
      "scoped",
      "seamless",
      // Microdata
      "itemScope"
    ].forEach((name) => {
      properties[name] = new PropertyInfoRecord(
        name,
        BOOLEAN,
        false,
        // mustUseProperty
        name.toLowerCase(),
        // attributeName
        null,
        // attributeNamespace
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    [
      "checked",
      // Note: `option.selected` is not updated if `select.multiple` is
      // disabled with `removeAttribute`. We have special logic for handling this.
      "multiple",
      "muted",
      "selected"
      // NOTE: if you add a camelCased prop to this list,
      // you'll need to set attributeName to name.toLowerCase()
      // instead in the assignment below.
    ].forEach((name) => {
      properties[name] = new PropertyInfoRecord(
        name,
        BOOLEAN,
        true,
        // mustUseProperty
        name,
        // attributeName
        null,
        // attributeNamespace
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    [
      "capture",
      "download"
      // NOTE: if you add a camelCased prop to this list,
      // you'll need to set attributeName to name.toLowerCase()
      // instead in the assignment below.
    ].forEach((name) => {
      properties[name] = new PropertyInfoRecord(
        name,
        OVERLOADED_BOOLEAN,
        false,
        // mustUseProperty
        name,
        // attributeName
        null,
        // attributeNamespace
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    [
      "cols",
      "rows",
      "size",
      "span"
      // NOTE: if you add a camelCased prop to this list,
      // you'll need to set attributeName to name.toLowerCase()
      // instead in the assignment below.
    ].forEach((name) => {
      properties[name] = new PropertyInfoRecord(
        name,
        POSITIVE_NUMERIC,
        false,
        // mustUseProperty
        name,
        // attributeName
        null,
        // attributeNamespace
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    ["rowSpan", "start"].forEach((name) => {
      properties[name] = new PropertyInfoRecord(
        name,
        NUMERIC,
        false,
        // mustUseProperty
        name.toLowerCase(),
        // attributeName
        null,
        // attributeNamespace
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    var CAMELIZE = /[\-\:]([a-z])/g;
    var capitalize = (token) => token[1].toUpperCase();
    [
      "accent-height",
      "alignment-baseline",
      "arabic-form",
      "baseline-shift",
      "cap-height",
      "clip-path",
      "clip-rule",
      "color-interpolation",
      "color-interpolation-filters",
      "color-profile",
      "color-rendering",
      "dominant-baseline",
      "enable-background",
      "fill-opacity",
      "fill-rule",
      "flood-color",
      "flood-opacity",
      "font-family",
      "font-size",
      "font-size-adjust",
      "font-stretch",
      "font-style",
      "font-variant",
      "font-weight",
      "glyph-name",
      "glyph-orientation-horizontal",
      "glyph-orientation-vertical",
      "horiz-adv-x",
      "horiz-origin-x",
      "image-rendering",
      "letter-spacing",
      "lighting-color",
      "marker-end",
      "marker-mid",
      "marker-start",
      "overline-position",
      "overline-thickness",
      "paint-order",
      "panose-1",
      "pointer-events",
      "rendering-intent",
      "shape-rendering",
      "stop-color",
      "stop-opacity",
      "strikethrough-position",
      "strikethrough-thickness",
      "stroke-dasharray",
      "stroke-dashoffset",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-miterlimit",
      "stroke-opacity",
      "stroke-width",
      "text-anchor",
      "text-decoration",
      "text-rendering",
      "underline-position",
      "underline-thickness",
      "unicode-bidi",
      "unicode-range",
      "units-per-em",
      "v-alphabetic",
      "v-hanging",
      "v-ideographic",
      "v-mathematical",
      "vector-effect",
      "vert-adv-y",
      "vert-origin-x",
      "vert-origin-y",
      "word-spacing",
      "writing-mode",
      "xmlns:xlink",
      "x-height"
      // NOTE: if you add a camelCased prop to this list,
      // you'll need to set attributeName to name.toLowerCase()
      // instead in the assignment below.
    ].forEach((attributeName) => {
      const name = attributeName.replace(CAMELIZE, capitalize);
      properties[name] = new PropertyInfoRecord(
        name,
        STRING,
        false,
        // mustUseProperty
        attributeName,
        null,
        // attributeNamespace
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    [
      "xlink:actuate",
      "xlink:arcrole",
      "xlink:role",
      "xlink:show",
      "xlink:title",
      "xlink:type"
      // NOTE: if you add a camelCased prop to this list,
      // you'll need to set attributeName to name.toLowerCase()
      // instead in the assignment below.
    ].forEach((attributeName) => {
      const name = attributeName.replace(CAMELIZE, capitalize);
      properties[name] = new PropertyInfoRecord(
        name,
        STRING,
        false,
        // mustUseProperty
        attributeName,
        "http://www.w3.org/1999/xlink",
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    [
      "xml:base",
      "xml:lang",
      "xml:space"
      // NOTE: if you add a camelCased prop to this list,
      // you'll need to set attributeName to name.toLowerCase()
      // instead in the assignment below.
    ].forEach((attributeName) => {
      const name = attributeName.replace(CAMELIZE, capitalize);
      properties[name] = new PropertyInfoRecord(
        name,
        STRING,
        false,
        // mustUseProperty
        attributeName,
        "http://www.w3.org/XML/1998/namespace",
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    ["tabIndex", "crossOrigin"].forEach((attributeName) => {
      properties[attributeName] = new PropertyInfoRecord(
        attributeName,
        STRING,
        false,
        // mustUseProperty
        attributeName.toLowerCase(),
        // attributeName
        null,
        // attributeNamespace
        false,
        // sanitizeURL
        false
        // removeEmptyString
      );
    });
    var xlinkHref = "xlinkHref";
    properties[xlinkHref] = new PropertyInfoRecord(
      "xlinkHref",
      STRING,
      false,
      // mustUseProperty
      "xlink:href",
      "http://www.w3.org/1999/xlink",
      true,
      // sanitizeURL
      false
      // removeEmptyString
    );
    ["src", "href", "action", "formAction"].forEach((attributeName) => {
      properties[attributeName] = new PropertyInfoRecord(
        attributeName,
        STRING,
        false,
        // mustUseProperty
        attributeName.toLowerCase(),
        // attributeName
        null,
        // attributeNamespace
        true,
        // sanitizeURL
        true
        // removeEmptyString
      );
    });
    var {
      CAMELCASE,
      SAME,
      possibleStandardNames: possibleStandardNamesOptimized
    } = require_possibleStandardNamesOptimized();
    var ATTRIBUTE_NAME_START_CHAR = ":A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
    var ATTRIBUTE_NAME_CHAR = ATTRIBUTE_NAME_START_CHAR + "\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
    var isCustomAttribute = RegExp.prototype.test.bind(
      // eslint-disable-next-line no-misleading-character-class
      new RegExp("^(data|aria)-[" + ATTRIBUTE_NAME_CHAR + "]*$")
    );
    var possibleStandardNames = Object.keys(
      possibleStandardNamesOptimized
    ).reduce((accumulator, standardName) => {
      const propName = possibleStandardNamesOptimized[standardName];
      if (propName === SAME) {
        accumulator[standardName] = standardName;
      } else if (propName === CAMELCASE) {
        accumulator[standardName.toLowerCase()] = standardName;
      } else {
        accumulator[standardName] = propName;
      }
      return accumulator;
    }, {});
    exports.BOOLEAN = BOOLEAN;
    exports.BOOLEANISH_STRING = BOOLEANISH_STRING;
    exports.NUMERIC = NUMERIC;
    exports.OVERLOADED_BOOLEAN = OVERLOADED_BOOLEAN;
    exports.POSITIVE_NUMERIC = POSITIVE_NUMERIC;
    exports.RESERVED = RESERVED;
    exports.STRING = STRING;
    exports.getPropertyInfo = getPropertyInfo;
    exports.isCustomAttribute = isCustomAttribute;
    exports.possibleStandardNames = possibleStandardNames;
  }
});

// ../../node_modules/.pnpm/inline-style-parser@0.2.7/node_modules/inline-style-parser/cjs/index.js
var require_cjs = __commonJS({
  "../../node_modules/.pnpm/inline-style-parser@0.2.7/node_modules/inline-style-parser/cjs/index.js"(exports, module) {
    "use strict";
    var COMMENT_REGEX = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
    var NEWLINE_REGEX = /\n/g;
    var WHITESPACE_REGEX2 = /^\s*/;
    var PROPERTY_REGEX = /^(\*?[-#/*\\\w]+(\[[0-9a-z_-]+\])?)\s*/;
    var COLON_REGEX = /^:\s*/;
    var VALUE_REGEX = /^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};])+)/;
    var SEMICOLON_REGEX = /^[;\s]*/;
    var TRIM_REGEX = /^\s+|\s+$/g;
    var NEWLINE = "\n";
    var FORWARD_SLASH = "/";
    var ASTERISK = "*";
    var EMPTY_STRING = "";
    var TYPE_COMMENT = "comment";
    var TYPE_DECLARATION = "declaration";
    function index(style, options2) {
      if (typeof style !== "string") {
        throw new TypeError("First argument must be a string");
      }
      if (!style) return [];
      options2 = options2 || {};
      var lineno = 1;
      var column = 1;
      function updatePosition(str) {
        var lines = str.match(NEWLINE_REGEX);
        if (lines) lineno += lines.length;
        var i = str.lastIndexOf(NEWLINE);
        column = ~i ? str.length - i : column + str.length;
      }
      function position() {
        var start = { line: lineno, column };
        return function(node) {
          node.position = new Position(start);
          whitespace();
          return node;
        };
      }
      function Position(start) {
        this.start = start;
        this.end = { line: lineno, column };
        this.source = options2.source;
      }
      Position.prototype.content = style;
      function error(msg) {
        var err = new Error(
          options2.source + ":" + lineno + ":" + column + ": " + msg
        );
        err.reason = msg;
        err.filename = options2.source;
        err.line = lineno;
        err.column = column;
        err.source = style;
        if (options2.silent) ;
        else {
          throw err;
        }
      }
      function match(re) {
        var m = re.exec(style);
        if (!m) return;
        var str = m[0];
        updatePosition(str);
        style = style.slice(str.length);
        return m;
      }
      function whitespace() {
        match(WHITESPACE_REGEX2);
      }
      function comments(rules) {
        var c;
        rules = rules || [];
        while (c = comment()) {
          if (c !== false) {
            rules.push(c);
          }
        }
        return rules;
      }
      function comment() {
        var pos = position();
        if (FORWARD_SLASH != style.charAt(0) || ASTERISK != style.charAt(1)) return;
        var i = 2;
        while (EMPTY_STRING != style.charAt(i) && (ASTERISK != style.charAt(i) || FORWARD_SLASH != style.charAt(i + 1))) {
          ++i;
        }
        i += 2;
        if (EMPTY_STRING === style.charAt(i - 1)) {
          return error("End of comment missing");
        }
        var str = style.slice(2, i - 2);
        column += 2;
        updatePosition(str);
        style = style.slice(i);
        column += 2;
        return pos({
          type: TYPE_COMMENT,
          comment: str
        });
      }
      function declaration() {
        var pos = position();
        var prop = match(PROPERTY_REGEX);
        if (!prop) return;
        comment();
        if (!match(COLON_REGEX)) return error("property missing ':'");
        var val = match(VALUE_REGEX);
        var ret = pos({
          type: TYPE_DECLARATION,
          property: trim(prop[0].replace(COMMENT_REGEX, EMPTY_STRING)),
          value: val ? trim(val[0].replace(COMMENT_REGEX, EMPTY_STRING)) : EMPTY_STRING
        });
        match(SEMICOLON_REGEX);
        return ret;
      }
      function declarations() {
        var decls = [];
        comments(decls);
        var decl;
        while (decl = declaration()) {
          if (decl !== false) {
            decls.push(decl);
            comments(decls);
          }
        }
        return decls;
      }
      whitespace();
      return declarations();
    }
    function trim(str) {
      return str ? str.replace(TRIM_REGEX, EMPTY_STRING) : EMPTY_STRING;
    }
    module.exports = index;
  }
});

// ../../node_modules/.pnpm/style-to-object@1.0.14/node_modules/style-to-object/cjs/index.js
var require_cjs2 = __commonJS({
  "../../node_modules/.pnpm/style-to-object@1.0.14/node_modules/style-to-object/cjs/index.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = StyleToObject;
    var inline_style_parser_1 = __importDefault(require_cjs());
    function StyleToObject(style, iterator) {
      let styleObject = null;
      if (!style || typeof style !== "string") {
        return styleObject;
      }
      const declarations = (0, inline_style_parser_1.default)(style);
      const hasIterator = typeof iterator === "function";
      declarations.forEach((declaration) => {
        if (declaration.type !== "declaration") {
          return;
        }
        const { property, value } = declaration;
        if (hasIterator) {
          iterator(property, value, declaration);
        } else if (value) {
          styleObject = styleObject || {};
          styleObject[property] = value;
        }
      });
      return styleObject;
    }
  }
});

// ../../node_modules/.pnpm/style-to-js@1.1.21/node_modules/style-to-js/cjs/utilities.js
var require_utilities2 = __commonJS({
  "../../node_modules/.pnpm/style-to-js@1.1.21/node_modules/style-to-js/cjs/utilities.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.camelCase = void 0;
    var CUSTOM_PROPERTY_REGEX = /^--[a-zA-Z0-9_-]+$/;
    var HYPHEN_REGEX = /-([a-z])/g;
    var NO_HYPHEN_REGEX = /^[^-]+$/;
    var VENDOR_PREFIX_REGEX = /^-(webkit|moz|ms|o|khtml)-/;
    var MS_VENDOR_PREFIX_REGEX = /^-(ms)-/;
    var skipCamelCase = function(property) {
      return !property || NO_HYPHEN_REGEX.test(property) || CUSTOM_PROPERTY_REGEX.test(property);
    };
    var capitalize = function(match, character) {
      return character.toUpperCase();
    };
    var trimHyphen = function(match, prefix) {
      return "".concat(prefix, "-");
    };
    var camelCase = function(property, options2) {
      if (options2 === void 0) {
        options2 = {};
      }
      if (skipCamelCase(property)) {
        return property;
      }
      property = property.toLowerCase();
      if (options2.reactCompat) {
        property = property.replace(MS_VENDOR_PREFIX_REGEX, trimHyphen);
      } else {
        property = property.replace(VENDOR_PREFIX_REGEX, trimHyphen);
      }
      return property.replace(HYPHEN_REGEX, capitalize);
    };
    exports.camelCase = camelCase;
  }
});

// ../../node_modules/.pnpm/style-to-js@1.1.21/node_modules/style-to-js/cjs/index.js
var require_cjs3 = __commonJS({
  "../../node_modules/.pnpm/style-to-js@1.1.21/node_modules/style-to-js/cjs/index.js"(exports, module) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    var style_to_object_1 = __importDefault(require_cjs2());
    var utilities_1 = require_utilities2();
    function StyleToJS(style, options2) {
      var output = {};
      if (!style || typeof style !== "string") {
        return output;
      }
      (0, style_to_object_1.default)(style, function(property, value) {
        if (property && value) {
          output[(0, utilities_1.camelCase)(property, options2)] = value;
        }
      });
      return output;
    }
    StyleToJS.default = StyleToJS;
    module.exports = StyleToJS;
  }
});

// ../../node_modules/.pnpm/html-react-parser@5.2.17_@types+react@18.3.12_react@18.3.1/node_modules/html-react-parser/lib/utilities.js
var require_utilities3 = __commonJS({
  "../../node_modules/.pnpm/html-react-parser@5.2.17_@types+react@18.3.12_react@18.3.1/node_modules/html-react-parser/lib/utilities.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.returnFirstArg = exports.canTextBeChildOfNode = exports.ELEMENTS_WITH_NO_TEXT_CHILDREN = exports.PRESERVE_CUSTOM_ATTRIBUTES = void 0;
    exports.isCustomComponent = isCustomComponent;
    exports.setStyleProp = setStyleProp;
    var react_1 = __require("react");
    var style_to_js_1 = __importDefault(require_cjs3());
    var RESERVED_SVG_MATHML_ELEMENTS = /* @__PURE__ */ new Set([
      "annotation-xml",
      "color-profile",
      "font-face",
      "font-face-src",
      "font-face-uri",
      "font-face-format",
      "font-face-name",
      "missing-glyph"
    ]);
    function isCustomComponent(tagName, props) {
      if (!tagName.includes("-")) {
        return Boolean(props && typeof props.is === "string");
      }
      if (RESERVED_SVG_MATHML_ELEMENTS.has(tagName)) {
        return false;
      }
      return true;
    }
    var styleOptions = {
      reactCompat: true
    };
    function setStyleProp(style, props) {
      if (typeof style !== "string") {
        return;
      }
      if (!style.trim()) {
        props.style = {};
        return;
      }
      try {
        props.style = (0, style_to_js_1.default)(style, styleOptions);
      } catch (error) {
        props.style = {};
      }
    }
    exports.PRESERVE_CUSTOM_ATTRIBUTES = Number(react_1.version.split(".")[0]) >= 16;
    exports.ELEMENTS_WITH_NO_TEXT_CHILDREN = /* @__PURE__ */ new Set([
      "tr",
      "tbody",
      "thead",
      "tfoot",
      "colgroup",
      "table",
      "head",
      "html",
      "frameset"
    ]);
    var canTextBeChildOfNode = function(node) {
      return !exports.ELEMENTS_WITH_NO_TEXT_CHILDREN.has(node.name);
    };
    exports.canTextBeChildOfNode = canTextBeChildOfNode;
    var returnFirstArg = function(arg) {
      return arg;
    };
    exports.returnFirstArg = returnFirstArg;
  }
});

// ../../node_modules/.pnpm/html-react-parser@5.2.17_@types+react@18.3.12_react@18.3.1/node_modules/html-react-parser/lib/attributes-to-props.js
var require_attributes_to_props = __commonJS({
  "../../node_modules/.pnpm/html-react-parser@5.2.17_@types+react@18.3.12_react@18.3.1/node_modules/html-react-parser/lib/attributes-to-props.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = attributesToProps2;
    var react_property_1 = require_lib3();
    var utilities_1 = require_utilities3();
    var UNCONTROLLED_COMPONENT_ATTRIBUTES = ["checked", "value"];
    var UNCONTROLLED_COMPONENT_NAMES = ["input", "select", "textarea"];
    var valueOnlyInputs = {
      reset: true,
      submit: true
    };
    function attributesToProps2(attributes, nodeName) {
      if (attributes === void 0) {
        attributes = {};
      }
      var props = {};
      var isInputValueOnly = Boolean(attributes.type && valueOnlyInputs[attributes.type]);
      for (var attributeName in attributes) {
        var attributeValue = attributes[attributeName];
        if ((0, react_property_1.isCustomAttribute)(attributeName)) {
          props[attributeName] = attributeValue;
          continue;
        }
        var attributeNameLowerCased = attributeName.toLowerCase();
        var propName = getPropName(attributeNameLowerCased);
        if (propName) {
          var propertyInfo = (0, react_property_1.getPropertyInfo)(propName);
          if (UNCONTROLLED_COMPONENT_ATTRIBUTES.includes(propName) && UNCONTROLLED_COMPONENT_NAMES.includes(nodeName) && !isInputValueOnly) {
            propName = getPropName("default" + attributeNameLowerCased);
          }
          props[propName] = attributeValue;
          switch (propertyInfo === null || propertyInfo === void 0 ? void 0 : propertyInfo.type) {
            case react_property_1.BOOLEAN:
              props[propName] = true;
              break;
            case react_property_1.OVERLOADED_BOOLEAN:
              if (attributeValue === "") {
                props[propName] = true;
              }
              break;
          }
          continue;
        }
        if (utilities_1.PRESERVE_CUSTOM_ATTRIBUTES) {
          props[attributeName] = attributeValue;
        }
      }
      (0, utilities_1.setStyleProp)(attributes.style, props);
      return props;
    }
    function getPropName(attributeName) {
      return react_property_1.possibleStandardNames[attributeName];
    }
  }
});

// ../../node_modules/.pnpm/html-react-parser@5.2.17_@types+react@18.3.12_react@18.3.1/node_modules/html-react-parser/lib/dom-to-react.js
var require_dom_to_react = __commonJS({
  "../../node_modules/.pnpm/html-react-parser@5.2.17_@types+react@18.3.12_react@18.3.1/node_modules/html-react-parser/lib/dom-to-react.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = domToReact2;
    var react_1 = __require("react");
    var attributes_to_props_1 = __importDefault(require_attributes_to_props());
    var utilities_1 = require_utilities3();
    var React11 = {
      cloneElement: react_1.cloneElement,
      createElement: react_1.createElement,
      isValidElement: react_1.isValidElement
    };
    function domToReact2(nodes, options2) {
      var _a, _b, _c, _d, _e;
      if (options2 === void 0) {
        options2 = {};
      }
      var reactElements = [];
      var hasReplace = typeof options2.replace === "function";
      var transform = (_a = options2.transform) !== null && _a !== void 0 ? _a : utilities_1.returnFirstArg;
      var _f = (_b = options2.library) !== null && _b !== void 0 ? _b : React11, cloneElement2 = _f.cloneElement, createElement2 = _f.createElement, isValidElement2 = _f.isValidElement;
      var nodesLength = nodes.length;
      for (var index = 0; index < nodesLength; index++) {
        var node = nodes[index];
        if (hasReplace) {
          var replaceElement = (_c = options2.replace) === null || _c === void 0 ? void 0 : _c.call(options2, node, index);
          if (isValidElement2(replaceElement)) {
            if (nodesLength > 1) {
              replaceElement = cloneElement2(replaceElement, {
                key: (_d = replaceElement.key) !== null && _d !== void 0 ? _d : index
              });
            }
            reactElements.push(transform(replaceElement, node, index));
            continue;
          }
        }
        if (node.type === "text") {
          var isWhitespace = !node.data.trim().length;
          if (isWhitespace && node.parent && !(0, utilities_1.canTextBeChildOfNode)(node.parent)) {
            continue;
          }
          if (options2.trim && isWhitespace) {
            continue;
          }
          reactElements.push(transform(node.data, node, index));
          continue;
        }
        var element = node;
        var props = {};
        if (skipAttributesToProps(element)) {
          (0, utilities_1.setStyleProp)(element.attribs.style, element.attribs);
          props = element.attribs;
        } else if (element.attribs) {
          props = (0, attributes_to_props_1.default)(element.attribs, element.name);
        }
        var children = void 0;
        switch (node.type) {
          case "script":
          case "style":
            if (node.children[0]) {
              props.dangerouslySetInnerHTML = {
                __html: node.children[0].data
              };
            }
            break;
          case "tag":
            if (node.name === "textarea" && node.children[0]) {
              props.defaultValue = node.children[0].data;
            } else if ((_e = node.children) === null || _e === void 0 ? void 0 : _e.length) {
              children = domToReact2(node.children, options2);
            }
            break;
          // skip all other cases (e.g., comment)
          default:
            continue;
        }
        if (nodesLength > 1) {
          props.key = index;
        }
        reactElements.push(transform(createElement2(node.name, props, children), node, index));
      }
      return reactElements.length === 1 ? reactElements[0] : reactElements;
    }
    function skipAttributesToProps(node) {
      return utilities_1.PRESERVE_CUSTOM_ATTRIBUTES && node.type === "tag" && (0, utilities_1.isCustomComponent)(node.name, node.attribs);
    }
  }
});

// ../../node_modules/.pnpm/html-react-parser@5.2.17_@types+react@18.3.12_react@18.3.1/node_modules/html-react-parser/lib/index.js
var require_lib4 = __commonJS({
  "../../node_modules/.pnpm/html-react-parser@5.2.17_@types+react@18.3.12_react@18.3.1/node_modules/html-react-parser/lib/index.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.htmlToDOM = exports.domToReact = exports.attributesToProps = exports.Text = exports.ProcessingInstruction = exports.Element = exports.Comment = void 0;
    exports.default = HTMLReactParser2;
    var html_dom_parser_1 = __importDefault(require_html_to_dom());
    exports.htmlToDOM = html_dom_parser_1.default;
    var attributes_to_props_1 = __importDefault(require_attributes_to_props());
    exports.attributesToProps = attributes_to_props_1.default;
    var dom_to_react_1 = __importDefault(require_dom_to_react());
    exports.domToReact = dom_to_react_1.default;
    var domhandler_1 = require_lib2();
    Object.defineProperty(exports, "Comment", { enumerable: true, get: function() {
      return domhandler_1.Comment;
    } });
    Object.defineProperty(exports, "Element", { enumerable: true, get: function() {
      return domhandler_1.Element;
    } });
    Object.defineProperty(exports, "ProcessingInstruction", { enumerable: true, get: function() {
      return domhandler_1.ProcessingInstruction;
    } });
    Object.defineProperty(exports, "Text", { enumerable: true, get: function() {
      return domhandler_1.Text;
    } });
    var domParserOptions = { lowerCaseAttributeNames: false };
    function HTMLReactParser2(html3, options2) {
      var _a;
      if (typeof html3 !== "string") {
        throw new TypeError("First argument must be a string");
      }
      if (!html3) {
        return [];
      }
      return (0, dom_to_react_1.default)((0, html_dom_parser_1.default)(html3, (_a = options2 === null || options2 === void 0 ? void 0 : options2.htmlparser2) !== null && _a !== void 0 ? _a : domParserOptions), options2);
    }
  }
});

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/model-context/ModelContextTypes.js
var mergeModelContexts = (configSet) => {
  const configs = Array.from(configSet).map((c) => c.getModelContext()).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return configs.reduce((acc, config) => {
    if (config.system) {
      if (acc.system) {
        acc.system += `

${config.system}`;
      } else {
        acc.system = config.system;
      }
    }
    if (config.tools) {
      for (const [name, tool] of Object.entries(config.tools)) {
        const existing = acc.tools?.[name];
        if (existing && existing !== tool) {
          throw new Error(
            `You tried to define a tool with the name ${name}, but it already exists.`
          );
        }
        if (!acc.tools) acc.tools = {};
        acc.tools[name] = tool;
      }
    }
    if (config.config) {
      acc.config = {
        ...acc.config,
        ...config.config
      };
    }
    if (config.callSettings) {
      acc.callSettings = {
        ...acc.callSettings,
        ...config.callSettings
      };
    }
    return acc;
  }, {});
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/utils/CompositeContextProvider.js
var CompositeContextProvider = class {
  _providers = /* @__PURE__ */ new Set();
  getModelContext() {
    return mergeModelContexts(this._providers);
  }
  registerModelContextProvider(provider) {
    this._providers.add(provider);
    const unsubscribe = provider.subscribe?.(() => {
      this.notifySubscribers();
    });
    this.notifySubscribers();
    return () => {
      this._providers.delete(provider);
      unsubscribe?.();
      this.notifySubscribers();
    };
  }
  _subscribers = /* @__PURE__ */ new Set();
  notifySubscribers() {
    for (const callback of this._subscribers) callback();
  }
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/core/BaseAssistantRuntimeCore.js
var BaseAssistantRuntimeCore = class {
  _contextProvider = new CompositeContextProvider();
  registerModelContextProvider(provider) {
    return this._contextProvider.registerModelContextProvider(provider);
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/remote-thread-list/BaseSubscribable.js
var BaseSubscribable = class {
  _subscribers = /* @__PURE__ */ new Set();
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }
  waitForUpdate() {
    return new Promise((resolve) => {
      const unsubscribe = this.subscribe(() => {
        unsubscribe();
        resolve();
      });
    });
  }
  _notifySubscribers() {
    const errors = [];
    for (const callback of this._subscribers) {
      try {
        callback();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      if (errors.length === 1) {
        throw errors[0];
      } else {
        throw new AggregateError(errors);
      }
    }
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/composer/BaseComposerRuntimeCore.js
var isAttachmentComplete = (a) => a.status.type === "complete";
var BaseComposerRuntimeCore = class extends BaseSubscribable {
  isEditing = true;
  get attachmentAccept() {
    return this.getAttachmentAdapter()?.accept ?? "*";
  }
  _attachments = [];
  get attachments() {
    return this._attachments;
  }
  setAttachments(value) {
    this._attachments = value;
    this._notifySubscribers();
  }
  get isEmpty() {
    return !this.text.trim() && !this.attachments.length;
  }
  _text = "";
  get text() {
    return this._text;
  }
  _role = "user";
  get role() {
    return this._role;
  }
  _runConfig = {};
  get runConfig() {
    return this._runConfig;
  }
  setText(value) {
    if (this._text === value) return;
    this._text = value;
    this._notifySubscribers();
  }
  setRole(role) {
    if (this._role === role) return;
    this._role = role;
    this._notifySubscribers();
  }
  setRunConfig(runConfig) {
    if (this._runConfig === runConfig) return;
    this._runConfig = runConfig;
    this._notifySubscribers();
  }
  _emptyTextAndAttachments() {
    this._attachments = [];
    this._text = "";
    this._notifySubscribers();
  }
  async _onClearAttachments() {
    const adapter = this.getAttachmentAdapter();
    if (adapter) {
      await Promise.all(this._attachments.map((a) => adapter.remove(a)));
    }
  }
  async reset() {
    if (this._attachments.length === 0 && this._text === "" && this._role === "user" && Object.keys(this._runConfig).length === 0) {
      return;
    }
    this._role = "user";
    this._runConfig = {};
    const task = this._onClearAttachments();
    this._emptyTextAndAttachments();
    await task;
  }
  async clearAttachments() {
    const task = this._onClearAttachments();
    this.setAttachments([]);
    await task;
  }
  async send() {
    const adapter = this.getAttachmentAdapter();
    const attachments = adapter && this.attachments.length > 0 ? Promise.all(
      this.attachments.map(async (a) => {
        if (isAttachmentComplete(a)) return a;
        const result = await adapter.send(a);
        return result;
      })
    ) : [];
    const text2 = this.text;
    this._emptyTextAndAttachments();
    const message = {
      createdAt: /* @__PURE__ */ new Date(),
      role: this.role,
      content: text2 ? [{ type: "text", text: text2 }] : [],
      attachments: await attachments,
      runConfig: this.runConfig,
      metadata: { custom: {} }
    };
    this.handleSend(message);
    this._notifyEventSubscribers("send");
  }
  cancel() {
    this.handleCancel();
  }
  async addAttachment(file) {
    const adapter = this.getAttachmentAdapter();
    if (!adapter) throw new Error("Attachments are not supported");
    const upsertAttachment = (a) => {
      const idx = this._attachments.findIndex(
        (attachment) => attachment.id === a.id
      );
      if (idx !== -1)
        this._attachments = [
          ...this._attachments.slice(0, idx),
          a,
          ...this._attachments.slice(idx + 1)
        ];
      else {
        this._attachments = [...this._attachments, a];
      }
      this._notifySubscribers();
    };
    const promiseOrGenerator = adapter.add({ file });
    if (Symbol.asyncIterator in promiseOrGenerator) {
      for await (const r of promiseOrGenerator) {
        upsertAttachment(r);
      }
    } else {
      upsertAttachment(await promiseOrGenerator);
    }
    this._notifyEventSubscribers("attachment-add");
    this._notifySubscribers();
  }
  async removeAttachment(attachmentId) {
    const adapter = this.getAttachmentAdapter();
    if (!adapter) throw new Error("Attachments are not supported");
    const index = this._attachments.findIndex((a) => a.id === attachmentId);
    if (index === -1) throw new Error("Attachment not found");
    const attachment = this._attachments[index];
    await adapter.remove(attachment);
    this._attachments = [
      ...this._attachments.slice(0, index),
      ...this._attachments.slice(index + 1)
    ];
    this._notifySubscribers();
  }
  _eventSubscribers = /* @__PURE__ */ new Map();
  _notifyEventSubscribers(event) {
    const subscribers = this._eventSubscribers.get(event);
    if (!subscribers) return;
    for (const callback of subscribers) callback();
  }
  unstable_on(event, callback) {
    const subscribers = this._eventSubscribers.get(event);
    if (!subscribers) {
      this._eventSubscribers.set(event, /* @__PURE__ */ new Set([callback]));
    } else {
      subscribers.add(callback);
    }
    return () => {
      const subscribers2 = this._eventSubscribers.get(event);
      if (!subscribers2) return;
      subscribers2.delete(callback);
    };
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/composer/DefaultThreadComposerRuntimeCore.js
var DefaultThreadComposerRuntimeCore = class extends BaseComposerRuntimeCore {
  constructor(runtime) {
    super();
    this.runtime = runtime;
    this.connect();
  }
  _canCancel = false;
  get canCancel() {
    return this._canCancel;
  }
  get attachments() {
    return super.attachments;
  }
  getAttachmentAdapter() {
    return this.runtime.adapters?.attachments;
  }
  connect() {
    return this.runtime.subscribe(() => {
      if (this.canCancel !== this.runtime.capabilities.cancel) {
        this._canCancel = this.runtime.capabilities.cancel;
        this._notifySubscribers();
      }
    });
  }
  async handleSend(message) {
    this.runtime.append({
      ...message,
      parentId: this.runtime.messages.at(-1)?.id ?? null,
      sourceId: null
    });
  }
  async handleCancel() {
    this.runtime.cancelRun();
  }
};

// ../../node_modules/.pnpm/nanoid@5.1.6/node_modules/nanoid/non-secure/index.js
var customAlphabet = (alphabet, defaultSize = 21) => {
  return (size = defaultSize) => {
    let id = "";
    let i = size | 0;
    while (i--) {
      id += alphabet[Math.random() * alphabet.length | 0];
    }
    return id;
  };
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/utils/idUtils.js
var generateId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7
);
var optimisticPrefix = "__optimistic__";
var generateOptimisticId = () => `${optimisticPrefix}${generateId()}`;

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/auto-status.js
var AUTO_STATUS_RUNNING = Object.freeze({ type: "running" });
var AUTO_STATUS_COMPLETE = Object.freeze({
  type: "complete",
  reason: "unknown"
});
var AUTO_STATUS_PENDING = Object.freeze({
  type: "requires-action",
  reason: "tool-calls"
});
var AUTO_STATUS_INTERRUPT = Object.freeze({
  type: "requires-action",
  reason: "interrupt"
});
var isAutoStatus = (status) => status === AUTO_STATUS_RUNNING || status === AUTO_STATUS_COMPLETE;
var getAutoStatus = (isLast, isRunning, hasInterruptedToolCalls, hasPendingToolCalls) => isLast && isRunning ? AUTO_STATUS_RUNNING : hasInterruptedToolCalls ? AUTO_STATUS_INTERRUPT : hasPendingToolCalls ? AUTO_STATUS_PENDING : AUTO_STATUS_COMPLETE;

// ../../node_modules/.pnpm/assistant-stream@0.2.47/node_modules/assistant-stream/dist/utils/json/parse-partial-json-object.js
var import_secure_json_parse = __toESM(require_secure_json_parse(), 1);

// ../../node_modules/.pnpm/assistant-stream@0.2.47/node_modules/assistant-stream/dist/utils/json/fix-json.js
function fixJson(input) {
  const stack = ["ROOT"];
  let lastValidIndex = -1;
  let literalStart = null;
  const path = [];
  let currentKey;
  function pushCurrentKeyToPath() {
    if (currentKey !== void 0) {
      path.push(JSON.parse(`"${currentKey}"`));
      currentKey = void 0;
    }
  }
  function processValueStart(char, i, swapState) {
    switch (char) {
      case '"': {
        lastValidIndex = i;
        stack.pop();
        stack.push(swapState);
        stack.push("INSIDE_STRING");
        pushCurrentKeyToPath();
        break;
      }
      case "f":
      case "t":
      case "n": {
        lastValidIndex = i;
        literalStart = i;
        stack.pop();
        stack.push(swapState);
        stack.push("INSIDE_LITERAL");
        break;
      }
      case "-": {
        stack.pop();
        stack.push(swapState);
        stack.push("INSIDE_NUMBER");
        pushCurrentKeyToPath();
        break;
      }
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9": {
        lastValidIndex = i;
        stack.pop();
        stack.push(swapState);
        stack.push("INSIDE_NUMBER");
        pushCurrentKeyToPath();
        break;
      }
      case "{": {
        lastValidIndex = i;
        stack.pop();
        stack.push(swapState);
        stack.push("INSIDE_OBJECT_START");
        pushCurrentKeyToPath();
        break;
      }
      case "[": {
        lastValidIndex = i;
        stack.pop();
        stack.push(swapState);
        stack.push("INSIDE_ARRAY_START");
        pushCurrentKeyToPath();
        break;
      }
    }
  }
  function processAfterObjectValue(char, i) {
    switch (char) {
      case ",": {
        stack.pop();
        stack.push("INSIDE_OBJECT_AFTER_COMMA");
        break;
      }
      case "}": {
        lastValidIndex = i;
        stack.pop();
        currentKey = path.pop();
        break;
      }
    }
  }
  function processAfterArrayValue(char, i) {
    switch (char) {
      case ",": {
        stack.pop();
        stack.push("INSIDE_ARRAY_AFTER_COMMA");
        currentKey = (Number(currentKey) + 1).toString();
        break;
      }
      case "]": {
        lastValidIndex = i;
        stack.pop();
        currentKey = path.pop();
        break;
      }
    }
  }
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const currentState = stack[stack.length - 1];
    switch (currentState) {
      case "ROOT":
        processValueStart(char, i, "FINISH");
        break;
      case "INSIDE_OBJECT_START": {
        switch (char) {
          case '"': {
            stack.pop();
            stack.push("INSIDE_OBJECT_KEY");
            currentKey = "";
            break;
          }
          case "}": {
            lastValidIndex = i;
            stack.pop();
            currentKey = path.pop();
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_AFTER_COMMA": {
        switch (char) {
          case '"': {
            stack.pop();
            stack.push("INSIDE_OBJECT_KEY");
            currentKey = "";
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_KEY": {
        switch (char) {
          case '"': {
            stack.pop();
            stack.push("INSIDE_OBJECT_AFTER_KEY");
            break;
          }
          case "\\": {
            stack.push("INSIDE_STRING_ESCAPE");
            currentKey += char;
            break;
          }
          default: {
            currentKey += char;
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_AFTER_KEY": {
        switch (char) {
          case ":": {
            stack.pop();
            stack.push("INSIDE_OBJECT_BEFORE_VALUE");
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_BEFORE_VALUE": {
        processValueStart(char, i, "INSIDE_OBJECT_AFTER_VALUE");
        break;
      }
      case "INSIDE_OBJECT_AFTER_VALUE": {
        processAfterObjectValue(char, i);
        break;
      }
      case "INSIDE_STRING": {
        switch (char) {
          case '"': {
            stack.pop();
            lastValidIndex = i;
            currentKey = path.pop();
            break;
          }
          case "\\": {
            stack.push("INSIDE_STRING_ESCAPE");
            break;
          }
          default: {
            lastValidIndex = i;
          }
        }
        break;
      }
      case "INSIDE_ARRAY_START": {
        switch (char) {
          case "]": {
            lastValidIndex = i;
            stack.pop();
            currentKey = path.pop();
            break;
          }
          default: {
            lastValidIndex = i;
            currentKey = "0";
            processValueStart(char, i, "INSIDE_ARRAY_AFTER_VALUE");
            break;
          }
        }
        break;
      }
      case "INSIDE_ARRAY_AFTER_VALUE": {
        switch (char) {
          case ",": {
            stack.pop();
            stack.push("INSIDE_ARRAY_AFTER_COMMA");
            currentKey = (Number(currentKey) + 1).toString();
            break;
          }
          case "]": {
            lastValidIndex = i;
            stack.pop();
            currentKey = path.pop();
            break;
          }
          default: {
            lastValidIndex = i;
            break;
          }
        }
        break;
      }
      case "INSIDE_ARRAY_AFTER_COMMA": {
        processValueStart(char, i, "INSIDE_ARRAY_AFTER_VALUE");
        break;
      }
      case "INSIDE_STRING_ESCAPE": {
        stack.pop();
        if (stack[stack.length - 1] === "INSIDE_STRING") {
          lastValidIndex = i;
        } else if (stack[stack.length - 1] === "INSIDE_OBJECT_KEY") {
          currentKey += char;
        }
        break;
      }
      case "INSIDE_NUMBER": {
        switch (char) {
          case "0":
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9": {
            lastValidIndex = i;
            break;
          }
          case "e":
          case "E":
          case "-":
          case ".": {
            break;
          }
          case ",": {
            stack.pop();
            currentKey = path.pop();
            if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
              processAfterArrayValue(char, i);
            }
            if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
              processAfterObjectValue(char, i);
            }
            break;
          }
          case "}": {
            stack.pop();
            currentKey = path.pop();
            if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
              processAfterObjectValue(char, i);
            }
            break;
          }
          case "]": {
            stack.pop();
            currentKey = path.pop();
            if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
              processAfterArrayValue(char, i);
            }
            break;
          }
          default: {
            stack.pop();
            currentKey = path.pop();
            break;
          }
        }
        break;
      }
      case "INSIDE_LITERAL": {
        const partialLiteral = input.substring(literalStart, i + 1);
        if (!"false".startsWith(partialLiteral) && !"true".startsWith(partialLiteral) && !"null".startsWith(partialLiteral)) {
          stack.pop();
          if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
            processAfterObjectValue(char, i);
          } else if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
            processAfterArrayValue(char, i);
          }
        } else {
          lastValidIndex = i;
        }
        break;
      }
    }
  }
  let result = input.slice(0, lastValidIndex + 1);
  for (let i = stack.length - 1; i >= 0; i--) {
    const state = stack[i];
    switch (state) {
      case "INSIDE_STRING": {
        result += '"';
        break;
      }
      case "INSIDE_OBJECT_KEY":
      case "INSIDE_OBJECT_AFTER_KEY":
      case "INSIDE_OBJECT_AFTER_COMMA":
      case "INSIDE_OBJECT_START":
      case "INSIDE_OBJECT_BEFORE_VALUE":
      case "INSIDE_OBJECT_AFTER_VALUE": {
        result += "}";
        break;
      }
      case "INSIDE_ARRAY_START":
      case "INSIDE_ARRAY_AFTER_COMMA":
      case "INSIDE_ARRAY_AFTER_VALUE": {
        result += "]";
        break;
      }
      case "INSIDE_LITERAL": {
        const partialLiteral = input.substring(literalStart, input.length);
        if ("true".startsWith(partialLiteral)) {
          result += "true".slice(partialLiteral.length);
        } else if ("false".startsWith(partialLiteral)) {
          result += "false".slice(partialLiteral.length);
        } else if ("null".startsWith(partialLiteral)) {
          result += "null".slice(partialLiteral.length);
        }
      }
    }
  }
  return [result, path];
}

// ../../node_modules/.pnpm/assistant-stream@0.2.47/node_modules/assistant-stream/dist/utils/json/parse-partial-json-object.js
var PARTIAL_JSON_OBJECT_META_SYMBOL = /* @__PURE__ */ Symbol("aui.parse-partial-json-object.meta");
var parsePartialJsonObject = (json) => {
  if (json.length === 0)
    return {
      [PARTIAL_JSON_OBJECT_META_SYMBOL]: { state: "partial", partialPath: [] }
    };
  try {
    const res = import_secure_json_parse.default.parse(json);
    if (typeof res !== "object" || res === null)
      throw new Error("argsText is expected to be an object");
    res[PARTIAL_JSON_OBJECT_META_SYMBOL] = {
      state: "complete",
      partialPath: []
    };
    return res;
  } catch {
    try {
      const [fixedJson, partialPath] = fixJson(json);
      const res = import_secure_json_parse.default.parse(fixedJson);
      if (typeof res !== "object" || res === null)
        throw new Error("argsText is expected to be an object");
      res[PARTIAL_JSON_OBJECT_META_SYMBOL] = {
        state: "partial",
        partialPath
      };
      return res;
    } catch {
      return void 0;
    }
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/ThreadMessageLike.js
var fromThreadMessageLike = (like, fallbackId, fallbackStatus) => {
  const { role, id, createdAt, attachments, status, metadata } = like;
  const common = {
    id: id ?? fallbackId,
    createdAt: createdAt ?? /* @__PURE__ */ new Date()
  };
  const content = typeof like.content === "string" ? [{ type: "text", text: like.content }] : like.content;
  const sanitizeImageContent = ({
    image,
    ...rest
  }) => {
    const match = image.match(
      /^data:image\/(png|jpeg|jpg|gif|webp);base64,(.*)$/
    );
    if (match) {
      return { ...rest, image };
    }
    console.warn(`Invalid image data format detected`);
    return null;
  };
  if (role !== "user" && attachments?.length)
    throw new Error("attachments are only supported for user messages");
  if (role !== "assistant" && status)
    throw new Error("status is only supported for assistant messages");
  if (role !== "assistant" && metadata?.steps)
    throw new Error("metadata.steps is only supported for assistant messages");
  switch (role) {
    case "assistant":
      return {
        ...common,
        role,
        content: content.map((part) => {
          const type = part.type;
          switch (type) {
            case "text":
            case "reasoning":
              if (part.text.trim().length === 0) return null;
              return part;
            case "file":
            case "source":
              return part;
            case "image":
              return sanitizeImageContent(part);
            case "tool-call": {
              const { parentId, messages, ...basePart } = part;
              const commonProps = {
                ...basePart,
                toolCallId: part.toolCallId ?? "tool-" + generateId(),
                ...parentId !== void 0 && { parentId },
                ...messages !== void 0 && { messages }
              };
              if (part.args) {
                return {
                  ...commonProps,
                  args: part.args,
                  argsText: part.argsText ?? JSON.stringify(part.args)
                };
              }
              return {
                ...commonProps,
                args: parsePartialJsonObject(part.argsText ?? "") ?? {},
                argsText: part.argsText ?? ""
              };
            }
            default: {
              const unhandledType = type;
              throw new Error(
                `Unsupported assistant message part type: ${unhandledType}`
              );
            }
          }
        }).filter((c) => !!c),
        status: status ?? fallbackStatus,
        metadata: {
          unstable_state: metadata?.unstable_state ?? null,
          unstable_annotations: metadata?.unstable_annotations ?? [],
          unstable_data: metadata?.unstable_data ?? [],
          custom: metadata?.custom ?? {},
          steps: metadata?.steps ?? []
        }
      };
    case "user":
      return {
        ...common,
        role,
        content: content.map((part) => {
          const type = part.type;
          switch (type) {
            case "text":
            case "image":
            case "audio":
            case "file":
              return part;
            default: {
              const unhandledType = type;
              throw new Error(
                `Unsupported user message part type: ${unhandledType}`
              );
            }
          }
        }),
        attachments: attachments ?? [],
        metadata: {
          custom: metadata?.custom ?? {}
        }
      };
    case "system":
      if (content.length !== 1 || content[0].type !== "text")
        throw new Error(
          "System messages must have exactly one text message part."
        );
      return {
        ...common,
        role,
        content,
        metadata: {
          custom: metadata?.custom ?? {}
        }
      };
    default: {
      const unsupportedRole = role;
      throw new Error(`Unknown message role: ${unsupportedRole}`);
    }
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/utils/MessageRepository.js
var ExportedMessageRepository = {
  /**
   * Converts an array of messages to an ExportedMessageRepository format.
   * Creates parent-child relationships based on the order of messages in the array.
   *
   * @param messages - Array of message-like objects to convert
   * @returns ExportedMessageRepository with parent-child relationships established
   */
  fromArray: (messages) => {
    const conv = messages.map(
      (m) => fromThreadMessageLike(
        m,
        generateId(),
        getAutoStatus(false, false, false, false)
      )
    );
    return {
      messages: conv.map((m, idx) => ({
        parentId: idx > 0 ? conv[idx - 1].id : null,
        message: m
      }))
    };
  }
};
var findHead = (message) => {
  if (message.next) return findHead(message.next);
  if ("current" in message) return message;
  return null;
};
var CachedValue = class {
  /**
   * @param func - The function that computes the cached value
   */
  constructor(func) {
    this.func = func;
  }
  _value = null;
  /**
   * Gets the cached value, computing it if necessary.
   */
  get value() {
    if (this._value === null) {
      this._value = this.func();
    }
    return this._value;
  }
  /**
   * Invalidates the cache, forcing recomputation on next access.
   */
  dirty() {
    this._value = null;
  }
};
var MessageRepository = class {
  /** Map of message IDs to repository message objects */
  messages = /* @__PURE__ */ new Map();
  /** Reference to the current head (most recent) message in the active branch */
  head = null;
  /** Root node of the tree structure */
  root = {
    children: [],
    next: null
  };
  /**
   * Performs link/unlink operations between messages in the tree.
   *
   * @param newParent - The new parent message, or null
   * @param child - The child message to operate on
   * @param operation - The type of operation to perform:
   *   - "cut": Remove the child from its current parent
   *   - "link": Add the child to a new parent
   *   - "relink": Both cut and link operations
   */
  performOp(newParent, child, operation) {
    const parentOrRoot = child.prev ?? this.root;
    const newParentOrRoot = newParent ?? this.root;
    if (operation === "relink" && parentOrRoot === newParentOrRoot) return;
    if (operation !== "link") {
      parentOrRoot.children = parentOrRoot.children.filter(
        (m) => m !== child.current.id
      );
      if (parentOrRoot.next === child) {
        const fallbackId = parentOrRoot.children.at(-1);
        const fallback = fallbackId ? this.messages.get(fallbackId) : null;
        if (fallback === void 0) {
          throw new Error(
            "MessageRepository(performOp/cut): Fallback sibling message not found. This is likely an internal bug in assistant-ui."
          );
        }
        parentOrRoot.next = fallback;
      }
    }
    if (operation !== "cut") {
      for (let current = newParent; current; current = current.prev) {
        if (current.current.id === child.current.id) {
          throw new Error(
            "MessageRepository(performOp/link): A message with the same id already exists in the parent tree. This error occurs if the same message id is found multiple times. This is likely an internal bug in assistant-ui."
          );
        }
      }
      newParentOrRoot.children = [
        ...newParentOrRoot.children,
        child.current.id
      ];
      if (findHead(child) === this.head || newParentOrRoot.next === null) {
        newParentOrRoot.next = child;
      }
      child.prev = newParent;
    }
  }
  /** Cached array of messages in the current active branch, from root to head */
  _messages = new CachedValue(() => {
    const messages = new Array(this.head?.level ?? 0);
    for (let current = this.head; current; current = current.prev) {
      messages[current.level] = current.current;
    }
    return messages;
  });
  /**
   * Gets the ID of the current head message.
   * @returns The ID of the head message, or null if no messages exist
   */
  get headId() {
    return this.head?.current.id ?? null;
  }
  /**
   * Gets all messages in the current active branch, from root to head.
   * @returns Array of messages in the current branch
   */
  getMessages() {
    return this._messages.value;
  }
  /**
   * Adds a new message or updates an existing one in the repository.
   * If the message ID already exists, the message is updated and potentially relinked to a new parent.
   * If the message is new, it's added as a child of the specified parent.
   *
   * @param parentId - ID of the parent message, or null for root messages
   * @param message - The message to add or update
   * @throws Error if the parent message is not found
   */
  addOrUpdateMessage(parentId, message) {
    const existingItem = this.messages.get(message.id);
    const prev = parentId ? this.messages.get(parentId) : null;
    if (prev === void 0)
      throw new Error(
        "MessageRepository(addOrUpdateMessage): Parent message not found. This is likely an internal bug in assistant-ui."
      );
    if (existingItem) {
      existingItem.current = message;
      this.performOp(prev, existingItem, "relink");
      this._messages.dirty();
      return;
    }
    const newItem = {
      prev,
      current: message,
      next: null,
      children: [],
      level: prev ? prev.level + 1 : 0
    };
    this.messages.set(message.id, newItem);
    this.performOp(prev, newItem, "link");
    if (this.head === prev) {
      this.head = newItem;
    }
    this._messages.dirty();
  }
  /**
   * Gets a message and its parent ID by message ID.
   *
   * @param messageId - ID of the message to retrieve
   * @returns Object containing the message and its parent ID
   * @throws Error if the message is not found
   */
  getMessage(messageId) {
    const message = this.messages.get(messageId);
    if (!message)
      throw new Error(
        "MessageRepository(updateMessage): Message not found. This is likely an internal bug in assistant-ui."
      );
    return {
      parentId: message.prev?.current.id ?? null,
      message: message.current
    };
  }
  /**
   * Adds an optimistic message to the repository.
   * An optimistic message is a temporary placeholder that will be replaced by a real message later.
   *
   * @param parentId - ID of the parent message, or null for root messages
   * @param message - The core message to convert to an optimistic message
   * @returns The generated optimistic ID
   */
  appendOptimisticMessage(parentId, message) {
    let optimisticId;
    do {
      optimisticId = generateOptimisticId();
    } while (this.messages.has(optimisticId));
    this.addOrUpdateMessage(
      parentId,
      fromThreadMessageLike(message, optimisticId, { type: "running" })
    );
    return optimisticId;
  }
  /**
   * Deletes a message from the repository and relinks its children.
   *
   * @param messageId - ID of the message to delete
   * @param replacementId - Optional ID of the message to become the new parent of the children,
   *                       undefined means use the deleted message's parent,
   *                       null means use the root
   * @throws Error if the message or replacement is not found
   */
  deleteMessage(messageId, replacementId) {
    const message = this.messages.get(messageId);
    if (!message)
      throw new Error(
        "MessageRepository(deleteMessage): Message not found. This is likely an internal bug in assistant-ui."
      );
    const replacement = replacementId === void 0 ? message.prev : replacementId === null ? null : this.messages.get(replacementId);
    if (replacement === void 0)
      throw new Error(
        "MessageRepository(deleteMessage): Replacement not found. This is likely an internal bug in assistant-ui."
      );
    for (const child of message.children) {
      const childMessage = this.messages.get(child);
      if (!childMessage)
        throw new Error(
          "MessageRepository(deleteMessage): Child message not found. This is likely an internal bug in assistant-ui."
        );
      this.performOp(replacement, childMessage, "relink");
    }
    this.performOp(null, message, "cut");
    this.messages.delete(messageId);
    if (this.head === message) {
      this.head = findHead(replacement ?? this.root);
    }
    this._messages.dirty();
  }
  /**
   * Gets all branch IDs (sibling messages) at the level of a specified message.
   *
   * @param messageId - ID of the message to find branches for
   * @returns Array of message IDs representing branches
   * @throws Error if the message is not found
   */
  getBranches(messageId) {
    const message = this.messages.get(messageId);
    if (!message)
      throw new Error(
        "MessageRepository(getBranches): Message not found. This is likely an internal bug in assistant-ui."
      );
    const { children } = message.prev ?? this.root;
    return children;
  }
  /**
   * Switches the active branch to the one containing the specified message.
   *
   * @param messageId - ID of the message in the branch to switch to
   * @throws Error if the branch is not found
   */
  switchToBranch(messageId) {
    const message = this.messages.get(messageId);
    if (!message)
      throw new Error(
        "MessageRepository(switchToBranch): Branch not found. This is likely an internal bug in assistant-ui."
      );
    const prevOrRoot = message.prev ?? this.root;
    prevOrRoot.next = message;
    this.head = findHead(message);
    this._messages.dirty();
  }
  /**
   * Resets the head to a specific message or null.
   *
   * @param messageId - ID of the message to set as head, or null to clear the head
   * @throws Error if the message is not found
   */
  resetHead(messageId) {
    if (messageId === null) {
      this.clear();
      return;
    }
    const message = this.messages.get(messageId);
    if (!message)
      throw new Error(
        "MessageRepository(resetHead): Branch not found. This is likely an internal bug in assistant-ui."
      );
    if (message.children.length > 0) {
      const deleteDescendants = (msg) => {
        for (const childId of msg.children) {
          const childMessage = this.messages.get(childId);
          if (childMessage) {
            deleteDescendants(childMessage);
            this.messages.delete(childId);
          }
        }
      };
      deleteDescendants(message);
      message.children = [];
      message.next = null;
    }
    this.head = message;
    for (let current = message; current; current = current.prev) {
      if (current.prev) {
        current.prev.next = current;
      }
    }
    this._messages.dirty();
  }
  /**
   * Clears all messages from the repository.
   */
  clear() {
    this.messages.clear();
    this.head = null;
    this.root = {
      children: [],
      next: null
    };
    this._messages.dirty();
  }
  /**
   * Exports the repository state for persistence.
   *
   * @returns Exportable repository state
   */
  export() {
    const exportItems = [];
    for (const [, message] of this.messages) {
      exportItems.push({
        message: message.current,
        parentId: message.prev?.current.id ?? null
      });
    }
    return {
      headId: this.head?.current.id ?? null,
      messages: exportItems
    };
  }
  /**
   * Imports repository state from an exported repository.
   *
   * @param repository - The exported repository state to import
   */
  import({ headId, messages }) {
    for (const { message, parentId } of messages) {
      this.addOrUpdateMessage(parentId, message);
    }
    this.resetHead(headId ?? messages.at(-1)?.message.id ?? null);
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/BaseSubject.js
var BaseSubject = class {
  _subscriptions = /* @__PURE__ */ new Set();
  _connection;
  get isConnected() {
    return !!this._connection;
  }
  notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }
  _updateConnection() {
    if (this._subscriptions.size > 0) {
      if (this._connection) return;
      this._connection = this._connect();
    } else {
      this._connection?.();
      this._connection = void 0;
    }
  }
  subscribe(callback) {
    this._subscriptions.add(callback);
    this._updateConnection();
    return () => {
      this._subscriptions.delete(callback);
      this._updateConnection();
    };
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/SKIP_UPDATE.js
var SKIP_UPDATE = /* @__PURE__ */ Symbol("skip-update");

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/LazyMemoizeSubject.js
var LazyMemoizeSubject = class extends BaseSubject {
  constructor(binding) {
    super();
    this.binding = binding;
  }
  get path() {
    return this.binding.path;
  }
  _previousStateDirty = true;
  _previousState;
  getState = () => {
    if (!this.isConnected || this._previousStateDirty) {
      const newState = this.binding.getState();
      if (newState !== SKIP_UPDATE) {
        this._previousState = newState;
      }
      this._previousStateDirty = false;
    }
    if (this._previousState === void 0)
      throw new Error("Entry not available in the store");
    return this._previousState;
  };
  _connect() {
    const callback = () => {
      this._previousStateDirty = true;
      this.notifySubscribers();
    };
    return this.binding.subscribe(callback);
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ThreadListItemRuntime.js
var ThreadListItemRuntimeImpl = class {
  constructor(_core, _threadListBinding) {
    this._core = _core;
    this._threadListBinding = _threadListBinding;
    this.__internal_bindMethods();
  }
  get path() {
    return this._core.path;
  }
  __internal_bindMethods() {
    this.switchTo = this.switchTo.bind(this);
    this.rename = this.rename.bind(this);
    this.archive = this.archive.bind(this);
    this.unarchive = this.unarchive.bind(this);
    this.delete = this.delete.bind(this);
    this.initialize = this.initialize.bind(this);
    this.generateTitle = this.generateTitle.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unstable_on = this.unstable_on.bind(this);
    this.getState = this.getState.bind(this);
    this.detach = this.detach.bind(this);
  }
  getState() {
    return this._core.getState();
  }
  switchTo() {
    const state = this._core.getState();
    return this._threadListBinding.switchToThread(state.id);
  }
  rename(newTitle) {
    const state = this._core.getState();
    return this._threadListBinding.rename(state.id, newTitle);
  }
  archive() {
    const state = this._core.getState();
    return this._threadListBinding.archive(state.id);
  }
  unarchive() {
    const state = this._core.getState();
    return this._threadListBinding.unarchive(state.id);
  }
  delete() {
    const state = this._core.getState();
    return this._threadListBinding.delete(state.id);
  }
  initialize() {
    const state = this._core.getState();
    return this._threadListBinding.initialize(state.id);
  }
  generateTitle() {
    const state = this._core.getState();
    return this._threadListBinding.generateTitle(state.id);
  }
  unstable_on(event, callback) {
    let prevIsMain = this._core.getState().isMain;
    let prevThreadId = this._core.getState().id;
    return this.subscribe(() => {
      const currentState = this._core.getState();
      const newIsMain = currentState.isMain;
      const newThreadId = currentState.id;
      if (prevIsMain === newIsMain && prevThreadId === newThreadId) return;
      prevIsMain = newIsMain;
      prevThreadId = newThreadId;
      if (event === "switched-to" && !newIsMain) return;
      if (event === "switched-away" && newIsMain) return;
      callback();
    });
  }
  subscribe(callback) {
    return this._core.subscribe(callback);
  }
  detach() {
    const state = this._core.getState();
    this._threadListBinding.detach(state.id);
  }
  /** @internal */
  __internal_getRuntime() {
    return this;
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/shallowEqual.js
function shallowEqual(objA, objB) {
  if (objA === void 0 && objB === void 0) return true;
  if (objA === void 0) return false;
  if (objB === void 0) return false;
  for (const key of Object.keys(objA)) {
    const valueA = objA[key];
    const valueB = objB[key];
    if (!Object.is(valueA, valueB)) return false;
  }
  return true;
}

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/ShallowMemoizeSubject.js
var ShallowMemoizeSubject = class extends BaseSubject {
  constructor(binding) {
    super();
    this.binding = binding;
    const state = binding.getState();
    if (state === SKIP_UPDATE)
      throw new Error("Entry not available in the store");
    this._previousState = state;
  }
  get path() {
    return this.binding.path;
  }
  _previousState;
  getState = () => {
    if (!this.isConnected) this._syncState();
    return this._previousState;
  };
  _syncState() {
    const state = this.binding.getState();
    if (state === SKIP_UPDATE) return false;
    if (shallowEqual(state, this._previousState)) return false;
    this._previousState = state;
    return true;
  }
  _connect() {
    const callback = () => {
      if (this._syncState()) {
        this.notifySubscribers();
      }
    };
    return this.binding.subscribe(callback);
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/getExternalStoreMessage.js
var symbolInnerMessage = /* @__PURE__ */ Symbol("innerMessage");
var getExternalStoreMessage = (input) => {
  const withInnerMessages = input;
  return withInnerMessages[symbolInnerMessage];
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/utils/getThreadMessageText.js
var getThreadMessageText = (message) => {
  const textParts = message.content.filter(
    (part) => part.type === "text"
  );
  return textParts.map((part) => part.text).join("\n\n");
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/AttachmentRuntime.js
var AttachmentRuntimeImpl = class {
  constructor(_core) {
    this._core = _core;
    this.__internal_bindMethods();
  }
  get path() {
    return this._core.path;
  }
  __internal_bindMethods() {
    this.getState = this.getState.bind(this);
    this.remove = this.remove.bind(this);
    this.subscribe = this.subscribe.bind(this);
  }
  getState() {
    return this._core.getState();
  }
  subscribe(callback) {
    return this._core.subscribe(callback);
  }
};
var ComposerAttachmentRuntime = class extends AttachmentRuntimeImpl {
  constructor(core, _composerApi) {
    super(core);
    this._composerApi = _composerApi;
  }
  remove() {
    const core = this._composerApi.getState();
    if (!core) throw new Error("Composer is not available");
    return core.removeAttachment(this.getState().id);
  }
};
var ThreadComposerAttachmentRuntimeImpl = class extends ComposerAttachmentRuntime {
  get source() {
    return "thread-composer";
  }
};
var EditComposerAttachmentRuntimeImpl = class extends ComposerAttachmentRuntime {
  get source() {
    return "edit-composer";
  }
};
var MessageAttachmentRuntimeImpl = class extends AttachmentRuntimeImpl {
  get source() {
    return "message";
  }
  constructor(core) {
    super(core);
  }
  remove() {
    throw new Error("Message attachments cannot be removed");
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/EventSubscriptionSubject.js
var EventSubscriptionSubject = class extends BaseSubject {
  constructor(config) {
    super();
    this.config = config;
  }
  getState() {
    return this.config.binding.getState();
  }
  outerSubscribe(callback) {
    return this.config.binding.subscribe(callback);
  }
  _connect() {
    const callback = () => {
      this.notifySubscribers();
    };
    let lastState = this.config.binding.getState();
    let innerUnsubscribe = lastState?.unstable_on(this.config.event, callback);
    const onRuntimeUpdate = () => {
      const newState = this.config.binding.getState();
      if (newState === lastState) return;
      lastState = newState;
      innerUnsubscribe?.();
      innerUnsubscribe = this.config.binding.getState()?.unstable_on(this.config.event, callback);
    };
    const outerUnsubscribe = this.outerSubscribe(onRuntimeUpdate);
    return () => {
      outerUnsubscribe?.();
      innerUnsubscribe?.();
    };
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ComposerRuntime.js
var EMPTY_ARRAY = Object.freeze([]);
var EMPTY_OBJECT = Object.freeze({});
var getThreadComposerState = (runtime) => {
  return Object.freeze({
    type: "thread",
    isEditing: runtime?.isEditing ?? false,
    canCancel: runtime?.canCancel ?? false,
    isEmpty: runtime?.isEmpty ?? true,
    attachments: runtime?.attachments ?? EMPTY_ARRAY,
    text: runtime?.text ?? "",
    role: runtime?.role ?? "user",
    runConfig: runtime?.runConfig ?? EMPTY_OBJECT,
    attachmentAccept: runtime?.attachmentAccept ?? "",
    value: runtime?.text ?? ""
  });
};
var getEditComposerState = (runtime) => {
  return Object.freeze({
    type: "edit",
    isEditing: runtime?.isEditing ?? false,
    canCancel: runtime?.canCancel ?? false,
    isEmpty: runtime?.isEmpty ?? true,
    text: runtime?.text ?? "",
    role: runtime?.role ?? "user",
    attachments: runtime?.attachments ?? EMPTY_ARRAY,
    runConfig: runtime?.runConfig ?? EMPTY_OBJECT,
    attachmentAccept: runtime?.attachmentAccept ?? "",
    value: runtime?.text ?? ""
  });
};
var ComposerRuntimeImpl = class {
  constructor(_core) {
    this._core = _core;
  }
  get path() {
    return this._core.path;
  }
  __internal_bindMethods() {
    this.setText = this.setText.bind(this);
    this.setRunConfig = this.setRunConfig.bind(this);
    this.getState = this.getState.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.addAttachment = this.addAttachment.bind(this);
    this.reset = this.reset.bind(this);
    this.clearAttachments = this.clearAttachments.bind(this);
    this.send = this.send.bind(this);
    this.cancel = this.cancel.bind(this);
    this.setRole = this.setRole.bind(this);
    this.getAttachmentByIndex = this.getAttachmentByIndex.bind(this);
    this.unstable_on = this.unstable_on.bind(this);
  }
  setText(text2) {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    core.setText(text2);
  }
  setRunConfig(runConfig) {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    core.setRunConfig(runConfig);
  }
  addAttachment(file) {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    return core.addAttachment(file);
  }
  reset() {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    return core.reset();
  }
  clearAttachments() {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    return core.clearAttachments();
  }
  send() {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    core.send();
  }
  cancel() {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    core.cancel();
  }
  setRole(role) {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    core.setRole(role);
  }
  subscribe(callback) {
    return this._core.subscribe(callback);
  }
  _eventSubscriptionSubjects = /* @__PURE__ */ new Map();
  unstable_on(event, callback) {
    let subject = this._eventSubscriptionSubjects.get(event);
    if (!subject) {
      subject = new EventSubscriptionSubject({
        event,
        binding: this._core
      });
      this._eventSubscriptionSubjects.set(event, subject);
    }
    return subject.subscribe(callback);
  }
};
var ThreadComposerRuntimeImpl = class extends ComposerRuntimeImpl {
  get path() {
    return this._core.path;
  }
  get type() {
    return "thread";
  }
  _getState;
  constructor(core) {
    const stateBinding = new LazyMemoizeSubject({
      path: core.path,
      getState: () => getThreadComposerState(core.getState()),
      subscribe: (callback) => core.subscribe(callback)
    });
    super({
      path: core.path,
      getState: () => core.getState(),
      subscribe: (callback) => stateBinding.subscribe(callback)
    });
    this._getState = stateBinding.getState.bind(stateBinding);
    this.__internal_bindMethods();
  }
  getState() {
    return this._getState();
  }
  getAttachmentByIndex(idx) {
    return new ThreadComposerAttachmentRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ...this.path,
          attachmentSource: "thread-composer",
          attachmentSelector: { type: "index", index: idx },
          ref: this.path.ref + `${this.path.ref}.attachments[${idx}]`
        },
        getState: () => {
          const attachments = this.getState().attachments;
          const attachment = attachments[idx];
          if (!attachment) return SKIP_UPDATE;
          return {
            ...attachment,
            source: "thread-composer"
          };
        },
        subscribe: (callback) => this._core.subscribe(callback)
      }),
      this._core
    );
  }
};
var EditComposerRuntimeImpl = class extends ComposerRuntimeImpl {
  constructor(core, _beginEdit) {
    const stateBinding = new LazyMemoizeSubject({
      path: core.path,
      getState: () => getEditComposerState(core.getState()),
      subscribe: (callback) => core.subscribe(callback)
    });
    super({
      path: core.path,
      getState: () => core.getState(),
      subscribe: (callback) => stateBinding.subscribe(callback)
    });
    this._beginEdit = _beginEdit;
    this._getState = stateBinding.getState.bind(stateBinding);
    this.__internal_bindMethods();
  }
  get path() {
    return this._core.path;
  }
  get type() {
    return "edit";
  }
  _getState;
  __internal_bindMethods() {
    super.__internal_bindMethods();
    this.beginEdit = this.beginEdit.bind(this);
  }
  getState() {
    return this._getState();
  }
  beginEdit() {
    this._beginEdit();
  }
  getAttachmentByIndex(idx) {
    return new EditComposerAttachmentRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ...this.path,
          attachmentSource: "edit-composer",
          attachmentSelector: { type: "index", index: idx },
          ref: this.path.ref + `${this.path.ref}.attachments[${idx}]`
        },
        getState: () => {
          const attachments = this.getState().attachments;
          const attachment = attachments[idx];
          if (!attachment) return SKIP_UPDATE;
          return {
            ...attachment,
            source: "edit-composer"
          };
        },
        subscribe: (callback) => this._core.subscribe(callback)
      }),
      this._core
    );
  }
};

// ../../node_modules/.pnpm/assistant-stream@0.2.47/node_modules/assistant-stream/dist/core/tool/ToolResponse.js
var TOOL_RESPONSE_SYMBOL = /* @__PURE__ */ Symbol.for("aui.tool-response");
var ToolResponse = class _ToolResponse {
  get [TOOL_RESPONSE_SYMBOL]() {
    return true;
  }
  artifact;
  result;
  isError;
  constructor(options2) {
    if (options2.artifact !== void 0) {
      this.artifact = options2.artifact;
    }
    this.result = options2.result;
    this.isError = options2.isError ?? false;
  }
  static [Symbol.hasInstance](obj) {
    return typeof obj === "object" && obj !== null && TOOL_RESPONSE_SYMBOL in obj;
  }
  static toResponse(result) {
    if (result instanceof _ToolResponse) {
      return result;
    }
    return new _ToolResponse({
      result: result === void 0 ? "<no result>" : result
    });
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/MessagePartRuntime.js
var MessagePartRuntimeImpl = class {
  constructor(contentBinding, messageApi, threadApi) {
    this.contentBinding = contentBinding;
    this.messageApi = messageApi;
    this.threadApi = threadApi;
    this.__internal_bindMethods();
  }
  get path() {
    return this.contentBinding.path;
  }
  __internal_bindMethods() {
    this.addToolResult = this.addToolResult.bind(this);
    this.resumeToolCall = this.resumeToolCall.bind(this);
    this.getState = this.getState.bind(this);
    this.subscribe = this.subscribe.bind(this);
  }
  getState() {
    return this.contentBinding.getState();
  }
  addToolResult(result) {
    const state = this.contentBinding.getState();
    if (!state) throw new Error("Message part is not available");
    if (state.type !== "tool-call")
      throw new Error("Tried to add tool result to non-tool message part");
    if (!this.messageApi)
      throw new Error(
        "Message API is not available. This is likely a bug in assistant-ui."
      );
    if (!this.threadApi) throw new Error("Thread API is not available");
    const message = this.messageApi.getState();
    if (!message) throw new Error("Message is not available");
    const toolName = state.toolName;
    const toolCallId = state.toolCallId;
    const response = ToolResponse.toResponse(result);
    this.threadApi.getState().addToolResult({
      messageId: message.id,
      toolName,
      toolCallId,
      result: response.result,
      artifact: response.artifact,
      isError: response.isError
    });
  }
  resumeToolCall(payload) {
    const state = this.contentBinding.getState();
    if (!state) throw new Error("Message part is not available");
    if (state.type !== "tool-call")
      throw new Error("Tried to resume tool call on non-tool message part");
    if (!this.threadApi) throw new Error("Thread API is not available");
    const toolCallId = state.toolCallId;
    this.threadApi.getState().resumeToolCall({
      toolCallId,
      payload
    });
  }
  subscribe(callback) {
    return this.contentBinding.subscribe(callback);
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/subscribable/NestedSubscriptionSubject.js
var NestedSubscriptionSubject = class extends BaseSubject {
  constructor(binding) {
    super();
    this.binding = binding;
  }
  get path() {
    return this.binding.path;
  }
  getState() {
    return this.binding.getState();
  }
  outerSubscribe(callback) {
    return this.binding.subscribe(callback);
  }
  _connect() {
    const callback = () => {
      this.notifySubscribers();
    };
    let lastState = this.binding.getState();
    let innerUnsubscribe = lastState?.subscribe(callback);
    const onRuntimeUpdate = () => {
      const newState = this.binding.getState();
      if (newState === lastState) return;
      lastState = newState;
      innerUnsubscribe?.();
      innerUnsubscribe = this.binding.getState()?.subscribe(callback);
      callback();
    };
    const outerUnsubscribe = this.outerSubscribe(onRuntimeUpdate);
    return () => {
      outerUnsubscribe?.();
      innerUnsubscribe?.();
    };
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/MessageRuntime.js
var COMPLETE_STATUS = Object.freeze({
  type: "complete"
});
var toMessagePartStatus = (message, partIndex, part) => {
  if (message.role !== "assistant") return COMPLETE_STATUS;
  if (part.type === "tool-call") {
    if (!part.result) {
      return message.status;
    } else {
      return COMPLETE_STATUS;
    }
  }
  const isLastPart = partIndex === Math.max(0, message.content.length - 1);
  if (message.status.type === "requires-action") return COMPLETE_STATUS;
  return isLastPart ? message.status : COMPLETE_STATUS;
};
var getMessagePartState = (message, partIndex) => {
  const part = message.content[partIndex];
  if (!part) {
    return SKIP_UPDATE;
  }
  const status = toMessagePartStatus(message, partIndex, part);
  return Object.freeze({
    ...part,
    ...{ [symbolInnerMessage]: part[symbolInnerMessage] },
    status
  });
};
var MessageRuntimeImpl = class {
  constructor(_core, _threadBinding) {
    this._core = _core;
    this._threadBinding = _threadBinding;
    this.composer = new EditComposerRuntimeImpl(
      new NestedSubscriptionSubject({
        path: {
          ...this.path,
          ref: this.path.ref + `${this.path.ref}.composer`,
          composerSource: "edit"
        },
        getState: this._getEditComposerRuntimeCore,
        subscribe: (callback) => this._threadBinding.subscribe(callback)
      }),
      () => this._threadBinding.getState().beginEdit(this._core.getState().id)
    );
    this.__internal_bindMethods();
  }
  get path() {
    return this._core.path;
  }
  __internal_bindMethods() {
    this.reload = this.reload.bind(this);
    this.getState = this.getState.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.getMessagePartByIndex = this.getMessagePartByIndex.bind(this);
    this.getMessagePartByToolCallId = this.getMessagePartByToolCallId.bind(this);
    this.getAttachmentByIndex = this.getAttachmentByIndex.bind(this);
    this.unstable_getCopyText = this.unstable_getCopyText.bind(this);
    this.speak = this.speak.bind(this);
    this.stopSpeaking = this.stopSpeaking.bind(this);
    this.submitFeedback = this.submitFeedback.bind(this);
    this.switchToBranch = this.switchToBranch.bind(this);
  }
  composer;
  _getEditComposerRuntimeCore = () => {
    return this._threadBinding.getState().getEditComposer(this._core.getState().id);
  };
  getState() {
    return this._core.getState();
  }
  reload(reloadConfig = {}) {
    const editComposerRuntimeCore = this._getEditComposerRuntimeCore();
    const composerRuntimeCore = editComposerRuntimeCore ?? this._threadBinding.getState().composer;
    const composer = editComposerRuntimeCore ?? composerRuntimeCore;
    const { runConfig = composer.runConfig } = reloadConfig;
    const state = this._core.getState();
    if (state.role !== "assistant")
      throw new Error("Can only reload assistant messages");
    this._threadBinding.getState().startRun({
      parentId: state.parentId,
      sourceId: state.id,
      runConfig
    });
  }
  speak() {
    const state = this._core.getState();
    return this._threadBinding.getState().speak(state.id);
  }
  stopSpeaking() {
    const state = this._core.getState();
    const thread = this._threadBinding.getState();
    if (thread.speech?.messageId === state.id) {
      this._threadBinding.getState().stopSpeaking();
    } else {
      throw new Error("Message is not being spoken");
    }
  }
  submitFeedback({ type }) {
    const state = this._core.getState();
    this._threadBinding.getState().submitFeedback({
      messageId: state.id,
      type
    });
  }
  switchToBranch({
    position,
    branchId
  }) {
    const state = this._core.getState();
    if (branchId && position) {
      throw new Error("May not specify both branchId and position");
    } else if (!branchId && !position) {
      throw new Error("Must specify either branchId or position");
    }
    const thread = this._threadBinding.getState();
    const branches = thread.getBranches(state.id);
    let targetBranch = branchId;
    if (position === "previous") {
      targetBranch = branches[state.branchNumber - 2];
    } else if (position === "next") {
      targetBranch = branches[state.branchNumber];
    }
    if (!targetBranch) throw new Error("Branch not found");
    this._threadBinding.getState().switchToBranch(targetBranch);
  }
  unstable_getCopyText() {
    return getThreadMessageText(this.getState());
  }
  subscribe(callback) {
    return this._core.subscribe(callback);
  }
  getMessagePartByIndex(idx) {
    if (idx < 0) throw new Error("Message part index must be >= 0");
    return new MessagePartRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ...this.path,
          ref: this.path.ref + `${this.path.ref}.content[${idx}]`,
          messagePartSelector: { type: "index", index: idx }
        },
        getState: () => {
          return getMessagePartState(this.getState(), idx);
        },
        subscribe: (callback) => this._core.subscribe(callback)
      }),
      this._core,
      this._threadBinding
    );
  }
  getMessagePartByToolCallId(toolCallId) {
    return new MessagePartRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ...this.path,
          ref: this.path.ref + `${this.path.ref}.content[toolCallId=${JSON.stringify(toolCallId)}]`,
          messagePartSelector: { type: "toolCallId", toolCallId }
        },
        getState: () => {
          const state = this._core.getState();
          const idx = state.content.findIndex(
            (part) => part.type === "tool-call" && part.toolCallId === toolCallId
          );
          if (idx === -1) return SKIP_UPDATE;
          return getMessagePartState(state, idx);
        },
        subscribe: (callback) => this._core.subscribe(callback)
      }),
      this._core,
      this._threadBinding
    );
  }
  getAttachmentByIndex(idx) {
    return new MessageAttachmentRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ...this.path,
          ref: this.path.ref + `${this.path.ref}.attachments[${idx}]`,
          attachmentSource: "message",
          attachmentSelector: { type: "index", index: idx }
        },
        getState: () => {
          const attachments = this.getState().attachments;
          const attachment = attachments?.[idx];
          if (!attachment) return SKIP_UPDATE;
          return {
            ...attachment,
            source: "message"
          };
        },
        subscribe: (callback) => this._core.subscribe(callback)
      })
    );
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ThreadRuntime.js
var toResumeRunConfig = (message) => {
  return {
    parentId: message.parentId ?? null,
    sourceId: message.sourceId ?? null,
    runConfig: message.runConfig ?? {},
    ...message.stream ? { stream: message.stream } : {}
  };
};
var toStartRunConfig = (message) => {
  return {
    parentId: message.parentId ?? null,
    sourceId: message.sourceId ?? null,
    runConfig: message.runConfig ?? {}
  };
};
var toAppendMessage = (messages, message) => {
  if (typeof message === "string") {
    return {
      createdAt: /* @__PURE__ */ new Date(),
      parentId: messages.at(-1)?.id ?? null,
      sourceId: null,
      runConfig: {},
      role: "user",
      content: [{ type: "text", text: message }],
      attachments: [],
      metadata: { custom: {} }
    };
  }
  return {
    createdAt: message.createdAt ?? /* @__PURE__ */ new Date(),
    parentId: message.parentId ?? messages.at(-1)?.id ?? null,
    sourceId: message.sourceId ?? null,
    role: message.role ?? "user",
    content: message.content,
    attachments: message.attachments ?? [],
    metadata: message.metadata ?? { custom: {} },
    runConfig: message.runConfig ?? {},
    startRun: message.startRun
  };
};
var getThreadState = (runtime, threadListItemState) => {
  const lastMessage = runtime.messages.at(-1);
  return Object.freeze({
    threadId: threadListItemState.id,
    metadata: threadListItemState,
    capabilities: runtime.capabilities,
    isDisabled: runtime.isDisabled,
    isLoading: runtime.isLoading,
    isRunning: lastMessage?.role !== "assistant" ? false : lastMessage.status.type === "running",
    messages: runtime.messages,
    state: runtime.state,
    suggestions: runtime.suggestions,
    extras: runtime.extras,
    speech: runtime.speech
  });
};
var ThreadRuntimeImpl = class {
  get path() {
    return this._threadBinding.path;
  }
  get __internal_threadBinding() {
    return this._threadBinding;
  }
  _threadBinding;
  constructor(threadBinding, threadListItemBinding) {
    const stateBinding = new ShallowMemoizeSubject({
      path: threadBinding.path,
      getState: () => getThreadState(
        threadBinding.getState(),
        threadListItemBinding.getState()
      ),
      subscribe: (callback) => {
        const sub1 = threadBinding.subscribe(callback);
        const sub2 = threadListItemBinding.subscribe(callback);
        return () => {
          sub1();
          sub2();
        };
      }
    });
    this._threadBinding = {
      path: threadBinding.path,
      getState: () => threadBinding.getState(),
      getStateState: () => stateBinding.getState(),
      outerSubscribe: (callback) => threadBinding.outerSubscribe(callback),
      subscribe: (callback) => threadBinding.subscribe(callback)
    };
    this.composer = new ThreadComposerRuntimeImpl(
      new NestedSubscriptionSubject({
        path: {
          ...this.path,
          ref: this.path.ref + `${this.path.ref}.composer`,
          composerSource: "thread"
        },
        getState: () => this._threadBinding.getState().composer,
        subscribe: (callback) => this._threadBinding.subscribe(callback)
      })
    );
    this.__internal_bindMethods();
  }
  __internal_bindMethods() {
    this.append = this.append.bind(this);
    this.unstable_resumeRun = this.unstable_resumeRun.bind(this);
    this.unstable_loadExternalState = this.unstable_loadExternalState.bind(this);
    this.startRun = this.startRun.bind(this);
    this.cancelRun = this.cancelRun.bind(this);
    this.stopSpeaking = this.stopSpeaking.bind(this);
    this.export = this.export.bind(this);
    this.import = this.import.bind(this);
    this.reset = this.reset.bind(this);
    this.getMessageByIndex = this.getMessageByIndex.bind(this);
    this.getMessageById = this.getMessageById.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unstable_on = this.unstable_on.bind(this);
    this.getModelContext = this.getModelContext.bind(this);
    this.getModelConfig = this.getModelConfig.bind(this);
    this.getState = this.getState.bind(this);
  }
  composer;
  getState() {
    return this._threadBinding.getStateState();
  }
  append(message) {
    this._threadBinding.getState().append(
      toAppendMessage(this._threadBinding.getState().messages, message)
    );
  }
  subscribe(callback) {
    return this._threadBinding.subscribe(callback);
  }
  getModelContext() {
    return this._threadBinding.getState().getModelContext();
  }
  getModelConfig() {
    return this.getModelContext();
  }
  startRun(configOrParentId) {
    const config = configOrParentId === null || typeof configOrParentId === "string" ? { parentId: configOrParentId } : configOrParentId;
    return this._threadBinding.getState().startRun(toStartRunConfig(config));
  }
  unstable_resumeRun(config) {
    return this._threadBinding.getState().resumeRun(toResumeRunConfig(config));
  }
  unstable_loadExternalState(state) {
    this._threadBinding.getState().unstable_loadExternalState(state);
  }
  cancelRun() {
    this._threadBinding.getState().cancelRun();
  }
  stopSpeaking() {
    return this._threadBinding.getState().stopSpeaking();
  }
  export() {
    return this._threadBinding.getState().export();
  }
  import(data) {
    this._threadBinding.getState().import(data);
  }
  reset(initialMessages) {
    this._threadBinding.getState().reset(initialMessages);
  }
  getMessageByIndex(idx) {
    if (idx < 0) throw new Error("Message index must be >= 0");
    return this._getMessageRuntime(
      {
        ...this.path,
        ref: this.path.ref + `${this.path.ref}.messages[${idx}]`,
        messageSelector: { type: "index", index: idx }
      },
      () => {
        const messages = this._threadBinding.getState().messages;
        const message = messages[idx];
        if (!message) return void 0;
        return {
          message,
          parentId: messages[idx - 1]?.id ?? null
        };
      }
    );
  }
  getMessageById(messageId) {
    return this._getMessageRuntime(
      {
        ...this.path,
        ref: this.path.ref + `${this.path.ref}.messages[messageId=${JSON.stringify(messageId)}]`,
        messageSelector: { type: "messageId", messageId }
      },
      () => this._threadBinding.getState().getMessageById(messageId)
    );
  }
  _getMessageRuntime(path, callback) {
    return new MessageRuntimeImpl(
      new ShallowMemoizeSubject({
        path,
        getState: () => {
          const { message, parentId } = callback() ?? {};
          const { messages, speech: speechState } = this._threadBinding.getState();
          if (!message || parentId === void 0) return SKIP_UPDATE;
          const thread = this._threadBinding.getState();
          const branches = thread.getBranches(message.id);
          const submittedFeedback = thread.getSubmittedFeedback(message.id);
          return {
            ...message,
            ...{ [symbolInnerMessage]: message[symbolInnerMessage] },
            isLast: messages.at(-1)?.id === message.id,
            parentId,
            branchNumber: branches.indexOf(message.id) + 1,
            branchCount: branches.length,
            speech: speechState?.messageId === message.id ? speechState : void 0,
            submittedFeedback
          };
        },
        subscribe: (callback2) => this._threadBinding.subscribe(callback2)
      }),
      this._threadBinding
    );
  }
  _eventSubscriptionSubjects = /* @__PURE__ */ new Map();
  unstable_on(event, callback) {
    let subject = this._eventSubscriptionSubjects.get(event);
    if (!subject) {
      subject = new EventSubscriptionSubject({
        event,
        binding: this._threadBinding
      });
      this._eventSubscriptionSubjects.set(event, subject);
    }
    return subject.subscribe(callback);
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/ThreadListRuntime.js
var getThreadListState = (threadList) => {
  return {
    mainThreadId: threadList.mainThreadId,
    newThread: threadList.newThreadId,
    threads: threadList.threadIds,
    archivedThreads: threadList.archivedThreadIds,
    isLoading: threadList.isLoading,
    threadItems: threadList.threadData
  };
};
var getThreadListItemState = (threadList, threadId) => {
  if (threadId === void 0) return SKIP_UPDATE;
  const threadData = threadList.getItemById(threadId);
  if (!threadData) return SKIP_UPDATE;
  return {
    id: threadData.id,
    threadId: threadData.id,
    // TODO remove in 0.8.0
    remoteId: threadData.remoteId,
    externalId: threadData.externalId,
    title: threadData.title,
    status: threadData.status,
    isMain: threadData.id === threadList.mainThreadId
  };
};
var ThreadListRuntimeImpl = class {
  constructor(_core, _runtimeFactory = ThreadRuntimeImpl) {
    this._core = _core;
    this._runtimeFactory = _runtimeFactory;
    const stateBinding = new LazyMemoizeSubject({
      path: {},
      getState: () => getThreadListState(_core),
      subscribe: (callback) => _core.subscribe(callback)
    });
    this._getState = stateBinding.getState.bind(stateBinding);
    this._mainThreadListItemRuntime = new ThreadListItemRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ref: `threadItems[main]`,
          threadSelector: { type: "main" }
        },
        getState: () => {
          return getThreadListItemState(this._core, this._core.mainThreadId);
        },
        subscribe: (callback) => this._core.subscribe(callback)
      }),
      this._core
    );
    this.main = new _runtimeFactory(
      new NestedSubscriptionSubject({
        path: {
          ref: "threads.main",
          threadSelector: { type: "main" }
        },
        getState: () => _core.getMainThreadRuntimeCore(),
        subscribe: (callback) => _core.subscribe(callback)
      }),
      this._mainThreadListItemRuntime
      // TODO capture "main" threadListItem from context around useLocalRuntime / useExternalStoreRuntime
    );
    this.__internal_bindMethods();
  }
  _getState;
  __internal_bindMethods() {
    this.switchToThread = this.switchToThread.bind(this);
    this.switchToNewThread = this.switchToNewThread.bind(this);
    this.getState = this.getState.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.getById = this.getById.bind(this);
    this.getItemById = this.getItemById.bind(this);
    this.getItemByIndex = this.getItemByIndex.bind(this);
    this.getArchivedItemByIndex = this.getArchivedItemByIndex.bind(this);
  }
  switchToThread(threadId) {
    return this._core.switchToThread(threadId);
  }
  switchToNewThread() {
    return this._core.switchToNewThread();
  }
  getState() {
    return this._getState();
  }
  subscribe(callback) {
    return this._core.subscribe(callback);
  }
  _mainThreadListItemRuntime;
  main;
  get mainItem() {
    return this._mainThreadListItemRuntime;
  }
  getById(threadId) {
    return new this._runtimeFactory(
      new NestedSubscriptionSubject({
        path: {
          ref: "threads[threadId=" + JSON.stringify(threadId) + "]",
          threadSelector: { type: "threadId", threadId }
        },
        getState: () => this._core.getThreadRuntimeCore(threadId),
        subscribe: (callback) => this._core.subscribe(callback)
      }),
      this.mainItem
      // TODO capture "main" threadListItem from context around useLocalRuntime / useExternalStoreRuntime
    );
  }
  getItemByIndex(idx) {
    return new ThreadListItemRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ref: `threadItems[${idx}]`,
          threadSelector: { type: "index", index: idx }
        },
        getState: () => {
          return getThreadListItemState(this._core, this._core.threadIds[idx]);
        },
        subscribe: (callback) => this._core.subscribe(callback)
      }),
      this._core
    );
  }
  getArchivedItemByIndex(idx) {
    return new ThreadListItemRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ref: `archivedThreadItems[${idx}]`,
          threadSelector: { type: "archiveIndex", index: idx }
        },
        getState: () => {
          return getThreadListItemState(
            this._core,
            this._core.archivedThreadIds[idx]
          );
        },
        subscribe: (callback) => this._core.subscribe(callback)
      }),
      this._core
    );
  }
  getItemById(threadId) {
    return new ThreadListItemRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ref: `threadItems[threadId=${threadId}]`,
          threadSelector: { type: "threadId", threadId }
        },
        getState: () => {
          return getThreadListItemState(this._core, threadId);
        },
        subscribe: (callback) => this._core.subscribe(callback)
      }),
      this._core
    );
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/adapters/RuntimeAdapterProvider.js
import { createContext, useContext } from "react";
import { jsx } from "react/jsx-runtime";
var RuntimeAdaptersContext = createContext(null);
var useRuntimeAdapters = () => {
  const adapters = useContext(RuntimeAdaptersContext);
  return adapters;
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/useExternalStoreRuntime.js
import { useEffect, useMemo, useState } from "react";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/ExternalStoreThreadListRuntimeCore.js
var EMPTY_ARRAY2 = Object.freeze([]);
var DEFAULT_THREAD_ID = "DEFAULT_THREAD_ID";
var DEFAULT_THREADS = Object.freeze([DEFAULT_THREAD_ID]);
var DEFAULT_THREAD = Object.freeze({
  id: DEFAULT_THREAD_ID,
  remoteId: void 0,
  externalId: void 0,
  status: "regular"
});
var RESOLVED_PROMISE = Promise.resolve();
var DEFAULT_THREAD_DATA = Object.freeze({
  [DEFAULT_THREAD_ID]: DEFAULT_THREAD
});
var ExternalStoreThreadListRuntimeCore = class {
  constructor(adapter = {}, threadFactory) {
    this.adapter = adapter;
    this.threadFactory = threadFactory;
    this._mainThread = this.threadFactory();
    this.__internal_setAdapter(adapter, true);
  }
  _mainThreadId = DEFAULT_THREAD_ID;
  _threads = DEFAULT_THREADS;
  _archivedThreads = EMPTY_ARRAY2;
  _threadData = DEFAULT_THREAD_DATA;
  get isLoading() {
    return this.adapter.isLoading ?? false;
  }
  get newThreadId() {
    return void 0;
  }
  get threadIds() {
    return this._threads;
  }
  get archivedThreadIds() {
    return this._archivedThreads;
  }
  get threadData() {
    return this._threadData;
  }
  getLoadThreadsPromise() {
    return RESOLVED_PROMISE;
  }
  _mainThread;
  get mainThreadId() {
    return this._mainThreadId;
  }
  getMainThreadRuntimeCore() {
    return this._mainThread;
  }
  getThreadRuntimeCore() {
    throw new Error("Method not implemented.");
  }
  getItemById(threadId) {
    for (const thread of this.adapter.threads ?? []) {
      if (thread.id === threadId) return thread;
    }
    for (const thread of this.adapter.archivedThreads ?? []) {
      if (thread.id === threadId) return thread;
    }
    if (threadId === DEFAULT_THREAD_ID) return DEFAULT_THREAD;
    return void 0;
  }
  __internal_setAdapter(adapter, initialLoad = false) {
    const previousAdapter = this.adapter;
    this.adapter = adapter;
    const newThreadId = adapter.threadId ?? DEFAULT_THREAD_ID;
    const newThreads = adapter.threads ?? EMPTY_ARRAY2;
    const newArchivedThreads = adapter.archivedThreads ?? EMPTY_ARRAY2;
    const previousThreadId = previousAdapter.threadId ?? DEFAULT_THREAD_ID;
    const previousThreads = previousAdapter.threads ?? EMPTY_ARRAY2;
    const previousArchivedThreads = previousAdapter.archivedThreads ?? EMPTY_ARRAY2;
    if (!initialLoad && previousThreadId === newThreadId && previousThreads === newThreads && previousArchivedThreads === newArchivedThreads) {
      return;
    }
    this._threadData = {
      ...DEFAULT_THREAD_DATA,
      ...Object.fromEntries(
        adapter.threads?.map((t) => [
          t.id,
          {
            ...t,
            remoteId: t.remoteId,
            externalId: t.externalId,
            status: "regular"
          }
        ]) ?? []
      ),
      ...Object.fromEntries(
        adapter.archivedThreads?.map((t) => [
          t.id,
          {
            ...t,
            remoteId: t.remoteId,
            externalId: t.externalId,
            status: "archived"
          }
        ]) ?? []
      )
    };
    if (previousThreads !== newThreads) {
      this._threads = this.adapter.threads?.map((t) => t.id) ?? EMPTY_ARRAY2;
    }
    if (previousArchivedThreads !== newArchivedThreads) {
      this._archivedThreads = this.adapter.archivedThreads?.map((t) => t.id) ?? EMPTY_ARRAY2;
    }
    if (previousThreadId !== newThreadId) {
      this._mainThreadId = newThreadId;
      this._mainThread = this.threadFactory();
    }
    this._notifySubscribers();
  }
  async switchToThread(threadId) {
    if (this._mainThreadId === threadId) return;
    const onSwitchToThread = this.adapter.onSwitchToThread;
    if (!onSwitchToThread)
      throw new Error(
        "External store adapter does not support switching to thread"
      );
    onSwitchToThread(threadId);
  }
  async switchToNewThread() {
    const onSwitchToNewThread = this.adapter.onSwitchToNewThread;
    if (!onSwitchToNewThread)
      throw new Error(
        "External store adapter does not support switching to new thread"
      );
    onSwitchToNewThread();
  }
  async rename(threadId, newTitle) {
    const onRename = this.adapter.onRename;
    if (!onRename)
      throw new Error("External store adapter does not support renaming");
    onRename(threadId, newTitle);
  }
  async detach() {
  }
  async archive(threadId) {
    const onArchive = this.adapter.onArchive;
    if (!onArchive)
      throw new Error("External store adapter does not support archiving");
    onArchive(threadId);
  }
  async unarchive(threadId) {
    const onUnarchive = this.adapter.onUnarchive;
    if (!onUnarchive)
      throw new Error("External store adapter does not support unarchiving");
    onUnarchive(threadId);
  }
  async delete(threadId) {
    const onDelete = this.adapter.onDelete;
    if (!onDelete)
      throw new Error("External store adapter does not support deleting");
    onDelete(threadId);
  }
  initialize() {
    throw new Error("Method not implemented.");
  }
  generateTitle() {
    throw new Error("Method not implemented.");
  }
  _subscriptions = /* @__PURE__ */ new Set();
  subscribe(callback) {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }
  _notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/ThreadMessageConverter.js
var ThreadMessageConverter = class {
  cache = /* @__PURE__ */ new WeakMap();
  convertMessages(messages, converter) {
    return messages.map((m, idx) => {
      const cached = this.cache.get(m);
      const newMessage = converter(cached, m, idx);
      this.cache.set(m, newMessage);
      return newMessage;
    });
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/composer/DefaultEditComposerRuntimeCore.js
var DefaultEditComposerRuntimeCore = class extends BaseComposerRuntimeCore {
  constructor(runtime, endEditCallback, { parentId, message }) {
    super();
    this.runtime = runtime;
    this.endEditCallback = endEditCallback;
    this._parentId = parentId;
    this._sourceId = message.id;
    this._previousText = getThreadMessageText(message);
    this.setText(this._previousText);
    this.setRole(message.role);
    this.setAttachments(message.attachments ?? []);
    this._nonTextParts = message.content.filter((part) => part.type !== "text");
    this.setRunConfig({ ...runtime.composer.runConfig });
  }
  get canCancel() {
    return true;
  }
  getAttachmentAdapter() {
    return this.runtime.adapters?.attachments;
  }
  _nonTextParts;
  _previousText;
  _parentId;
  _sourceId;
  async handleSend(message) {
    const text2 = getThreadMessageText(message);
    if (text2 !== this._previousText) {
      this.runtime.append({
        ...message,
        content: [...message.content, ...this._nonTextParts],
        parentId: this._parentId,
        sourceId: this._sourceId
      });
    }
    this.handleCancel();
  }
  handleCancel() {
    this.endEditCallback();
    this._notifySubscribers();
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/core/BaseThreadRuntimeCore.js
var BaseThreadRuntimeCore = class {
  constructor(_contextProvider) {
    this._contextProvider = _contextProvider;
  }
  _subscriptions = /* @__PURE__ */ new Set();
  _isInitialized = false;
  repository = new MessageRepository();
  get messages() {
    return this.repository.getMessages();
  }
  get state() {
    let mostRecentAssistantMessage;
    for (const message of this.messages) {
      if (message.role === "assistant") {
        mostRecentAssistantMessage = message;
        break;
      }
    }
    return mostRecentAssistantMessage?.metadata.unstable_state ?? null;
  }
  composer = new DefaultThreadComposerRuntimeCore(this);
  getModelContext() {
    return this._contextProvider.getModelContext();
  }
  _editComposers = /* @__PURE__ */ new Map();
  getEditComposer(messageId) {
    return this._editComposers.get(messageId);
  }
  beginEdit(messageId) {
    if (this._editComposers.has(messageId))
      throw new Error("Edit already in progress");
    this._editComposers.set(
      messageId,
      new DefaultEditComposerRuntimeCore(
        this,
        () => this._editComposers.delete(messageId),
        this.repository.getMessage(messageId)
      )
    );
    this._notifySubscribers();
  }
  getMessageById(messageId) {
    try {
      return this.repository.getMessage(messageId);
    } catch {
      return void 0;
    }
  }
  getBranches(messageId) {
    return this.repository.getBranches(messageId);
  }
  switchToBranch(branchId) {
    this.repository.switchToBranch(branchId);
    this._notifySubscribers();
  }
  _notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }
  _notifyEventSubscribers(event) {
    const subscribers = this._eventSubscribers.get(event);
    if (!subscribers) return;
    for (const callback of subscribers) callback();
  }
  subscribe(callback) {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }
  _submittedFeedback = {};
  getSubmittedFeedback(messageId) {
    return this._submittedFeedback[messageId];
  }
  submitFeedback({ messageId, type }) {
    const adapter = this.adapters?.feedback;
    if (!adapter) throw new Error("Feedback adapter not configured");
    const { message } = this.repository.getMessage(messageId);
    adapter.submit({ message, type });
    this._submittedFeedback[messageId] = { type };
    this._notifySubscribers();
  }
  _stopSpeaking;
  speech;
  speak(messageId) {
    const adapter = this.adapters?.speech;
    if (!adapter) throw new Error("Speech adapter not configured");
    const { message } = this.repository.getMessage(messageId);
    this._stopSpeaking?.();
    const utterance = adapter.speak(getThreadMessageText(message));
    const unsub = utterance.subscribe(() => {
      if (utterance.status.type === "ended") {
        this._stopSpeaking = void 0;
        this.speech = void 0;
      } else {
        this.speech = { messageId, status: utterance.status };
      }
      this._notifySubscribers();
    });
    this.speech = { messageId, status: utterance.status };
    this._notifySubscribers();
    this._stopSpeaking = () => {
      utterance.cancel();
      unsub();
      this.speech = void 0;
      this._stopSpeaking = void 0;
    };
  }
  stopSpeaking() {
    if (!this._stopSpeaking) throw new Error("No message is being spoken");
    this._stopSpeaking();
    this._notifySubscribers();
  }
  ensureInitialized() {
    if (!this._isInitialized) {
      this._isInitialized = true;
      this._notifyEventSubscribers("initialize");
    }
  }
  // TODO import()/export() on external store doesn't make much sense
  export() {
    return this.repository.export();
  }
  import(data) {
    this.ensureInitialized();
    this.repository.clear();
    this.repository.import(data);
    this._notifySubscribers();
  }
  reset(initialMessages) {
    this.import(ExportedMessageRepository.fromArray(initialMessages ?? []));
  }
  _eventSubscribers = /* @__PURE__ */ new Map();
  unstable_on(event, callback) {
    if (event === "model-context-update") {
      return this._contextProvider.subscribe?.(callback) ?? (() => {
      });
    }
    const subscribers = this._eventSubscribers.get(event);
    if (!subscribers) {
      this._eventSubscribers.set(event, /* @__PURE__ */ new Set([callback]));
    } else {
      subscribers.add(callback);
    }
    return () => {
      const subscribers2 = this._eventSubscribers.get(event);
      subscribers2.delete(callback);
    };
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/ExternalStoreThreadRuntimeCore.js
var EMPTY_ARRAY3 = Object.freeze([]);
var hasUpcomingMessage = (isRunning, messages) => {
  return isRunning && messages[messages.length - 1]?.role !== "assistant";
};
var ExternalStoreThreadRuntimeCore = class extends BaseThreadRuntimeCore {
  _assistantOptimisticId = null;
  _capabilities = {
    switchToBranch: false,
    switchBranchDuringRun: false,
    edit: false,
    reload: false,
    cancel: false,
    unstable_copy: false,
    speech: false,
    attachments: false,
    feedback: false
  };
  get capabilities() {
    return this._capabilities;
  }
  _messages;
  isDisabled;
  get isLoading() {
    return this._store.isLoading ?? false;
  }
  get messages() {
    return this._messages;
  }
  get state() {
    return this._store.state ?? super.state;
  }
  get adapters() {
    return this._store.adapters;
  }
  suggestions = [];
  extras = void 0;
  _converter = new ThreadMessageConverter();
  _store;
  beginEdit(messageId) {
    if (!this._store.onEdit)
      throw new Error("Runtime does not support editing.");
    super.beginEdit(messageId);
  }
  constructor(contextProvider, store) {
    super(contextProvider);
    this.__internal_setAdapter(store);
  }
  __internal_setAdapter(store) {
    if (this._store === store) return;
    const isRunning = store.isRunning ?? false;
    this.isDisabled = store.isDisabled ?? false;
    const oldStore = this._store;
    this._store = store;
    this.extras = store.extras;
    this.suggestions = store.suggestions ?? EMPTY_ARRAY3;
    this._capabilities = {
      switchToBranch: this._store.setMessages !== void 0,
      switchBranchDuringRun: false,
      // External store never supports branch switching during run
      edit: this._store.onEdit !== void 0,
      reload: this._store.onReload !== void 0,
      cancel: this._store.onCancel !== void 0,
      speech: this._store.adapters?.speech !== void 0,
      unstable_copy: this._store.unstable_capabilities?.copy !== false,
      // default true
      attachments: !!this._store.adapters?.attachments,
      feedback: !!this._store.adapters?.feedback
    };
    let messages;
    if (store.messageRepository) {
      if (oldStore && oldStore.isRunning === store.isRunning && oldStore.messageRepository === store.messageRepository) {
        this._notifySubscribers();
        return;
      }
      this.repository.clear();
      this._assistantOptimisticId = null;
      this.repository.import(store.messageRepository);
      messages = this.repository.getMessages();
    } else if (store.messages) {
      if (oldStore) {
        if (oldStore.convertMessage !== store.convertMessage) {
          this._converter = new ThreadMessageConverter();
        } else if (oldStore.isRunning === store.isRunning && oldStore.messages === store.messages) {
          this._notifySubscribers();
          return;
        }
      }
      messages = !store.convertMessage ? store.messages : this._converter.convertMessages(store.messages, (cache, m, idx) => {
        if (!store.convertMessage) return m;
        const isLast = idx === store.messages.length - 1;
        const autoStatus = getAutoStatus(isLast, isRunning, false, false);
        if (cache && (cache.role !== "assistant" || !isAutoStatus(cache.status) || cache.status === autoStatus))
          return cache;
        const messageLike = store.convertMessage(m, idx);
        const newMessage = fromThreadMessageLike(
          messageLike,
          idx.toString(),
          autoStatus
        );
        newMessage[symbolInnerMessage] = m;
        return newMessage;
      });
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const parent = messages[i - 1];
        this.repository.addOrUpdateMessage(parent?.id ?? null, message);
      }
    } else {
      throw new Error(
        "ExternalStoreAdapter must provide either 'messages' or 'messageRepository'"
      );
    }
    if (messages.length > 0) this.ensureInitialized();
    if ((oldStore?.isRunning ?? false) !== (store.isRunning ?? false)) {
      if (store.isRunning) {
        this._notifyEventSubscribers("run-start");
      } else {
        this._notifyEventSubscribers("run-end");
      }
    }
    if (this._assistantOptimisticId) {
      this.repository.deleteMessage(this._assistantOptimisticId);
      this._assistantOptimisticId = null;
    }
    if (hasUpcomingMessage(isRunning, messages)) {
      this._assistantOptimisticId = this.repository.appendOptimisticMessage(
        messages.at(-1)?.id ?? null,
        {
          role: "assistant",
          content: []
        }
      );
    }
    this.repository.resetHead(
      this._assistantOptimisticId ?? messages.at(-1)?.id ?? null
    );
    this._messages = this.repository.getMessages();
    this._notifySubscribers();
  }
  switchToBranch(branchId) {
    if (!this._store.setMessages)
      throw new Error("Runtime does not support switching branches.");
    if (this._store.isRunning) {
      return;
    }
    this.repository.switchToBranch(branchId);
    this.updateMessages(this.repository.getMessages());
  }
  async append(message) {
    if (message.parentId !== (this.messages.at(-1)?.id ?? null)) {
      if (!this._store.onEdit)
        throw new Error("Runtime does not support editing messages.");
      await this._store.onEdit(message);
    } else {
      await this._store.onNew(message);
    }
  }
  async startRun(config) {
    if (!this._store.onReload)
      throw new Error("Runtime does not support reloading messages.");
    await this._store.onReload(config.parentId, config);
  }
  async resumeRun(config) {
    if (!this._store.onResume)
      throw new Error("Runtime does not support resuming runs.");
    await this._store.onResume(config);
  }
  unstable_loadExternalState(state) {
    if (!this._store.onLoadExternalState)
      throw new Error("Runtime does not support importing states.");
    this._store.onLoadExternalState(state);
  }
  cancelRun() {
    if (!this._store.onCancel)
      throw new Error("Runtime does not support cancelling runs.");
    this._store.onCancel();
    if (this._assistantOptimisticId) {
      this.repository.deleteMessage(this._assistantOptimisticId);
      this._assistantOptimisticId = null;
    }
    let messages = this.repository.getMessages();
    const previousMessage = messages[messages.length - 1];
    if (previousMessage?.role === "user" && previousMessage.id === messages.at(-1)?.id) {
      this.repository.deleteMessage(previousMessage.id);
      if (!this.composer.text.trim()) {
        this.composer.setText(getThreadMessageText(previousMessage));
      }
      messages = this.repository.getMessages();
    } else {
      this._notifySubscribers();
    }
    setTimeout(() => {
      this.updateMessages(messages);
    }, 0);
  }
  addToolResult(options2) {
    if (!this._store.onAddToolResult && !this._store.onAddToolResult)
      throw new Error("Runtime does not support tool results.");
    this._store.onAddToolResult?.(options2);
  }
  resumeToolCall(options2) {
    if (!this._store.onResumeToolCall)
      throw new Error("Runtime does not support resuming tool calls.");
    this._store.onResumeToolCall(options2);
  }
  reset(initialMessages) {
    const repo = new MessageRepository();
    repo.import(ExportedMessageRepository.fromArray(initialMessages ?? []));
    this.updateMessages(repo.getMessages());
  }
  import(data) {
    this._assistantOptimisticId = null;
    super.import(data);
    if (this._store.onImport) {
      this._store.onImport(this.repository.getMessages());
    }
  }
  updateMessages = (messages) => {
    const hasConverter = this._store.convertMessage !== void 0;
    if (hasConverter) {
      this._store.setMessages?.(
        messages.flatMap(getExternalStoreMessage).filter((m) => m != null)
      );
    } else {
      this._store.setMessages?.(messages);
    }
  };
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/ExternalStoreRuntimeCore.js
var getThreadListAdapter = (store) => {
  return store.adapters?.threadList ?? {};
};
var ExternalStoreRuntimeCore = class extends BaseAssistantRuntimeCore {
  threads;
  constructor(adapter) {
    super();
    this.threads = new ExternalStoreThreadListRuntimeCore(
      getThreadListAdapter(adapter),
      () => new ExternalStoreThreadRuntimeCore(this._contextProvider, adapter)
    );
  }
  setAdapter(adapter) {
    this.threads.__internal_setAdapter(getThreadListAdapter(adapter));
    this.threads.getMainThreadRuntimeCore().__internal_setAdapter(adapter);
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime-cores/external-store/useExternalStoreRuntime.js
var useExternalStoreRuntime = (store) => {
  const [runtime] = useState(() => new ExternalStoreRuntimeCore(store));
  useEffect(() => {
    runtime.setAdapter(store);
  });
  const { modelContext } = useRuntimeAdapters() ?? {};
  useEffect(() => {
    if (!modelContext) return void 0;
    return runtime.registerModelContextProvider(modelContext);
  }, [modelContext, runtime]);
  return useMemo(() => new AssistantRuntimeImpl(runtime), [runtime]);
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/react/AssistantApiContext.js
import {
  createContext as createContext4,
  useContext as useContext3,
  useMemo as useMemo4,
  useEffect as useEffect4
} from "react";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/types/EventTypes.js
var normalizeEventSelector = (selector) => {
  if (typeof selector === "string") {
    const source2 = selector.split(".")[0];
    return {
      scope: source2,
      event: selector
    };
  }
  return {
    scope: selector.scope,
    event: selector.event
  };
};
var checkEventScope = (expectedScope, scope, _event) => {
  return scope === expectedScope;
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/providers/ThreadViewportProvider.js
import { useEffect as useEffect2, useState as useState2 } from "react";

// ../../node_modules/.pnpm/zustand@5.0.15_@types+react@18.3.12_react@18.3.1/node_modules/zustand/esm/vanilla.mjs
var createStoreImpl = (createState) => {
  let state;
  const listeners = /* @__PURE__ */ new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const getInitialState = () => initialState;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const api = { setState, getState, getInitialState, subscribe };
  const initialState = state = createState(setState, getState, api);
  return api;
};
var createStore = ((createState) => createState ? createStoreImpl(createState) : createStoreImpl);

// ../../node_modules/.pnpm/zustand@5.0.15_@types+react@18.3.12_react@18.3.1/node_modules/zustand/esm/react.mjs
import React from "react";
var identity = (arg) => arg;
function useStore(api, selector = identity) {
  const slice = React.useSyncExternalStore(
    api.subscribe,
    React.useCallback(() => selector(api.getState()), [api, selector]),
    React.useCallback(() => selector(api.getInitialState()), [api, selector])
  );
  React.useDebugValue(slice);
  return slice;
}
var createImpl = (createState) => {
  const api = createStore(createState);
  const useBoundStore = (selector) => useStore(api, selector);
  Object.assign(useBoundStore, api);
  return useBoundStore;
};
var create = ((createState) => createState ? createImpl(createState) : createImpl);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/stores/ThreadViewport.js
var makeThreadViewportStore = () => {
  const scrollToBottomListeners = /* @__PURE__ */ new Set();
  return create(() => ({
    isAtBottom: true,
    scrollToBottom: () => {
      for (const listener of scrollToBottomListeners) {
        listener();
      }
    },
    onScrollToBottom: (callback) => {
      scrollToBottomListeners.add(callback);
      return () => {
        scrollToBottomListeners.delete(callback);
      };
    }
  }));
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/react/ThreadViewportContext.js
import { createContext as createContext2 } from "react";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/react/utils/createContextHook.js
import { useContext as useContext2 } from "react";
function createContextHook(context, providerName) {
  function useContextHook(options2) {
    const contextValue2 = useContext2(context);
    if (!options2?.optional && !contextValue2) {
      throw new Error(`This component must be used within ${providerName}.`);
    }
    return contextValue2;
  }
  return useContextHook;
}

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/react/utils/createContextStoreHook.js
function createContextStoreHook(contextHook, contextKey) {
  function useStoreStoreHook(options2) {
    const context = contextHook(options2);
    if (!context) return null;
    return context[contextKey];
  }
  function useStoreHook(param) {
    let optional = false;
    let selector;
    if (typeof param === "function") {
      selector = param;
    } else if (param && typeof param === "object") {
      optional = !!param.optional;
      selector = param.selector;
    }
    const store = useStoreStoreHook({
      optional
    });
    if (!store) return null;
    return selector ? store(selector) : store();
  }
  return {
    [contextKey]: useStoreHook,
    [`${contextKey}Store`]: useStoreStoreHook
  };
}

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/react/ThreadViewportContext.js
var ThreadViewportContext = createContext2(null);
var useThreadViewportContext = createContextHook(
  ThreadViewportContext,
  "ThreadPrimitive.Viewport"
);
var { useThreadViewport, useThreadViewportStore } = createContextStoreHook(useThreadViewportContext, "useThreadViewport");

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/ReadonlyStore.js
var writableStore = (store) => {
  return store;
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/providers/ThreadViewportProvider.js
import { jsx as jsx2 } from "react/jsx-runtime";
var useThreadViewportStoreValue = () => {
  const outerViewport = useThreadViewportStore({ optional: true });
  const [store] = useState2(() => makeThreadViewportStore());
  useEffect2(() => {
    return outerViewport?.getState().onScrollToBottom(() => {
      store.getState().scrollToBottom();
    });
  }, [outerViewport, store]);
  useEffect2(() => {
    if (!outerViewport) return;
    return store.subscribe((state) => {
      if (outerViewport.getState().isAtBottom !== state.isAtBottom) {
        writableStore(outerViewport).setState({ isAtBottom: state.isAtBottom });
      }
    });
  }, [store, outerViewport]);
  return store;
};
var ThreadViewportProvider = ({ children }) => {
  const useThreadViewport2 = useThreadViewportStoreValue();
  const [context] = useState2(() => {
    return {
      useThreadViewport: useThreadViewport2
    };
  });
  return /* @__PURE__ */ jsx2(ThreadViewportContext.Provider, { value: context, children });
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/devtools/DevToolsHooks.js
var cachedHook;
var getHook = () => {
  if (cachedHook) {
    return cachedHook;
  }
  const createHook = () => ({
    apis: /* @__PURE__ */ new Map(),
    nextId: 0,
    listeners: /* @__PURE__ */ new Set()
  });
  if (typeof window === "undefined") {
    cachedHook = createHook();
    return cachedHook;
  }
  const existingHook = window.__ASSISTANT_UI_DEVTOOLS_HOOK__;
  if (existingHook) {
    cachedHook = existingHook;
    return existingHook;
  }
  const newHook = createHook();
  window.__ASSISTANT_UI_DEVTOOLS_HOOK__ = newHook;
  cachedHook = newHook;
  return newHook;
};
var DevToolsProviderApi = class _DevToolsProviderApi {
  static MAX_EVENT_LOGS_PER_API = 200;
  static register(api) {
    const hook = getHook();
    for (const entry2 of hook.apis.values()) {
      if (entry2.api === api) {
        return () => {
        };
      }
    }
    const apiId = hook.nextId++;
    const entry = {
      api,
      logs: []
    };
    const eventUnsubscribe = api.on?.("*", (e) => {
      const entry2 = hook.apis.get(apiId);
      if (!entry2) return;
      entry2.logs.push({
        time: /* @__PURE__ */ new Date(),
        event: e.event,
        data: e.payload
      });
      if (entry2.logs.length > _DevToolsProviderApi.MAX_EVENT_LOGS_PER_API) {
        entry2.logs = entry2.logs.slice(
          -_DevToolsProviderApi.MAX_EVENT_LOGS_PER_API
        );
      }
      _DevToolsProviderApi.notifyListeners(apiId);
    });
    const stateUnsubscribe = api.subscribe?.(() => {
      _DevToolsProviderApi.notifyListeners(apiId);
    });
    hook.apis.set(apiId, entry);
    _DevToolsProviderApi.notifyListeners(apiId);
    return () => {
      const hook2 = getHook();
      const entry2 = hook2.apis.get(apiId);
      if (!entry2) return;
      eventUnsubscribe?.();
      stateUnsubscribe?.();
      hook2.apis.delete(apiId);
      _DevToolsProviderApi.notifyListeners(apiId);
    };
  }
  static notifyListeners(apiId) {
    const hook = getHook();
    hook.listeners.forEach((listener) => listener(apiId));
  }
};

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/core/resource.js
function resource(type) {
  return (props, options2) => {
    return {
      type,
      props,
      ...options2?.key !== void 0 && { key: options2.key }
    };
  };
}

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/core/execution-context.js
var currentResourceFiber = null;
function withResourceFiber(fiber, fn) {
  fiber.currentIndex = 0;
  const previousContext = currentResourceFiber;
  currentResourceFiber = fiber;
  try {
    fn();
    fiber.isFirstRender = false;
    if (fiber.cells.length !== fiber.currentIndex) {
      throw new Error(
        `Rendered ${fiber.currentIndex} hooks but expected ${fiber.cells.length}. Hooks must be called in the exact same order in every render.`
      );
    }
  } finally {
    currentResourceFiber = previousContext;
  }
}
function getCurrentResourceFiber() {
  if (!currentResourceFiber) {
    throw new Error("No resource fiber available");
  }
  return currentResourceFiber;
}

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/hooks/tap-state.js
var rerender = (fiber) => {
  if (fiber.renderContext) {
    throw new Error("Resource updated during render");
  }
  if (fiber.isNeverMounted) {
    throw new Error("Resource updated before mount");
  }
  if (fiber.isMounted) {
    fiber.scheduleRerender();
  }
};
function getStateCell(initialValue) {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;
  if (!fiber.isFirstRender && index >= fiber.cells.length) {
    throw new Error(
      "Rendered more hooks than during the previous render. Hooks must be called in the exact same order in every render."
    );
  }
  if (!fiber.cells[index]) {
    const value = typeof initialValue === "function" ? initialValue() : initialValue;
    const cell2 = {
      type: "state",
      value,
      set: (updater) => {
        const currentValue = cell2.value;
        const nextValue = typeof updater === "function" ? updater(currentValue) : updater;
        if (!Object.is(currentValue, nextValue)) {
          cell2.value = nextValue;
          rerender(fiber);
        }
      }
    };
    fiber.cells[index] = cell2;
  }
  const cell = fiber.cells[index];
  if (cell.type !== "state") {
    throw new Error("Hook order changed between renders");
  }
  return cell;
}
function tapState(initial) {
  const cell = getStateCell(initial);
  return [cell.value, cell.set];
}

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/hooks/tap-effect.js
function getEffectCell() {
  const fiber = getCurrentResourceFiber();
  const index = fiber.currentIndex++;
  if (!fiber.isFirstRender && index >= fiber.cells.length) {
    throw new Error(
      "Rendered more hooks than during the previous render. Hooks must be called in the exact same order in every render."
    );
  }
  if (!fiber.cells[index]) {
    const cell2 = {
      type: "effect",
      mounted: false
    };
    fiber.cells[index] = cell2;
  }
  const cell = fiber.cells[index];
  if (cell.type !== "effect") {
    throw new Error("Hook order changed between renders");
  }
  return index;
}
function tapEffect(effect, deps) {
  const fiber = getCurrentResourceFiber();
  const cellIndex = getEffectCell();
  fiber.renderContext.commitTasks.push({
    effect,
    deps,
    cellIndex
  });
}

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/hooks/tap-ref.js
function tapRef(initialValue) {
  const [state] = tapState(() => ({
    current: initialValue !== void 0 && typeof initialValue === "function" ? initialValue() : initialValue
  }));
  return state;
}

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/hooks/depsShallowEqual.js
var depsShallowEqual = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
};

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/hooks/tap-memo.js
var tapMemo = (fn, deps) => {
  const dataRef = tapRef(() => ({
    value: fn(),
    deps
  }));
  if (!depsShallowEqual(dataRef.current.deps, deps)) {
    dataRef.current.value = fn();
    dataRef.current.deps = deps;
  }
  return dataRef.current.value;
};

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/core/commit.js
function commitRender(renderResult, fiber) {
  renderResult.commitTasks.forEach((task) => {
    const cellIndex = task.cellIndex;
    const effectCell = fiber.cells[cellIndex];
    if (effectCell.type !== "effect") {
      throw new Error("Cannot find effect cell");
    }
    let shouldRunEffect = true;
    if (effectCell.deps !== void 0 && task.deps !== void 0) {
      shouldRunEffect = effectCell.deps.length !== task.deps.length || effectCell.deps.some((dep, j) => !Object.is(dep, task.deps[j]));
    }
    if (shouldRunEffect) {
      if (effectCell.mounted) {
        if (typeof effectCell.deps !== typeof task.deps) {
          throw new Error(
            "tapEffect called with and without dependencies across re-renders"
          );
        }
        try {
          if (effectCell.mounted && effectCell.cleanup) {
            effectCell.cleanup();
          }
        } finally {
          effectCell.mounted = false;
        }
      }
      try {
        const cleanup = task.effect();
        if (cleanup !== void 0 && typeof cleanup !== "function") {
          throw new Error(
            `An effect function must either return a cleanup function or nothing. Received: ${typeof cleanup}`
          );
        }
        effectCell.mounted = true;
        effectCell.cleanup = typeof cleanup === "function" ? cleanup : void 0;
        effectCell.deps = task.deps;
      } catch (error) {
        throw error;
      }
    }
  });
}
function cleanupAllEffects(executionContext) {
  let firstError = null;
  for (let i = executionContext.cells.length - 1; i >= 0; i--) {
    const cell = executionContext.cells[i];
    if (cell?.type === "effect" && cell.mounted && cell.cleanup) {
      try {
        cell.cleanup();
      } catch (e) {
        if (firstError == null) firstError = e;
      } finally {
        cell.mounted = false;
      }
    }
  }
  if (firstError != null) throw firstError;
}

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/core/ResourceFiber.js
function createResourceFiber(resourceFn, scheduleRerender) {
  return {
    resourceFn,
    scheduleRerender,
    cells: [],
    currentIndex: 0,
    renderContext: void 0,
    isFirstRender: true,
    isMounted: false,
    isNeverMounted: true
  };
}
function unmountResource(fiber) {
  fiber.isMounted = false;
  cleanupAllEffects(fiber);
}
function renderResource(fiber, props) {
  const result = {
    commitTasks: [],
    props,
    state: void 0
  };
  withResourceFiber(fiber, () => {
    fiber.renderContext = result;
    try {
      result.state = fiber.resourceFn(props);
    } finally {
      fiber.renderContext = void 0;
    }
  });
  return result;
}
function commitResource(fiber, result) {
  fiber.isMounted = true;
  fiber.isNeverMounted = false;
  commitRender(result, fiber);
}

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/hooks/tap-resource.js
function tapResource(element, deps) {
  const [stateVersion, rerender2] = tapState({});
  const fiber = tapMemo(
    () => createResourceFiber(element.type, () => rerender2({})),
    [element.type]
  );
  const props = deps ? tapMemo(() => element.props, deps) : element.props;
  const result = tapMemo(
    () => renderResource(fiber, props),
    [fiber, props, stateVersion]
  );
  tapEffect(() => {
    return () => unmountResource(fiber);
  }, [fiber]);
  tapEffect(() => {
    commitResource(fiber, result);
  }, [fiber, result]);
  return result.state;
}

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/hooks/tap-inline-resource.js
function tapInlineResource(element) {
  return element.type(element.props);
}

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/hooks/tap-resources.js
function tapResources(elements) {
  const seenKeys = /* @__PURE__ */ new Set();
  elements.forEach((element, index) => {
    if (element.key === void 0) {
      throw new Error(
        `tapResources: All resource elements must have a key. Element at index ${index} is missing a key.`
      );
    }
    if (seenKeys.has(element.key)) {
      throw new Error(
        `tapResources: Duplicate key "${element.key}" found. All keys must be unique.`
      );
    }
    seenKeys.add(element.key);
  });
  const [stateVersion, rerender2] = tapState({});
  const elementsByKey = tapMemo(
    () => new Map(elements.map((element) => [element.key, element])),
    [elements]
  );
  const [fibers] = tapState(
    () => /* @__PURE__ */ new Map()
  );
  const results = tapMemo(() => {
    const resultMap = /* @__PURE__ */ new Map();
    const currentKeys = /* @__PURE__ */ new Set();
    elementsByKey.forEach((element, key) => {
      currentKeys.add(key);
      let fiber = fibers.get(key);
      if (!fiber || fiber.resourceFn !== element.type) {
        if (fiber) unmountResource(fiber);
        fiber = createResourceFiber(element.type, () => rerender2({}));
        fibers.set(key, fiber);
      }
      const result = renderResource(fiber, element.props);
      resultMap.set(key, result);
    });
    fibers.forEach((fiber, key) => {
      if (!currentKeys.has(key)) {
        unmountResource(fiber);
        fibers.delete(key);
      }
    });
    return resultMap;
  }, [elementsByKey, stateVersion]);
  tapEffect(() => {
    results.forEach((result, key) => {
      const fiber = fibers.get(key);
      if (fiber) {
        commitResource(fiber, result);
      }
    });
  }, [results, fibers]);
  tapEffect(() => {
    return () => {
      fibers.forEach((fiber) => {
        unmountResource(fiber);
      });
      fibers.clear();
    };
  }, [fibers]);
  return tapMemo(
    () => elements.map((element) => results.get(element.key)?.state),
    [elements, results]
  );
}

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/core/scheduler.js
var queue = [];
var isFlushPending = false;
function flushQueue() {
  isFlushPending = false;
  const tasksToRun = queue;
  queue = [];
  for (const task of tasksToRun) {
    try {
      task();
    } catch (error) {
      console.error("Error in scheduled task:", error);
    }
  }
}
function scheduleUpdate(task) {
  queue.push(task);
  if (!isFlushPending) {
    isFlushPending = true;
    queueMicrotask(flushQueue);
  }
}
var UpdateScheduler = class _UpdateScheduler {
  constructor(_task) {
    this._task = _task;
  }
  _isDirty = false;
  _hasScheduledTask = false;
  _isFlushing = false;
  static MAX_FLUSH_DEPTH = 50;
  get isDirty() {
    return this._isDirty;
  }
  markDirty() {
    this._isDirty = true;
    if (this._hasScheduledTask || this._isFlushing) return;
    this._hasScheduledTask = true;
    scheduleUpdate(() => {
      this._hasScheduledTask = false;
      this.flushSync();
    });
  }
  flushSync() {
    if (this._isFlushing) return;
    this._isFlushing = true;
    let flushDepth = 0;
    try {
      while (this._isDirty) {
        flushDepth++;
        if (flushDepth > _UpdateScheduler.MAX_FLUSH_DEPTH) {
          throw new Error(
            `Maximum update depth exceeded. This can happen when a resource repeatedly calls setState inside tapEffect.`
          );
        }
        this._isDirty = false;
        this._task();
      }
    } finally {
      this._isFlushing = false;
    }
  }
};

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/core/ResourceHandle.js
var HandleWrapperResource = ({
  element,
  onUpdateInput,
  onFlushSync,
  onDispose
}) => {
  const [props, setProps] = tapState(element.props);
  const value = tapInlineResource({ type: element.type, props });
  const subscribers = tapRef(/* @__PURE__ */ new Set()).current;
  const valueRef = tapRef(value);
  tapEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      subscribers.forEach((callback) => callback());
    }
  });
  const handle = tapMemo(
    () => ({
      getState: () => valueRef.current,
      subscribe: (callback) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
      updateInput: (props2) => {
        onUpdateInput();
        setProps(() => props2);
      },
      flushSync: onFlushSync,
      dispose: onDispose
    }),
    []
  );
  return handle;
};
var createResource = (element, delayMount = false) => {
  let isMounted = !delayMount;
  const props = {
    element,
    onUpdateInput: () => {
      if (isMounted) return;
      isMounted = true;
      commitResource(fiber, lastRender);
    },
    onFlushSync: () => {
      scheduler.flushSync();
    },
    onDispose: () => unmountResource(fiber)
  };
  const scheduler = new UpdateScheduler(() => {
    lastRender = renderResource(fiber, props);
    if (isMounted) commitResource(fiber, lastRender);
  });
  const fiber = createResourceFiber(
    HandleWrapperResource,
    () => scheduler.markDirty()
  );
  let lastRender = renderResource(fiber, props);
  if (isMounted) commitResource(fiber, lastRender);
  return lastRender.state;
};

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/core/context.js
var contextValue = /* @__PURE__ */ Symbol("tap.Context");
var createContext3 = (defaultValue) => {
  return {
    [contextValue]: defaultValue
  };
};
var withContextProvider = (context, value, fn) => {
  const previousValue = context[contextValue];
  context[contextValue] = value;
  try {
    return fn();
  } finally {
    context[contextValue] = previousValue;
  }
};
var tapContext = (context) => {
  return context[contextValue];
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/utils/tap-store/store.js
var asStore = resource(
  (element) => {
    const resource2 = tapMemo(
      () => createResource(element, true),
      [element.type]
    );
    tapEffect(() => {
      resource2.updateInput(element.props);
    });
    return resource2;
  }
);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/utils/tap-store/tap-api.js
var ReadonlyApiHandler = class {
  constructor(getApi) {
    this.getApi = getApi;
  }
  get(_, prop) {
    return this.getApi()[prop];
  }
  ownKeys() {
    return Object.keys(this.getApi());
  }
  has(_, prop) {
    return prop in this.getApi();
  }
  getOwnPropertyDescriptor(_, prop) {
    return Object.getOwnPropertyDescriptor(this.getApi(), prop);
  }
  set() {
    return false;
  }
  defineProperty() {
    return false;
  }
  deleteProperty() {
    return false;
  }
};
var tapApi = (api, options2) => {
  const ref = tapRef(() => api);
  tapEffect(() => {
    ref.current = api;
  });
  const apiProxy = tapMemo(
    () => new Proxy({}, new ReadonlyApiHandler(() => ref.current)),
    []
  );
  const key = options2?.key;
  const state = api.getState();
  return tapMemo(
    () => ({
      key,
      state,
      api: apiProxy
    }),
    [state, key]
  );
};

// ../../node_modules/.pnpm/@assistant-ui+tap@0.1.2_react@18.3.1/node_modules/@assistant-ui/tap/dist/react/use-resource.js
import { useEffect as useEffect3, useLayoutEffect, useMemo as useMemo2, useState as useState3 } from "react";
var shouldAvoidLayoutEffect = globalThis.__ASSISTANT_UI_DISABLE_LAYOUT_EFFECT__ === true;
var useIsomorphicLayoutEffect = shouldAvoidLayoutEffect ? useEffect3 : useLayoutEffect;
function useResource(element) {
  const [, rerender2] = useState3({});
  const fiber = useMemo2(
    () => createResourceFiber(element.type, () => rerender2({})),
    [element.type]
  );
  const result = renderResource(fiber, element.props);
  useIsomorphicLayoutEffect(() => {
    return () => unmountResource(fiber);
  }, []);
  useIsomorphicLayoutEffect(() => {
    commitResource(fiber, result);
  });
  return result.state;
}

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/client/AssistantClient.js
import { useMemo as useMemo3 } from "react";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/client/EventManagerRuntimeClient.js
var EventManager = resource(() => {
  const events = tapMemo(() => {
    const listeners = /* @__PURE__ */ new Map();
    return {
      on: (event, callback) => {
        if (!listeners.has(event)) {
          listeners.set(event, /* @__PURE__ */ new Set());
        }
        const eventListeners = listeners.get(event);
        eventListeners.add(callback);
        return () => {
          eventListeners.delete(callback);
          if (eventListeners.size === 0) {
            listeners.delete(event);
          }
        };
      },
      emit: (event, payload) => {
        const eventListeners = listeners.get(event);
        const wildcardListeners = listeners.get("*");
        if (!eventListeners && !wildcardListeners) return;
        queueMicrotask(() => {
          if (eventListeners) {
            for (const callback of eventListeners) {
              callback(payload);
            }
          }
          if (wildcardListeners) {
            for (const callback of wildcardListeners) {
              callback({ event, payload });
            }
          }
        });
      }
    };
  }, []);
  return events;
});

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/client/ToolUIClient.js
var ToolUIClient = resource(() => {
  const [state, setState] = tapState(() => ({}));
  return tapApi({
    getState: () => state,
    setToolUI: (toolName, render) => {
      setState((prev) => {
        return {
          ...prev,
          [toolName]: [...prev[toolName] ?? [], render]
        };
      });
      return () => {
        setState((prev) => {
          return {
            ...prev,
            [toolName]: prev[toolName]?.filter((r) => r !== render) ?? []
          };
        });
      };
    }
  });
});

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/client/EventContext.js
var EventsContext = createContext3(null);
var withEventsProvider = (events, fn) => {
  return withContextProvider(EventsContext, events, fn);
};
var tapEvents = () => {
  const events = tapContext(EventsContext);
  if (!events) throw new Error("Events context is not available");
  return events;
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/client/AssistantClient.js
var AssistantStore = resource(
  ({
    threads: threadsEl,
    registerModelContextProvider,
    __internal_runtime
  }) => {
    const events = tapInlineResource(EventManager());
    const { threads, toolUIs } = withEventsProvider(events, () => {
      return {
        toolUIs: tapInlineResource(ToolUIClient()),
        threads: tapResource(threadsEl, [threadsEl])
      };
    });
    const state = tapMemo(
      () => ({
        threads: threads.state,
        toolUIs: toolUIs.state
      }),
      [threads.state, toolUIs.state]
    );
    return tapApi({
      getState: () => state,
      threads: threads.api,
      toolUIs: toolUIs.api,
      on: events.on,
      registerModelContextProvider: registerModelContextProvider ?? (() => () => {
      }),
      ...__internal_runtime && {
        __internal_getRuntime: () => __internal_runtime
      }
    });
  }
);
var getClientFromStore = (client) => {
  const getItem = () => {
    return client.getState().api.threads.item("main");
  };
  return {
    threads: createAssistantApiField({
      source: "root",
      query: {},
      get: () => client.getState().api.threads
    }),
    toolUIs: createAssistantApiField({
      source: "root",
      query: {},
      get: () => client.getState().api.toolUIs
    }),
    thread: createAssistantApiField({
      source: "threads",
      query: { type: "main" },
      get: () => client.getState().api.threads.thread("main")
    }),
    threadListItem: createAssistantApiField({
      source: "threads",
      query: { type: "main" },
      get: () => getItem()
    }),
    composer: createAssistantApiField({
      source: "thread",
      query: {},
      get: () => client.getState().api.threads.thread("main").composer
    }),
    registerModelContextProvider(provider) {
      return client.getState().api.registerModelContextProvider(provider);
    },
    ...client.getState().api.__internal_getRuntime && {
      __internal_getRuntime() {
        return client.getState().api.__internal_getRuntime();
      }
    },
    on(selector, callback) {
      const { event, scope } = normalizeEventSelector(selector);
      if (scope === "*") return client.getState().api.on(event, callback);
      if (checkEventScope("thread", scope, event) || checkEventScope("thread-list-item", scope, event) || checkEventScope("composer", scope, event)) {
        return client.getState().api.on(event, (e) => {
          if (e.threadId !== getItem().getState().id) return;
          callback(e);
        });
      }
      throw new Error(
        `Event scope is not available in this component: ${scope}`
      );
    },
    subscribe: client.subscribe,
    flushSync: client.flushSync
  };
};
var useAssistantClient = (props) => {
  const client = useResource(asStore(AssistantStore(props)));
  return useMemo3(() => getClientFromStore(client), [client]);
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/react/AssistantApiContext.js
import { jsx as jsx3 } from "react/jsx-runtime";
var createAssistantApiField = (config) => {
  const fn = config.get;
  fn.source = config.source;
  fn.query = config.query;
  return fn;
};
var NO_OP_FN = () => () => {
};
var AssistantApiContext = createContext4({
  threads: createAssistantApiField({
    source: null,
    query: {},
    get: () => {
      throw new Error("Threads is only available inside <AssistantProvider />");
    }
  }),
  toolUIs: createAssistantApiField({
    source: null,
    query: {},
    get: () => {
      throw new Error("ToolUIs is only available inside <AssistantProvider />");
    }
  }),
  threadListItem: createAssistantApiField({
    source: null,
    query: {},
    get: () => {
      throw new Error(
        "ThreadListItem is only available inside <AssistantProvider />"
      );
    }
  }),
  thread: createAssistantApiField({
    source: null,
    query: {},
    get: () => {
      throw new Error("Thread is only available inside <AssistantProvider />");
    }
  }),
  composer: createAssistantApiField({
    source: null,
    query: {},
    get: () => {
      throw new Error(
        "Composer is only available inside <AssistantProvider />"
      );
    }
  }),
  message: createAssistantApiField({
    source: null,
    query: {},
    get: () => {
      throw new Error(
        "Message is only available inside <ThreadPrimitive.Messages />"
      );
    }
  }),
  part: createAssistantApiField({
    source: null,
    query: {},
    get: () => {
      throw new Error(
        "Part is only available inside <MessagePrimitive.Parts />"
      );
    }
  }),
  attachment: createAssistantApiField({
    source: null,
    query: {},
    get: () => {
      throw new Error(
        "Attachment is only available inside <MessagePrimitive.Attachments /> or <ComposerPrimitive.Attachments />"
      );
    }
  }),
  subscribe: NO_OP_FN,
  flushSync: NO_OP_FN,
  on: (selector) => {
    const { scope } = normalizeEventSelector(selector);
    throw new Error(`Event scope is not available in this component: ${scope}`);
  },
  registerModelContextProvider: () => {
    throw new Error(
      "Registering model context providers is only available inside <AssistantProvider />"
    );
  }
});
var useAssistantApiImpl = () => {
  return useContext3(AssistantApiContext);
};
var useExtendedAssistantApiImpl = (config) => {
  const api = useAssistantApiImpl();
  const api2 = useAssistantClient(config);
  const extendedApi = useMemo4(() => extendApi(api, api2), [api, api2]);
  return extendedApi;
};
function useAssistantApi(config) {
  if (config) {
    return useExtendedAssistantApiImpl(config);
  } else {
    return useAssistantApiImpl();
  }
}
var mergeFns = (fn1, fn2) => {
  if (fn1 === NO_OP_FN) return fn2;
  if (fn2 === NO_OP_FN) return fn1;
  return (...args) => {
    fn1(...args);
    fn2(...args);
  };
};
var mergeFnsWithUnsubscribe = (fn1, fn2) => {
  if (fn1 === NO_OP_FN) return fn2;
  if (fn2 === NO_OP_FN) return fn1;
  return (...args) => {
    const unsubscribe1 = fn1(...args);
    const unsubscribe2 = fn2(...args);
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  };
};
var extendApi = (api, api2) => {
  const api2Subscribe = api2.subscribe;
  const api2FlushSync = api2.flushSync;
  return {
    ...api,
    ...api2,
    subscribe: mergeFnsWithUnsubscribe(
      api.subscribe,
      api2Subscribe ?? NO_OP_FN
    ),
    flushSync: mergeFns(api.flushSync, api2FlushSync ?? NO_OP_FN)
  };
};
var AssistantProvider = ({ api: api2, children, devToolsVisible = true }) => {
  const api = useAssistantApi();
  const extendedApi = useMemo4(() => extendApi(api, api2), [api, api2]);
  useEffect4(() => {
    if (!devToolsVisible || !api2.subscribe) return void 0;
    return DevToolsProviderApi.register(api2);
  }, [api2, devToolsVisible]);
  return /* @__PURE__ */ jsx3(AssistantApiContext.Provider, { value: extendedApi, children: /* @__PURE__ */ jsx3(ThreadViewportProvider, { children }) });
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/react/hooks/useAssistantState.js
import { useMemo as useMemo5, useSyncExternalStore, useDebugValue } from "react";
var ProxiedAssistantState = class {
  #api;
  constructor(api) {
    this.#api = api;
  }
  get threads() {
    return this.#api.threads().getState();
  }
  get toolUIs() {
    return this.#api.toolUIs().getState();
  }
  get threadListItem() {
    return this.#api.threadListItem().getState();
  }
  get thread() {
    return this.#api.thread().getState();
  }
  get composer() {
    return this.#api.composer().getState();
  }
  get message() {
    return this.#api.message().getState();
  }
  get part() {
    return this.#api.part().getState();
  }
  get attachment() {
    return this.#api.attachment().getState();
  }
};
var useAssistantState = (selector) => {
  const api = useAssistantApi();
  const proxiedState = useMemo5(() => new ProxiedAssistantState(api), [api]);
  const slice = useSyncExternalStore(
    api.subscribe,
    () => selector(proxiedState),
    () => selector(proxiedState)
  );
  useDebugValue(slice);
  if (slice instanceof ProxiedAssistantState)
    throw new Error(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations."
    );
  return slice;
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/react/hooks/useAssistantEvent.js
import { useEffect as useEffect5, useRef } from "react";
var useAssistantEvent = (selector, callback) => {
  const api = useAssistantApi();
  const callbackRef = useRef(callback);
  useEffect5(() => {
    callbackRef.current = callback;
  });
  const { scope, event } = normalizeEventSelector(selector);
  useEffect5(
    () => api.on({ scope, event }, (e) => callbackRef.current(e)),
    [api, scope, event]
  );
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/react/utils/useRuntimeState.js
import { useDebugValue as useDebugValue2, useSyncExternalStore as useSyncExternalStore2 } from "react";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/react/utils/ensureBinding.js
var ensureBinding = (r) => {
  const runtime = r;
  if (runtime.__isBound) return;
  runtime.__internal_bindMethods?.();
  runtime.__isBound = true;
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/react/utils/useRuntimeState.js
function useRuntimeStateInternal(runtime, selector = identity2) {
  ensureBinding(runtime);
  const slice = useSyncExternalStore2(
    runtime.subscribe,
    () => selector(runtime.getState()),
    () => selector(runtime.getState())
  );
  useDebugValue2(slice);
  return slice;
}
var identity2 = (arg) => arg;

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/react/utils/createStateHookForRuntime.js
function createStateHookForRuntime(useRuntime) {
  function useStoreHook(param) {
    let optional = false;
    let selector;
    if (typeof param === "function") {
      selector = param;
    } else if (param) {
      optional = !!param.optional;
      selector = param.selector;
    }
    const store = useRuntime({ optional });
    if (!store) return null;
    return useRuntimeStateInternal(store, selector);
  }
  return useStoreHook;
}

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/hooks/ThreadContext.js
import { useState as useState4 } from "react";
function useThreadRuntime(options2) {
  const api = useAssistantApi();
  const runtime = useAssistantState(
    () => api.thread.source ? api.thread().__internal_getRuntime?.() ?? null : null
  );
  if (!runtime && !options2?.optional) {
    throw new Error("ThreadRuntime is not available");
  }
  return runtime;
}
var useThread = createStateHookForRuntime(useThreadRuntime);
var useThreadComposerRuntime = (opt) => useThreadRuntime(opt)?.composer ?? null;
var useThreadComposer = createStateHookForRuntime(
  useThreadComposerRuntime
);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/AssistantRuntimeProvider.js
import { memo } from "react";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/util-hooks/tapSubscribable.js
var tapSubscribable = (subscribable) => {
  const [, setState] = tapState(subscribable.getState);
  tapEffect(() => {
    setState(subscribable.getState());
    return subscribable.subscribe(() => {
      setState(subscribable.getState());
    });
  }, [subscribable]);
  return subscribable.getState();
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/client/ThreadListItemRuntimeClient.js
var ThreadListItemClient = resource(
  ({ runtime }) => {
    const runtimeState = tapSubscribable(runtime);
    const events = tapEvents();
    tapEffect(() => {
      const unsubscribers = [];
      const threadListItemEvents = [
        "switched-to",
        "switched-away"
      ];
      for (const event of threadListItemEvents) {
        const unsubscribe = runtime.unstable_on(event, () => {
          events.emit(`thread-list-item.${event}`, {
            threadId: runtime.getState().id
          });
        });
        unsubscribers.push(unsubscribe);
      }
      return () => {
        for (const unsub of unsubscribers) unsub();
      };
    }, [runtime, events]);
    return tapApi(
      {
        getState: () => runtimeState,
        switchTo: runtime.switchTo,
        rename: runtime.rename,
        archive: runtime.archive,
        unarchive: runtime.unarchive,
        delete: runtime.delete,
        generateTitle: runtime.generateTitle,
        initialize: runtime.initialize,
        detach: runtime.detach,
        __internal_getRuntime: () => runtime
      },
      {
        key: runtimeState.id
      }
    );
  }
);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/client/util-hooks/tapLookupResources.js
var tapLookupResources = (elements) => {
  const resources = tapResources(elements);
  return {
    state: resources.map((r) => r.state),
    api: (lookup) => {
      const value = "index" in lookup ? resources[lookup.index]?.api : resources.find((r) => r.key === lookup.key)?.api;
      if (!value) {
        throw new Error(
          `tapLookupResources: Resource not found for lookup: ${JSON.stringify(lookup)}`
        );
      }
      return value;
    }
  };
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/client/AttachmentRuntimeClient.js
var AttachmentRuntimeClient = resource(
  ({ runtime }) => {
    const state = tapSubscribable(runtime);
    return tapApi(
      {
        getState: () => state,
        remove: runtime.remove,
        __internal_getRuntime: () => runtime
      },
      {
        key: state.id
      }
    );
  }
);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/client/ComposerRuntimeClient.js
var ComposerAttachmentClientByIndex = resource(
  ({ runtime, index }) => {
    const attachmentRuntime = tapMemo(
      () => runtime.getAttachmentByIndex(index),
      [runtime, index]
    );
    return tapInlineResource(
      AttachmentRuntimeClient({
        runtime: attachmentRuntime
      })
    );
  }
);
var ComposerClient = resource(
  ({
    threadIdRef,
    messageIdRef,
    runtime
  }) => {
    const runtimeState = tapSubscribable(runtime);
    const events = tapEvents();
    tapEffect(() => {
      const unsubscribers = [];
      const composerEvents = [
        "send",
        "attachment-add"
      ];
      for (const event of composerEvents) {
        const unsubscribe = runtime.unstable_on(event, () => {
          events.emit(`composer.${event}`, {
            threadId: threadIdRef.current,
            ...messageIdRef && { messageId: messageIdRef.current }
          });
        });
        unsubscribers.push(unsubscribe);
      }
      return () => {
        for (const unsub of unsubscribers) unsub();
      };
    }, [runtime, events, threadIdRef, messageIdRef]);
    const attachments = tapLookupResources(
      runtimeState.attachments.map(
        (_, idx) => ComposerAttachmentClientByIndex(
          { runtime, index: idx },
          { key: idx }
        )
      )
    );
    const state = tapMemo(() => {
      return {
        text: runtimeState.text,
        role: runtimeState.role,
        attachments: attachments.state,
        runConfig: runtimeState.runConfig,
        isEditing: runtimeState.isEditing,
        canCancel: runtimeState.canCancel,
        attachmentAccept: runtimeState.attachmentAccept,
        isEmpty: runtimeState.isEmpty,
        type: runtimeState.type ?? "thread"
      };
    }, [runtimeState, attachments.state]);
    return tapApi({
      getState: () => state,
      setText: runtime.setText,
      setRole: runtime.setRole,
      setRunConfig: runtime.setRunConfig,
      addAttachment: runtime.addAttachment,
      reset: runtime.reset,
      clearAttachments: runtime.clearAttachments,
      send: runtime.send,
      cancel: runtime.cancel,
      beginEdit: runtime.beginEdit ?? (() => {
        throw new Error("beginEdit is not supported in this runtime");
      }),
      attachment: (selector) => {
        if ("id" in selector) {
          return attachments.api({ key: selector.id });
        } else {
          return attachments.api(selector);
        }
      },
      __internal_getRuntime: () => runtime
    });
  }
);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/client/MessagePartRuntimeClient.js
var MessagePartClient = resource(
  ({ runtime }) => {
    const runtimeState = tapSubscribable(runtime);
    const api = {
      getState: () => runtimeState,
      addToolResult: (result) => runtime.addToolResult(result),
      resumeToolCall: (payload) => runtime.resumeToolCall(payload),
      __internal_getRuntime: () => runtime
    };
    return tapApi(api, {
      key: runtimeState.type === "tool-call" ? "toolCallId-" + runtimeState.toolCallId : void 0
    });
  }
);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/client/MessageRuntimeClient.js
var MessageAttachmentClientByIndex = resource(
  ({ runtime, index }) => {
    const attachmentRuntime = tapMemo(
      () => runtime.getAttachmentByIndex(index),
      [runtime, index]
    );
    return tapInlineResource(
      AttachmentRuntimeClient({ runtime: attachmentRuntime })
    );
  }
);
var MessagePartByIndex = resource(
  ({ runtime, index }) => {
    const partRuntime = tapMemo(
      () => runtime.getMessagePartByIndex(index),
      [runtime, index]
    );
    return tapInlineResource(MessagePartClient({ runtime: partRuntime }));
  }
);
var MessageClient = resource(
  ({
    runtime,
    threadIdRef
  }) => {
    const runtimeState = tapSubscribable(runtime);
    const [isCopiedState, setIsCopied] = tapState(false);
    const [isHoveringState, setIsHovering] = tapState(false);
    const messageIdRef = tapMemo(
      () => ({
        get current() {
          return runtime.getState().id;
        }
      }),
      [runtime]
    );
    const composer = tapInlineResource(
      ComposerClient({
        runtime: runtime.composer,
        threadIdRef,
        messageIdRef
      })
    );
    const parts = tapLookupResources(
      runtimeState.content.map(
        (_, idx) => MessagePartByIndex({ runtime, index: idx }, { key: idx })
      )
    );
    const attachments = tapLookupResources(
      runtimeState.attachments?.map(
        (_, idx) => MessageAttachmentClientByIndex({ runtime, index: idx }, { key: idx })
      ) ?? []
    );
    const state = tapMemo(() => {
      return {
        ...runtimeState,
        parts: parts.state,
        composer: composer.state,
        isCopied: isCopiedState,
        isHovering: isHoveringState
      };
    }, [
      runtimeState,
      parts.state,
      composer.state,
      isCopiedState,
      isHoveringState
    ]);
    return tapApi(
      {
        getState: () => state,
        composer: composer.api,
        reload: (config) => runtime.reload(config),
        speak: () => runtime.speak(),
        stopSpeaking: () => runtime.stopSpeaking(),
        submitFeedback: (feedback) => runtime.submitFeedback(feedback),
        switchToBranch: (options2) => runtime.switchToBranch(options2),
        getCopyText: () => runtime.unstable_getCopyText(),
        part: (selector) => {
          if ("index" in selector) {
            return parts.api({ index: selector.index });
          } else {
            return parts.api({ key: "toolCallId-" + selector.toolCallId });
          }
        },
        attachment: (selector) => {
          if ("id" in selector) {
            return attachments.api({ key: selector.id });
          } else {
            return attachments.api(selector);
          }
        },
        setIsCopied,
        setIsHovering,
        __internal_getRuntime: () => runtime
      },
      {
        key: runtimeState.id
      }
    );
  }
);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/client/ThreadRuntimeClient.js
var MessageClientById = resource(
  ({
    runtime,
    id,
    threadIdRef
  }) => {
    const messageRuntime = tapMemo(
      () => runtime.getMessageById(id),
      [runtime, id]
    );
    return tapInlineResource(
      MessageClient({ runtime: messageRuntime, threadIdRef })
    );
  }
);
var ThreadClient = resource(
  ({ runtime }) => {
    const runtimeState = tapSubscribable(runtime);
    const events = tapEvents();
    tapEffect(() => {
      const unsubscribers = [];
      const threadEvents = [
        "run-start",
        "run-end",
        "initialize",
        "model-context-update"
      ];
      for (const event of threadEvents) {
        const unsubscribe = runtime.unstable_on(event, () => {
          const threadId = runtime.getState()?.threadId || "unknown";
          events.emit(`thread.${event}`, {
            threadId
          });
        });
        unsubscribers.push(unsubscribe);
      }
      return () => {
        for (const unsub of unsubscribers) unsub();
      };
    }, [runtime]);
    const threadIdRef = tapMemo(
      () => ({
        get current() {
          return runtime.getState().threadId;
        }
      }),
      [runtime]
    );
    const composer = tapInlineResource(
      ComposerClient({
        runtime: runtime.composer,
        threadIdRef
      })
    );
    const messages = tapLookupResources(
      runtimeState.messages.map(
        (m) => MessageClientById(
          { runtime, id: m.id, threadIdRef },
          { key: m.id }
        )
      )
    );
    const state = tapMemo(() => {
      return {
        isDisabled: runtimeState.isDisabled,
        isLoading: runtimeState.isLoading,
        isRunning: runtimeState.isRunning,
        capabilities: runtimeState.capabilities,
        state: runtimeState.state,
        suggestions: runtimeState.suggestions,
        extras: runtimeState.extras,
        speech: runtimeState.speech,
        composer: composer.state,
        messages: messages.state
      };
    }, [runtimeState, messages, composer.state]);
    return tapApi({
      getState: () => state,
      composer: composer.api,
      append: runtime.append,
      startRun: runtime.startRun,
      unstable_resumeRun: runtime.unstable_resumeRun,
      cancelRun: runtime.cancelRun,
      getModelContext: runtime.getModelContext,
      export: runtime.export,
      import: runtime.import,
      reset: runtime.reset,
      stopSpeaking: runtime.stopSpeaking,
      startVoice: async () => {
        throw new Error("startVoice is not supported in this runtime");
      },
      stopVoice: async () => {
        throw new Error("stopVoice is not supported in this runtime");
      },
      message: (selector) => {
        if ("id" in selector) {
          return messages.api({ key: selector.id });
        } else {
          return messages.api(selector);
        }
      },
      __internal_getRuntime: () => runtime
    });
  }
);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/client/ThreadListRuntimeClient.js
var ThreadListItemClientById = resource(
  ({ runtime, id }) => {
    const threadListItemRuntime = tapMemo(
      () => runtime.getItemById(id),
      [runtime, id]
    );
    return tapInlineResource(
      ThreadListItemClient({
        runtime: threadListItemRuntime
      })
    );
  }
);
var ThreadListClient = resource(
  ({ runtime }) => {
    const runtimeState = tapSubscribable(runtime);
    const main = tapInlineResource(
      ThreadClient({
        runtime: runtime.main
      })
    );
    const threadItems = tapLookupResources(
      Object.keys(runtimeState.threadItems).map(
        (id) => ThreadListItemClientById({ runtime, id }, { key: id })
      )
    );
    const state = tapMemo(() => {
      return {
        mainThreadId: runtimeState.mainThreadId,
        newThreadId: runtimeState.newThread ?? null,
        isLoading: runtimeState.isLoading,
        threadIds: runtimeState.threads,
        archivedThreadIds: runtimeState.archivedThreads,
        threadItems: threadItems.state,
        main: main.state
      };
    }, [runtimeState, threadItems.state, main.state]);
    return tapApi({
      getState: () => state,
      thread: () => main.api,
      item: (threadIdOrOptions) => {
        if (threadIdOrOptions === "main") {
          return threadItems.api({ key: state.mainThreadId });
        }
        if ("id" in threadIdOrOptions) {
          return threadItems.api({ key: threadIdOrOptions.id });
        }
        const { index, archived = false } = threadIdOrOptions;
        const id = archived ? state.archivedThreadIds[index] : state.threadIds[index];
        return threadItems.api({ key: id });
      },
      switchToThread: (threadId) => {
        runtime.switchToThread(threadId);
      },
      switchToNewThread: () => {
        runtime.switchToNewThread();
      }
    });
  }
);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/AssistantRuntimeProvider.js
import { jsx as jsx4, jsxs } from "react/jsx-runtime";
var getRenderComponent = (runtime) => {
  return runtime._core?.RenderComponent;
};
var AssistantRuntimeProviderImpl = ({
  children,
  runtime
}) => {
  const api = useAssistantClient({
    threads: ThreadListClient({
      runtime: runtime.threads
    }),
    registerModelContextProvider: runtime.registerModelContextProvider,
    __internal_runtime: runtime
  });
  const RenderComponent = getRenderComponent(runtime);
  return /* @__PURE__ */ jsxs(AssistantProvider, { api, children: [
    RenderComponent && /* @__PURE__ */ jsx4(RenderComponent, {}),
    children
  ] });
};
var AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/providers/MessageByIndexProvider.js
import { useMemo as useMemo6 } from "react";
import { jsx as jsx5 } from "react/jsx-runtime";
var MessageByIndexProvider = ({ index, children }) => {
  const api = useAssistantApi();
  const api2 = useMemo6(() => {
    const getMessage = () => api.thread().message({ index });
    return {
      message: createAssistantApiField({
        source: "thread",
        query: { type: "index", index },
        get: () => getMessage()
      }),
      composer: createAssistantApiField({
        source: "message",
        query: {},
        get: () => getMessage().composer
      }),
      on(selector, callback) {
        const { event, scope } = normalizeEventSelector(selector);
        if (!checkEventScope("composer", scope, event) && !checkEventScope("message", scope, event))
          return api.on(selector, callback);
        return api.on({ scope: "thread", event }, (e) => {
          if (e.messageId === getMessage().getState().id) {
            callback(e);
          }
        });
      }
    };
  }, [api, index]);
  return /* @__PURE__ */ jsx5(AssistantProvider, { api: api2, children });
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/providers/PartByIndexProvider.js
import { useMemo as useMemo7 } from "react";
import { jsx as jsx6 } from "react/jsx-runtime";
var PartByIndexProvider = ({ index, children }) => {
  const api = useAssistantApi();
  const api2 = useMemo7(() => {
    return {
      part: createAssistantApiField({
        source: "message",
        query: { type: "index", index },
        get: () => api.message().part({ index })
      })
    };
  }, [api, index]);
  return /* @__PURE__ */ jsx6(AssistantProvider, { api: api2, children });
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/providers/AttachmentByIndexProvider.js
import { useMemo as useMemo8 } from "react";
import { jsx as jsx7 } from "react/jsx-runtime";
var MessageAttachmentByIndexProvider = ({ index, children }) => {
  const api = useAssistantApi();
  const api2 = useMemo8(() => {
    return {
      attachment: createAssistantApiField({
        source: "message",
        query: { type: "index", index },
        get: () => api.message().attachment({ index })
      })
    };
  }, [api, index]);
  return /* @__PURE__ */ jsx7(AssistantProvider, { api: api2, children });
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/context/providers/TextMessagePartProvider.js
import { useMemo as useMemo9 } from "react";
import { jsx as jsx8 } from "react/jsx-runtime";
var TextMessagePartClient = resource(
  ({ text: text2, isRunning }) => {
    const state = tapMemo(
      () => ({
        type: "text",
        text: text2,
        status: isRunning ? { type: "running" } : { type: "complete" }
      }),
      [text2, isRunning]
    );
    return tapApi({
      getState: () => state,
      addToolResult: () => {
        throw new Error("Not supported");
      },
      resumeToolCall: () => {
        throw new Error("Not supported");
      }
    });
  }
);
var TextMessagePartProvider = ({ text: text2, isRunning = false, children }) => {
  const store = useResource(
    asStore(TextMessagePartClient({ text: text2, isRunning }))
  );
  const api = useMemo9(() => {
    return {
      part: createAssistantApiField({
        source: "root",
        query: {},
        get: () => store.getState().api
      }),
      subscribe: store.subscribe,
      flushSync: store.flushSync
    };
  }, [store]);
  return /* @__PURE__ */ jsx8(AssistantProvider, { api, children });
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/legacy-runtime/runtime/AssistantRuntime.js
var AssistantRuntimeImpl = class {
  constructor(_core) {
    this._core = _core;
    this.threads = new ThreadListRuntimeImpl(_core.threads);
    this._thread = this.threads.main;
    this.__internal_bindMethods();
  }
  threads;
  get threadList() {
    return this.threads;
  }
  _thread;
  __internal_bindMethods() {
    this.switchToNewThread = this.switchToNewThread.bind(this);
    this.switchToThread = this.switchToThread.bind(this);
    this.registerModelContextProvider = this.registerModelContextProvider.bind(this);
    this.registerModelConfigProvider = this.registerModelConfigProvider.bind(this);
    this.reset = this.reset.bind(this);
  }
  get thread() {
    return this._thread;
  }
  switchToNewThread() {
    return this._core.threads.switchToNewThread();
  }
  switchToThread(threadId) {
    return this._core.threads.switchToThread(threadId);
  }
  registerModelContextProvider(provider) {
    return this._core.registerModelContextProvider(provider);
  }
  registerModelConfigProvider(provider) {
    return this.registerModelContextProvider(provider);
  }
  reset({
    initialMessages
  } = {}) {
    return this._core.threads.getMainThreadRuntimeCore().import(ExportedMessageRepository.fromArray(initialMessages ?? []));
  }
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/utils/smooth/useSmooth.js
import { useEffect as useEffect7, useMemo as useMemo11, useRef as useRef3, useState as useState6 } from "react";

// ../../node_modules/.pnpm/@radix-ui+react-use-callbac_4fc6af52f24a622a0812d96a481a052a/node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs
import * as React2 from "react";
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
function useCallbackRef(callback) {
  const callbackRef = React2.useRef(callback);
  React2.useEffect(() => {
    callbackRef.current = callback;
  });
  return React2.useMemo(() => ((...args) => callbackRef.current?.(...args)), []);
}
__name(useCallbackRef, "useCallbackRef");

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/utils/smooth/SmoothContext.js
import {
  createContext as createContext5,
  forwardRef,
  useContext as useContext4,
  useState as useState5
} from "react";
import { jsx as jsx9 } from "react/jsx-runtime";
var SmoothContext = createContext5(null);
function useSmoothContext(options2) {
  const context = useContext4(SmoothContext);
  if (!options2?.optional && !context)
    throw new Error(
      "This component must be used within a SmoothContextProvider."
    );
  return context;
}
var { useSmoothStatus, useSmoothStatusStore } = createContextStoreHook(
  useSmoothContext,
  "useSmoothStatus"
);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/utils/smooth/useSmooth.js
var TextStreamAnimator = class {
  constructor(currentText, setText) {
    this.currentText = currentText;
    this.setText = setText;
  }
  animationFrameId = null;
  lastUpdateTime = Date.now();
  targetText = "";
  start() {
    if (this.animationFrameId !== null) return;
    this.lastUpdateTime = Date.now();
    this.animate();
  }
  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  animate = () => {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    let timeToConsume = deltaTime;
    const remainingChars = this.targetText.length - this.currentText.length;
    const baseTimePerChar = Math.min(5, 250 / remainingChars);
    let charsToAdd = 0;
    while (timeToConsume >= baseTimePerChar && charsToAdd < remainingChars) {
      charsToAdd++;
      timeToConsume -= baseTimePerChar;
    }
    if (charsToAdd !== remainingChars) {
      this.animationFrameId = requestAnimationFrame(this.animate);
    } else {
      this.animationFrameId = null;
    }
    if (charsToAdd === 0) return;
    this.currentText = this.targetText.slice(
      0,
      this.currentText.length + charsToAdd
    );
    this.lastUpdateTime = currentTime - timeToConsume;
    this.setText(this.currentText);
  };
};
var SMOOTH_STATUS = Object.freeze({
  type: "running"
});
var useSmooth = (state, smooth = false) => {
  const { text: text2 } = state;
  const id = useAssistantState(({ message }) => message.id);
  const idRef = useRef3(id);
  const [displayedText, setDisplayedText] = useState6(text2);
  const smoothStatusStore = useSmoothStatusStore({ optional: true });
  const setText = useCallbackRef((text22) => {
    setDisplayedText(text22);
    if (smoothStatusStore) {
      const target = displayedText !== text22 || state.status.type === "running" ? SMOOTH_STATUS : state.status;
      writableStore(smoothStatusStore).setState(target, true);
    }
  });
  useEffect7(() => {
    if (smoothStatusStore) {
      const target = displayedText !== text2 || state.status.type === "running" ? SMOOTH_STATUS : state.status;
      writableStore(smoothStatusStore).setState(target, true);
    }
  }, [smoothStatusStore, text2, displayedText, state.status]);
  const [animatorRef] = useState6(
    new TextStreamAnimator(text2, setText)
  );
  useEffect7(() => {
    if (!smooth) {
      animatorRef.stop();
      return;
    }
    if (idRef.current !== id || !text2.startsWith(animatorRef.targetText)) {
      idRef.current = id;
      setText(text2);
      animatorRef.currentText = text2;
      animatorRef.targetText = text2;
      animatorRef.stop();
      return;
    }
    animatorRef.targetText = text2;
    animatorRef.start();
  }, [setText, animatorRef, id, smooth, text2]);
  useEffect7(() => {
    return () => {
      animatorRef.stop();
    };
  }, [animatorRef]);
  return useMemo11(
    () => smooth ? {
      type: "text",
      text: displayedText,
      status: text2 === displayedText ? state.status : SMOOTH_STATUS
    } : state,
    [smooth, displayedText, state, text2]
  );
};

// ../../node_modules/.pnpm/@radix-ui+react-compose-ref_0c717eff060deeed876adccdc2d72fcc/node_modules/@radix-ui/react-compose-refs/dist/index.mjs
import * as React3 from "react";
var __defProp2 = Object.defineProperty;
var __name2 = (target, value) => __defProp2(target, "name", { value, configurable: true });
function setRef(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
__name2(setRef, "setRef");
function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup == "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup == "function") {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}
__name2(composeRefs, "composeRefs");
function useComposedRefs(...refs) {
  return React3.useCallback(composeRefs(...refs), refs);
}
__name2(useComposedRefs, "useComposedRefs");

// ../../node_modules/.pnpm/@radix-ui+react-primitive@2_ee1e5ceefdcd28323129c06c66dbead1/node_modules/@radix-ui/react-primitive/dist/index.mjs
import * as React5 from "react";
import * as ReactDOM from "react-dom";

// ../../node_modules/.pnpm/@radix-ui+react-slot@1.3.3_@types+react@18.3.12_react@18.3.1/node_modules/@radix-ui/react-slot/dist/index.mjs
import * as React4 from "react";
var __defProp3 = Object.defineProperty;
var __name3 = (target, value) => __defProp3(target, "name", { value, configurable: true });
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
  const Slot2 = React4.forwardRef((props, forwardedRef) => {
    let { children, ...slotProps } = props;
    let slottableElement = null;
    let hasSlottable = false;
    const newChildren = [];
    if (isLazyComponent(children) && typeof use === "function") {
      children = use(children._payload);
    }
    React4.Children.forEach(children, (maybeSlottable) => {
      if (isSlottable(maybeSlottable)) {
        hasSlottable = true;
        const slottable = maybeSlottable;
        let child = "child" in slottable.props ? slottable.props.child : slottable.props.children;
        if (isLazyComponent(child) && typeof use === "function") {
          child = use(child._payload);
        }
        slottableElement = getSlottableElementFromSlottable(slottable, child);
        newChildren.push(slottableElement?.props?.children);
      } else {
        newChildren.push(maybeSlottable);
      }
    });
    if (slottableElement) {
      slottableElement = React4.cloneElement(slottableElement, void 0, newChildren);
    } else if (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !hasSlottable && React4.Children.count(children) === 1 && React4.isValidElement(children)
    ) {
      slottableElement = children;
    }
    const slottableElementRef = slottableElement ? getElementRef(slottableElement) : void 0;
    const composedRef = useComposedRefs(forwardedRef, slottableElementRef);
    if (!slottableElement) {
      if (children || children === 0) {
        throw new Error(
          hasSlottable ? createSlottableError(ownerName) : createSlotError(ownerName)
        );
      }
      return children;
    }
    const mergedProps = mergeProps(slotProps, slottableElement.props ?? {});
    if (slottableElement.type !== React4.Fragment) {
      mergedProps.ref = forwardedRef ? composedRef : slottableElementRef;
    }
    return React4.cloneElement(slottableElement, mergedProps);
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
__name3(createSlot, "createSlot");
var SLOTTABLE_IDENTIFIER = /* @__PURE__ */ Symbol.for("radix.slottable");
// @__NO_SIDE_EFFECTS__
function createSlottable(ownerName) {
  const Slottable2 = /* @__PURE__ */ __name3((props) => "child" in props ? props.children(props.child) : props.children, "Slottable");
  Slottable2.displayName = `${ownerName}.Slottable`;
  Slottable2.__radixId = SLOTTABLE_IDENTIFIER;
  return Slottable2;
}
__name3(createSlottable, "createSlottable");
var getSlottableElementFromSlottable = /* @__PURE__ */ __name3((slottable, child) => {
  if ("child" in slottable.props) {
    const child2 = slottable.props.child;
    if (!React4.isValidElement(child2)) return null;
    return React4.cloneElement(child2, void 0, slottable.props.children(child2.props.children));
  }
  return React4.isValidElement(child) ? child : null;
}, "getSlottableElementFromSlottable");
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
__name3(mergeProps, "mergeProps");
function getElementRef(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}
__name3(getElementRef, "getElementRef");
function isSlottable(child) {
  return React4.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER;
}
__name3(isSlottable, "isSlottable");
var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
function isLazyComponent(element) {
  return element != null && typeof element === "object" && "$$typeof" in element && element.$$typeof === REACT_LAZY_TYPE && "_payload" in element && isPromiseLike(element._payload);
}
__name3(isLazyComponent, "isLazyComponent");
function isPromiseLike(value) {
  return typeof value === "object" && value !== null && "then" in value;
}
__name3(isPromiseLike, "isPromiseLike");
var createSlotError = /* @__PURE__ */ __name3((ownerName) => {
  return `${ownerName} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`;
}, "createSlotError");
var createSlottableError = /* @__PURE__ */ __name3((ownerName) => {
  return `${ownerName} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`;
}, "createSlottableError");
var use = React4[" use ".trim().toString()];

// ../../node_modules/.pnpm/@radix-ui+react-primitive@2_ee1e5ceefdcd28323129c06c66dbead1/node_modules/@radix-ui/react-primitive/dist/index.mjs
import { jsx as jsx10 } from "react/jsx-runtime";
var __defProp4 = Object.defineProperty;
var __name4 = (target, value) => __defProp4(target, "name", { value, configurable: true });
var NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
];
var Primitive = NODES.reduce((primitive, node) => {
  const Slot = createSlot(`Primitive.${node}`);
  const Node2 = React5.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot : node;
    if (typeof window !== "undefined") {
      window[/* @__PURE__ */ Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ jsx10(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node2.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node2 };
}, {});
function dispatchDiscreteCustomEvent(target, event) {
  if (target) ReactDOM.flushSync(() => target.dispatchEvent(event));
}
__name4(dispatchDiscreteCustomEvent, "dispatchDiscreteCustomEvent");

// ../../node_modules/.pnpm/@radix-ui+primitive@1.1.7/node_modules/@radix-ui/primitive/dist/index.mjs
var __defProp5 = Object.defineProperty;
var __name5 = (target, value) => __defProp5(target, "name", { value, configurable: true });
var canUseDOM = !!(typeof window !== "undefined" && window.document && window.document.createElement);
function composeEventHandlers(originalEventHandler, ourEventHandler, { checkForDefaultPrevented = true } = {}) {
  return /* @__PURE__ */ __name5(function handleEvent(event) {
    originalEventHandler?.(event);
    if (checkForDefaultPrevented === false || !event || !event.defaultPrevented) {
      return ourEventHandler?.(event);
    }
  }, "handleEvent");
}
__name5(composeEventHandlers, "composeEventHandlers");
function getOwnerWindow(element) {
  if (!canUseDOM) {
    throw new Error("Cannot access window outside of the DOM");
  }
  return element?.ownerDocument?.defaultView ?? window;
}
__name5(getOwnerWindow, "getOwnerWindow");
function getOwnerDocument(element) {
  if (!canUseDOM) {
    throw new Error("Cannot access document outside of the DOM");
  }
  return element?.ownerDocument ?? document;
}
__name5(getOwnerDocument, "getOwnerDocument");
function getActiveElement(node, activeDescendant = false) {
  const { activeElement } = getOwnerDocument(node);
  if (!activeElement?.nodeName) {
    return null;
  }
  if (isFrame(activeElement) && activeElement.contentDocument) {
    return getActiveElement(activeElement.contentDocument.body, activeDescendant);
  }
  if (activeDescendant) {
    const id = activeElement.getAttribute("aria-activedescendant");
    if (id) {
      const element = getOwnerDocument(activeElement).getElementById(id);
      if (element) {
        return element;
      }
    }
  }
  return activeElement;
}
__name5(getActiveElement, "getActiveElement");
function isFrame(element) {
  return element.tagName === "IFRAME";
}
__name5(isFrame, "isFrame");

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/utils/createActionButton.js
import {
  forwardRef as forwardRef4
} from "react";
import { jsx as jsx11 } from "react/jsx-runtime";
var createActionButton = (displayName, useActionButton, forwardProps = []) => {
  const ActionButton = forwardRef4((props, forwardedRef) => {
    const forwardedProps = {};
    const primitiveProps = {};
    Object.keys(props).forEach((key) => {
      if (forwardProps.includes(key)) {
        forwardedProps[key] = props[key];
      } else {
        primitiveProps[key] = props[key];
      }
    });
    const callback = useActionButton(forwardedProps) ?? void 0;
    return /* @__PURE__ */ jsx11(
      Primitive.button,
      {
        type: "button",
        ...primitiveProps,
        ref: forwardedRef,
        disabled: primitiveProps.disabled || !callback,
        onClick: composeEventHandlers(primitiveProps.onClick, callback)
      }
    );
  });
  ActionButton.displayName = displayName;
  return ActionButton;
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/message/index.js
var message_exports = {};
__export(message_exports, {
  AttachmentByIndex: () => MessagePrimitiveAttachmentByIndex,
  Attachments: () => MessagePrimitiveAttachments,
  Content: () => MessagePrimitiveParts,
  Error: () => MessagePrimitiveError,
  If: () => MessagePrimitiveIf,
  PartByIndex: () => MessagePrimitivePartByIndex,
  Parts: () => MessagePrimitiveParts,
  Root: () => MessagePrimitiveRoot,
  Unstable_PartsGrouped: () => MessagePrimitiveUnstable_PartsGrouped,
  Unstable_PartsGroupedByParentId: () => MessagePrimitiveUnstable_PartsGroupedByParentId
});

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/message/MessageRoot.js
import {
  forwardRef as forwardRef5,
  useCallback as useCallback3
} from "react";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/utils/hooks/useManagedRef.js
import { useCallback as useCallback2, useRef as useRef4 } from "react";
var useManagedRef = (callback) => {
  const cleanupRef = useRef4(void 0);
  const ref = useCallback2(
    (el) => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (el) {
        cleanupRef.current = callback(el);
      }
    },
    [callback]
  );
  return ref;
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/message/MessageRoot.js
import { jsx as jsx12 } from "react/jsx-runtime";
var useIsHoveringRef = () => {
  const api = useAssistantApi();
  const message = useAssistantState(() => api.message());
  const callbackRef = useCallback3(
    (el) => {
      const handleMouseEnter = () => {
        message.setIsHovering(true);
      };
      const handleMouseLeave = () => {
        message.setIsHovering(false);
      };
      el.addEventListener("mouseenter", handleMouseEnter);
      el.addEventListener("mouseleave", handleMouseLeave);
      if (el.matches(":hover")) message.setIsHovering(true);
      return () => {
        el.removeEventListener("mouseenter", handleMouseEnter);
        el.removeEventListener("mouseleave", handleMouseLeave);
        message.setIsHovering(false);
      };
    },
    [message]
  );
  return useManagedRef(callbackRef);
};
var MessagePrimitiveRoot = forwardRef5((props, forwardRef22) => {
  const isHoveringRef = useIsHoveringRef();
  const ref = useComposedRefs(forwardRef22, isHoveringRef);
  return /* @__PURE__ */ jsx12(Primitive.div, { ...props, ref });
});
MessagePrimitiveRoot.displayName = "MessagePrimitive.Root";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/message/MessageParts.js
import {
  memo as memo2,
  useMemo as useMemo12
} from "react";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/messagePart/MessagePartText.js
import {
  forwardRef as forwardRef6
} from "react";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/messagePart/useMessagePartText.js
var useMessagePartText = () => {
  const text2 = useAssistantState(({ part }) => {
    if (part.type !== "text" && part.type !== "reasoning")
      throw new Error(
        "MessagePartText can only be used inside text or reasoning message parts."
      );
    return part;
  });
  return text2;
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/messagePart/MessagePartText.js
import { jsx as jsx13 } from "react/jsx-runtime";
var MessagePartPrimitiveText = forwardRef6(({ smooth = true, component: Component = "span", ...rest }, forwardedRef) => {
  const { text: text2, status } = useSmooth(useMessagePartText(), smooth);
  return /* @__PURE__ */ jsx13(Component, { "data-status": status.type, ...rest, ref: forwardedRef, children: text2 });
});
MessagePartPrimitiveText.displayName = "MessagePartPrimitive.Text";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/messagePart/MessagePartImage.js
import { forwardRef as forwardRef7 } from "react";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/messagePart/useMessagePartImage.js
var useMessagePartImage = () => {
  const image = useAssistantState(({ part }) => {
    if (part.type !== "image")
      throw new Error(
        "MessagePartImage can only be used inside image message parts."
      );
    return part;
  });
  return image;
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/messagePart/MessagePartImage.js
import { jsx as jsx14 } from "react/jsx-runtime";
var MessagePartPrimitiveImage = forwardRef7((props, forwardedRef) => {
  const { image } = useMessagePartImage();
  return /* @__PURE__ */ jsx14(Primitive.img, { src: image, ...props, ref: forwardedRef });
});
MessagePartPrimitiveImage.displayName = "MessagePartPrimitive.Image";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/messagePart/MessagePartInProgress.js
var MessagePartPrimitiveInProgress = ({ children }) => {
  const isInProgress = useAssistantState(
    ({ part }) => part.status.type === "running"
  );
  return isInProgress ? children : null;
};
MessagePartPrimitiveInProgress.displayName = "MessagePartPrimitive.InProgress";

// ../../node_modules/.pnpm/zustand@5.0.15_@types+react@18.3.12_react@18.3.1/node_modules/zustand/esm/vanilla/shallow.mjs
var isIterable = (obj) => Symbol.iterator in obj;
var hasIterableEntries = (value) => (
  // HACK: avoid checking entries type
  "entries" in value
);
var compareEntries = (valueA, valueB) => {
  const mapA = valueA instanceof Map ? valueA : new Map(valueA.entries());
  const mapB = valueB instanceof Map ? valueB : new Map(valueB.entries());
  if (mapA.size !== mapB.size) {
    return false;
  }
  for (const [key, value] of mapA) {
    if (!mapB.has(key) || !Object.is(value, mapB.get(key))) {
      return false;
    }
  }
  return true;
};
var compareIterables = (valueA, valueB) => {
  const iteratorA = valueA[Symbol.iterator]();
  const iteratorB = valueB[Symbol.iterator]();
  let nextA = iteratorA.next();
  let nextB = iteratorB.next();
  while (!nextA.done && !nextB.done) {
    if (!Object.is(nextA.value, nextB.value)) {
      return false;
    }
    nextA = iteratorA.next();
    nextB = iteratorB.next();
  }
  return !!nextA.done && !!nextB.done;
};
function shallow(valueA, valueB) {
  if (Object.is(valueA, valueB)) {
    return true;
  }
  if (typeof valueA !== "object" || valueA === null || typeof valueB !== "object" || valueB === null) {
    return false;
  }
  if (Object.getPrototypeOf(valueA) !== Object.getPrototypeOf(valueB)) {
    return false;
  }
  if (isIterable(valueA) && isIterable(valueB)) {
    if (hasIterableEntries(valueA) && hasIterableEntries(valueB)) {
      return compareEntries(valueA, valueB);
    }
    return compareIterables(valueA, valueB);
  }
  return compareEntries(
    { entries: () => Object.entries(valueA) },
    { entries: () => Object.entries(valueB) }
  );
}

// ../../node_modules/.pnpm/zustand@5.0.15_@types+react@18.3.12_react@18.3.1/node_modules/zustand/esm/react/shallow.mjs
import React6 from "react";
function useShallow(selector) {
  const prev = React6.useRef(void 0);
  return (state) => {
    const next = selector(state);
    return shallow(prev.current, next) ? prev.current : prev.current = next;
  };
}

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/message/MessageParts.js
import { Fragment as Fragment2, jsx as jsx15, jsxs as jsxs2 } from "react/jsx-runtime";
var groupMessageParts = (messageTypes) => {
  const ranges = [];
  let currentToolGroupStart = -1;
  for (let i = 0; i < messageTypes.length; i++) {
    const type = messageTypes[i];
    if (type === "tool-call") {
      if (currentToolGroupStart === -1) {
        currentToolGroupStart = i;
      }
    } else {
      if (currentToolGroupStart !== -1) {
        ranges.push({
          type: "toolGroup",
          startIndex: currentToolGroupStart,
          endIndex: i - 1
        });
        currentToolGroupStart = -1;
      }
      ranges.push({ type: "single", index: i });
    }
  }
  if (currentToolGroupStart !== -1) {
    ranges.push({
      type: "toolGroup",
      startIndex: currentToolGroupStart,
      endIndex: messageTypes.length - 1
    });
  }
  return ranges;
};
var useMessagePartsGroups = () => {
  const messageTypes = useAssistantState(
    useShallow((s) => s.message.parts.map((c) => c.type))
  );
  return useMemo12(() => {
    if (messageTypes.length === 0) {
      return [];
    }
    return groupMessageParts(messageTypes);
  }, [messageTypes]);
};
var ToolUIDisplay = ({
  Fallback,
  ...props
}) => {
  const Render = useAssistantState(({ toolUIs }) => {
    const Render2 = toolUIs[props.toolName] ?? Fallback;
    if (Array.isArray(Render2)) return Render2[0];
    return Render2;
  });
  if (!Render) return null;
  return /* @__PURE__ */ jsx15(Render, { ...props });
};
var defaultComponents = {
  Text: () => /* @__PURE__ */ jsxs2("p", { style: { whiteSpace: "pre-line" }, children: [
    /* @__PURE__ */ jsx15(MessagePartPrimitiveText, {}),
    /* @__PURE__ */ jsx15(MessagePartPrimitiveInProgress, { children: /* @__PURE__ */ jsx15("span", { style: { fontFamily: "revert" }, children: " ●" }) })
  ] }),
  Reasoning: () => null,
  Source: () => null,
  Image: () => /* @__PURE__ */ jsx15(MessagePartPrimitiveImage, {}),
  File: () => null,
  Unstable_Audio: () => null,
  ToolGroup: ({ children }) => children
};
var MessagePartComponent = ({
  components: {
    Text: Text2 = defaultComponents.Text,
    Reasoning = defaultComponents.Reasoning,
    Image = defaultComponents.Image,
    Source = defaultComponents.Source,
    File = defaultComponents.File,
    Unstable_Audio: Audio = defaultComponents.Unstable_Audio,
    tools = {}
  } = {}
}) => {
  const api = useAssistantApi();
  const part = useAssistantState(({ part: part2 }) => part2);
  const type = part.type;
  if (type === "tool-call") {
    const addResult = api.part().addToolResult;
    const resume = api.part().resumeToolCall;
    if ("Override" in tools)
      return /* @__PURE__ */ jsx15(tools.Override, { ...part, addResult, resume });
    const Tool = tools.by_name?.[part.toolName] ?? tools.Fallback;
    return /* @__PURE__ */ jsx15(
      ToolUIDisplay,
      {
        ...part,
        Fallback: Tool,
        addResult,
        resume
      }
    );
  }
  if (part.status?.type === "requires-action")
    throw new Error("Encountered unexpected requires-action status");
  switch (type) {
    case "text":
      return /* @__PURE__ */ jsx15(Text2, { ...part });
    case "reasoning":
      return /* @__PURE__ */ jsx15(Reasoning, { ...part });
    case "source":
      return /* @__PURE__ */ jsx15(Source, { ...part });
    case "image":
      return /* @__PURE__ */ jsx15(Image, { ...part });
    case "file":
      return /* @__PURE__ */ jsx15(File, { ...part });
    case "audio":
      return /* @__PURE__ */ jsx15(Audio, { ...part });
    default:
      const unhandledType = type;
      throw new Error(`Unknown message part type: ${unhandledType}`);
  }
};
var MessagePrimitivePartByIndex = memo2(
  ({ index, components: components2 }) => {
    return /* @__PURE__ */ jsx15(PartByIndexProvider, { index, children: /* @__PURE__ */ jsx15(MessagePartComponent, { components: components2 }) });
  },
  (prev, next) => prev.index === next.index && prev.components?.Text === next.components?.Text && prev.components?.Reasoning === next.components?.Reasoning && prev.components?.Source === next.components?.Source && prev.components?.Image === next.components?.Image && prev.components?.File === next.components?.File && prev.components?.Unstable_Audio === next.components?.Unstable_Audio && prev.components?.tools === next.components?.tools && prev.components?.ToolGroup === next.components?.ToolGroup
);
MessagePrimitivePartByIndex.displayName = "MessagePrimitive.PartByIndex";
var EmptyPartFallback = ({ status, component: Component }) => {
  return /* @__PURE__ */ jsx15(TextMessagePartProvider, { text: "", isRunning: status.type === "running", children: /* @__PURE__ */ jsx15(Component, { type: "text", text: "", status }) });
};
var COMPLETE_STATUS2 = Object.freeze({
  type: "complete"
});
var EmptyPartsImpl = ({ components: components2 }) => {
  const status = useAssistantState(
    (s) => s.message.status ?? COMPLETE_STATUS2
  );
  if (components2?.Empty) return /* @__PURE__ */ jsx15(components2.Empty, { status });
  return /* @__PURE__ */ jsx15(
    EmptyPartFallback,
    {
      status,
      component: components2?.Text ?? defaultComponents.Text
    }
  );
};
var EmptyParts = memo2(
  EmptyPartsImpl,
  (prev, next) => prev.components?.Empty === next.components?.Empty && prev.components?.Text === next.components?.Text
);
var MessagePrimitiveParts = ({
  components: components2
}) => {
  const contentLength = useAssistantState(
    ({ message }) => message.parts.length
  );
  const messageRanges = useMessagePartsGroups();
  const partsElements = useMemo12(() => {
    if (contentLength === 0) {
      return /* @__PURE__ */ jsx15(EmptyParts, { components: components2 });
    }
    return messageRanges.map((range) => {
      if (range.type === "single") {
        return /* @__PURE__ */ jsx15(
          MessagePrimitivePartByIndex,
          {
            index: range.index,
            components: components2
          },
          range.index
        );
      } else {
        const ToolGroupComponent = components2.ToolGroup ?? defaultComponents.ToolGroup;
        return /* @__PURE__ */ jsx15(
          ToolGroupComponent,
          {
            startIndex: range.startIndex,
            endIndex: range.endIndex,
            children: Array.from(
              { length: range.endIndex - range.startIndex + 1 },
              (_, i) => /* @__PURE__ */ jsx15(
                MessagePrimitivePartByIndex,
                {
                  index: range.startIndex + i,
                  components: components2
                },
                i
              )
            )
          },
          range.startIndex
        );
      }
    });
  }, [messageRanges, components2, contentLength]);
  return /* @__PURE__ */ jsx15(Fragment2, { children: partsElements });
};
MessagePrimitiveParts.displayName = "MessagePrimitive.Parts";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/message/MessageIf.js
var useMessageIf = (props) => {
  return useAssistantState(({ message }) => {
    const {
      role,
      attachments,
      parts,
      branchCount,
      isLast,
      speech,
      submittedFeedback,
      isCopied,
      isHovering
    } = message;
    if (props.hasBranches === true && branchCount < 2) return false;
    if (props.user && role !== "user") return false;
    if (props.assistant && role !== "assistant") return false;
    if (props.system && role !== "system") return false;
    if (props.lastOrHover === true && !isHovering && !isLast) return false;
    if (props.last !== void 0 && props.last !== isLast) return false;
    if (props.copied === true && !isCopied) return false;
    if (props.copied === false && isCopied) return false;
    if (props.speaking === true && speech == null) return false;
    if (props.speaking === false && speech != null) return false;
    if (props.hasAttachments === true && (role !== "user" || !attachments?.length))
      return false;
    if (props.hasAttachments === false && role === "user" && !!attachments?.length)
      return false;
    if (props.hasContent === true && parts.length === 0) return false;
    if (props.hasContent === false && parts.length > 0) return false;
    if (props.submittedFeedback !== void 0 && (submittedFeedback?.type ?? null) !== props.submittedFeedback)
      return false;
    return true;
  });
};
var MessagePrimitiveIf = ({
  children,
  ...query
}) => {
  const result = useMessageIf(query);
  return result ? children : null;
};
MessagePrimitiveIf.displayName = "MessagePrimitive.If";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/message/MessageAttachments.js
import { memo as memo3, useMemo as useMemo13 } from "react";
import { jsx as jsx16 } from "react/jsx-runtime";
var getComponent = (components2, attachment) => {
  const type = attachment.type;
  switch (type) {
    case "image":
      return components2?.Image ?? components2?.Attachment;
    case "document":
      return components2?.Document ?? components2?.Attachment;
    case "file":
      return components2?.File ?? components2?.Attachment;
    default:
      const _exhaustiveCheck = type;
      throw new Error(`Unknown attachment type: ${_exhaustiveCheck}`);
  }
};
var AttachmentComponent = ({ components: components2 }) => {
  const attachment = useAssistantState(({ attachment: attachment2 }) => attachment2);
  if (!attachment) return null;
  const Component = getComponent(components2, attachment);
  if (!Component) return null;
  return /* @__PURE__ */ jsx16(Component, {});
};
var MessagePrimitiveAttachmentByIndex = memo3(
  ({ index, components: components2 }) => {
    return /* @__PURE__ */ jsx16(MessageAttachmentByIndexProvider, { index, children: /* @__PURE__ */ jsx16(AttachmentComponent, { components: components2 }) });
  },
  (prev, next) => prev.index === next.index && prev.components?.Image === next.components?.Image && prev.components?.Document === next.components?.Document && prev.components?.File === next.components?.File && prev.components?.Attachment === next.components?.Attachment
);
MessagePrimitiveAttachmentByIndex.displayName = "MessagePrimitive.AttachmentByIndex";
var MessagePrimitiveAttachments = ({ components: components2 }) => {
  const attachmentsCount = useAssistantState(({ message }) => {
    if (message.role !== "user") return 0;
    return message.attachments.length;
  });
  const attachmentElements = useMemo13(() => {
    return Array.from({ length: attachmentsCount }, (_, index) => /* @__PURE__ */ jsx16(
      MessagePrimitiveAttachmentByIndex,
      {
        index,
        components: components2
      },
      index
    ));
  }, [attachmentsCount, components2]);
  return attachmentElements;
};
MessagePrimitiveAttachments.displayName = "MessagePrimitive.Attachments";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/message/MessageError.js
import { Fragment as Fragment3, jsx as jsx17 } from "react/jsx-runtime";
var MessagePrimitiveError = ({ children }) => {
  const hasError = useAssistantState(
    ({ message }) => message.status?.type === "incomplete" && message.status.reason === "error"
  );
  return hasError ? /* @__PURE__ */ jsx17(Fragment3, { children }) : null;
};
MessagePrimitiveError.displayName = "MessagePrimitive.Error";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/message/MessagePartsGrouped.js
import {
  memo as memo4,
  useMemo as useMemo14
} from "react";
import { Fragment as Fragment4, jsx as jsx18, jsxs as jsxs3 } from "react/jsx-runtime";
var groupMessagePartsByParentId = (parts) => {
  const groupMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const parentId = part?.parentId;
    const groupId = parentId ?? `__ungrouped_${i}`;
    const indices = groupMap.get(groupId) ?? [];
    indices.push(i);
    groupMap.set(groupId, indices);
  }
  const groups = [];
  for (const [groupId, indices] of groupMap) {
    const groupKey = groupId.startsWith("__ungrouped_") ? void 0 : groupId;
    groups.push({ groupKey, indices });
  }
  return groups;
};
var useMessagePartsGrouped = (groupingFunction) => {
  const parts = useAssistantState(({ message }) => message.parts);
  return useMemo14(() => {
    if (parts.length === 0) {
      return [];
    }
    return groupingFunction(parts);
  }, [parts, groupingFunction]);
};
var ToolUIDisplay2 = ({
  Fallback,
  ...props
}) => {
  const Render = useAssistantState(({ toolUIs }) => {
    const Render2 = toolUIs[props.toolName] ?? Fallback;
    if (Array.isArray(Render2)) return Render2[0];
    return Render2;
  });
  if (!Render) return null;
  return /* @__PURE__ */ jsx18(Render, { ...props });
};
var defaultComponents2 = {
  Text: () => /* @__PURE__ */ jsxs3("p", { style: { whiteSpace: "pre-line" }, children: [
    /* @__PURE__ */ jsx18(MessagePartPrimitiveText, {}),
    /* @__PURE__ */ jsx18(MessagePartPrimitiveInProgress, { children: /* @__PURE__ */ jsx18("span", { style: { fontFamily: "revert" }, children: " ●" }) })
  ] }),
  Reasoning: () => null,
  Source: () => null,
  Image: () => /* @__PURE__ */ jsx18(MessagePartPrimitiveImage, {}),
  File: () => null,
  Unstable_Audio: () => null,
  Group: ({ children }) => children
};
var MessagePartComponent2 = ({
  components: {
    Text: Text2 = defaultComponents2.Text,
    Reasoning = defaultComponents2.Reasoning,
    Image = defaultComponents2.Image,
    Source = defaultComponents2.Source,
    File = defaultComponents2.File,
    Unstable_Audio: Audio = defaultComponents2.Unstable_Audio,
    tools = {}
  } = {}
}) => {
  const api = useAssistantApi();
  const part = useAssistantState(({ part: part2 }) => part2);
  const type = part.type;
  if (type === "tool-call") {
    const addResult = (result) => api.part().addToolResult(result);
    const resume = api.part().resumeToolCall;
    if ("Override" in tools)
      return /* @__PURE__ */ jsx18(tools.Override, { ...part, addResult, resume });
    const Tool = tools.by_name?.[part.toolName] ?? tools.Fallback;
    return /* @__PURE__ */ jsx18(
      ToolUIDisplay2,
      {
        ...part,
        Fallback: Tool,
        addResult,
        resume
      }
    );
  }
  if (part.status?.type === "requires-action")
    throw new Error("Encountered unexpected requires-action status");
  switch (type) {
    case "text":
      return /* @__PURE__ */ jsx18(Text2, { ...part });
    case "reasoning":
      return /* @__PURE__ */ jsx18(Reasoning, { ...part });
    case "source":
      return /* @__PURE__ */ jsx18(Source, { ...part });
    case "image":
      return /* @__PURE__ */ jsx18(Image, { ...part });
    case "file":
      return /* @__PURE__ */ jsx18(File, { ...part });
    case "audio":
      return /* @__PURE__ */ jsx18(Audio, { ...part });
    default:
      const unhandledType = type;
      throw new Error(`Unknown message part type: ${unhandledType}`);
  }
};
var MessagePartImpl = ({ partIndex, components: components2 }) => {
  return /* @__PURE__ */ jsx18(PartByIndexProvider, { index: partIndex, children: /* @__PURE__ */ jsx18(MessagePartComponent2, { components: components2 }) });
};
var MessagePart = memo4(
  MessagePartImpl,
  (prev, next) => prev.partIndex === next.partIndex && prev.components?.Text === next.components?.Text && prev.components?.Reasoning === next.components?.Reasoning && prev.components?.Source === next.components?.Source && prev.components?.Image === next.components?.Image && prev.components?.File === next.components?.File && prev.components?.Unstable_Audio === next.components?.Unstable_Audio && prev.components?.tools === next.components?.tools && prev.components?.Group === next.components?.Group
);
var EmptyPartFallback2 = ({ status, component: Component }) => {
  return /* @__PURE__ */ jsx18(TextMessagePartProvider, { text: "", isRunning: status.type === "running", children: /* @__PURE__ */ jsx18(Component, { type: "text", text: "", status }) });
};
var COMPLETE_STATUS3 = Object.freeze({
  type: "complete"
});
var EmptyPartsImpl2 = ({ components: components2 }) => {
  const status = useAssistantState(
    (s) => s.message.status ?? COMPLETE_STATUS3
  );
  if (components2?.Empty) return /* @__PURE__ */ jsx18(components2.Empty, { status });
  return /* @__PURE__ */ jsx18(
    EmptyPartFallback2,
    {
      status,
      component: components2?.Text ?? defaultComponents2.Text
    }
  );
};
var EmptyParts2 = memo4(
  EmptyPartsImpl2,
  (prev, next) => prev.components?.Empty === next.components?.Empty && prev.components?.Text === next.components?.Text
);
var MessagePrimitiveUnstable_PartsGrouped = ({ groupingFunction, components: components2 }) => {
  const contentLength = useAssistantState(
    ({ message }) => message.parts.length
  );
  const messageGroups = useMessagePartsGrouped(groupingFunction);
  const partsElements = useMemo14(() => {
    if (contentLength === 0) {
      return /* @__PURE__ */ jsx18(EmptyParts2, { components: components2 });
    }
    return messageGroups.map((group, groupIndex) => {
      const GroupComponent = components2?.Group ?? defaultComponents2.Group;
      return /* @__PURE__ */ jsx18(
        GroupComponent,
        {
          groupKey: group.groupKey,
          indices: group.indices,
          children: group.indices.map((partIndex) => /* @__PURE__ */ jsx18(
            MessagePart,
            {
              partIndex,
              components: components2
            },
            partIndex
          ))
        },
        `group-${groupIndex}-${group.groupKey ?? "ungrouped"}`
      );
    });
  }, [messageGroups, components2, contentLength]);
  return /* @__PURE__ */ jsx18(Fragment4, { children: partsElements });
};
MessagePrimitiveUnstable_PartsGrouped.displayName = "MessagePrimitive.Unstable_PartsGrouped";
var MessagePrimitiveUnstable_PartsGroupedByParentId = ({ components: components2, ...props }) => {
  return /* @__PURE__ */ jsx18(
    MessagePrimitiveUnstable_PartsGrouped,
    {
      ...props,
      components: components2,
      groupingFunction: groupMessagePartsByParentId
    }
  );
};
MessagePrimitiveUnstable_PartsGroupedByParentId.displayName = "MessagePrimitive.Unstable_PartsGroupedByParentId";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/utils/hooks/useOnScrollToBottom.js
import { useEffect as useEffect8 } from "react";
var useOnScrollToBottom = (callback) => {
  const callbackRef = useCallbackRef(callback);
  const onScrollToBottom = useThreadViewport((vp) => vp.onScrollToBottom);
  useEffect8(() => {
    return onScrollToBottom(callbackRef);
  }, [onScrollToBottom, callbackRef]);
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/thread/index.js
var thread_exports = {};
__export(thread_exports, {
  Empty: () => ThreadPrimitiveEmpty,
  If: () => ThreadPrimitiveIf,
  MessageByIndex: () => ThreadPrimitiveMessageByIndex,
  Messages: () => ThreadPrimitiveMessages,
  Root: () => ThreadPrimitiveRoot,
  ScrollToBottom: () => ThreadPrimitiveScrollToBottom,
  Suggestion: () => ThreadPrimitiveSuggestion,
  Viewport: () => ThreadPrimitiveViewport
});

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/thread/ThreadRoot.js
import { forwardRef as forwardRef8 } from "react";
import { jsx as jsx19 } from "react/jsx-runtime";
var ThreadPrimitiveRoot = forwardRef8((props, ref) => {
  return /* @__PURE__ */ jsx19(Primitive.div, { ...props, ref });
});
ThreadPrimitiveRoot.displayName = "ThreadPrimitive.Root";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/thread/ThreadEmpty.js
var ThreadPrimitiveEmpty = ({
  children
}) => {
  const empty = useAssistantState(
    ({ thread }) => thread.messages.length === 0 && !thread.isLoading
  );
  return empty ? children : null;
};
ThreadPrimitiveEmpty.displayName = "ThreadPrimitive.Empty";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/thread/ThreadIf.js
var useThreadIf = (props) => {
  return useAssistantState(({ thread }) => {
    const isEmpty = thread.messages.length === 0 && !thread.isLoading;
    if (props.empty === true && !isEmpty) return false;
    if (props.empty === false && isEmpty) return false;
    if (props.running === true && !thread.isRunning) return false;
    if (props.running === false && thread.isRunning) return false;
    if (props.disabled === true && !thread.isDisabled) return false;
    if (props.disabled === false && thread.isDisabled) return false;
    return true;
  });
};
var ThreadPrimitiveIf = ({
  children,
  ...query
}) => {
  const result = useThreadIf(query);
  return result ? children : null;
};
ThreadPrimitiveIf.displayName = "ThreadPrimitive.If";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/thread/ThreadViewport.js
import { forwardRef as forwardRef9 } from "react";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/thread/useThreadViewportAutoScroll.js
import { useCallback as useCallback5, useRef as useRef5 } from "react";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/utils/hooks/useOnResizeContent.js
import { useCallback as useCallback4 } from "react";
var useOnResizeContent = (callback) => {
  const callbackRef = useCallbackRef(callback);
  const refCallback = useCallback4(
    (el) => {
      const resizeObserver = new ResizeObserver(() => {
        callbackRef();
      });
      const mutationObserver = new MutationObserver(() => {
        callbackRef();
      });
      resizeObserver.observe(el);
      mutationObserver.observe(el, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
      };
    },
    [callbackRef]
  );
  return useManagedRef(refCallback);
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/thread/useThreadViewportAutoScroll.js
var useThreadViewportAutoScroll = ({
  autoScroll = true
}) => {
  const divRef = useRef5(null);
  const threadViewportStore = useThreadViewportStore();
  const lastScrollTop = useRef5(0);
  const isScrollingToBottomRef = useRef5(false);
  const scrollToBottom = useCallback5(
    (behavior) => {
      const div = divRef.current;
      if (!div || !autoScroll) return;
      isScrollingToBottomRef.current = true;
      div.scrollTo({ top: div.scrollHeight, behavior });
    },
    [autoScroll]
  );
  const handleScroll = () => {
    const div = divRef.current;
    if (!div) return;
    const isAtBottom = threadViewportStore.getState().isAtBottom;
    const newIsAtBottom = div.scrollHeight - div.scrollTop <= div.clientHeight + 1;
    if (!newIsAtBottom && lastScrollTop.current < div.scrollTop) {
    } else {
      if (newIsAtBottom) {
        isScrollingToBottomRef.current = false;
      }
      if (newIsAtBottom !== isAtBottom) {
        writableStore(threadViewportStore).setState({
          isAtBottom: newIsAtBottom
        });
      }
    }
    lastScrollTop.current = div.scrollTop;
  };
  const resizeRef = useOnResizeContent(() => {
    if (isScrollingToBottomRef.current || threadViewportStore.getState().isAtBottom) {
      scrollToBottom("instant");
    }
    handleScroll();
  });
  const scrollRef = useManagedRef((el) => {
    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  });
  useOnScrollToBottom(() => {
    scrollToBottom("auto");
  });
  useAssistantEvent("thread.run-start", () => scrollToBottom("auto"));
  const autoScrollRef = useComposedRefs(resizeRef, scrollRef, divRef);
  return autoScrollRef;
};

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/thread/ThreadViewport.js
import { jsx as jsx20 } from "react/jsx-runtime";
var ThreadPrimitiveViewportScrollable = forwardRef9(({ autoScroll, children, ...rest }, forwardedRef) => {
  const autoScrollRef = useThreadViewportAutoScroll({
    autoScroll
  });
  const ref = useComposedRefs(forwardedRef, autoScrollRef);
  return /* @__PURE__ */ jsx20(Primitive.div, { ...rest, ref, children });
});
ThreadPrimitiveViewportScrollable.displayName = "ThreadPrimitive.ViewportScrollable";
var ThreadPrimitiveViewport = forwardRef9((props, ref) => {
  return /* @__PURE__ */ jsx20(ThreadViewportProvider, { children: /* @__PURE__ */ jsx20(ThreadPrimitiveViewportScrollable, { ...props, ref }) });
});
ThreadPrimitiveViewport.displayName = "ThreadPrimitive.Viewport";

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/thread/ThreadMessages.js
import { memo as memo5, useMemo as useMemo15 } from "react";
import { jsx as jsx21 } from "react/jsx-runtime";
var isComponentsSame = (prev, next) => {
  return prev.Message === next.Message && prev.EditComposer === next.EditComposer && prev.UserEditComposer === next.UserEditComposer && prev.AssistantEditComposer === next.AssistantEditComposer && prev.SystemEditComposer === next.SystemEditComposer && prev.UserMessage === next.UserMessage && prev.AssistantMessage === next.AssistantMessage && prev.SystemMessage === next.SystemMessage;
};
var DEFAULT_SYSTEM_MESSAGE = () => null;
var getComponent2 = (components2, role, isEditing) => {
  switch (role) {
    case "user":
      if (isEditing) {
        return components2.UserEditComposer ?? components2.EditComposer ?? components2.UserMessage ?? components2.Message;
      } else {
        return components2.UserMessage ?? components2.Message;
      }
    case "assistant":
      if (isEditing) {
        return components2.AssistantEditComposer ?? components2.EditComposer ?? components2.AssistantMessage ?? components2.Message;
      } else {
        return components2.AssistantMessage ?? components2.Message;
      }
    case "system":
      if (isEditing) {
        return components2.SystemEditComposer ?? components2.EditComposer ?? components2.SystemMessage ?? components2.Message;
      } else {
        return components2.SystemMessage ?? DEFAULT_SYSTEM_MESSAGE;
      }
    default:
      const _exhaustiveCheck = role;
      throw new Error(`Unknown message role: ${_exhaustiveCheck}`);
  }
};
var ThreadMessageComponent = ({
  components: components2
}) => {
  const role = useAssistantState(({ message }) => message.role);
  const isEditing = useAssistantState(
    ({ message }) => message.composer.isEditing
  );
  const Component = getComponent2(components2, role, isEditing);
  return /* @__PURE__ */ jsx21(Component, {});
};
var ThreadPrimitiveMessageByIndex = memo5(
  ({ index, components: components2 }) => {
    return /* @__PURE__ */ jsx21(MessageByIndexProvider, { index, children: /* @__PURE__ */ jsx21(ThreadMessageComponent, { components: components2 }) });
  },
  (prev, next) => prev.index === next.index && isComponentsSame(prev.components, next.components)
);
ThreadPrimitiveMessageByIndex.displayName = "ThreadPrimitive.MessageByIndex";
var ThreadPrimitiveMessagesImpl = ({
  components: components2
}) => {
  const messagesLength = useAssistantState(
    ({ thread }) => thread.messages.length
  );
  const messageElements = useMemo15(() => {
    if (messagesLength === 0) return null;
    return Array.from({ length: messagesLength }, (_, index) => /* @__PURE__ */ jsx21(
      ThreadPrimitiveMessageByIndex,
      {
        index,
        components: components2
      },
      index
    ));
  }, [messagesLength, components2]);
  return messageElements;
};
ThreadPrimitiveMessagesImpl.displayName = "ThreadPrimitive.Messages";
var ThreadPrimitiveMessages = memo5(
  ThreadPrimitiveMessagesImpl,
  (prev, next) => isComponentsSame(prev.components, next.components)
);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/thread/ThreadScrollToBottom.js
import { useCallback as useCallback6 } from "react";
var useThreadScrollToBottom = () => {
  const isAtBottom = useThreadViewport((s) => s.isAtBottom);
  const threadViewportStore = useThreadViewportStore();
  const handleScrollToBottom = useCallback6(() => {
    threadViewportStore.getState().scrollToBottom();
  }, [threadViewportStore]);
  if (isAtBottom) return null;
  return handleScrollToBottom;
};
var ThreadPrimitiveScrollToBottom = createActionButton(
  "ThreadPrimitive.ScrollToBottom",
  useThreadScrollToBottom
);

// ../../node_modules/.pnpm/@assistant-ui+react@0.11.27_9cb39785cf96af499620d9de49c2e39d/node_modules/@assistant-ui/react/dist/primitives/thread/ThreadSuggestion.js
import { useCallback as useCallback7 } from "react";
var useThreadSuggestion = ({
  prompt,
  send,
  clearComposer = true,
  autoSend,
  method: _method
}) => {
  const api = useAssistantApi();
  const disabled = useAssistantState(({ thread }) => thread.isDisabled);
  const resolvedSend = send ?? autoSend ?? false;
  const callback = useCallback7(() => {
    const isRunning = api.thread().getState().isRunning;
    if (resolvedSend && !isRunning) {
      api.thread().append(prompt);
      if (clearComposer) {
        api.composer().setText("");
      }
    } else {
      if (clearComposer) {
        api.composer().setText(prompt);
      } else {
        const currentText = api.composer().getState().text;
        api.composer().setText(currentText.trim() ? `${currentText} ${prompt}` : prompt);
      }
    }
  }, [api, resolvedSend, clearComposer, prompt]);
  if (disabled) return null;
  return callback;
};
var ThreadPrimitiveSuggestion = createActionButton(
  "ThreadPrimitive.Suggestion",
  useThreadSuggestion,
  ["prompt", "send", "clearComposer", "autoSend", "method"]
);

// ../web-ui/src/conversation/cost.tsx
import { Fragment as Fragment5 } from "react";

// ../web-ui/src/locales/conversation.ts
var conversationLocaleCatalog = {
  en: {
    "timeline.userLabel": "You",
    "conversation.imageUnavailable": "Image unavailable",
    "conversation.imageAlt": "Attached image {index}",
    "timeline.thinkingSummary": "Deep thinking",
    "timeline.lostOutput": "_Output interrupted; at least {count} characters were not saved_",
    "timeline.approvalLabel": "Approval: {status}",
    "timeline.approvalTitle": "Approval",
    "timeline.approval.pending": "Needs your confirmation",
    "timeline.approval.decided": "Approval processed",
    "timeline.approval.expired": "Approval expired",
    "timeline.decision.allowedOnce": "Allowed once",
    "timeline.decision.allowedSession": "Allowed for this session",
    "timeline.decision.allowedPermanent": "Always allowed for this profile",
    "timeline.decision.rejected": "Rejected",
    "timeline.decision.cancelled": "Cancelled",
    "timeline.reason.userRejected": "Rejected",
    "timeline.reason.timeout": "Timed out, not run",
    "timeline.reason.noApprover": "No one to approve, not run",
    "timeline.reason.stopped": "Stopped",
    "timeline.reason.policyDenied": "Blocked by command policy",
    "timeline.reason.subagentScope": "Refused automatically: outside the sub-agent scope",
    "timeline.artifactLabel": "Artifact",
    "timeline.compactionLabel": "Context compaction",
    "timeline.compactionFallback": "Context compacted (range: {range})",
    "timeline.unsupportedLabel": "Unsupported content",
    "timeline.conflictLabel": "Context configuration conflict",
    "timeline.conflictJoiner": ": ",
    "timeline.conflictOpsJoiner": ", ",
    "timeline.loadEarlier": "Load earlier records",
    "turn.status.running": "Running",
    "turn.status.waiting": "Waiting",
    "turn.status.completed": "Completed",
    "turn.status.failed": "Failed",
    "turn.status.cancelled": "Cancelled",
    "turn.status.awaitingApproval": "Awaiting approval",
    "turn.status.runningTool": "Running a tool",
    "turn.status.replying": "Replying",
    "turn.status.thinking": "Thinking",
    "turn.status.preparing": "Preparing a reply",
    "turn.duration.ms": "{n} ms",
    "turn.duration.s": "{n} s",
    "turn.duration.minSec": "{min} min {sec} s",
    "turn.elapsedSuffix": " · took {duration}",
    "turn.error.codeJoin": "{code}: {message}",
    "turn.error.unknownReason": "unknown reason",
    "turn.error.noDetail": "The run did not finish ({reason}); no error details were received.",
    "tool.status.planned": "Planned",
    "tool.status.awaitingApproval": "Awaiting approval",
    "tool.status.running": "Running",
    "tool.status.completed": "Completed",
    "tool.status.failed": "Failed",
    "tool.status.cancelled": "Cancelled",
    "tool.status.exitCode": "Exit code {code}",
    "tool.card.aria": "Tool {name}: {status}",
    "tool.detail.header": "Tool: {name}",
    "tool.detail.status": "Status: {status}",
    "tool.detail.args": "Arguments",
    "tool.detail.result": "Result",
    "tool.detail.error": "Error details",
    "tool.detail.noOutput": "(no output)",
    "tool.detail.expand": "View details",
    "tool.detail.collapse": "Hide details",
    "slot.notReady": "Plugin for this card is not ready",
    "slot.entryFailed": "Plugin render failed",
    "cost.detailsAria": "View the cost breakdown for this call",
    "cost.summary.input": "In {n}",
    "cost.summary.output": "Out {n}",
    "cost.source.gateway": "gateway record",
    "cost.source.estimated": "estimated",
    "cost.billing.usd": "{usd} ({source})",
    "cost.summary.noBilling": "Cost not provided",
    "cost.summary.credits": "{credits} credits ({source})",
    "cost.summary.interrupted": "Interrupted",
    "cost.rows.tokensInNoCache": "Input tokens (excl. cache)",
    "cost.rows.tokensOutReasoning": "Output tokens (incl. reasoning)",
    "cost.rows.cacheRead": "Cache read tokens",
    "cost.rows.cacheWrite": "Cache write tokens",
    "cost.rows.reasoning": "Reasoning tokens (subset of output)",
    "cost.rows.notProvided": "Not provided",
    "cost.rows.range": "Record range",
    "cost.rows.singleRecord": "Single call cost record",
    "cost.purpose.inference": "Model call",
    "cost.purpose.compaction": "Context compaction",
    "cost.purpose.subagent": "Subtask",
    "cost.purpose.verifier": "Result verification",
    "cost.purpose.media": "Media",
    "cost.purpose.tool": "Tool",
    "cost.rows.model": "Model",
    "cost.rows.tokenDetail": "Token detail",
    "cost.rows.usd": "USD cost",
    "cost.rows.credits": "Credits",
    "cost.rows.ttft": "Time to first output",
    "cost.rows.requestDuration": "Model request duration",
    "cost.rows.status": "Status",
    "cost.rows.interruptedNote": "Interrupted; usage may be incomplete or partially estimated",
    "cost.time.s": "{n} s",
    "usage.stale": " · last synced",
    "usage.caption": "About {used} / {window}{stale}",
    "usage.summary": "Context about {used} / {window} · {pct}%{stale}",
    "usage.rows.context": "Context used",
    "usage.rows.window": "Model window",
    "usage.rows.maxOutput": "Max output",
    "usage.rows.autoCompact": "Auto compaction",
    "usage.enabled": "Enabled",
    "usage.disabled": "Disabled",
    "usage.viewAria": "View {summary}",
    "usage.viewAriaFallback": "View session context usage",
    "usage.title": "Context usage",
    "usage.usedTitle": "Context used",
    "usage.note": "Context is estimated by the backend and includes retained conversation content; the model window and output cap come from the model configuration.",
    "markdown.copyCode": "Copy code",
    "markdown.copied": "Copied",
    "markdown.copyFailed": "Copy failed",
    "markdown.copy": "Copy",
    "markdown.tableScroll": "Table, scrollable horizontally",
    "turnactions.copy": "Copy answer",
    "turnactions.fork": "Fork into a new chat",
    "turnactions.copied": "Copied",
    "turnactions.copyFailed": "Copy failed",
    "turnactions.forkFailed": "Fork failed. Try again.",
    "turnactions.metaAria": "View usage and call details for this turn",
    "turnactions.rows.tokensIn": "Input tokens",
    "turnactions.rows.tokensOut": "Output tokens",
    "turnactions.rows.cache": "Cache read / write",
    "turnactions.rows.cost": "Cost",
    "turnactions.rows.credits": "Credits",
    "turnactions.rows.duration": "Duration",
    "turnactions.subscription": " · subscription",
    "turnactions.billingPartial": " · partially known",
    "turnactions.creditsPartial": " · partial",
    "turnactions.inherited": "Inherited history",
    "doc.preview.unavailable": "{kind} resource {reason}",
    "doc.reason.unauthorized": "not authorized",
    "doc.reason.unavailable": "unavailable",
    "doc.kind.image": "Image",
    "doc.kind.pdf": "PDF",
    "doc.imageFallback": "Document image",
    "doc.pdfFallback": "PDF document",
    "runtime.lostOutput": "Output interrupted; at least {count} characters not saved",
    "runtime.compactionFallback": "Context compacted {range}",
    "accounts.disable": "Disable",
    "accounts.enable": "Enable",
    "accounts.makeDefault": "Set as default",
    "accounts.confirmRemove": "Confirm removal",
    "accounts.remove": "Remove",
    "accounts.enabled": "Enabled",
    "accounts.disabled": "Disabled",
    "accounts.defaultBadge": "Default",
    "accounts.editAria": "Edit {label}",
    "accounts.edit": "Edit",
    "accounts.cancelRemove": "Cancel removal",
    "accounts.keyPlaceholder": "Enter a new key or keep the current one",
    "accounts.save": "Save account",
    "accounts.testConnection": "Test connection",
    "accounts.closeAria": "Close account details",
    "accounts.kicker": "Account configuration",
    "accounts.title": "Account details",
    "accounts.context": "Edit the connection and default model",
    "accounts.connectionLegend": "Connection",
    "accounts.nameLabel": "Account name",
    "accounts.namePlaceholder": "e.g. work account, local model",
    "accounts.providerLabel": "Provider",
    "accounts.baseUrlLabel": "Base URL",
    "accounts.apiKeyLabel": "API Key",
    "accounts.validationLegend": "Validation & default model",
    "accounts.retryRead": "Retry reading the configuration",
    "accounts.defaultModelLabel": "Default model",
    "accounts.defaultThinkingLabel": "Default thinking level",
    "accounts.contextBudgetLabel": "Default context budget (tokens)",
    "accounts.contextBudgetPlaceholder": "Automatic (model catalog default)",
    "accounts.modelSettingsHint": "K and M suffixes are supported; 100K means 100,000 tokens. New sessions inherit these defaults; existing sessions keep their settings.",
    "accounts.guard": "The default account cannot be disabled or deleted; set another enabled account as default first.",
    "settings.oauth.methodLabel": "Auth method"
  },
  "zh-CN": {
    "timeline.userLabel": "你",
    "conversation.imageUnavailable": "图片无法显示",
    "conversation.imageAlt": "附图 {index}",
    "timeline.thinkingSummary": "深度思考",
    "timeline.lostOutput": "_输出中断，至少 {count} 字未保存_",
    "timeline.approvalLabel": "审批：{status}",
    "timeline.approvalTitle": "审批",
    "timeline.approval.pending": "需要你确认",
    "timeline.approval.decided": "审批已处理",
    "timeline.approval.expired": "审批已过期",
    "timeline.decision.allowedOnce": "仅允许这次",
    "timeline.decision.allowedSession": "本会话允许",
    "timeline.decision.allowedPermanent": "对此配置始终允许",
    "timeline.decision.rejected": "已拒绝",
    "timeline.decision.cancelled": "已取消",
    "timeline.reason.userRejected": "已拒绝",
    "timeline.reason.timeout": "等待超时，未执行",
    "timeline.reason.noApprover": "无人审批，未执行",
    "timeline.reason.stopped": "已停止",
    "timeline.reason.policyDenied": "被命令策略拦截",
    "timeline.reason.subagentScope": "子代理权限范围内，已自动拒绝",
    "timeline.artifactLabel": "产物",
    "timeline.compactionLabel": "上下文整理",
    "timeline.compactionFallback": "已整理上下文（范围：{range}）",
    "timeline.unsupportedLabel": "暂不支持的内容",
    "timeline.conflictLabel": "上下文配置冲突",
    "timeline.conflictJoiner": "：",
    "timeline.conflictOpsJoiner": "、",
    "timeline.loadEarlier": "加载更早的记录",
    "turn.status.running": "正在执行",
    "turn.status.waiting": "等待处理",
    "turn.status.completed": "已完成",
    "turn.status.failed": "执行失败",
    "turn.status.cancelled": "已取消",
    "turn.status.awaitingApproval": "等待审批",
    "turn.status.runningTool": "正在执行工具",
    "turn.status.replying": "正在回复",
    "turn.status.thinking": "正在思考",
    "turn.status.preparing": "正在准备回复",
    "turn.duration.ms": "{n} 毫秒",
    "turn.duration.s": "{n} 秒",
    "turn.duration.minSec": "{min} 分 {sec} 秒",
    "turn.elapsedSuffix": " · 用时 {duration}",
    "turn.error.codeJoin": "{code}：{message}",
    "turn.error.unknownReason": "未知原因",
    "turn.error.noDetail": "本次执行未完成（{reason}），暂未收到具体错误信息。",
    "tool.status.planned": "等待执行",
    "tool.status.awaitingApproval": "等待审批",
    "tool.status.running": "正在执行",
    "tool.status.completed": "执行完成",
    "tool.status.failed": "执行失败",
    "tool.status.cancelled": "已取消",
    "tool.status.exitCode": "退出码 {code}",
    "tool.card.aria": "工具 {name}：{status}",
    "tool.detail.header": "工具：{name}",
    "tool.detail.status": "状态：{status}",
    "tool.detail.args": "执行参数",
    "tool.detail.result": "执行结果",
    "tool.detail.error": "错误详情",
    "tool.detail.noOutput": "（无输出）",
    "tool.detail.expand": "查看详情",
    "tool.detail.collapse": "收起详情",
    "slot.notReady": "此卡片的插件未就绪",
    "slot.entryFailed": "插件渲染失败",
    "cost.detailsAria": "查看本次调用用量明细",
    "cost.summary.input": "输入 {n}",
    "cost.summary.output": "输出 {n}",
    "cost.source.gateway": "网关记录",
    "cost.source.estimated": "估算",
    "cost.billing.usd": "{usd}（{source}）",
    "cost.summary.noBilling": "费用未提供",
    "cost.summary.credits": "{credits} credits（{source}）",
    "cost.summary.interrupted": "已中断",
    "cost.rows.tokensInNoCache": "输入 Token（不含缓存）",
    "cost.rows.tokensOutReasoning": "输出 Token（含推理）",
    "cost.rows.cacheRead": "缓存读取 Token",
    "cost.rows.cacheWrite": "缓存写入 Token",
    "cost.rows.reasoning": "推理 Token（输出的子集）",
    "cost.rows.notProvided": "未提供",
    "cost.rows.range": "记录范围",
    "cost.rows.singleRecord": "单次费用记录",
    "cost.purpose.inference": "模型调用",
    "cost.purpose.compaction": "上下文整理",
    "cost.purpose.subagent": "子任务",
    "cost.purpose.verifier": "结果验证",
    "cost.purpose.media": "媒体",
    "cost.purpose.tool": "工具",
    "cost.rows.model": "模型",
    "cost.rows.tokenDetail": "Token 明细",
    "cost.rows.usd": "美元费用",
    "cost.rows.credits": "额度",
    "cost.rows.ttft": "首次输出等待",
    "cost.rows.requestDuration": "模型请求耗时",
    "cost.rows.status": "状态",
    "cost.rows.interruptedNote": "已中断；用量可能不完整或包含估算",
    "cost.time.s": "{n} 秒",
    "usage.stale": " · 上次同步",
    "usage.caption": "约 {used} / {window}{stale}",
    "usage.summary": "上下文约 {used} / {window} · {pct}%{stale}",
    "usage.rows.context": "上下文占用",
    "usage.rows.window": "模型窗口",
    "usage.rows.maxOutput": "最大输出上限",
    "usage.rows.autoCompact": "自动整理上下文",
    "usage.enabled": "已启用",
    "usage.disabled": "未启用",
    "usage.viewAria": "查看{summary}",
    "usage.viewAriaFallback": "查看会话上下文占用",
    "usage.title": "上下文用量",
    "usage.usedTitle": "上下文已用",
    "usage.note": "上下文为后台估算，包含当前保留的对话等内容；模型窗口与输出上限来自模型配置。",
    "markdown.copyCode": "复制代码",
    "markdown.copied": "已复制",
    "markdown.copyFailed": "复制失败",
    "markdown.copy": "复制",
    "markdown.tableScroll": "表格，可横向滚动",
    "turnactions.copy": "复制回答",
    "turnactions.fork": "分支到新聊天",
    "turnactions.copied": "已复制",
    "turnactions.copyFailed": "复制失败",
    "turnactions.forkFailed": "分支失败，请重试。",
    "turnactions.metaAria": "查看本轮用量与调用明细",
    "turnactions.rows.tokensIn": "输入 Token",
    "turnactions.rows.tokensOut": "输出 Token",
    "turnactions.rows.cache": "缓存读取 / 写入",
    "turnactions.rows.cost": "费用",
    "turnactions.rows.credits": "额度",
    "turnactions.rows.duration": "用时",
    "turnactions.subscription": " · 订阅",
    "turnactions.billingPartial": " · 已知部分",
    "turnactions.creditsPartial": " · 部分",
    "turnactions.inherited": "继承历史",
    "doc.preview.unavailable": "{kind}资源{reason}",
    "doc.reason.unauthorized": "未获授权",
    "doc.reason.unavailable": "不可用",
    "doc.kind.image": "图片",
    "doc.kind.pdf": "PDF ",
    "doc.imageFallback": "文档图片",
    "doc.pdfFallback": "PDF 文档",
    "runtime.lostOutput": "输出中断，至少 {count} 字未保存",
    "runtime.compactionFallback": "已整理上下文 {range}",
    "accounts.disable": "停用",
    "accounts.enable": "启用",
    "accounts.makeDefault": "设为默认",
    "accounts.confirmRemove": "确认删除",
    "accounts.remove": "删除",
    "accounts.enabled": "已启用",
    "accounts.disabled": "已停用",
    "accounts.defaultBadge": "默认",
    "accounts.editAria": "编辑 {label}",
    "accounts.edit": "编辑",
    "accounts.cancelRemove": "取消删除",
    "accounts.keyPlaceholder": "输入新密钥或保留当前密钥",
    "accounts.save": "保存账户",
    "accounts.testConnection": "测试连接",
    "accounts.closeAria": "关闭账户详情",
    "accounts.kicker": "账户配置",
    "accounts.title": "账户详情",
    "accounts.context": "编辑连接与默认模型",
    "accounts.connectionLegend": "连接信息",
    "accounts.nameLabel": "账户名称",
    "accounts.namePlaceholder": "例如：工作账户、本地模型",
    "accounts.providerLabel": "Provider",
    "accounts.baseUrlLabel": "服务地址",
    "accounts.apiKeyLabel": "API Key",
    "accounts.validationLegend": "验证与默认模型",
    "accounts.retryRead": "重试读取配置",
    "accounts.defaultModelLabel": "默认模型",
    "accounts.defaultThinkingLabel": "默认思考强度",
    "accounts.contextBudgetLabel": "默认上下文预算（Token）",
    "accounts.contextBudgetPlaceholder": "自动（模型目录默认值）",
    "accounts.modelSettingsHint": "支持 K/M 单位，如 100K 表示 100,000 Token。新会话继承这些默认值；已有会话保留自己的配置。",
    "accounts.guard": "默认账户不可停用或删除；如需调整，请先将其他已启用账户设为默认。",
    "settings.oauth.methodLabel": "认证方式"
  }
};

// ../web-ui/src/locales/model-settings.ts
var modelSettingsLocaleCatalog = {
  en: {
    "modelSettings.thinking.off": "Off",
    "modelSettings.thinking.minimal": "Minimal",
    "modelSettings.thinking.low": "Low",
    "modelSettings.thinking.medium": "Medium",
    "modelSettings.thinking.high": "High",
    "modelSettings.thinking.xhigh": "Very high",
    "modelSettings.thinking.max": "Max",
    "modelSettings.thinking.auto": "Automatic (provider default)",
    "modelSettings.thinkingLabel": "Reasoning level",
    "modelSettings.savedThinkingUnavailable": "The saved level is currently unavailable: {value}",
    "modelSettings.detailAria": "Settings for this session's model",
    "modelSettings.capacityLabel": "Model capacity",
    "modelSettings.windowLabel": "Context window",
    "modelSettings.presetAuto": "Automatic",
    "modelSettings.customAria": "Custom context budget in tokens",
    "modelSettings.windowPlaceholder": "Automatic · {tokens}",
    "modelSettings.windowHint": "Model capacity {tokens} tokens. Enter 100K (100,000 tokens) or the full number; leave empty to restore the automatic value. A smaller budget compacts the context earlier.",
    "modelSettings.windowRange": "Enter a positive integer between {min} and {max} tokens. K/M units are accepted."
  },
  "zh-CN": {
    "modelSettings.thinking.off": "关闭",
    "modelSettings.thinking.minimal": "最低",
    "modelSettings.thinking.low": "低",
    "modelSettings.thinking.medium": "中",
    "modelSettings.thinking.high": "高",
    "modelSettings.thinking.xhigh": "更高",
    "modelSettings.thinking.max": "最高",
    "modelSettings.thinking.auto": "自动（Provider 默认）",
    "modelSettings.thinkingLabel": "思考强度",
    "modelSettings.savedThinkingUnavailable": "已保存的档位当前不可用：{value}",
    "modelSettings.detailAria": "所选模型的会话设置",
    "modelSettings.capacityLabel": "模型容量",
    "modelSettings.windowLabel": "上下文窗口",
    "modelSettings.presetAuto": "自动",
    "modelSettings.customAria": "自定义上下文预算（Token）",
    "modelSettings.windowPlaceholder": "自动 · {tokens}",
    "modelSettings.windowHint": "模型容量 {tokens} Token。可输入 100K（100,000 Token）或完整数量；留空恢复自动。较小预算会提前整理上下文。",
    "modelSettings.windowRange": "请输入 {min} 至 {max} 之间的正整数 Token，可使用 K/M 单位。"
  }
};

// ../web-ui/src/locales/index.ts
var fallbackT = (key) => key;
var DICTS = [conversationLocaleCatalog, modelSettingsLocaleCatalog];
var webUiLocaleCatalog = {
  en: Object.fromEntries(DICTS.flatMap((dict) => Object.entries(dict.en))),
  "zh-CN": Object.fromEntries(DICTS.flatMap((dict) => Object.entries(dict["zh-CN"])))
};

// ../web-ui/src/conversation/cost-format.ts
var count = (n) => n.toLocaleString("en-US");
var compact = (n) => n < 1e3 ? String(n) : `${(n / (n >= 1e6 ? 1e6 : 1e3)).toFixed(1)}${n >= 1e6 ? "M" : "K"}`;
var usd = (n) => `$${(n / 1e6).toFixed(6).replace(/0+$/, "").replace(/\.$/, ".00")}`;
var credits = (n) => n.toFixed(8).replace(/\.?0+$/, "");
var source = (value, t) => t(value === "estimated" ? "cost.source.estimated" : "cost.source.gateway");
var time = (n, t) => n < 1e3 ? `${n} ms` : t("cost.time.s", { n: (n / 1e3).toFixed(2) });
var purposeKeys = {
  inference: "cost.purpose.inference",
  compaction: "cost.purpose.compaction",
  subagent: "cost.purpose.subagent",
  verifier: "cost.purpose.verifier",
  media: "cost.purpose.media",
  tool: "cost.purpose.tool"
};
function costSummary(node, t = fallbackT) {
  const parts = node.tokens ? [
    t("cost.summary.input", { n: compact(node.tokens.input) }),
    t("cost.summary.output", { n: compact(node.tokens.output) })
  ] : [];
  const amount = node.billing ? t("cost.billing.usd", { usd: usd(node.billing.usdMicros), source: source(node.billing.source, t) }) : node.credits === void 0 ? t("cost.summary.noBilling") : t("cost.summary.credits", { credits: credits(node.credits), source: source(node.source, t) });
  return [...parts, amount, ...node.interrupted ? [t("cost.summary.interrupted")] : []].join(" · ");
}
function tokenRows(tokens, t) {
  return [
    [t("cost.rows.tokensInNoCache"), count(tokens.input)],
    [t("cost.rows.tokensOutReasoning"), count(tokens.output)],
    [t("cost.rows.cacheRead"), count(tokens.cacheRead)],
    [t("cost.rows.cacheWrite"), count(tokens.cacheWrite)],
    [
      t("cost.rows.reasoning"),
      tokens.reasoning === void 0 ? t("cost.rows.notProvided") : count(tokens.reasoning)
    ]
  ];
}
function costDetails(node, t = fallbackT) {
  const purpose = node.purpose ?? "";
  const purposeKey = Object.hasOwn(purposeKeys, purpose) ? purposeKeys[purpose] : void 0;
  return [
    [t("cost.rows.range"), purposeKey === void 0 ? t("cost.rows.singleRecord") : t(purposeKey)],
    ...node.model ? [[t("cost.rows.model"), node.model]] : [],
    ...node.tokens ? tokenRows(node.tokens, t) : [[t("cost.rows.tokenDetail"), t("cost.rows.notProvided")]],
    ...node.billing ? [
      [t("cost.rows.usd"), `${usd(node.billing.usdMicros)} · ${source(node.billing.source, t)}`]
    ] : [],
    [
      t("cost.rows.credits"),
      node.credits === void 0 ? t("cost.rows.notProvided") : `${credits(node.credits)} credits · ${source(node.source, t)}`
    ],
    ...node.timing?.ttftMs !== void 0 ? [[t("cost.rows.ttft"), time(node.timing.ttftMs, t)]] : [],
    ...node.timing?.durationMs !== void 0 ? [[t("cost.rows.requestDuration"), time(node.timing.durationMs, t)]] : [],
    ...node.interrupted ? [[t("cost.rows.status"), t("cost.rows.interruptedNote")]] : []
  ];
}

// ../web-ui/src/conversation/cost.tsx
import { jsx as jsx22, jsxs as jsxs4 } from "react/jsx-runtime";
function ConversationCost({ node, t = fallbackT }) {
  return /* @__PURE__ */ jsxs4("details", { className: "usage-disclosure call-usage", children: [
    /* @__PURE__ */ jsx22("summary", { "aria-label": t("cost.detailsAria"), children: costSummary(node, t) }),
    /* @__PURE__ */ jsx22("dl", { className: "usage-grid", children: costDetails(node, t).map(([name, value]) => /* @__PURE__ */ jsxs4(Fragment5, { children: [
      /* @__PURE__ */ jsx22("dt", { children: name }),
      /* @__PURE__ */ jsx22("dd", { children: value })
    ] }, name)) })
  ] });
}

// ../web-ui/src/conversation/document-preview.tsx
import { createElement, useMemo as useMemo20 } from "react";

// ../web-ui/src/conversation/document-preview-policy.ts
var HTML_TAGS = /* @__PURE__ */ new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "CODE",
  "DEL",
  "EM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HR",
  "I",
  "LI",
  "OL",
  "P",
  "PRE",
  "STRONG",
  "TABLE",
  "TBODY",
  "TD",
  "TH",
  "THEAD",
  "TR",
  "UL"
]);
var HTML_ATTRIBUTES = /* @__PURE__ */ new Set(["aria-label", "class", "colspan", "rowspan", "scope", "title"]);
function safeFragment(value) {
  if (!value.startsWith("#") || value.length > 256) return void 0;
  try {
    decodeURIComponent(value.slice(1));
    return value;
  } catch {
    return void 0;
  }
}
function sanitizeDocumentHtml(source2) {
  const template = document.createElement("template");
  template.innerHTML = source2;
  const result = document.createDocumentFragment();
  const appendNode = (parent, node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.append(document.createTextNode(node.nodeValue ?? ""));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const sourceElement = node;
    if (!HTML_TAGS.has(sourceElement.tagName)) {
      if (sourceElement.textContent) parent.append(document.createTextNode(sourceElement.textContent));
      return;
    }
    const target = document.createElement(sourceElement.tagName.toLowerCase());
    for (const attribute of Array.from(sourceElement.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on") || name === "style" || name === "src" || name === "srcset") continue;
      if (name === "href") {
        const href = safeFragment(attribute.value);
        if (href) target.setAttribute("href", href);
        continue;
      }
      if (HTML_ATTRIBUTES.has(name)) target.setAttribute(name, attribute.value);
    }
    for (const child of Array.from(sourceElement.childNodes)) appendNode(target, child);
    parent.append(target);
  };
  for (const child of Array.from(template.content.childNodes)) appendNode(result, child);
  return result;
}
function documentResourceUrl(value) {
  if (!value) return void 0;
  try {
    const url = new URL(value, globalThis.location?.href);
    return url.protocol === "blob:" ? url.href : void 0;
  } catch {
    return void 0;
  }
}

// ../../node_modules/.pnpm/@ant-design+x-markdown@2.9._a775707fb3dd5b8f608e56bd9e660169/node_modules/@ant-design/x-markdown/es/XMarkdown/index.js
import React10, { useMemo as useMemo17 } from "react";

// ../../node_modules/.pnpm/marked@15.0.12/node_modules/marked/lib/marked.esm.js
function _getDefaults() {
  return {
    async: false,
    breaks: false,
    extensions: null,
    gfm: true,
    hooks: null,
    pedantic: false,
    renderer: null,
    silent: false,
    tokenizer: null,
    walkTokens: null
  };
}
var _defaults = _getDefaults();
function changeDefaults(newDefaults) {
  _defaults = newDefaults;
}
var noopTest = { exec: () => null };
function edit(regex, opt = "") {
  let source2 = typeof regex === "string" ? regex : regex.source;
  const obj = {
    replace: (name, val) => {
      let valSource = typeof val === "string" ? val : val.source;
      valSource = valSource.replace(other.caret, "$1");
      source2 = source2.replace(name, valSource);
      return obj;
    },
    getRegex: () => {
      return new RegExp(source2, opt);
    }
  };
  return obj;
}
var other = {
  codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
  outputLinkReplace: /\\([\[\]])/g,
  indentCodeCompensation: /^(\s+)(?:```)/,
  beginningSpace: /^\s+/,
  endingHash: /#$/,
  startingSpaceChar: /^ /,
  endingSpaceChar: / $/,
  nonSpaceChar: /[^ ]/,
  newLineCharGlobal: /\n/g,
  tabCharGlobal: /\t/g,
  multipleSpaceGlobal: /\s+/g,
  blankLine: /^[ \t]*$/,
  doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
  blockquoteStart: /^ {0,3}>/,
  blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
  blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
  listReplaceTabs: /^\t+/,
  listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
  listIsTask: /^\[[ xX]\] /,
  listReplaceTask: /^\[[ xX]\] +/,
  anyLine: /\n.*\n/,
  hrefBrackets: /^<(.*)>$/,
  tableDelimiter: /[:|]/,
  tableAlignChars: /^\||\| *$/g,
  tableRowBlankLine: /\n[ \t]*$/,
  tableAlignRight: /^ *-+: *$/,
  tableAlignCenter: /^ *:-+: *$/,
  tableAlignLeft: /^ *:-+ *$/,
  startATag: /^<a /i,
  endATag: /^<\/a>/i,
  startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
  endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
  startAngleBracket: /^</,
  endAngleBracket: />$/,
  pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
  unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
  escapeTest: /[&<>"']/,
  escapeReplace: /[&<>"']/g,
  escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
  escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,
  caret: /(^|[^\[])\^/g,
  percentDecode: /%25/g,
  findPipe: /\|/g,
  splitPipe: / \|/,
  slashPipe: /\\\|/g,
  carriageReturn: /\r\n|\r/g,
  spaceLine: /^ +$/gm,
  notSpaceStart: /^\S*/,
  endingNewline: /\n$/,
  listItemRegex: (bull) => new RegExp(`^( {0,3}${bull})((?:[	 ][^\\n]*)?(?:\\n|$))`),
  nextBulletRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
  hrRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
  fencesBeginRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`),
  headingBeginRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`),
  htmlBeginRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}<(?:[a-z].*>|!--)`, "i")
};
var newline = /^(?:[ \t]*(?:\n|$))+/;
var blockCode = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var fences = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var hr = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var bullet = /(?:[*+-]|\d{1,9}[.)])/;
var lheadingCore = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
var lheading = edit(lheadingCore).replace(/bull/g, bullet).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
var lheadingGfm = edit(lheadingCore).replace(/bull/g, bullet).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
var _paragraph = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
var blockText = /^[^\n]+/;
var _blockLabel = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
var def = edit(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", _blockLabel).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var list = edit(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, bullet).getRegex();
var _tag = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var html = edit(
  "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))",
  "i"
).replace("comment", _comment).replace("tag", _tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var paragraph = edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex();
var blockquote = edit(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", paragraph).getRegex();
var blockNormal = {
  blockquote,
  code: blockCode,
  def,
  fences,
  heading,
  hr,
  html,
  lheading,
  list,
  newline,
  paragraph,
  table: noopTest,
  text: blockText
};
var gfmTable = edit(
  "^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)"
).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex();
var blockGfm = {
  ...blockNormal,
  lheading: lheadingGfm,
  table: gfmTable,
  paragraph: edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", gfmTable).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex()
};
var blockPedantic = {
  ...blockNormal,
  html: edit(
    `^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`
  ).replace("comment", _comment).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
  heading: /^(#{1,6})(.*)(?:\n+|$)/,
  fences: noopTest,
  // fences not supported
  lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  paragraph: edit(_paragraph).replace("hr", hr).replace("heading", " *#{1,6} *[^\n]").replace("lheading", lheading).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex()
};
var escape = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var br = /^( {2,}|\\)\n(?!\s*$)/;
var inlineText = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var _punctuation = /[\p{P}\p{S}]/u;
var _punctuationOrSpace = /[\s\p{P}\p{S}]/u;
var _notPunctuationOrSpace = /[^\s\p{P}\p{S}]/u;
var punctuation = edit(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, _punctuationOrSpace).getRegex();
var _punctuationGfmStrongEm = /(?!~)[\p{P}\p{S}]/u;
var _punctuationOrSpaceGfmStrongEm = /(?!~)[\s\p{P}\p{S}]/u;
var _notPunctuationOrSpaceGfmStrongEm = /(?:[^\s\p{P}\p{S}]|~)/u;
var blockSkip = /\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g;
var emStrongLDelimCore = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/;
var emStrongLDelim = edit(emStrongLDelimCore, "u").replace(/punct/g, _punctuation).getRegex();
var emStrongLDelimGfm = edit(emStrongLDelimCore, "u").replace(/punct/g, _punctuationGfmStrongEm).getRegex();
var emStrongRDelimAstCore = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
var emStrongRDelimAst = edit(emStrongRDelimAstCore, "gu").replace(/notPunctSpace/g, _notPunctuationOrSpace).replace(/punctSpace/g, _punctuationOrSpace).replace(/punct/g, _punctuation).getRegex();
var emStrongRDelimAstGfm = edit(emStrongRDelimAstCore, "gu").replace(/notPunctSpace/g, _notPunctuationOrSpaceGfmStrongEm).replace(/punctSpace/g, _punctuationOrSpaceGfmStrongEm).replace(/punct/g, _punctuationGfmStrongEm).getRegex();
var emStrongRDelimUnd = edit(
  "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)",
  "gu"
).replace(/notPunctSpace/g, _notPunctuationOrSpace).replace(/punctSpace/g, _punctuationOrSpace).replace(/punct/g, _punctuation).getRegex();
var anyPunctuation = edit(/\\(punct)/, "gu").replace(/punct/g, _punctuation).getRegex();
var autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var _inlineComment = edit(_comment).replace("(?:-->|$)", "-->").getRegex();
var tag = edit(
  "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>"
).replace("comment", _inlineComment).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var _inlineLabel = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
var link = edit(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", _inlineLabel).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var reflink = edit(/^!?\[(label)\]\[(ref)\]/).replace("label", _inlineLabel).replace("ref", _blockLabel).getRegex();
var nolink = edit(/^!?\[(ref)\](?:\[\])?/).replace("ref", _blockLabel).getRegex();
var reflinkSearch = edit("reflink|nolink(?!\\()", "g").replace("reflink", reflink).replace("nolink", nolink).getRegex();
var inlineNormal = {
  _backpedal: noopTest,
  // only used for GFM url
  anyPunctuation,
  autolink,
  blockSkip,
  br,
  code: inlineCode,
  del: noopTest,
  emStrongLDelim,
  emStrongRDelimAst,
  emStrongRDelimUnd,
  escape,
  link,
  nolink,
  punctuation,
  reflink,
  reflinkSearch,
  tag,
  text: inlineText,
  url: noopTest
};
var inlinePedantic = {
  ...inlineNormal,
  link: edit(/^!?\[(label)\]\((.*?)\)/).replace("label", _inlineLabel).getRegex(),
  reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", _inlineLabel).getRegex()
};
var inlineGfm = {
  ...inlineNormal,
  emStrongRDelimAst: emStrongRDelimAstGfm,
  emStrongLDelim: emStrongLDelimGfm,
  url: edit(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, "i").replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),
  _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
  del: /^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,
  text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
};
var inlineBreaks = {
  ...inlineGfm,
  br: edit(br).replace("{2,}", "*").getRegex(),
  text: edit(inlineGfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
};
var block = {
  normal: blockNormal,
  gfm: blockGfm,
  pedantic: blockPedantic
};
var inline = {
  normal: inlineNormal,
  gfm: inlineGfm,
  breaks: inlineBreaks,
  pedantic: inlinePedantic
};
var escapeReplacements = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
var getEscapeReplacement = (ch) => escapeReplacements[ch];
function escape2(html22, encode) {
  if (encode) {
    if (other.escapeTest.test(html22)) {
      return html22.replace(other.escapeReplace, getEscapeReplacement);
    }
  } else {
    if (other.escapeTestNoEncode.test(html22)) {
      return html22.replace(other.escapeReplaceNoEncode, getEscapeReplacement);
    }
  }
  return html22;
}
function cleanUrl(href) {
  try {
    href = encodeURI(href).replace(other.percentDecode, "%");
  } catch {
    return null;
  }
  return href;
}
function splitCells(tableRow, count3) {
  const row = tableRow.replace(other.findPipe, (match, offset, str) => {
    let escaped = false;
    let curr = offset;
    while (--curr >= 0 && str[curr] === "\\") escaped = !escaped;
    if (escaped) {
      return "|";
    } else {
      return " |";
    }
  }), cells = row.split(other.splitPipe);
  let i = 0;
  if (!cells[0].trim()) {
    cells.shift();
  }
  if (cells.length > 0 && !cells.at(-1)?.trim()) {
    cells.pop();
  }
  if (count3) {
    if (cells.length > count3) {
      cells.splice(count3);
    } else {
      while (cells.length < count3) cells.push("");
    }
  }
  for (; i < cells.length; i++) {
    cells[i] = cells[i].trim().replace(other.slashPipe, "|");
  }
  return cells;
}
function rtrim(str, c, invert) {
  const l = str.length;
  if (l === 0) {
    return "";
  }
  let suffLen = 0;
  while (suffLen < l) {
    const currChar = str.charAt(l - suffLen - 1);
    if (currChar === c && !invert) {
      suffLen++;
    } else if (currChar !== c && invert) {
      suffLen++;
    } else {
      break;
    }
  }
  return str.slice(0, l - suffLen);
}
function findClosingBracket(str, b) {
  if (str.indexOf(b[1]) === -1) {
    return -1;
  }
  let level = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\") {
      i++;
    } else if (str[i] === b[0]) {
      level++;
    } else if (str[i] === b[1]) {
      level--;
      if (level < 0) {
        return i;
      }
    }
  }
  if (level > 0) {
    return -2;
  }
  return -1;
}
function outputLink(cap, link2, raw, lexer2, rules) {
  const href = link2.href;
  const title = link2.title || null;
  const text2 = cap[1].replace(rules.other.outputLinkReplace, "$1");
  lexer2.state.inLink = true;
  const token = {
    type: cap[0].charAt(0) === "!" ? "image" : "link",
    raw,
    href,
    title,
    text: text2,
    tokens: lexer2.inlineTokens(text2)
  };
  lexer2.state.inLink = false;
  return token;
}
function indentCodeCompensation(raw, text2, rules) {
  const matchIndentToCode = raw.match(rules.other.indentCodeCompensation);
  if (matchIndentToCode === null) {
    return text2;
  }
  const indentToCode = matchIndentToCode[1];
  return text2.split("\n").map((node) => {
    const matchIndentInNode = node.match(rules.other.beginningSpace);
    if (matchIndentInNode === null) {
      return node;
    }
    const [indentInNode] = matchIndentInNode;
    if (indentInNode.length >= indentToCode.length) {
      return node.slice(indentToCode.length);
    }
    return node;
  }).join("\n");
}
var _Tokenizer = class {
  options;
  rules;
  // set by the lexer
  lexer;
  // set by the lexer
  constructor(options2) {
    this.options = options2 || _defaults;
  }
  space(src) {
    const cap = this.rules.block.newline.exec(src);
    if (cap && cap[0].length > 0) {
      return {
        type: "space",
        raw: cap[0]
      };
    }
  }
  code(src) {
    const cap = this.rules.block.code.exec(src);
    if (cap) {
      const text2 = cap[0].replace(this.rules.other.codeRemoveIndent, "");
      return {
        type: "code",
        raw: cap[0],
        codeBlockStyle: "indented",
        text: !this.options.pedantic ? rtrim(text2, "\n") : text2
      };
    }
  }
  fences(src) {
    const cap = this.rules.block.fences.exec(src);
    if (cap) {
      const raw = cap[0];
      const text2 = indentCodeCompensation(raw, cap[3] || "", this.rules);
      return {
        type: "code",
        raw,
        lang: cap[2] ? cap[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : cap[2],
        text: text2
      };
    }
  }
  heading(src) {
    const cap = this.rules.block.heading.exec(src);
    if (cap) {
      let text2 = cap[2].trim();
      if (this.rules.other.endingHash.test(text2)) {
        const trimmed = rtrim(text2, "#");
        if (this.options.pedantic) {
          text2 = trimmed.trim();
        } else if (!trimmed || this.rules.other.endingSpaceChar.test(trimmed)) {
          text2 = trimmed.trim();
        }
      }
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[1].length,
        text: text2,
        tokens: this.lexer.inline(text2)
      };
    }
  }
  hr(src) {
    const cap = this.rules.block.hr.exec(src);
    if (cap) {
      return {
        type: "hr",
        raw: rtrim(cap[0], "\n")
      };
    }
  }
  blockquote(src) {
    const cap = this.rules.block.blockquote.exec(src);
    if (cap) {
      let lines = rtrim(cap[0], "\n").split("\n");
      let raw = "";
      let text2 = "";
      const tokens = [];
      while (lines.length > 0) {
        let inBlockquote = false;
        const currentLines = [];
        let i;
        for (i = 0; i < lines.length; i++) {
          if (this.rules.other.blockquoteStart.test(lines[i])) {
            currentLines.push(lines[i]);
            inBlockquote = true;
          } else if (!inBlockquote) {
            currentLines.push(lines[i]);
          } else {
            break;
          }
        }
        lines = lines.slice(i);
        const currentRaw = currentLines.join("\n");
        const currentText = currentRaw.replace(this.rules.other.blockquoteSetextReplace, "\n    $1").replace(this.rules.other.blockquoteSetextReplace2, "");
        raw = raw ? `${raw}
${currentRaw}` : currentRaw;
        text2 = text2 ? `${text2}
${currentText}` : currentText;
        const top = this.lexer.state.top;
        this.lexer.state.top = true;
        this.lexer.blockTokens(currentText, tokens, true);
        this.lexer.state.top = top;
        if (lines.length === 0) {
          break;
        }
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "code") {
          break;
        } else if (lastToken?.type === "blockquote") {
          const oldToken = lastToken;
          const newText = oldToken.raw + "\n" + lines.join("\n");
          const newToken = this.blockquote(newText);
          tokens[tokens.length - 1] = newToken;
          raw = raw.substring(0, raw.length - oldToken.raw.length) + newToken.raw;
          text2 = text2.substring(0, text2.length - oldToken.text.length) + newToken.text;
          break;
        } else if (lastToken?.type === "list") {
          const oldToken = lastToken;
          const newText = oldToken.raw + "\n" + lines.join("\n");
          const newToken = this.list(newText);
          tokens[tokens.length - 1] = newToken;
          raw = raw.substring(0, raw.length - lastToken.raw.length) + newToken.raw;
          text2 = text2.substring(0, text2.length - oldToken.raw.length) + newToken.raw;
          lines = newText.substring(tokens.at(-1).raw.length).split("\n");
          continue;
        }
      }
      return {
        type: "blockquote",
        raw,
        tokens,
        text: text2
      };
    }
  }
  list(src) {
    let cap = this.rules.block.list.exec(src);
    if (cap) {
      let bull = cap[1].trim();
      const isordered = bull.length > 1;
      const list2 = {
        type: "list",
        raw: "",
        ordered: isordered,
        start: isordered ? +bull.slice(0, -1) : "",
        loose: false,
        items: []
      };
      bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
      if (this.options.pedantic) {
        bull = isordered ? bull : "[*+-]";
      }
      const itemRegex = this.rules.other.listItemRegex(bull);
      let endsWithBlankLine = false;
      while (src) {
        let endEarly = false;
        let raw = "";
        let itemContents = "";
        if (!(cap = itemRegex.exec(src))) {
          break;
        }
        if (this.rules.block.hr.test(src)) {
          break;
        }
        raw = cap[0];
        src = src.substring(raw.length);
        let line = cap[2].split("\n", 1)[0].replace(this.rules.other.listReplaceTabs, (t) => " ".repeat(3 * t.length));
        let nextLine = src.split("\n", 1)[0];
        let blankLine = !line.trim();
        let indent = 0;
        if (this.options.pedantic) {
          indent = 2;
          itemContents = line.trimStart();
        } else if (blankLine) {
          indent = cap[1].length + 1;
        } else {
          indent = cap[2].search(this.rules.other.nonSpaceChar);
          indent = indent > 4 ? 1 : indent;
          itemContents = line.slice(indent);
          indent += cap[1].length;
        }
        if (blankLine && this.rules.other.blankLine.test(nextLine)) {
          raw += nextLine + "\n";
          src = src.substring(nextLine.length + 1);
          endEarly = true;
        }
        if (!endEarly) {
          const nextBulletRegex = this.rules.other.nextBulletRegex(indent);
          const hrRegex = this.rules.other.hrRegex(indent);
          const fencesBeginRegex = this.rules.other.fencesBeginRegex(indent);
          const headingBeginRegex = this.rules.other.headingBeginRegex(indent);
          const htmlBeginRegex = this.rules.other.htmlBeginRegex(indent);
          while (src) {
            const rawLine = src.split("\n", 1)[0];
            let nextLineWithoutTabs;
            nextLine = rawLine;
            if (this.options.pedantic) {
              nextLine = nextLine.replace(this.rules.other.listReplaceNesting, "  ");
              nextLineWithoutTabs = nextLine;
            } else {
              nextLineWithoutTabs = nextLine.replace(this.rules.other.tabCharGlobal, "    ");
            }
            if (fencesBeginRegex.test(nextLine)) {
              break;
            }
            if (headingBeginRegex.test(nextLine)) {
              break;
            }
            if (htmlBeginRegex.test(nextLine)) {
              break;
            }
            if (nextBulletRegex.test(nextLine)) {
              break;
            }
            if (hrRegex.test(nextLine)) {
              break;
            }
            if (nextLineWithoutTabs.search(this.rules.other.nonSpaceChar) >= indent || !nextLine.trim()) {
              itemContents += "\n" + nextLineWithoutTabs.slice(indent);
            } else {
              if (blankLine) {
                break;
              }
              if (line.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4) {
                break;
              }
              if (fencesBeginRegex.test(line)) {
                break;
              }
              if (headingBeginRegex.test(line)) {
                break;
              }
              if (hrRegex.test(line)) {
                break;
              }
              itemContents += "\n" + nextLine;
            }
            if (!blankLine && !nextLine.trim()) {
              blankLine = true;
            }
            raw += rawLine + "\n";
            src = src.substring(rawLine.length + 1);
            line = nextLineWithoutTabs.slice(indent);
          }
        }
        if (!list2.loose) {
          if (endsWithBlankLine) {
            list2.loose = true;
          } else if (this.rules.other.doubleBlankLine.test(raw)) {
            endsWithBlankLine = true;
          }
        }
        let istask = null;
        let ischecked;
        if (this.options.gfm) {
          istask = this.rules.other.listIsTask.exec(itemContents);
          if (istask) {
            ischecked = istask[0] !== "[ ] ";
            itemContents = itemContents.replace(this.rules.other.listReplaceTask, "");
          }
        }
        list2.items.push({
          type: "list_item",
          raw,
          task: !!istask,
          checked: ischecked,
          loose: false,
          text: itemContents,
          tokens: []
        });
        list2.raw += raw;
      }
      const lastItem = list2.items.at(-1);
      if (lastItem) {
        lastItem.raw = lastItem.raw.trimEnd();
        lastItem.text = lastItem.text.trimEnd();
      } else {
        return;
      }
      list2.raw = list2.raw.trimEnd();
      for (let i = 0; i < list2.items.length; i++) {
        this.lexer.state.top = false;
        list2.items[i].tokens = this.lexer.blockTokens(list2.items[i].text, []);
        if (!list2.loose) {
          const spacers = list2.items[i].tokens.filter((t) => t.type === "space");
          const hasMultipleLineBreaks = spacers.length > 0 && spacers.some((t) => this.rules.other.anyLine.test(t.raw));
          list2.loose = hasMultipleLineBreaks;
        }
      }
      if (list2.loose) {
        for (let i = 0; i < list2.items.length; i++) {
          list2.items[i].loose = true;
        }
      }
      return list2;
    }
  }
  html(src) {
    const cap = this.rules.block.html.exec(src);
    if (cap) {
      const token = {
        type: "html",
        block: true,
        raw: cap[0],
        pre: cap[1] === "pre" || cap[1] === "script" || cap[1] === "style",
        text: cap[0]
      };
      return token;
    }
  }
  def(src) {
    const cap = this.rules.block.def.exec(src);
    if (cap) {
      const tag2 = cap[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " ");
      const href = cap[2] ? cap[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "";
      const title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : cap[3];
      return {
        type: "def",
        tag: tag2,
        raw: cap[0],
        href,
        title
      };
    }
  }
  table(src) {
    const cap = this.rules.block.table.exec(src);
    if (!cap) {
      return;
    }
    if (!this.rules.other.tableDelimiter.test(cap[2])) {
      return;
    }
    const headers = splitCells(cap[1]);
    const aligns = cap[2].replace(this.rules.other.tableAlignChars, "").split("|");
    const rows = cap[3]?.trim() ? cap[3].replace(this.rules.other.tableRowBlankLine, "").split("\n") : [];
    const item = {
      type: "table",
      raw: cap[0],
      header: [],
      align: [],
      rows: []
    };
    if (headers.length !== aligns.length) {
      return;
    }
    for (const align of aligns) {
      if (this.rules.other.tableAlignRight.test(align)) {
        item.align.push("right");
      } else if (this.rules.other.tableAlignCenter.test(align)) {
        item.align.push("center");
      } else if (this.rules.other.tableAlignLeft.test(align)) {
        item.align.push("left");
      } else {
        item.align.push(null);
      }
    }
    for (let i = 0; i < headers.length; i++) {
      item.header.push({
        text: headers[i],
        tokens: this.lexer.inline(headers[i]),
        header: true,
        align: item.align[i]
      });
    }
    for (const row of rows) {
      item.rows.push(splitCells(row, item.header.length).map((cell, i) => {
        return {
          text: cell,
          tokens: this.lexer.inline(cell),
          header: false,
          align: item.align[i]
        };
      }));
    }
    return item;
  }
  lheading(src) {
    const cap = this.rules.block.lheading.exec(src);
    if (cap) {
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[2].charAt(0) === "=" ? 1 : 2,
        text: cap[1],
        tokens: this.lexer.inline(cap[1])
      };
    }
  }
  paragraph(src) {
    const cap = this.rules.block.paragraph.exec(src);
    if (cap) {
      const text2 = cap[1].charAt(cap[1].length - 1) === "\n" ? cap[1].slice(0, -1) : cap[1];
      return {
        type: "paragraph",
        raw: cap[0],
        text: text2,
        tokens: this.lexer.inline(text2)
      };
    }
  }
  text(src) {
    const cap = this.rules.block.text.exec(src);
    if (cap) {
      return {
        type: "text",
        raw: cap[0],
        text: cap[0],
        tokens: this.lexer.inline(cap[0])
      };
    }
  }
  escape(src) {
    const cap = this.rules.inline.escape.exec(src);
    if (cap) {
      return {
        type: "escape",
        raw: cap[0],
        text: cap[1]
      };
    }
  }
  tag(src) {
    const cap = this.rules.inline.tag.exec(src);
    if (cap) {
      if (!this.lexer.state.inLink && this.rules.other.startATag.test(cap[0])) {
        this.lexer.state.inLink = true;
      } else if (this.lexer.state.inLink && this.rules.other.endATag.test(cap[0])) {
        this.lexer.state.inLink = false;
      }
      if (!this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(cap[0])) {
        this.lexer.state.inRawBlock = true;
      } else if (this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(cap[0])) {
        this.lexer.state.inRawBlock = false;
      }
      return {
        type: "html",
        raw: cap[0],
        inLink: this.lexer.state.inLink,
        inRawBlock: this.lexer.state.inRawBlock,
        block: false,
        text: cap[0]
      };
    }
  }
  link(src) {
    const cap = this.rules.inline.link.exec(src);
    if (cap) {
      const trimmedUrl = cap[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(trimmedUrl)) {
        if (!this.rules.other.endAngleBracket.test(trimmedUrl)) {
          return;
        }
        const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), "\\");
        if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
          return;
        }
      } else {
        const lastParenIndex = findClosingBracket(cap[2], "()");
        if (lastParenIndex === -2) {
          return;
        }
        if (lastParenIndex > -1) {
          const start = cap[0].indexOf("!") === 0 ? 5 : 4;
          const linkLen = start + cap[1].length + lastParenIndex;
          cap[2] = cap[2].substring(0, lastParenIndex);
          cap[0] = cap[0].substring(0, linkLen).trim();
          cap[3] = "";
        }
      }
      let href = cap[2];
      let title = "";
      if (this.options.pedantic) {
        const link2 = this.rules.other.pedanticHrefTitle.exec(href);
        if (link2) {
          href = link2[1];
          title = link2[3];
        }
      } else {
        title = cap[3] ? cap[3].slice(1, -1) : "";
      }
      href = href.trim();
      if (this.rules.other.startAngleBracket.test(href)) {
        if (this.options.pedantic && !this.rules.other.endAngleBracket.test(trimmedUrl)) {
          href = href.slice(1);
        } else {
          href = href.slice(1, -1);
        }
      }
      return outputLink(cap, {
        href: href ? href.replace(this.rules.inline.anyPunctuation, "$1") : href,
        title: title ? title.replace(this.rules.inline.anyPunctuation, "$1") : title
      }, cap[0], this.lexer, this.rules);
    }
  }
  reflink(src, links) {
    let cap;
    if ((cap = this.rules.inline.reflink.exec(src)) || (cap = this.rules.inline.nolink.exec(src))) {
      const linkString = (cap[2] || cap[1]).replace(this.rules.other.multipleSpaceGlobal, " ");
      const link2 = links[linkString.toLowerCase()];
      if (!link2) {
        const text2 = cap[0].charAt(0);
        return {
          type: "text",
          raw: text2,
          text: text2
        };
      }
      return outputLink(cap, link2, cap[0], this.lexer, this.rules);
    }
  }
  emStrong(src, maskedSrc, prevChar = "") {
    let match = this.rules.inline.emStrongLDelim.exec(src);
    if (!match) return;
    if (match[3] && prevChar.match(this.rules.other.unicodeAlphaNumeric)) return;
    const nextChar = match[1] || match[2] || "";
    if (!nextChar || !prevChar || this.rules.inline.punctuation.exec(prevChar)) {
      const lLength = [...match[0]].length - 1;
      let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
      const endReg = match[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      endReg.lastIndex = 0;
      maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
      while ((match = endReg.exec(maskedSrc)) != null) {
        rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
        if (!rDelim) continue;
        rLength = [...rDelim].length;
        if (match[3] || match[4]) {
          delimTotal += rLength;
          continue;
        } else if (match[5] || match[6]) {
          if (lLength % 3 && !((lLength + rLength) % 3)) {
            midDelimTotal += rLength;
            continue;
          }
        }
        delimTotal -= rLength;
        if (delimTotal > 0) continue;
        rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
        const lastCharLength = [...match[0]][0].length;
        const raw = src.slice(0, lLength + match.index + lastCharLength + rLength);
        if (Math.min(lLength, rLength) % 2) {
          const text22 = raw.slice(1, -1);
          return {
            type: "em",
            raw,
            text: text22,
            tokens: this.lexer.inlineTokens(text22)
          };
        }
        const text2 = raw.slice(2, -2);
        return {
          type: "strong",
          raw,
          text: text2,
          tokens: this.lexer.inlineTokens(text2)
        };
      }
    }
  }
  codespan(src) {
    const cap = this.rules.inline.code.exec(src);
    if (cap) {
      let text2 = cap[2].replace(this.rules.other.newLineCharGlobal, " ");
      const hasNonSpaceChars = this.rules.other.nonSpaceChar.test(text2);
      const hasSpaceCharsOnBothEnds = this.rules.other.startingSpaceChar.test(text2) && this.rules.other.endingSpaceChar.test(text2);
      if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
        text2 = text2.substring(1, text2.length - 1);
      }
      return {
        type: "codespan",
        raw: cap[0],
        text: text2
      };
    }
  }
  br(src) {
    const cap = this.rules.inline.br.exec(src);
    if (cap) {
      return {
        type: "br",
        raw: cap[0]
      };
    }
  }
  del(src) {
    const cap = this.rules.inline.del.exec(src);
    if (cap) {
      return {
        type: "del",
        raw: cap[0],
        text: cap[2],
        tokens: this.lexer.inlineTokens(cap[2])
      };
    }
  }
  autolink(src) {
    const cap = this.rules.inline.autolink.exec(src);
    if (cap) {
      let text2, href;
      if (cap[2] === "@") {
        text2 = cap[1];
        href = "mailto:" + text2;
      } else {
        text2 = cap[1];
        href = text2;
      }
      return {
        type: "link",
        raw: cap[0],
        text: text2,
        href,
        tokens: [
          {
            type: "text",
            raw: text2,
            text: text2
          }
        ]
      };
    }
  }
  url(src) {
    let cap;
    if (cap = this.rules.inline.url.exec(src)) {
      let text2, href;
      if (cap[2] === "@") {
        text2 = cap[0];
        href = "mailto:" + text2;
      } else {
        let prevCapZero;
        do {
          prevCapZero = cap[0];
          cap[0] = this.rules.inline._backpedal.exec(cap[0])?.[0] ?? "";
        } while (prevCapZero !== cap[0]);
        text2 = cap[0];
        if (cap[1] === "www.") {
          href = "http://" + cap[0];
        } else {
          href = cap[0];
        }
      }
      return {
        type: "link",
        raw: cap[0],
        text: text2,
        href,
        tokens: [
          {
            type: "text",
            raw: text2,
            text: text2
          }
        ]
      };
    }
  }
  inlineText(src) {
    const cap = this.rules.inline.text.exec(src);
    if (cap) {
      const escaped = this.lexer.state.inRawBlock;
      return {
        type: "text",
        raw: cap[0],
        text: cap[0],
        escaped
      };
    }
  }
};
var _Lexer = class __Lexer {
  tokens;
  options;
  state;
  tokenizer;
  inlineQueue;
  constructor(options2) {
    this.tokens = [];
    this.tokens.links = /* @__PURE__ */ Object.create(null);
    this.options = options2 || _defaults;
    this.options.tokenizer = this.options.tokenizer || new _Tokenizer();
    this.tokenizer = this.options.tokenizer;
    this.tokenizer.options = this.options;
    this.tokenizer.lexer = this;
    this.inlineQueue = [];
    this.state = {
      inLink: false,
      inRawBlock: false,
      top: true
    };
    const rules = {
      other,
      block: block.normal,
      inline: inline.normal
    };
    if (this.options.pedantic) {
      rules.block = block.pedantic;
      rules.inline = inline.pedantic;
    } else if (this.options.gfm) {
      rules.block = block.gfm;
      if (this.options.breaks) {
        rules.inline = inline.breaks;
      } else {
        rules.inline = inline.gfm;
      }
    }
    this.tokenizer.rules = rules;
  }
  /**
   * Expose Rules
   */
  static get rules() {
    return {
      block,
      inline
    };
  }
  /**
   * Static Lex Method
   */
  static lex(src, options2) {
    const lexer2 = new __Lexer(options2);
    return lexer2.lex(src);
  }
  /**
   * Static Lex Inline Method
   */
  static lexInline(src, options2) {
    const lexer2 = new __Lexer(options2);
    return lexer2.inlineTokens(src);
  }
  /**
   * Preprocessing
   */
  lex(src) {
    src = src.replace(other.carriageReturn, "\n");
    this.blockTokens(src, this.tokens);
    for (let i = 0; i < this.inlineQueue.length; i++) {
      const next = this.inlineQueue[i];
      this.inlineTokens(next.src, next.tokens);
    }
    this.inlineQueue = [];
    return this.tokens;
  }
  blockTokens(src, tokens = [], lastParagraphClipped = false) {
    if (this.options.pedantic) {
      src = src.replace(other.tabCharGlobal, "    ").replace(other.spaceLine, "");
    }
    while (src) {
      let token;
      if (this.options.extensions?.block?.some((extTokenizer) => {
        if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token = this.tokenizer.space(src)) {
        src = src.substring(token.raw.length);
        const lastToken = tokens.at(-1);
        if (token.raw.length === 1 && lastToken !== void 0) {
          lastToken.raw += "\n";
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.code(src)) {
        src = src.substring(token.raw.length);
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "paragraph" || lastToken?.type === "text") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.at(-1).src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.fences(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.heading(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.hr(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.blockquote(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.list(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.html(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.def(src)) {
        src = src.substring(token.raw.length);
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "paragraph" || lastToken?.type === "text") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.raw;
          this.inlineQueue.at(-1).src = lastToken.text;
        } else if (!this.tokens.links[token.tag]) {
          this.tokens.links[token.tag] = {
            href: token.href,
            title: token.title
          };
        }
        continue;
      }
      if (token = this.tokenizer.table(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.lheading(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      let cutSrc = src;
      if (this.options.extensions?.startBlock) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startBlock.forEach((getStartIndex) => {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
        const lastToken = tokens.at(-1);
        if (lastParagraphClipped && lastToken?.type === "paragraph") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.pop();
          this.inlineQueue.at(-1).src = lastToken.text;
        } else {
          tokens.push(token);
        }
        lastParagraphClipped = cutSrc.length !== src.length;
        src = src.substring(token.raw.length);
        continue;
      }
      if (token = this.tokenizer.text(src)) {
        src = src.substring(token.raw.length);
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "text") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.pop();
          this.inlineQueue.at(-1).src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    this.state.top = true;
    return tokens;
  }
  inline(src, tokens = []) {
    this.inlineQueue.push({ src, tokens });
    return tokens;
  }
  /**
   * Lexing/Compiling
   */
  inlineTokens(src, tokens = []) {
    let maskedSrc = src;
    let match = null;
    if (this.tokens.links) {
      const links = Object.keys(this.tokens.links);
      if (links.length > 0) {
        while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
          if (links.includes(match[0].slice(match[0].lastIndexOf("[") + 1, -1))) {
            maskedSrc = maskedSrc.slice(0, match.index) + "[" + "a".repeat(match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
          }
        }
      }
    }
    while ((match = this.tokenizer.rules.inline.anyPunctuation.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index) + "++" + maskedSrc.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    }
    while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index) + "[" + "a".repeat(match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    }
    let keepPrevChar = false;
    let prevChar = "";
    while (src) {
      if (!keepPrevChar) {
        prevChar = "";
      }
      keepPrevChar = false;
      let token;
      if (this.options.extensions?.inline?.some((extTokenizer) => {
        if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token = this.tokenizer.escape(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.tag(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.link(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.reflink(src, this.tokens.links)) {
        src = src.substring(token.raw.length);
        const lastToken = tokens.at(-1);
        if (token.type === "text" && lastToken?.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.codespan(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.br(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.del(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.autolink(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (!this.state.inLink && (token = this.tokenizer.url(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      let cutSrc = src;
      if (this.options.extensions?.startInline) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startInline.forEach((getStartIndex) => {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (token = this.tokenizer.inlineText(cutSrc)) {
        src = src.substring(token.raw.length);
        if (token.raw.slice(-1) !== "_") {
          prevChar = token.raw.slice(-1);
        }
        keepPrevChar = true;
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    return tokens;
  }
};
var _Renderer = class {
  options;
  parser;
  // set by the parser
  constructor(options2) {
    this.options = options2 || _defaults;
  }
  space(token) {
    return "";
  }
  code({ text: text2, lang, escaped }) {
    const langString = (lang || "").match(other.notSpaceStart)?.[0];
    const code = text2.replace(other.endingNewline, "") + "\n";
    if (!langString) {
      return "<pre><code>" + (escaped ? code : escape2(code, true)) + "</code></pre>\n";
    }
    return '<pre><code class="language-' + escape2(langString) + '">' + (escaped ? code : escape2(code, true)) + "</code></pre>\n";
  }
  blockquote({ tokens }) {
    const body = this.parser.parse(tokens);
    return `<blockquote>
${body}</blockquote>
`;
  }
  html({ text: text2 }) {
    return text2;
  }
  heading({ tokens, depth }) {
    return `<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>
`;
  }
  hr(token) {
    return "<hr>\n";
  }
  list(token) {
    const ordered = token.ordered;
    const start = token.start;
    let body = "";
    for (let j = 0; j < token.items.length; j++) {
      const item = token.items[j];
      body += this.listitem(item);
    }
    const type = ordered ? "ol" : "ul";
    const startAttr = ordered && start !== 1 ? ' start="' + start + '"' : "";
    return "<" + type + startAttr + ">\n" + body + "</" + type + ">\n";
  }
  listitem(item) {
    let itemBody = "";
    if (item.task) {
      const checkbox = this.checkbox({ checked: !!item.checked });
      if (item.loose) {
        if (item.tokens[0]?.type === "paragraph") {
          item.tokens[0].text = checkbox + " " + item.tokens[0].text;
          if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === "text") {
            item.tokens[0].tokens[0].text = checkbox + " " + escape2(item.tokens[0].tokens[0].text);
            item.tokens[0].tokens[0].escaped = true;
          }
        } else {
          item.tokens.unshift({
            type: "text",
            raw: checkbox + " ",
            text: checkbox + " ",
            escaped: true
          });
        }
      } else {
        itemBody += checkbox + " ";
      }
    }
    itemBody += this.parser.parse(item.tokens, !!item.loose);
    return `<li>${itemBody}</li>
`;
  }
  checkbox({ checked }) {
    return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  paragraph({ tokens }) {
    return `<p>${this.parser.parseInline(tokens)}</p>
`;
  }
  table(token) {
    let header = "";
    let cell = "";
    for (let j = 0; j < token.header.length; j++) {
      cell += this.tablecell(token.header[j]);
    }
    header += this.tablerow({ text: cell });
    let body = "";
    for (let j = 0; j < token.rows.length; j++) {
      const row = token.rows[j];
      cell = "";
      for (let k = 0; k < row.length; k++) {
        cell += this.tablecell(row[k]);
      }
      body += this.tablerow({ text: cell });
    }
    if (body) body = `<tbody>${body}</tbody>`;
    return "<table>\n<thead>\n" + header + "</thead>\n" + body + "</table>\n";
  }
  tablerow({ text: text2 }) {
    return `<tr>
${text2}</tr>
`;
  }
  tablecell(token) {
    const content = this.parser.parseInline(token.tokens);
    const type = token.header ? "th" : "td";
    const tag2 = token.align ? `<${type} align="${token.align}">` : `<${type}>`;
    return tag2 + content + `</${type}>
`;
  }
  /**
   * span level renderer
   */
  strong({ tokens }) {
    return `<strong>${this.parser.parseInline(tokens)}</strong>`;
  }
  em({ tokens }) {
    return `<em>${this.parser.parseInline(tokens)}</em>`;
  }
  codespan({ text: text2 }) {
    return `<code>${escape2(text2, true)}</code>`;
  }
  br(token) {
    return "<br>";
  }
  del({ tokens }) {
    return `<del>${this.parser.parseInline(tokens)}</del>`;
  }
  link({ href, title, tokens }) {
    const text2 = this.parser.parseInline(tokens);
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return text2;
    }
    href = cleanHref;
    let out = '<a href="' + href + '"';
    if (title) {
      out += ' title="' + escape2(title) + '"';
    }
    out += ">" + text2 + "</a>";
    return out;
  }
  image({ href, title, text: text2, tokens }) {
    if (tokens) {
      text2 = this.parser.parseInline(tokens, this.parser.textRenderer);
    }
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return escape2(text2);
    }
    href = cleanHref;
    let out = `<img src="${href}" alt="${text2}"`;
    if (title) {
      out += ` title="${escape2(title)}"`;
    }
    out += ">";
    return out;
  }
  text(token) {
    return "tokens" in token && token.tokens ? this.parser.parseInline(token.tokens) : "escaped" in token && token.escaped ? token.text : escape2(token.text);
  }
};
var _TextRenderer = class {
  // no need for block level renderers
  strong({ text: text2 }) {
    return text2;
  }
  em({ text: text2 }) {
    return text2;
  }
  codespan({ text: text2 }) {
    return text2;
  }
  del({ text: text2 }) {
    return text2;
  }
  html({ text: text2 }) {
    return text2;
  }
  text({ text: text2 }) {
    return text2;
  }
  link({ text: text2 }) {
    return "" + text2;
  }
  image({ text: text2 }) {
    return "" + text2;
  }
  br() {
    return "";
  }
};
var _Parser = class __Parser {
  options;
  renderer;
  textRenderer;
  constructor(options2) {
    this.options = options2 || _defaults;
    this.options.renderer = this.options.renderer || new _Renderer();
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
    this.renderer.parser = this;
    this.textRenderer = new _TextRenderer();
  }
  /**
   * Static Parse Method
   */
  static parse(tokens, options2) {
    const parser2 = new __Parser(options2);
    return parser2.parse(tokens);
  }
  /**
   * Static Parse Inline Method
   */
  static parseInline(tokens, options2) {
    const parser2 = new __Parser(options2);
    return parser2.parseInline(tokens);
  }
  /**
   * Parse Loop
   */
  parse(tokens, top = true) {
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      const anyToken = tokens[i];
      if (this.options.extensions?.renderers?.[anyToken.type]) {
        const genericToken = anyToken;
        const ret = this.options.extensions.renderers[genericToken.type].call({ parser: this }, genericToken);
        if (ret !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(genericToken.type)) {
          out += ret || "";
          continue;
        }
      }
      const token = anyToken;
      switch (token.type) {
        case "space": {
          out += this.renderer.space(token);
          continue;
        }
        case "hr": {
          out += this.renderer.hr(token);
          continue;
        }
        case "heading": {
          out += this.renderer.heading(token);
          continue;
        }
        case "code": {
          out += this.renderer.code(token);
          continue;
        }
        case "table": {
          out += this.renderer.table(token);
          continue;
        }
        case "blockquote": {
          out += this.renderer.blockquote(token);
          continue;
        }
        case "list": {
          out += this.renderer.list(token);
          continue;
        }
        case "html": {
          out += this.renderer.html(token);
          continue;
        }
        case "paragraph": {
          out += this.renderer.paragraph(token);
          continue;
        }
        case "text": {
          let textToken = token;
          let body = this.renderer.text(textToken);
          while (i + 1 < tokens.length && tokens[i + 1].type === "text") {
            textToken = tokens[++i];
            body += "\n" + this.renderer.text(textToken);
          }
          if (top) {
            out += this.renderer.paragraph({
              type: "paragraph",
              raw: body,
              text: body,
              tokens: [{ type: "text", raw: body, text: body, escaped: true }]
            });
          } else {
            out += body;
          }
          continue;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return "";
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
  /**
   * Parse Inline Tokens
   */
  parseInline(tokens, renderer = this.renderer) {
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      const anyToken = tokens[i];
      if (this.options.extensions?.renderers?.[anyToken.type]) {
        const ret = this.options.extensions.renderers[anyToken.type].call({ parser: this }, anyToken);
        if (ret !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(anyToken.type)) {
          out += ret || "";
          continue;
        }
      }
      const token = anyToken;
      switch (token.type) {
        case "escape": {
          out += renderer.text(token);
          break;
        }
        case "html": {
          out += renderer.html(token);
          break;
        }
        case "link": {
          out += renderer.link(token);
          break;
        }
        case "image": {
          out += renderer.image(token);
          break;
        }
        case "strong": {
          out += renderer.strong(token);
          break;
        }
        case "em": {
          out += renderer.em(token);
          break;
        }
        case "codespan": {
          out += renderer.codespan(token);
          break;
        }
        case "br": {
          out += renderer.br(token);
          break;
        }
        case "del": {
          out += renderer.del(token);
          break;
        }
        case "text": {
          out += renderer.text(token);
          break;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return "";
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
};
var _Hooks = class {
  options;
  block;
  constructor(options2) {
    this.options = options2 || _defaults;
  }
  static passThroughHooks = /* @__PURE__ */ new Set([
    "preprocess",
    "postprocess",
    "processAllTokens"
  ]);
  /**
   * Process markdown before marked
   */
  preprocess(markdown) {
    return markdown;
  }
  /**
   * Process HTML after marked is finished
   */
  postprocess(html22) {
    return html22;
  }
  /**
   * Process all tokens before walk tokens
   */
  processAllTokens(tokens) {
    return tokens;
  }
  /**
   * Provide function to tokenize markdown
   */
  provideLexer() {
    return this.block ? _Lexer.lex : _Lexer.lexInline;
  }
  /**
   * Provide function to parse tokens
   */
  provideParser() {
    return this.block ? _Parser.parse : _Parser.parseInline;
  }
};
var Marked = class {
  defaults = _getDefaults();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = _Parser;
  Renderer = _Renderer;
  TextRenderer = _TextRenderer;
  Lexer = _Lexer;
  Tokenizer = _Tokenizer;
  Hooks = _Hooks;
  constructor(...args) {
    this.use(...args);
  }
  /**
   * Run callback for every token
   */
  walkTokens(tokens, callback) {
    let values = [];
    for (const token of tokens) {
      values = values.concat(callback.call(this, token));
      switch (token.type) {
        case "table": {
          const tableToken = token;
          for (const cell of tableToken.header) {
            values = values.concat(this.walkTokens(cell.tokens, callback));
          }
          for (const row of tableToken.rows) {
            for (const cell of row) {
              values = values.concat(this.walkTokens(cell.tokens, callback));
            }
          }
          break;
        }
        case "list": {
          const listToken = token;
          values = values.concat(this.walkTokens(listToken.items, callback));
          break;
        }
        default: {
          const genericToken = token;
          if (this.defaults.extensions?.childTokens?.[genericToken.type]) {
            this.defaults.extensions.childTokens[genericToken.type].forEach((childTokens) => {
              const tokens2 = genericToken[childTokens].flat(Infinity);
              values = values.concat(this.walkTokens(tokens2, callback));
            });
          } else if (genericToken.tokens) {
            values = values.concat(this.walkTokens(genericToken.tokens, callback));
          }
        }
      }
    }
    return values;
  }
  use(...args) {
    const extensions = this.defaults.extensions || { renderers: {}, childTokens: {} };
    args.forEach((pack) => {
      const opts = { ...pack };
      opts.async = this.defaults.async || opts.async || false;
      if (pack.extensions) {
        pack.extensions.forEach((ext) => {
          if (!ext.name) {
            throw new Error("extension name required");
          }
          if ("renderer" in ext) {
            const prevRenderer = extensions.renderers[ext.name];
            if (prevRenderer) {
              extensions.renderers[ext.name] = function(...args2) {
                let ret = ext.renderer.apply(this, args2);
                if (ret === false) {
                  ret = prevRenderer.apply(this, args2);
                }
                return ret;
              };
            } else {
              extensions.renderers[ext.name] = ext.renderer;
            }
          }
          if ("tokenizer" in ext) {
            if (!ext.level || ext.level !== "block" && ext.level !== "inline") {
              throw new Error("extension level must be 'block' or 'inline'");
            }
            const extLevel = extensions[ext.level];
            if (extLevel) {
              extLevel.unshift(ext.tokenizer);
            } else {
              extensions[ext.level] = [ext.tokenizer];
            }
            if (ext.start) {
              if (ext.level === "block") {
                if (extensions.startBlock) {
                  extensions.startBlock.push(ext.start);
                } else {
                  extensions.startBlock = [ext.start];
                }
              } else if (ext.level === "inline") {
                if (extensions.startInline) {
                  extensions.startInline.push(ext.start);
                } else {
                  extensions.startInline = [ext.start];
                }
              }
            }
          }
          if ("childTokens" in ext && ext.childTokens) {
            extensions.childTokens[ext.name] = ext.childTokens;
          }
        });
        opts.extensions = extensions;
      }
      if (pack.renderer) {
        const renderer = this.defaults.renderer || new _Renderer(this.defaults);
        for (const prop in pack.renderer) {
          if (!(prop in renderer)) {
            throw new Error(`renderer '${prop}' does not exist`);
          }
          if (["options", "parser"].includes(prop)) {
            continue;
          }
          const rendererProp = prop;
          const rendererFunc = pack.renderer[rendererProp];
          const prevRenderer = renderer[rendererProp];
          renderer[rendererProp] = (...args2) => {
            let ret = rendererFunc.apply(renderer, args2);
            if (ret === false) {
              ret = prevRenderer.apply(renderer, args2);
            }
            return ret || "";
          };
        }
        opts.renderer = renderer;
      }
      if (pack.tokenizer) {
        const tokenizer = this.defaults.tokenizer || new _Tokenizer(this.defaults);
        for (const prop in pack.tokenizer) {
          if (!(prop in tokenizer)) {
            throw new Error(`tokenizer '${prop}' does not exist`);
          }
          if (["options", "rules", "lexer"].includes(prop)) {
            continue;
          }
          const tokenizerProp = prop;
          const tokenizerFunc = pack.tokenizer[tokenizerProp];
          const prevTokenizer = tokenizer[tokenizerProp];
          tokenizer[tokenizerProp] = (...args2) => {
            let ret = tokenizerFunc.apply(tokenizer, args2);
            if (ret === false) {
              ret = prevTokenizer.apply(tokenizer, args2);
            }
            return ret;
          };
        }
        opts.tokenizer = tokenizer;
      }
      if (pack.hooks) {
        const hooks = this.defaults.hooks || new _Hooks();
        for (const prop in pack.hooks) {
          if (!(prop in hooks)) {
            throw new Error(`hook '${prop}' does not exist`);
          }
          if (["options", "block"].includes(prop)) {
            continue;
          }
          const hooksProp = prop;
          const hooksFunc = pack.hooks[hooksProp];
          const prevHook = hooks[hooksProp];
          if (_Hooks.passThroughHooks.has(prop)) {
            hooks[hooksProp] = (arg) => {
              if (this.defaults.async) {
                return Promise.resolve(hooksFunc.call(hooks, arg)).then((ret2) => {
                  return prevHook.call(hooks, ret2);
                });
              }
              const ret = hooksFunc.call(hooks, arg);
              return prevHook.call(hooks, ret);
            };
          } else {
            hooks[hooksProp] = (...args2) => {
              let ret = hooksFunc.apply(hooks, args2);
              if (ret === false) {
                ret = prevHook.apply(hooks, args2);
              }
              return ret;
            };
          }
        }
        opts.hooks = hooks;
      }
      if (pack.walkTokens) {
        const walkTokens2 = this.defaults.walkTokens;
        const packWalktokens = pack.walkTokens;
        opts.walkTokens = function(token) {
          let values = [];
          values.push(packWalktokens.call(this, token));
          if (walkTokens2) {
            values = values.concat(walkTokens2.call(this, token));
          }
          return values;
        };
      }
      this.defaults = { ...this.defaults, ...opts };
    });
    return this;
  }
  setOptions(opt) {
    this.defaults = { ...this.defaults, ...opt };
    return this;
  }
  lexer(src, options2) {
    return _Lexer.lex(src, options2 ?? this.defaults);
  }
  parser(tokens, options2) {
    return _Parser.parse(tokens, options2 ?? this.defaults);
  }
  parseMarkdown(blockType) {
    const parse2 = (src, options2) => {
      const origOpt = { ...options2 };
      const opt = { ...this.defaults, ...origOpt };
      const throwError = this.onError(!!opt.silent, !!opt.async);
      if (this.defaults.async === true && origOpt.async === false) {
        return throwError(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      }
      if (typeof src === "undefined" || src === null) {
        return throwError(new Error("marked(): input parameter is undefined or null"));
      }
      if (typeof src !== "string") {
        return throwError(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(src) + ", string expected"));
      }
      if (opt.hooks) {
        opt.hooks.options = opt;
        opt.hooks.block = blockType;
      }
      const lexer2 = opt.hooks ? opt.hooks.provideLexer() : blockType ? _Lexer.lex : _Lexer.lexInline;
      const parser2 = opt.hooks ? opt.hooks.provideParser() : blockType ? _Parser.parse : _Parser.parseInline;
      if (opt.async) {
        return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src).then((src2) => lexer2(src2, opt)).then((tokens) => opt.hooks ? opt.hooks.processAllTokens(tokens) : tokens).then((tokens) => opt.walkTokens ? Promise.all(this.walkTokens(tokens, opt.walkTokens)).then(() => tokens) : tokens).then((tokens) => parser2(tokens, opt)).then((html22) => opt.hooks ? opt.hooks.postprocess(html22) : html22).catch(throwError);
      }
      try {
        if (opt.hooks) {
          src = opt.hooks.preprocess(src);
        }
        let tokens = lexer2(src, opt);
        if (opt.hooks) {
          tokens = opt.hooks.processAllTokens(tokens);
        }
        if (opt.walkTokens) {
          this.walkTokens(tokens, opt.walkTokens);
        }
        let html22 = parser2(tokens, opt);
        if (opt.hooks) {
          html22 = opt.hooks.postprocess(html22);
        }
        return html22;
      } catch (e) {
        return throwError(e);
      }
    };
    return parse2;
  }
  onError(silent, async) {
    return (e) => {
      e.message += "\nPlease report this to https://github.com/markedjs/marked.";
      if (silent) {
        const msg = "<p>An error occurred:</p><pre>" + escape2(e.message + "", true) + "</pre>";
        if (async) {
          return Promise.resolve(msg);
        }
        return msg;
      }
      if (async) {
        return Promise.reject(e);
      }
      throw e;
    };
  }
};
var markedInstance = new Marked();
function marked(src, opt) {
  return markedInstance.parse(src, opt);
}
marked.options = marked.setOptions = function(options2) {
  markedInstance.setOptions(options2);
  marked.defaults = markedInstance.defaults;
  changeDefaults(marked.defaults);
  return marked;
};
marked.getDefaults = _getDefaults;
marked.defaults = _defaults;
marked.use = function(...args) {
  markedInstance.use(...args);
  marked.defaults = markedInstance.defaults;
  changeDefaults(marked.defaults);
  return marked;
};
marked.walkTokens = function(tokens, callback) {
  return markedInstance.walkTokens(tokens, callback);
};
marked.parseInline = markedInstance.parseInline;
marked.Parser = _Parser;
marked.parser = _Parser.parse;
marked.Renderer = _Renderer;
marked.TextRenderer = _TextRenderer;
marked.Lexer = _Lexer;
marked.lexer = _Lexer.lex;
marked.Tokenizer = _Tokenizer;
marked.Hooks = _Hooks;
marked.parse = marked;
var options = marked.options;
var setOptions = marked.setOptions;
var use2 = marked.use;
var walkTokens = marked.walkTokens;
var parseInline = marked.parseInline;
var parser = _Parser.parse;
var lexer = _Lexer.lex;

// ../../node_modules/.pnpm/@ant-design+x-markdown@2.9._a775707fb3dd5b8f608e56bd9e660169/node_modules/@ant-design/x-markdown/es/XMarkdown/core/Parser.js
var other2 = {
  escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
  escapeTest: /[&<>"'/]/,
  notSpaceStart: /^\S*/,
  endingNewline: /\n$/,
  escapeReplace: /[&<>"'/]/g,
  escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  completeFencedCode: /^ {0,3}(`{3,}|~{3,})([\s\S]*?)\n {0,3}\1[ \n\t]*$/
};
var escapeReplacements2 = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;"
};
var getEscapeReplacement2 = (ch) => escapeReplacements2[ch];
function escapeHtml(html3, encode) {
  if (encode) {
    if (other2.escapeTest.test(html3)) {
      return html3.replace(other2.escapeReplace, getEscapeReplacement2);
    }
  } else {
    if (other2.escapeTestNoEncode.test(html3)) {
      return html3.replace(other2.escapeReplaceNoEncode, getEscapeReplacement2);
    }
  }
  return html3;
}
var TAIL_MARKER = /* @__PURE__ */ Symbol("tailMarker");
var PLACEHOLDER_PREFIX = "X_MD_NL_";
var PLACEHOLDER_SUFFIX = "";
var PLACEHOLDER_REGEX = /\uE000X_MD_NL_\d+\uE001/g;
var Parser = class {
  options;
  markdownInstance;
  injectTail = false;
  constructor(options2 = {}) {
    this.options = options2;
    this.markdownInstance = new Marked();
    this.configureLinkRenderer();
    this.configureParagraphRenderer();
    this.configureCodeRenderer();
    this.configureHtmlEscapeRenderer();
    this.configureTailInjection();
    this.markdownInstance.use(options2.markedConfig || {});
  }
  configureHtmlEscapeRenderer() {
    if (!this.options.escapeRawHtml) return;
    this.markdownInstance.use({
      renderer: {
        html(token) {
          const {
            raw = "",
            text: text2 = ""
          } = token;
          return escapeHtml(raw || text2, true);
        }
      }
    });
  }
  configureLinkRenderer() {
    if (!this.options.openLinksInNewTab) return;
    this.markdownInstance.use({
      renderer: {
        link({
          href,
          title,
          tokens
        }) {
          const text2 = this.parser.parseInline(tokens);
          const titleAttr = title ? ` title="${title}"` : "";
          return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text2}</a>`;
        }
      }
    });
  }
  configureParagraphRenderer() {
    const {
      paragraphTag
    } = this.options;
    if (!paragraphTag) return;
    this.markdownInstance.use({
      renderer: {
        paragraph({
          tokens
        }) {
          return `<${paragraphTag}>${this.parser.parseInline(tokens)}</${paragraphTag}>
`;
        }
      }
    });
  }
  configureCodeRenderer() {
    this.markdownInstance.use({
      renderer: {
        code({
          text: text2,
          raw,
          lang,
          escaped,
          codeBlockStyle
        }) {
          const infoString = (lang || "").trim();
          const langString = infoString.match(other2.notSpaceStart)?.[0];
          const code = `${text2.replace(other2.endingNewline, "")}
`;
          const isIndentedCode = codeBlockStyle === "indented";
          const streamStatus = isIndentedCode || other2.completeFencedCode.test(raw) ? "done" : "loading";
          const escapedCode = escaped ? code : escapeHtml(code, true);
          const classAttr = langString ? ` class="language-${escapeHtml(langString)}"` : "";
          const dataAttrs = ` data-block="true" data-state="${streamStatus}"` + (infoString ? ` data-lang="${escapeHtml(infoString)}"` : "");
          return `<pre><code${dataAttrs}${classAttr}>${escapedCode}</code></pre>
`;
        }
      }
    });
  }
  configureTailInjection() {
    const parser2 = this;
    this.markdownInstance.use({
      hooks: {
        processAllTokens(tokens) {
          if (!parser2.injectTail) return tokens;
          const lastTextToken = parser2.findLastTextToken(tokens);
          if (lastTextToken) {
            lastTextToken[TAIL_MARKER] = true;
          }
          return tokens;
        }
      },
      renderer: {
        text(token) {
          const text2 = "tokens" in token && token.tokens ? this.parser.parseInline(token.tokens) : "text" in token ? token.text : "";
          if (token[TAIL_MARKER]) {
            return `${text2}<xmd-tail></xmd-tail>`;
          }
          return text2;
        }
      }
    });
  }
  protectCustomTags(content, disableBlockMarkdown) {
    const placeholders = /* @__PURE__ */ new Map();
    const customTagNames = Object.keys(this.options.components || {});
    if (customTagNames.length === 0) {
      return {
        protected: content,
        placeholders
      };
    }
    let placeholderIndex = 0;
    const protectNewlines = (value) => value.replace(/\n/g, () => {
      const ph = `${PLACEHOLDER_PREFIX}${placeholderIndex++}${PLACEHOLDER_SUFFIX}`;
      placeholders.set(ph, "\n");
      return ph;
    });
    const tagNamePattern = customTagNames.map((name) => name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const openTagRegex = new RegExp(`<(${tagNamePattern})(?:\\s[^>]*)?>`, "gi");
    const closeTagRegex = new RegExp(`</(${tagNamePattern})>`, "gi");
    const positions = [];
    let match = openTagRegex.exec(content);
    while (match !== null) {
      positions.push({
        index: match.index,
        type: "open",
        tagName: match[1].toLowerCase(),
        match: match[0]
      });
      match = openTagRegex.exec(content);
    }
    closeTagRegex.lastIndex = 0;
    match = closeTagRegex.exec(content);
    while (match !== null) {
      positions.push({
        index: match.index,
        type: "close",
        tagName: match[1].toLowerCase(),
        match: match[0]
      });
      match = closeTagRegex.exec(content);
    }
    positions.sort((a, b) => a.index - b.index);
    const stack = [];
    const result = [];
    let lastIndex = 0;
    for (const pos of positions) {
      if (pos.type === "open") {
        if (!pos.match.endsWith("/>")) {
          stack.push({
            tagName: pos.tagName,
            start: pos.index,
            openTag: pos.match
          });
        }
      } else if (pos.type === "close" && stack.length > 0 && stack[stack.length - 1].tagName === pos.tagName) {
        const open = stack.pop();
        if (stack.length === 0) {
          const startPos = open.start;
          const endPos = pos.index + pos.match.length;
          const openTag = open.openTag;
          const closeTag = pos.match;
          const innerContent = content.slice(startPos + openTag.length, pos.index);
          if (lastIndex < startPos) {
            result.push(content.slice(lastIndex, startPos));
          }
          if (disableBlockMarkdown && innerContent.includes("\n")) {
            const protectedInner = protectNewlines(innerContent);
            result.push(openTag + protectedInner + closeTag);
          } else if (innerContent.includes("\n\n")) {
            const protectedInner = innerContent.replace(/\n{2,}/g, (newlines) => protectNewlines(newlines));
            result.push(openTag + protectedInner + closeTag);
          } else {
            result.push(openTag + innerContent + closeTag);
          }
          lastIndex = endPos;
        }
      }
    }
    if (lastIndex < content.length) {
      result.push(content.slice(lastIndex));
    }
    return {
      protected: result.join(""),
      placeholders
    };
  }
  restorePlaceholders(content, placeholders) {
    if (placeholders.size === 0) {
      return content;
    }
    return content.replace(PLACEHOLDER_REGEX, (match) => placeholders.get(match) ?? match);
  }
  /**
   * Find the last non-empty token in the token tree (reverse search)
   */
  findLastNonEmptyToken(tokens) {
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      if (token.type === "list" && "items" in token && Array.isArray(token.items)) {
        for (let j = token.items.length - 1; j >= 0; j--) {
          const item = token.items[j];
          if ("tokens" in item && item.tokens && item.tokens.length > 0) {
            const found = this.findLastNonEmptyToken(item.tokens);
            if (found) return found;
          }
        }
      }
      if ("tokens" in token && token.tokens && token.tokens.length > 0) {
        const found = this.findLastNonEmptyToken(token.tokens);
        if (found) return found;
      }
      if (token.type === "text") {
        const textContent = "text" in token ? token.text : "";
        if (textContent.trim()) {
          return token;
        }
      } else if (token.type === "html" || token.type === "tag") {
        return token;
      }
    }
    return null;
  }
  /**
   * Find the last text token in the token tree
   * Returns null if the last non-empty token is not a text type (e.g., HTML/incomplete component)
   */
  findLastTextToken(tokens) {
    const lastNonEmptyToken = this.findLastNonEmptyToken(tokens);
    if (lastNonEmptyToken?.type !== "text") {
      return null;
    }
    return lastNonEmptyToken;
  }
  parse(content, parseOptions) {
    this.injectTail = parseOptions?.injectTail ?? false;
    if (this.options.protectCustomTagNewlines || this.options.disableCustomTagBlockMarkdown) {
      const {
        protected: protectedContent,
        placeholders
      } = this.protectCustomTags(content, !!this.options.disableCustomTagBlockMarkdown);
      const parsed = this.markdownInstance.parse(protectedContent);
      return this.restorePlaceholders(parsed, placeholders);
    }
    return this.markdownInstance.parse(content);
  }
};
var Parser_default = Parser;

// ../../node_modules/.pnpm/dompurify@3.4.16/node_modules/dompurify/dist/purify.es.mjs
function _OverloadYield(e, d) {
  this.v = e, this.k = d;
}
function _arrayLikeToArray(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
function _arrayWithHoles(r) {
  if (Array.isArray(r)) return r;
}
function _iterableToArrayLimit(r, l) {
  var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (null != t) {
    var e, n, i, u, a = [], f = true, o = false;
    try {
      if (i = (t = t.call(r)).next, 0 === l) {
        if (Object(t) !== t) return;
        f = false;
      } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
    } catch (r2) {
      o = true, n = r2;
    } finally {
      try {
        if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
      } finally {
        if (o) throw n;
      }
    }
    return a;
  }
}
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _slicedToArray(r, e) {
  return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
}
function _unsupportedIterableToArray(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
  }
}
function AsyncGenerator(e) {
  var t, n;
  function resume(t2, n2) {
    try {
      var r = e[t2](n2), o = r.value, u = o instanceof _OverloadYield;
      Promise.resolve(u ? o.v : o).then(function(n3) {
        if (u) {
          var i = "return" === t2 && o.k ? t2 : "next";
          if (!o.k || n3.done) return resume(i, n3);
          n3 = e[i](n3).value;
        }
        settle(!!r.done, n3);
      }, function(e2) {
        resume("throw", e2);
      });
    } catch (e2) {
      settle(2, e2);
    }
  }
  function settle(e2, r) {
    2 === e2 ? t.reject(r) : t.resolve({
      value: r,
      done: e2
    }), (t = t.next) ? resume(t.key, t.arg) : n = null;
  }
  this._invoke = function(e2, r) {
    return new Promise(function(o, u) {
      var i = {
        key: e2,
        arg: r,
        resolve: o,
        reject: u,
        next: null
      };
      n ? n = n.next = i : (t = n = i, resume(e2, r));
    });
  }, "function" != typeof e.return && (this.return = void 0);
}
AsyncGenerator.prototype["function" == typeof Symbol && Symbol.asyncIterator || "@@asyncIterator"] = function() {
  return this;
}, AsyncGenerator.prototype.next = function(e) {
  return this._invoke("next", e);
}, AsyncGenerator.prototype.throw = function(e) {
  return this._invoke("throw", e);
}, AsyncGenerator.prototype.return = function(e) {
  return this._invoke("return", e);
};
var entries = Object.entries;
var setPrototypeOf = Object.setPrototypeOf;
var isFrozen = Object.isFrozen;
var getPrototypeOf = Object.getPrototypeOf;
var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
var freeze = Object.freeze;
var seal = Object.seal;
var create2 = Object.create;
var _ref = typeof Reflect !== "undefined" && Reflect;
var apply = _ref.apply;
var construct = _ref.construct;
if (!freeze) freeze = function freeze2(x) {
  return x;
};
if (!seal) seal = function seal2(x) {
  return x;
};
if (!apply) apply = function apply2(func, thisArg) {
  for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) args[_key - 2] = arguments[_key];
  return func.apply(thisArg, args);
};
if (!construct) construct = function construct2(Func) {
  for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) args[_key2 - 1] = arguments[_key2];
  return new Func(...args);
};
var arrayForEach = unapply(Array.prototype.forEach);
Array.prototype.indexOf;
var arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
var arrayPop = unapply(Array.prototype.pop);
var arrayPush = unapply(Array.prototype.push);
Array.prototype.slice;
var arraySplice = unapply(Array.prototype.splice);
var arrayIsArray = Array.isArray;
var stringToLowerCase = unapply(String.prototype.toLowerCase);
var stringToString = unapply(String.prototype.toString);
var stringMatch = unapply(String.prototype.match);
var stringReplace = unapply(String.prototype.replace);
var stringIndexOf = unapply(String.prototype.indexOf);
var stringTrim = unapply(String.prototype.trim);
var numberToString = unapply(Number.prototype.toString);
var booleanToString = unapply(Boolean.prototype.toString);
var bigintToString = typeof BigInt === "undefined" ? null : unapply(BigInt.prototype.toString);
var symbolToString = typeof Symbol === "undefined" ? null : unapply(Symbol.prototype.toString);
var objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
var objectToString = unapply(Object.prototype.toString);
var regExpTest = unapply(RegExp.prototype.test);
var typeErrorCreate = unconstruct(TypeError);
function unapply(func) {
  return function(thisArg) {
    if (thisArg instanceof RegExp) thisArg.lastIndex = 0;
    for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) args[_key3 - 1] = arguments[_key3];
    return apply(func, thisArg, args);
  };
}
function unconstruct(Func) {
  return function() {
    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) args[_key4] = arguments[_key4];
    return construct(Func, args);
  };
}
function addToSet(set, array) {
  let transformCaseFunc = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : stringToLowerCase;
  if (setPrototypeOf) setPrototypeOf(set, null);
  if (!arrayIsArray(array)) return set;
  let l = array.length;
  while (l--) {
    let element = array[l];
    if (typeof element === "string") {
      const lcElement = transformCaseFunc(element);
      if (lcElement !== element) {
        if (!isFrozen(array)) array[l] = lcElement;
        element = lcElement;
      }
    }
    set[element] = true;
  }
  return set;
}
function cleanArray(array) {
  for (let index = 0; index < array.length; index++) if (!objectHasOwnProperty(array, index)) array[index] = null;
  return array;
}
function clone(object) {
  const newObject = create2(null);
  for (const _ref2 of entries(object)) {
    var _ref3 = _slicedToArray(_ref2, 2);
    const property = _ref3[0];
    const value = _ref3[1];
    if (objectHasOwnProperty(object, property)) {
      if (arrayIsArray(value)) newObject[property] = cleanArray(value);
      else if (value && typeof value === "object" && value.constructor === Object) newObject[property] = clone(value);
      else newObject[property] = value;
    }
  }
  return newObject;
}
function stringifyValue(value) {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
      return numberToString(value);
    case "boolean":
      return booleanToString(value);
    case "bigint":
      return bigintToString ? bigintToString(value) : "0";
    case "symbol":
      return symbolToString ? symbolToString(value) : "Symbol()";
    case "undefined":
      return objectToString(value);
    case "function":
    case "object": {
      if (value === null) return objectToString(value);
      const valueAsRecord = value;
      const valueToString = lookupGetter(valueAsRecord, "toString");
      if (typeof valueToString === "function") {
        const stringified = valueToString(valueAsRecord);
        return typeof stringified === "string" ? stringified : objectToString(stringified);
      }
      return objectToString(value);
    }
    default:
      return objectToString(value);
  }
}
function lookupGetter(object, prop) {
  while (object !== null) {
    const desc = getOwnPropertyDescriptor(object, prop);
    if (desc) {
      if (desc.get) return unapply(desc.get);
      if (typeof desc.value === "function") return unapply(desc.value);
    }
    object = getPrototypeOf(object);
  }
  function fallbackValue() {
    return null;
  }
  return fallbackValue;
}
function isRegex(value) {
  try {
    regExpTest(value, "");
    return true;
  } catch (_unused) {
    return false;
  }
}
var html$1 = freeze([
  "a",
  "abbr",
  "acronym",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "bdi",
  "bdo",
  "big",
  "blink",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "center",
  "cite",
  "code",
  "col",
  "colgroup",
  "content",
  "data",
  "datalist",
  "dd",
  "decorator",
  "del",
  "details",
  "dfn",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "element",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "font",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "main",
  "map",
  "mark",
  "marquee",
  "menu",
  "menuitem",
  "meter",
  "nav",
  "nobr",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "search",
  "section",
  "select",
  "shadow",
  "slot",
  "small",
  "source",
  "spacer",
  "span",
  "strike",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "track",
  "tt",
  "u",
  "ul",
  "var",
  "video",
  "wbr"
]);
var svg$1 = freeze([
  "svg",
  "a",
  "altglyph",
  "altglyphdef",
  "altglyphitem",
  "animatecolor",
  "animatemotion",
  "animatetransform",
  "circle",
  "clippath",
  "defs",
  "desc",
  "ellipse",
  "enterkeyhint",
  "exportparts",
  "filter",
  "font",
  "g",
  "glyph",
  "glyphref",
  "hkern",
  "image",
  "inputmode",
  "line",
  "lineargradient",
  "marker",
  "mask",
  "metadata",
  "mpath",
  "part",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialgradient",
  "rect",
  "stop",
  "style",
  "switch",
  "symbol",
  "text",
  "textpath",
  "title",
  "tref",
  "tspan",
  "view",
  "vkern"
]);
var svgFilters = freeze([
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence"
]);
var svgDisallowed = freeze([
  "animate",
  "color-profile",
  "cursor",
  "discard",
  "font-face",
  "font-face-format",
  "font-face-name",
  "font-face-src",
  "font-face-uri",
  "foreignobject",
  "hatch",
  "hatchpath",
  "mesh",
  "meshgradient",
  "meshpatch",
  "meshrow",
  "missing-glyph",
  "script",
  "set",
  "solidcolor",
  "unknown",
  "use"
]);
var mathMl$1 = freeze([
  "math",
  "menclose",
  "merror",
  "mfenced",
  "mfrac",
  "mglyph",
  "mi",
  "mlabeledtr",
  "mmultiscripts",
  "mn",
  "mo",
  "mover",
  "mpadded",
  "mphantom",
  "mroot",
  "mrow",
  "ms",
  "mspace",
  "msqrt",
  "mstyle",
  "msub",
  "msup",
  "msubsup",
  "mtable",
  "mtd",
  "mtext",
  "mtr",
  "munder",
  "munderover",
  "mprescripts"
]);
var mathMlDisallowed = freeze([
  "maction",
  "maligngroup",
  "malignmark",
  "mlongdiv",
  "mscarries",
  "mscarry",
  "msgroup",
  "mstack",
  "msline",
  "msrow",
  "semantics",
  "annotation",
  "annotation-xml",
  "mprescripts",
  "none"
]);
var text = freeze(["#text"]);
var html2 = freeze([
  "accept",
  "action",
  "align",
  "alt",
  "autocapitalize",
  "autocomplete",
  "autopictureinpicture",
  "autoplay",
  "background",
  "bgcolor",
  "border",
  "capture",
  "cellpadding",
  "cellspacing",
  "checked",
  "cite",
  "class",
  "clear",
  "color",
  "cols",
  "colspan",
  "command",
  "commandfor",
  "controls",
  "controlslist",
  "coords",
  "crossorigin",
  "datetime",
  "decoding",
  "default",
  "dir",
  "disabled",
  "disablepictureinpicture",
  "disableremoteplayback",
  "download",
  "draggable",
  "enctype",
  "enterkeyhint",
  "exportparts",
  "face",
  "for",
  "headers",
  "height",
  "hidden",
  "high",
  "href",
  "hreflang",
  "id",
  "inert",
  "inputmode",
  "integrity",
  "ismap",
  "kind",
  "label",
  "lang",
  "list",
  "loading",
  "loop",
  "low",
  "max",
  "maxlength",
  "media",
  "method",
  "min",
  "minlength",
  "multiple",
  "muted",
  "name",
  "nonce",
  "noshade",
  "novalidate",
  "nowrap",
  "open",
  "optimum",
  "part",
  "pattern",
  "placeholder",
  "playsinline",
  "popover",
  "popovertarget",
  "popovertargetaction",
  "poster",
  "preload",
  "pubdate",
  "radiogroup",
  "readonly",
  "rel",
  "required",
  "rev",
  "reversed",
  "role",
  "rows",
  "rowspan",
  "spellcheck",
  "scope",
  "selected",
  "shape",
  "size",
  "sizes",
  "slot",
  "span",
  "srclang",
  "start",
  "src",
  "srcset",
  "step",
  "style",
  "summary",
  "tabindex",
  "title",
  "translate",
  "type",
  "usemap",
  "valign",
  "value",
  "width",
  "wrap",
  "xmlns"
]);
var svg = freeze([
  "accent-height",
  "accumulate",
  "additive",
  "alignment-baseline",
  "amplitude",
  "ascent",
  "attributename",
  "attributetype",
  "azimuth",
  "basefrequency",
  "baseline-shift",
  "begin",
  "bias",
  "by",
  "class",
  "clip",
  "clippathunits",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "cx",
  "cy",
  "d",
  "dx",
  "dy",
  "diffuseconstant",
  "direction",
  "display",
  "divisor",
  "dominant-baseline",
  "dur",
  "edgemode",
  "elevation",
  "end",
  "exponent",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "filterunits",
  "flood-color",
  "flood-opacity",
  "font-family",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "fx",
  "fy",
  "g1",
  "g2",
  "glyph-name",
  "glyphref",
  "gradientunits",
  "gradienttransform",
  "height",
  "href",
  "id",
  "image-rendering",
  "in",
  "in2",
  "intercept",
  "k",
  "k1",
  "k2",
  "k3",
  "k4",
  "kerning",
  "keypoints",
  "keysplines",
  "keytimes",
  "lang",
  "lengthadjust",
  "letter-spacing",
  "kernelmatrix",
  "kernelunitlength",
  "lighting-color",
  "local",
  "marker-end",
  "marker-mid",
  "marker-start",
  "markerheight",
  "markerunits",
  "markerwidth",
  "maskcontentunits",
  "maskunits",
  "max",
  "mask",
  "mask-type",
  "media",
  "method",
  "mode",
  "min",
  "name",
  "numoctaves",
  "offset",
  "operator",
  "opacity",
  "order",
  "orient",
  "orientation",
  "origin",
  "overflow",
  "paint-order",
  "path",
  "pathlength",
  "patterncontentunits",
  "patterntransform",
  "patternunits",
  "pointer-events",
  "points",
  "preservealpha",
  "preserveaspectratio",
  "primitiveunits",
  "r",
  "rx",
  "ry",
  "radius",
  "refx",
  "refy",
  "repeatcount",
  "repeatdur",
  "restart",
  "result",
  "rotate",
  "scale",
  "seed",
  "shape-rendering",
  "slope",
  "specularconstant",
  "specularexponent",
  "spreadmethod",
  "startoffset",
  "stddeviation",
  "stitchtiles",
  "stop-color",
  "stop-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke",
  "stroke-width",
  "style",
  "surfacescale",
  "systemlanguage",
  "tabindex",
  "tablevalues",
  "targetx",
  "targety",
  "transform",
  "transform-origin",
  "text-anchor",
  "text-decoration",
  "text-orientation",
  "text-rendering",
  "textlength",
  "type",
  "u1",
  "u2",
  "unicode",
  "values",
  "vector-effect",
  "viewbox",
  "visibility",
  "version",
  "vert-adv-y",
  "vert-origin-x",
  "vert-origin-y",
  "width",
  "word-spacing",
  "wrap",
  "writing-mode",
  "xchannelselector",
  "ychannelselector",
  "x",
  "x1",
  "x2",
  "xmlns",
  "y",
  "y1",
  "y2",
  "z",
  "zoomandpan"
]);
var mathMl = freeze([
  "accent",
  "accentunder",
  "align",
  "bevelled",
  "close",
  "columnalign",
  "columnlines",
  "columnspacing",
  "columnspan",
  "denomalign",
  "depth",
  "dir",
  "display",
  "displaystyle",
  "encoding",
  "fence",
  "frame",
  "height",
  "href",
  "id",
  "largeop",
  "length",
  "linethickness",
  "lquote",
  "lspace",
  "mathbackground",
  "mathcolor",
  "mathsize",
  "mathvariant",
  "maxsize",
  "minsize",
  "movablelimits",
  "notation",
  "numalign",
  "open",
  "rowalign",
  "rowlines",
  "rowspacing",
  "rowspan",
  "rspace",
  "rquote",
  "scriptlevel",
  "scriptminsize",
  "scriptsizemultiplier",
  "selection",
  "separator",
  "separators",
  "stretchy",
  "subscriptshift",
  "supscriptshift",
  "symmetric",
  "voffset",
  "width",
  "xmlns"
]);
var xml = freeze([
  "xlink:href",
  "xml:id",
  "xlink:title",
  "xml:space",
  "xmlns:xlink"
]);
var MUSTACHE_EXPR = seal(/{{[\w\W]*|^[\w\W]*}}/g);
var ERB_EXPR = seal(/<%[\w\W]*|^[\w\W]*%>/g);
var TMPLIT_EXPR = seal(/\${[\w\W]*/g);
var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/);
var ARIA_ATTR = seal(/^aria-[\-\w]+$/);
var IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i);
var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
var ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g);
var DOCTYPE_NAME = seal(/^html$/i);
var CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);
var ELEMENT_MARKUP_PROBE = seal(/<[/\w!]/g);
var COMMENT_MARKUP_PROBE = seal(/<[/\w]/g);
var FALLBACK_TAG_CLOSE = seal(/<\/no(script|embed|frames)/i);
var SELF_CLOSING_TAG = seal(/\/>/i);
var NODE_TYPE = {
  element: 1,
  attribute: 2,
  text: 3,
  cdataSection: 4,
  entityReference: 5,
  entityNode: 6,
  processingInstruction: 7,
  comment: 8,
  document: 9,
  documentType: 10,
  documentFragment: 11,
  notation: 12
};
var LITERAL_TEXT_ELEMENT_NAMES = [
  "style",
  "script",
  "xmp",
  "iframe",
  "noembed",
  "noframes",
  "plaintext",
  "noscript"
];
var LITERAL_TEXT_ELEMENTS = freeze(addToSet({}, LITERAL_TEXT_ELEMENT_NAMES));
var LITERAL_TEXT_CLOSE = (function() {
  const map = {};
  arrayForEach(LITERAL_TEXT_ELEMENT_NAMES, (name) => {
    map[name] = seal(new RegExp("</" + name + "(?=[\\t\\n\\f\\r />])", "i"));
  });
  return freeze(map);
})();
var getGlobal = function getGlobal2() {
  return typeof window === "undefined" ? null : window;
};
var _createTrustedTypesPolicy = function _createTrustedTypesPolicy2(trustedTypes, purifyHostElement) {
  if (typeof trustedTypes !== "object" || typeof trustedTypes.createPolicy !== "function") return null;
  let suffix = null;
  const ATTR_NAME = "data-tt-policy-suffix";
  if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) suffix = purifyHostElement.getAttribute(ATTR_NAME);
  const policyName = "dompurify" + (suffix ? "#" + suffix : "");
  try {
    return trustedTypes.createPolicy(policyName, {
      createHTML(html3) {
        return html3;
      },
      createScriptURL(scriptUrl) {
        return scriptUrl;
      }
    });
  } catch (_) {
    console.warn("TrustedTypes policy " + policyName + " could not be created.");
    return null;
  }
};
var _createHooksMap = function _createHooksMap2() {
  return {
    afterSanitizeAttributes: [],
    afterSanitizeElements: [],
    afterSanitizeShadowDOM: [],
    beforeSanitizeAttributes: [],
    beforeSanitizeElements: [],
    beforeSanitizeShadowDOM: [],
    uponSanitizeAttribute: [],
    uponSanitizeElement: [],
    uponSanitizeShadowNode: []
  };
};
var _resolveSetOption = function _resolveSetOption2(cfg, key, fallback, options2) {
  return objectHasOwnProperty(cfg, key) && arrayIsArray(cfg[key]) ? addToSet(options2.base ? clone(options2.base) : {}, cfg[key], options2.transform) : fallback;
};
var _resolveObjectOption = function _resolveObjectOption2(cfg, key, makeFallback) {
  const value = objectHasOwnProperty(cfg, key) ? cfg[key] : void 0;
  return value && typeof value === "object" ? clone(value) : makeFallback();
};
function createDOMPurify() {
  let window2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : getGlobal();
  const DOMPurify = (root) => createDOMPurify(root);
  DOMPurify.version = "3.4.16";
  DOMPurify.removed = [];
  if (!window2 || !window2.document || window2.document.nodeType !== NODE_TYPE.document || !window2.Element) {
    DOMPurify.isSupported = false;
    return DOMPurify;
  }
  let document2 = window2.document;
  const originalDocument = document2;
  const currentScript = originalDocument.currentScript;
  window2.DocumentFragment;
  const HTMLTemplateElement = window2.HTMLTemplateElement, Node2 = window2.Node, Element2 = window2.Element, NodeFilter2 = window2.NodeFilter;
  window2.NamedNodeMap === void 0 && (window2.NamedNodeMap || window2.MozNamedAttrMap);
  window2.HTMLFormElement;
  const DOMParser2 = window2.DOMParser, trustedTypes = window2.trustedTypes;
  const ElementPrototype = Element2.prototype;
  const cloneNode = lookupGetter(ElementPrototype, "cloneNode");
  const remove = lookupGetter(ElementPrototype, "remove");
  const removeAttributeNode = lookupGetter(ElementPrototype, "removeAttributeNode");
  const getNextSibling = lookupGetter(ElementPrototype, "nextSibling");
  const getChildNodes = lookupGetter(ElementPrototype, "childNodes");
  const getParentNode = lookupGetter(ElementPrototype, "parentNode");
  const getShadowRoot = lookupGetter(ElementPrototype, "shadowRoot");
  const getAttributes = lookupGetter(ElementPrototype, "attributes");
  const getNodeType = Node2 && Node2.prototype ? lookupGetter(Node2.prototype, "nodeType") : null;
  const getNodeName = Node2 && Node2.prototype ? lookupGetter(Node2.prototype, "nodeName") : null;
  const getOwnerDocument2 = Node2 && Node2.prototype ? lookupGetter(Node2.prototype, "ownerDocument") : null;
  const _readNodeType = function _readNodeType2(node) {
    return getNodeType ? getNodeType(node) : node.nodeType;
  };
  const _readNodeName = function _readNodeName2(node) {
    return getNodeName ? getNodeName(node) : node.nodeName;
  };
  if (typeof HTMLTemplateElement === "function") {
    const template = document2.createElement("template");
    if (template.content && template.content.ownerDocument) document2 = template.content.ownerDocument;
  }
  let trustedTypesPolicy;
  let emptyHTML = "";
  let defaultTrustedTypesPolicy;
  let defaultTrustedTypesPolicyResolved = false;
  let IN_TRUSTED_TYPES_POLICY = 0;
  const _assertNotInTrustedTypesPolicy = function _assertNotInTrustedTypesPolicy2() {
    if (IN_TRUSTED_TYPES_POLICY > 0) throw typeErrorCreate('A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.');
  };
  const _createTrustedHTML = function _createTrustedHTML2(html3) {
    _assertNotInTrustedTypesPolicy();
    IN_TRUSTED_TYPES_POLICY++;
    try {
      return trustedTypesPolicy.createHTML(html3);
    } finally {
      IN_TRUSTED_TYPES_POLICY--;
    }
  };
  const _createTrustedScriptURL = function _createTrustedScriptURL2(scriptUrl) {
    _assertNotInTrustedTypesPolicy();
    IN_TRUSTED_TYPES_POLICY++;
    try {
      return trustedTypesPolicy.createScriptURL(scriptUrl);
    } finally {
      IN_TRUSTED_TYPES_POLICY--;
    }
  };
  const _getDefaultTrustedTypesPolicy = function _getDefaultTrustedTypesPolicy2() {
    if (!defaultTrustedTypesPolicyResolved) {
      defaultTrustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
      defaultTrustedTypesPolicyResolved = true;
    }
    return defaultTrustedTypesPolicy;
  };
  const _document = document2, implementation = _document.implementation, createNodeIterator = _document.createNodeIterator, createDocumentFragment = _document.createDocumentFragment, getElementsByTagName = _document.getElementsByTagName;
  const importNode = originalDocument.importNode;
  let hooks = _createHooksMap();
  DOMPurify.isSupported = typeof entries === "function" && typeof getParentNode === "function" && implementation && implementation.createHTMLDocument !== void 0;
  const MUSTACHE_EXPR$1 = MUSTACHE_EXPR, ERB_EXPR$1 = ERB_EXPR, TMPLIT_EXPR$1 = TMPLIT_EXPR, DATA_ATTR$1 = DATA_ATTR, ARIA_ATTR$1 = ARIA_ATTR, IS_SCRIPT_OR_DATA$1 = IS_SCRIPT_OR_DATA, ATTR_WHITESPACE$1 = ATTR_WHITESPACE, CUSTOM_ELEMENT$1 = CUSTOM_ELEMENT;
  let IS_ALLOWED_URI$1 = IS_ALLOWED_URI;
  let ALLOWED_TAGS = null;
  const DEFAULT_ALLOWED_TAGS = addToSet({}, [
    ...html$1,
    ...svg$1,
    ...svgFilters,
    ...mathMl$1,
    ...text
  ]);
  let ALLOWED_ATTR = null;
  const DEFAULT_ALLOWED_ATTR = addToSet({}, [
    ...html2,
    ...svg,
    ...mathMl,
    ...xml
  ]);
  let CUSTOM_ELEMENT_HANDLING = Object.seal(create2(null, {
    tagNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    allowCustomizedBuiltInElements: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: false
    }
  }));
  let FORBID_TAGS = null;
  let FORBID_ATTR = null;
  const EXTRA_ELEMENT_HANDLING = Object.seal(create2(null, {
    tagCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    }
  }));
  let ALLOW_ARIA_ATTR = true;
  let ALLOW_DATA_ATTR = true;
  let ALLOW_UNKNOWN_PROTOCOLS = false;
  let ALLOW_SELF_CLOSE_IN_ATTR = true;
  let SAFE_FOR_TEMPLATES = false;
  let SAFE_FOR_XML = true;
  let WHOLE_DOCUMENT = false;
  let SET_CONFIG = false;
  let SET_CONFIG_ALLOWED_TAGS = null;
  let SET_CONFIG_ALLOWED_ATTR = null;
  let FORCE_BODY = false;
  let RETURN_DOM = false;
  let RETURN_DOM_FRAGMENT = false;
  let RETURN_TRUSTED_TYPE = false;
  let SANITIZE_DOM = true;
  let SANITIZE_NAMED_PROPS = false;
  const SANITIZE_NAMED_PROPS_PREFIX = "user-content-";
  let KEEP_CONTENT = true;
  let IN_PLACE = false;
  let USE_PROFILES = {};
  let FORBID_CONTENTS = null;
  const DEFAULT_FORBID_CONTENTS = addToSet({}, [
    "annotation-xml",
    "audio",
    "colgroup",
    "desc",
    "foreignobject",
    "head",
    "iframe",
    "math",
    "mi",
    "mn",
    "mo",
    "ms",
    "mtext",
    "noembed",
    "noframes",
    "noscript",
    "plaintext",
    "script",
    "selectedcontent",
    "style",
    "svg",
    "template",
    "thead",
    "title",
    "video",
    "xmp"
  ]);
  let DATA_URI_TAGS = null;
  const DEFAULT_DATA_URI_TAGS = addToSet({}, [
    "audio",
    "video",
    "img",
    "source",
    "image",
    "track"
  ]);
  let URI_SAFE_ATTRIBUTES = null;
  const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, [
    "alt",
    "class",
    "for",
    "id",
    "label",
    "name",
    "pattern",
    "placeholder",
    "role",
    "summary",
    "title",
    "value",
    "style",
    "xmlns"
  ]);
  const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
  let NAMESPACE = HTML_NAMESPACE;
  let IS_EMPTY_INPUT = false;
  let ALLOWED_NAMESPACES = null;
  const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [
    MATHML_NAMESPACE,
    SVG_NAMESPACE,
    HTML_NAMESPACE
  ], stringToString);
  const DEFAULT_MATHML_TEXT_INTEGRATION_POINTS = freeze([
    "mi",
    "mo",
    "mn",
    "ms",
    "mtext"
  ]);
  let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS);
  const DEFAULT_HTML_INTEGRATION_POINTS = freeze(["annotation-xml"]);
  let HTML_INTEGRATION_POINTS = addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS);
  const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, [
    "title",
    "style",
    "font",
    "a",
    "script"
  ]);
  let PARSER_MEDIA_TYPE = null;
  const SUPPORTED_PARSER_MEDIA_TYPES = ["application/xhtml+xml", "text/html"];
  const DEFAULT_PARSER_MEDIA_TYPE = "text/html";
  let transformCaseFunc = null;
  let CONFIG = null;
  const formElement = document2.createElement("form");
  const isRegexOrFunction = function isRegexOrFunction2(testValue) {
    return testValue instanceof RegExp || testValue instanceof Function;
  };
  const _parseConfig = function _parseConfig2() {
    let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (CONFIG && CONFIG === cfg) return;
    if (!cfg || typeof cfg !== "object") cfg = {};
    cfg = clone(cfg);
    PARSER_MEDIA_TYPE = SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
    transformCaseFunc = PARSER_MEDIA_TYPE === "application/xhtml+xml" ? stringToString : stringToLowerCase;
    ALLOWED_TAGS = _resolveSetOption(cfg, "ALLOWED_TAGS", DEFAULT_ALLOWED_TAGS, { transform: transformCaseFunc });
    ALLOWED_ATTR = _resolveSetOption(cfg, "ALLOWED_ATTR", DEFAULT_ALLOWED_ATTR, { transform: transformCaseFunc });
    ALLOWED_NAMESPACES = _resolveSetOption(cfg, "ALLOWED_NAMESPACES", DEFAULT_ALLOWED_NAMESPACES, { transform: stringToString });
    URI_SAFE_ATTRIBUTES = _resolveSetOption(cfg, "ADD_URI_SAFE_ATTR", DEFAULT_URI_SAFE_ATTRIBUTES, {
      transform: transformCaseFunc,
      base: DEFAULT_URI_SAFE_ATTRIBUTES
    });
    DATA_URI_TAGS = _resolveSetOption(cfg, "ADD_DATA_URI_TAGS", DEFAULT_DATA_URI_TAGS, {
      transform: transformCaseFunc,
      base: DEFAULT_DATA_URI_TAGS
    });
    FORBID_CONTENTS = _resolveSetOption(cfg, "FORBID_CONTENTS", DEFAULT_FORBID_CONTENTS, { transform: transformCaseFunc });
    FORBID_TAGS = _resolveSetOption(cfg, "FORBID_TAGS", clone({}), { transform: transformCaseFunc });
    FORBID_ATTR = _resolveSetOption(cfg, "FORBID_ATTR", clone({}), { transform: transformCaseFunc });
    USE_PROFILES = objectHasOwnProperty(cfg, "USE_PROFILES") ? cfg.USE_PROFILES && typeof cfg.USE_PROFILES === "object" ? clone(cfg.USE_PROFILES) : cfg.USE_PROFILES : false;
    ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false;
    ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false;
    ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false;
    ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false;
    SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false;
    SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false;
    WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false;
    RETURN_DOM = cfg.RETURN_DOM || false;
    RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false;
    RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false;
    FORCE_BODY = cfg.FORCE_BODY || false;
    SANITIZE_DOM = cfg.SANITIZE_DOM !== false;
    SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false;
    KEEP_CONTENT = cfg.KEEP_CONTENT !== false;
    IN_PLACE = cfg.IN_PLACE || false;
    IS_ALLOWED_URI$1 = isRegex(cfg.ALLOWED_URI_REGEXP) ? cfg.ALLOWED_URI_REGEXP : IS_ALLOWED_URI;
    NAMESPACE = typeof cfg.NAMESPACE === "string" ? cfg.NAMESPACE : HTML_NAMESPACE;
    MATHML_TEXT_INTEGRATION_POINTS = _resolveObjectOption(cfg, "MATHML_TEXT_INTEGRATION_POINTS", () => addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS));
    HTML_INTEGRATION_POINTS = _resolveObjectOption(cfg, "HTML_INTEGRATION_POINTS", () => addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS));
    const customElementHandling = _resolveObjectOption(cfg, "CUSTOM_ELEMENT_HANDLING", () => create2(null));
    CUSTOM_ELEMENT_HANDLING = create2(null);
    if (objectHasOwnProperty(customElementHandling, "tagNameCheck") && isRegexOrFunction(customElementHandling.tagNameCheck)) CUSTOM_ELEMENT_HANDLING.tagNameCheck = customElementHandling.tagNameCheck;
    if (objectHasOwnProperty(customElementHandling, "attributeNameCheck") && isRegexOrFunction(customElementHandling.attributeNameCheck)) CUSTOM_ELEMENT_HANDLING.attributeNameCheck = customElementHandling.attributeNameCheck;
    if (objectHasOwnProperty(customElementHandling, "allowCustomizedBuiltInElements") && typeof customElementHandling.allowCustomizedBuiltInElements === "boolean") CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = customElementHandling.allowCustomizedBuiltInElements;
    seal(CUSTOM_ELEMENT_HANDLING);
    if (SAFE_FOR_TEMPLATES) ALLOW_DATA_ATTR = false;
    if (RETURN_DOM_FRAGMENT) RETURN_DOM = true;
    if (USE_PROFILES) {
      ALLOWED_TAGS = addToSet({}, text);
      ALLOWED_ATTR = create2(null);
      if (USE_PROFILES.html === true) {
        addToSet(ALLOWED_TAGS, html$1);
        addToSet(ALLOWED_ATTR, html2);
      }
      if (USE_PROFILES.svg === true) {
        addToSet(ALLOWED_TAGS, svg$1);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.svgFilters === true) {
        addToSet(ALLOWED_TAGS, svgFilters);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.mathMl === true) {
        addToSet(ALLOWED_TAGS, mathMl$1);
        addToSet(ALLOWED_ATTR, mathMl);
        addToSet(ALLOWED_ATTR, xml);
      }
    }
    EXTRA_ELEMENT_HANDLING.tagCheck = null;
    EXTRA_ELEMENT_HANDLING.attributeCheck = null;
    if (objectHasOwnProperty(cfg, "ADD_TAGS")) {
      if (typeof cfg.ADD_TAGS === "function") EXTRA_ELEMENT_HANDLING.tagCheck = cfg.ADD_TAGS;
      else if (arrayIsArray(cfg.ADD_TAGS)) {
        if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) ALLOWED_TAGS = clone(ALLOWED_TAGS);
        addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
      }
    }
    if (objectHasOwnProperty(cfg, "ADD_ATTR")) {
      if (typeof cfg.ADD_ATTR === "function") EXTRA_ELEMENT_HANDLING.attributeCheck = cfg.ADD_ATTR;
      else if (arrayIsArray(cfg.ADD_ATTR)) {
        if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) ALLOWED_ATTR = clone(ALLOWED_ATTR);
        addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
      }
    }
    if (objectHasOwnProperty(cfg, "ADD_FORBID_CONTENTS") && arrayIsArray(cfg.ADD_FORBID_CONTENTS)) {
      if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) FORBID_CONTENTS = clone(FORBID_CONTENTS);
      addToSet(FORBID_CONTENTS, cfg.ADD_FORBID_CONTENTS, transformCaseFunc);
    }
    if (KEEP_CONTENT) ALLOWED_TAGS["#text"] = true;
    if (WHOLE_DOCUMENT) addToSet(ALLOWED_TAGS, [
      "html",
      "head",
      "body"
    ]);
    if (ALLOWED_TAGS.table) {
      addToSet(ALLOWED_TAGS, ["tbody"]);
      delete FORBID_TAGS.tbody;
    }
    if (cfg.TRUSTED_TYPES_POLICY) {
      if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== "function") throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
      if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== "function") throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
      const previousTrustedTypesPolicy = trustedTypesPolicy;
      trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
      try {
        emptyHTML = _createTrustedHTML("");
      } catch (error) {
        trustedTypesPolicy = previousTrustedTypesPolicy;
        throw error;
      }
    } else if (cfg.TRUSTED_TYPES_POLICY === null) {
      trustedTypesPolicy = void 0;
      emptyHTML = "";
    } else {
      if (trustedTypesPolicy === void 0) trustedTypesPolicy = _getDefaultTrustedTypesPolicy();
      if (trustedTypesPolicy && typeof emptyHTML === "string") emptyHTML = _createTrustedHTML("");
    }
    if (freeze) freeze(cfg);
    CONFIG = cfg;
  };
  const ALL_SVG_TAGS = addToSet({}, [
    ...svg$1,
    ...svgFilters,
    ...svgDisallowed
  ]);
  const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
  const _checkSvgNamespace = function _checkSvgNamespace2(tagName, parent, parentTagName) {
    if (parent.namespaceURI === HTML_NAMESPACE) return tagName === "svg";
    if (parent.namespaceURI === MATHML_NAMESPACE) return tagName === "svg" && (parentTagName === "annotation-xml" || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
    return Boolean(ALL_SVG_TAGS[tagName]);
  };
  const _checkMathMlNamespace = function _checkMathMlNamespace2(tagName, parent, parentTagName) {
    if (parent.namespaceURI === HTML_NAMESPACE) return tagName === "math";
    if (parent.namespaceURI === SVG_NAMESPACE) return tagName === "math" && HTML_INTEGRATION_POINTS[parentTagName];
    return Boolean(ALL_MATHML_TAGS[tagName]);
  };
  const _checkHtmlNamespace = function _checkHtmlNamespace2(tagName, parent, parentTagName) {
    if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) return false;
    if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) return false;
    return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
  };
  const _checkValidNamespace = function _checkValidNamespace2(element) {
    let parent = getParentNode(element);
    if (!parent || !parent.tagName) parent = {
      namespaceURI: NAMESPACE,
      tagName: "template"
    };
    const tagName = stringToLowerCase(element.tagName);
    const parentTagName = stringToLowerCase(parent.tagName);
    if (!ALLOWED_NAMESPACES[element.namespaceURI]) return false;
    if (element.namespaceURI === SVG_NAMESPACE) return _checkSvgNamespace(tagName, parent, parentTagName);
    if (element.namespaceURI === MATHML_NAMESPACE) return _checkMathMlNamespace(tagName, parent, parentTagName);
    if (element.namespaceURI === HTML_NAMESPACE) return _checkHtmlNamespace(tagName, parent, parentTagName);
    if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && ALLOWED_NAMESPACES[element.namespaceURI]) return true;
    return false;
  };
  const _forceRemove = function _forceRemove2(node) {
    arrayPush(DOMPurify.removed, { element: node });
    try {
      getParentNode(node).removeChild(node);
    } catch (_) {
      remove(node);
      if (!getParentNode(node)) throw typeErrorCreate("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place");
    }
  };
  const _stripAttributeNode = function _stripAttributeNode2(element, attribute, name) {
    try {
      removeAttributeNode(element, attribute);
    } catch (_) {
      try {
        element.removeAttribute(name);
      } catch (_2) {
      }
    }
  };
  const _neutralizeRoot = function _neutralizeRoot2(root) {
    _neutralizeSubtree(root);
    const childNodes = getChildNodes(root);
    if (childNodes) {
      const snapshot = [];
      arrayForEach(childNodes, (child) => {
        arrayPush(snapshot, child);
      });
      arrayForEach(snapshot, (child) => {
        try {
          remove(child);
        } catch (_) {
        }
      });
    }
    const attributes = getAttributes(root);
    if (attributes) for (let i = attributes.length - 1; i >= 0; --i) {
      const attribute = attributes[i];
      const name = attribute && attribute.name;
      if (typeof name === "string") _stripAttributeNode(root, attribute, name);
    }
  };
  const _removeAttribute = function _removeAttribute2(name, element, attr) {
    if (!attr) try {
      attr = element.getAttributeNode(name);
    } catch (_) {
      attr = null;
    }
    arrayPush(DOMPurify.removed, {
      attribute: attr || null,
      from: element
    });
    try {
      if (attr) removeAttributeNode(element, attr);
      else element.removeAttribute(name);
    } catch (_) {
      try {
        element.removeAttribute(name);
      } catch (_2) {
      }
    }
    if (name === "is") {
      if (RETURN_DOM || RETURN_DOM_FRAGMENT) try {
        _forceRemove(element);
      } catch (_) {
      }
      else try {
        element.setAttribute(name, "");
      } catch (_) {
      }
    }
  };
  const _stripDisallowedAttributes = function _stripDisallowedAttributes2(element) {
    const attributes = getAttributes(element);
    if (!attributes) return;
    for (let i = attributes.length - 1; i >= 0; --i) {
      const attribute = attributes[i];
      const name = attribute && attribute.name;
      if (typeof name !== "string" || ALLOWED_ATTR[transformCaseFunc(name)]) continue;
      _stripAttributeNode(element, attribute, name);
    }
  };
  const _neutralizeSubtree = function _neutralizeSubtree2(root) {
    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (_readNodeType(node) === NODE_TYPE.element) _stripDisallowedAttributes(node);
      const childNodes = getChildNodes(node);
      if (childNodes) for (let i = childNodes.length - 1; i >= 0; --i) stack.push(childNodes[i]);
    }
  };
  const _isPatchLinkageAttribute = function _isPatchLinkageAttribute2(lcName, lcTag) {
    if (!SAFE_FOR_XML) return false;
    if (lcName === "patchsrc") return true;
    return lcName === "for" && lcTag !== "label" && lcTag !== "output";
  };
  const _neutralizePatchLinkage = function _neutralizePatchLinkage2(root) {
    if (!SAFE_FOR_XML) return;
    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      const nodeType = _readNodeType(node);
      if (nodeType === NODE_TYPE.processingInstruction || nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, node.data)) {
        try {
          remove(node);
        } catch (_) {
        }
        continue;
      }
      if (nodeType === NODE_TYPE.element) {
        const element = node;
        const lcTag = transformCaseFunc(_readNodeName(node));
        try {
          if (element.hasAttribute && element.hasAttribute("patchsrc")) element.removeAttribute("patchsrc");
          if (element.hasAttribute && element.hasAttribute("for") && _isPatchLinkageAttribute("for", lcTag)) element.removeAttribute("for");
        } catch (_) {
        }
      }
      const childNodes = getChildNodes(node);
      if (childNodes) for (let i = childNodes.length - 1; i >= 0; --i) stack.push(childNodes[i]);
    }
  };
  const _initDocument = function _initDocument2(dirty) {
    let doc = null;
    let leadingWhitespace = null;
    if (FORCE_BODY) dirty = "<remove></remove>" + dirty;
    else {
      const matches = stringMatch(dirty, /^[\r\n\t ]+/);
      leadingWhitespace = matches && matches[0];
    }
    if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && NAMESPACE === HTML_NAMESPACE) dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + "</body></html>";
    const dirtyPayload = trustedTypesPolicy ? _createTrustedHTML(dirty) : dirty;
    if (NAMESPACE === HTML_NAMESPACE) try {
      doc = new DOMParser2().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
    } catch (_) {
    }
    if (!doc || !doc.documentElement) {
      doc = implementation.createDocument(NAMESPACE, "template", null);
      try {
        doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
      } catch (_) {
      }
    }
    const body = doc.body || doc.documentElement;
    if (dirty && leadingWhitespace) body.insertBefore(document2.createTextNode(leadingWhitespace), body.childNodes[0] || null);
    if (NAMESPACE === HTML_NAMESPACE) return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? "html" : "body")[0];
    return WHOLE_DOCUMENT ? doc.documentElement : body;
  };
  const _createNodeIterator = function _createNodeIterator2(root) {
    const doc = getOwnerDocument2 ? getOwnerDocument2(root) : root.ownerDocument;
    return createNodeIterator.call(doc || root, root, NodeFilter2.SHOW_ELEMENT | NodeFilter2.SHOW_COMMENT | NodeFilter2.SHOW_TEXT | NodeFilter2.SHOW_PROCESSING_INSTRUCTION | NodeFilter2.SHOW_CDATA_SECTION, null);
  };
  const _stripTemplateExpressions = function _stripTemplateExpressions2(value) {
    value = stringReplace(value, MUSTACHE_EXPR$1, " ");
    value = stringReplace(value, ERB_EXPR$1, " ");
    value = stringReplace(value, TMPLIT_EXPR$1, " ");
    return value;
  };
  const _scrubTemplateExpressions2 = function _scrubTemplateExpressions(node) {
    var _node$querySelectorAl;
    node.normalize();
    const doc = getOwnerDocument2 ? getOwnerDocument2(node) : node.ownerDocument;
    const walker = createNodeIterator.call(doc || node, node, NodeFilter2.SHOW_TEXT | NodeFilter2.SHOW_COMMENT | NodeFilter2.SHOW_CDATA_SECTION | NodeFilter2.SHOW_PROCESSING_INSTRUCTION, null);
    let currentNode = walker.nextNode();
    while (currentNode) {
      currentNode.data = _stripTemplateExpressions(currentNode.data);
      currentNode = walker.nextNode();
    }
    const templates = (_node$querySelectorAl = node.querySelectorAll) === null || _node$querySelectorAl === void 0 ? void 0 : _node$querySelectorAl.call(node, "template");
    if (templates) arrayForEach(templates, (tmpl) => {
      if (_isDocumentFragment(tmpl.content)) _scrubTemplateExpressions2(tmpl.content);
    });
  };
  const _isClobbered = function _isClobbered2(element) {
    const realTagName = getNodeName ? getNodeName(element) : null;
    if (typeof realTagName !== "string") return false;
    if (transformCaseFunc(realTagName) !== "form") return false;
    return typeof element.nodeName !== "string" || typeof element.textContent !== "string" || typeof element.removeChild !== "function" || element.attributes !== getAttributes(element) || typeof element.removeAttribute !== "function" || typeof element.removeAttributeNode !== "function" || typeof element.getAttributeNode !== "function" || typeof element.setAttribute !== "function" || typeof element.namespaceURI !== "string" || typeof element.insertBefore !== "function" || typeof element.hasChildNodes !== "function" || element.nodeType !== getNodeType(element) || element.childNodes !== getChildNodes(element);
  };
  const _isDocumentFragment = function _isDocumentFragment2(value) {
    if (!getNodeType || typeof value !== "object" || value === null) return false;
    try {
      return getNodeType(value) === NODE_TYPE.documentFragment;
    } catch (_) {
      return false;
    }
  };
  const _isNode = function _isNode2(value) {
    if (!getNodeType || typeof value !== "object" || value === null) return false;
    try {
      return typeof getNodeType(value) === "number";
    } catch (_) {
      return false;
    }
  };
  function _executeHooks(hooks2, currentNode, data) {
    if (hooks2.length === 0) return;
    arrayForEach(hooks2, (hook) => {
      hook.call(DOMPurify, currentNode, data, CONFIG);
    });
  }
  const _isUnsafeNode = function _isUnsafeNode2(currentNode, tagName) {
    if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.textContent) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.innerHTML)) return true;
    if (SAFE_FOR_XML && currentNode.namespaceURI === HTML_NAMESPACE && LITERAL_TEXT_ELEMENTS[tagName] && (_isNode(currentNode.firstElementChild) || typeof currentNode.textContent === "string" && regExpTest(LITERAL_TEXT_CLOSE[tagName], currentNode.textContent))) return true;
    if (currentNode.nodeType === NODE_TYPE.processingInstruction) return true;
    if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, currentNode.data)) return true;
    return false;
  };
  const _matchesNameCheck = function _matchesNameCheck2(check, name) {
    if (check instanceof RegExp) return regExpTest(check, name);
    if (check instanceof Function) {
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) args[_key - 2] = arguments[_key];
      return Boolean(check(name, ...args));
    }
    return false;
  };
  const _sanitizeDisallowedNode = function _sanitizeDisallowedNode2(currentNode, tagName, root) {
    if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) return false;
    if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
      const parentNode = getParentNode(currentNode);
      const childNodes = getChildNodes(currentNode);
      if (childNodes && parentNode) {
        const childCount = childNodes.length;
        for (let i = childCount - 1; i >= 0; --i) {
          const hoisted = currentNode === root ? cloneNode(childNodes[i], true) : childNodes[i];
          parentNode.insertBefore(hoisted, getNextSibling(currentNode));
        }
      }
    }
    _forceRemove(currentNode);
    return true;
  };
  const _forkSharedAllowlist = function _forkSharedAllowlist2(hookList, set, defaultSet, setConfigSet) {
    if (hookList.length === 0) return set;
    return set === defaultSet || set === setConfigSet ? clone(set) : set;
  };
  const _handleHookDetachedNode = function _handleHookDetachedNode2(currentNode, root) {
    if (currentNode === root || getParentNode(currentNode) !== null) return false;
    if (IN_PLACE) _neutralizeSubtree(currentNode);
    return true;
  };
  const _sanitizeElements = function _sanitizeElements2(currentNode, root) {
    _executeHooks(hooks.beforeSanitizeElements, currentNode, null);
    if (_handleHookDetachedNode(currentNode, root)) return true;
    if (_isClobbered(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    const tagName = transformCaseFunc(_readNodeName(currentNode));
    ALLOWED_TAGS = _forkSharedAllowlist(hooks.uponSanitizeElement, ALLOWED_TAGS, DEFAULT_ALLOWED_TAGS, SET_CONFIG_ALLOWED_TAGS);
    _executeHooks(hooks.uponSanitizeElement, currentNode, {
      tagName,
      allowedTags: ALLOWED_TAGS
    });
    if (_handleHookDetachedNode(currentNode, root)) return true;
    if (_isUnsafeNode(currentNode, tagName)) {
      _forceRemove(currentNode);
      return true;
    }
    if (FORBID_TAGS[tagName] || !(EXTRA_ELEMENT_HANDLING.tagCheck instanceof Function && EXTRA_ELEMENT_HANDLING.tagCheck(tagName)) && !ALLOWED_TAGS[tagName]) {
      const removed = _sanitizeDisallowedNode(currentNode, tagName, root);
      if (removed === false) {
        _executeHooks(hooks.afterSanitizeElements, currentNode, null);
        if (_handleHookDetachedNode(currentNode, root)) return true;
      }
      return removed;
    }
    if (_readNodeType(currentNode) === NODE_TYPE.element && !_checkValidNamespace(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    if ((tagName === "noscript" || tagName === "noembed" || tagName === "noframes") && regExpTest(FALLBACK_TAG_CLOSE, currentNode.innerHTML)) {
      _forceRemove(currentNode);
      return true;
    }
    if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
      const content = _stripTemplateExpressions(currentNode.textContent);
      if (currentNode.textContent !== content) {
        arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
        currentNode.textContent = content;
      }
    }
    _executeHooks(hooks.afterSanitizeElements, currentNode, null);
    return _handleHookDetachedNode(currentNode, root);
  };
  const _isValidAttribute = function _isValidAttribute2(lcTag, lcName, value) {
    if (FORBID_ATTR[lcName]) return false;
    if (_isPatchLinkageAttribute(lcName, lcTag)) return false;
    if (SANITIZE_DOM && (lcName === "id" || lcName === "name") && (value in document2 || value in formElement)) return false;
    const nameIsPermitted = ALLOWED_ATTR[lcName] || EXTRA_ELEMENT_HANDLING.attributeCheck instanceof Function && EXTRA_ELEMENT_HANDLING.attributeCheck(lcName, lcTag);
    if (ALLOW_DATA_ATTR && regExpTest(DATA_ATTR$1, lcName)) return true;
    if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$1, lcName)) return true;
    if (!nameIsPermitted) return _isBasicCustomElement(lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName, lcTag) || lcName === "is" && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value);
    if (URI_SAFE_ATTRIBUTES[lcName]) return true;
    if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) return true;
    if ((lcName === "src" || lcName === "xlink:href" || lcName === "href") && lcTag !== "script" && stringIndexOf(value, "data:") === 0 && DATA_URI_TAGS[lcTag]) return true;
    if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) return true;
    return !value;
  };
  const RESERVED_CUSTOM_ELEMENT_NAMES = addToSet({}, [
    "annotation-xml",
    "color-profile",
    "font-face",
    "font-face-format",
    "font-face-name",
    "font-face-src",
    "font-face-uri",
    "missing-glyph"
  ]);
  const _isBasicCustomElement = function _isBasicCustomElement2(tagName) {
    return !RESERVED_CUSTOM_ELEMENT_NAMES[stringToLowerCase(tagName)] && regExpTest(CUSTOM_ELEMENT$1, tagName);
  };
  const _applyTrustedTypesToAttribute = function _applyTrustedTypesToAttribute2(lcTag, lcName, namespaceURI, value) {
    if (trustedTypesPolicy && typeof trustedTypes === "object" && typeof trustedTypes.getAttributeType === "function" && !namespaceURI) switch (trustedTypes.getAttributeType(lcTag, lcName)) {
      case "TrustedHTML":
        return _createTrustedHTML(value);
      case "TrustedScriptURL":
        return _createTrustedScriptURL(value);
    }
    return value;
  };
  const _setAttributeValue = function _setAttributeValue2(currentNode, name, namespaceURI, value) {
    try {
      if (namespaceURI) currentNode.setAttributeNS(namespaceURI, name, value);
      else currentNode.setAttribute(name, value);
      if (_isClobbered(currentNode)) {
        _forceRemove(currentNode);
        return false;
      }
      return true;
    } catch (_) {
      _removeAttribute(name, currentNode);
      return false;
    }
  };
  const _sanitizeAttributes = function _sanitizeAttributes2(currentNode, root) {
    _executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
    if (_handleHookDetachedNode(currentNode, root)) return;
    const attributes = currentNode.attributes;
    if (!attributes || _isClobbered(currentNode)) return;
    ALLOWED_ATTR = _forkSharedAllowlist(hooks.uponSanitizeAttribute, ALLOWED_ATTR, DEFAULT_ALLOWED_ATTR, SET_CONFIG_ALLOWED_ATTR);
    const hookEvent = {
      attrName: "",
      attrValue: "",
      keepAttr: true,
      allowedAttributes: ALLOWED_ATTR,
      forceKeepAttr: void 0
    };
    let l = attributes.length;
    const lcTag = transformCaseFunc(currentNode.nodeName);
    while (l--) {
      const attr = attributes[l];
      const name = attr.name, namespaceURI = attr.namespaceURI, attrValue = attr.value;
      const lcName = transformCaseFunc(name);
      const initValue = attrValue;
      let value = name === "value" ? initValue : stringTrim(initValue);
      let recreatedNamedProp = false;
      hookEvent.attrName = lcName;
      hookEvent.attrValue = value;
      hookEvent.keepAttr = true;
      hookEvent.forceKeepAttr = void 0;
      _executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
      value = hookEvent.attrValue;
      if (SANITIZE_NAMED_PROPS && (lcName === "id" || lcName === "name") && stringIndexOf(value, SANITIZE_NAMED_PROPS_PREFIX) !== 0) {
        _removeAttribute(name, currentNode, attr);
        value = SANITIZE_NAMED_PROPS_PREFIX + value;
        recreatedNamedProp = true;
      }
      if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, value)) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      if (lcName === "attributename" && stringMatch(value, "href")) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      if (hookEvent.forceKeepAttr) continue;
      if (!hookEvent.keepAttr) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(SELF_CLOSING_TAG, value)) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      if (SAFE_FOR_TEMPLATES) value = _stripTemplateExpressions(value);
      if (!_isValidAttribute(lcTag, lcName, value)) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      value = _applyTrustedTypesToAttribute(lcTag, lcName, namespaceURI, value);
      if (value !== initValue) {
        if (_setAttributeValue(currentNode, name, namespaceURI, value) && recreatedNamedProp) arrayPop(DOMPurify.removed);
      }
    }
    _executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
    _handleHookDetachedNode(currentNode, root);
  };
  const _sanitizeShadowDOM2 = function _sanitizeShadowDOM(fragment) {
    let shadowNode = null;
    const shadowIterator = _createNodeIterator(fragment);
    _executeHooks(hooks.beforeSanitizeShadowDOM, fragment, null);
    while (shadowNode = shadowIterator.nextNode()) {
      _executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
      _sanitizeElements(shadowNode, fragment);
      _sanitizeAttributes(shadowNode, fragment);
      if (_isDocumentFragment(shadowNode.content)) _sanitizeShadowDOM2(shadowNode.content);
      if (_readNodeType(shadowNode) === NODE_TYPE.element) {
        const innerSr = getShadowRoot(shadowNode);
        if (_isDocumentFragment(innerSr)) {
          _sanitizeAttachedShadowRoots(innerSr);
          _sanitizeShadowDOM2(innerSr);
        }
      }
    }
    _executeHooks(hooks.afterSanitizeShadowDOM, fragment, null);
  };
  const _sanitizeAttachedShadowRoots = function _sanitizeAttachedShadowRoots2(root) {
    const stack = [{
      node: root,
      shadow: null
    }];
    while (stack.length > 0) {
      const item = stack.pop();
      if (item.shadow) {
        _sanitizeShadowDOM2(item.shadow);
        continue;
      }
      const node = item.node;
      const isElement = _readNodeType(node) === NODE_TYPE.element;
      const childNodes = getChildNodes(node);
      if (childNodes) for (let i = childNodes.length - 1; i >= 0; --i) stack.push({
        node: childNodes[i],
        shadow: null
      });
      if (isElement) {
        const rootName = getNodeName ? getNodeName(node) : null;
        if (typeof rootName === "string" && transformCaseFunc(rootName) === "template") {
          const content = node.content;
          if (_isDocumentFragment(content)) stack.push({
            node: content,
            shadow: null
          });
        }
      }
      if (isElement) {
        const sr = getShadowRoot(node);
        if (_isDocumentFragment(sr)) stack.push({
          node: null,
          shadow: sr
        }, {
          node: sr,
          shadow: null
        });
      }
    }
  };
  DOMPurify.sanitize = function(dirty) {
    let cfg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    let body = null;
    let importedNode = null;
    let currentNode = null;
    let returnNode = null;
    IS_EMPTY_INPUT = !dirty;
    if (IS_EMPTY_INPUT) dirty = "<!-->";
    if (typeof dirty !== "string" && !_isNode(dirty)) {
      dirty = stringifyValue(dirty);
      if (typeof dirty !== "string") throw typeErrorCreate("dirty is not a string, aborting");
    }
    if (!DOMPurify.isSupported) return dirty;
    if (SET_CONFIG) {
      ALLOWED_TAGS = SET_CONFIG_ALLOWED_TAGS;
      ALLOWED_ATTR = SET_CONFIG_ALLOWED_ATTR;
    } else _parseConfig(cfg);
    if (hooks.uponSanitizeElement.length > 0 || hooks.uponSanitizeAttribute.length > 0) ALLOWED_TAGS = clone(ALLOWED_TAGS);
    if (hooks.uponSanitizeAttribute.length > 0) ALLOWED_ATTR = clone(ALLOWED_ATTR);
    DOMPurify.removed = [];
    const inPlace = IN_PLACE && typeof dirty !== "string" && _isNode(dirty);
    if (inPlace) {
      _neutralizePatchLinkage(dirty);
      const nn = _readNodeName(dirty);
      if (typeof nn === "string") {
        const tagName = transformCaseFunc(nn);
        if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
          _neutralizeRoot(dirty);
          throw typeErrorCreate("root node is forbidden and cannot be sanitized in-place");
        }
      }
      if (_isClobbered(dirty)) {
        _neutralizeRoot(dirty);
        throw typeErrorCreate("root node is clobbered and cannot be sanitized in-place");
      }
      try {
        _sanitizeAttachedShadowRoots(dirty);
      } catch (error) {
        _neutralizeRoot(dirty);
        throw error;
      }
    } else if (_isNode(dirty)) {
      body = _initDocument("<!---->");
      importedNode = body.ownerDocument.importNode(dirty, true);
      if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === "BODY") body = importedNode;
      else if (importedNode.nodeName === "HTML") body = importedNode;
      else body.appendChild(importedNode);
      _sanitizeAttachedShadowRoots(body);
    } else {
      if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && dirty.indexOf("<") === -1) return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(dirty) : dirty;
      body = _initDocument(dirty);
      if (!body) return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : "";
    }
    if (body && FORCE_BODY) _forceRemove(body.firstChild);
    const walkRoot = inPlace ? dirty : body;
    try {
      const nodeIterator = _createNodeIterator(walkRoot);
      while (currentNode = nodeIterator.nextNode()) {
        _sanitizeElements(currentNode, walkRoot);
        _sanitizeAttributes(currentNode, walkRoot);
        if (_isDocumentFragment(currentNode.content)) _sanitizeShadowDOM2(currentNode.content);
      }
    } catch (error) {
      if (inPlace) {
        _neutralizeRoot(dirty);
        arrayForEach(DOMPurify.removed, (entry) => {
          if (entry.element) _neutralizeSubtree(entry.element);
        });
      }
      throw error;
    }
    if (inPlace) {
      let rootWasRemoved = false;
      arrayForEach(DOMPurify.removed, (entry) => {
        if (entry.element) {
          if (entry.element === dirty) rootWasRemoved = true;
          _neutralizeSubtree(entry.element);
        }
      });
      if (rootWasRemoved) throw typeErrorCreate("a node selected for removal could not be safely returned; refusing to sanitize in place");
      if (SAFE_FOR_TEMPLATES) _scrubTemplateExpressions2(dirty);
      return dirty;
    }
    if (RETURN_DOM) {
      if (SAFE_FOR_TEMPLATES) _scrubTemplateExpressions2(body);
      if (RETURN_DOM_FRAGMENT) {
        returnNode = createDocumentFragment.call(body.ownerDocument);
        while (body.firstChild) returnNode.appendChild(body.firstChild);
      } else returnNode = body;
      if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) returnNode = importNode.call(originalDocument, returnNode, true);
      return returnNode;
    }
    let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
    if (WHOLE_DOCUMENT && ALLOWED_TAGS["!doctype"] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) serializedHTML = "<!DOCTYPE " + body.ownerDocument.doctype.name + ">\n" + serializedHTML;
    if (SAFE_FOR_TEMPLATES) serializedHTML = _stripTemplateExpressions(serializedHTML);
    return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(serializedHTML) : serializedHTML;
  };
  DOMPurify.setConfig = function() {
    let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    _parseConfig(cfg);
    SET_CONFIG = true;
    SET_CONFIG_ALLOWED_TAGS = ALLOWED_TAGS;
    SET_CONFIG_ALLOWED_ATTR = ALLOWED_ATTR;
  };
  DOMPurify.clearConfig = function() {
    CONFIG = null;
    SET_CONFIG = false;
    SET_CONFIG_ALLOWED_TAGS = null;
    SET_CONFIG_ALLOWED_ATTR = null;
    trustedTypesPolicy = defaultTrustedTypesPolicy;
    emptyHTML = "";
  };
  DOMPurify.isValidAttribute = function(tag2, attr, value) {
    if (!CONFIG) _parseConfig({});
    const lcTag = transformCaseFunc(tag2);
    const lcName = transformCaseFunc(attr);
    return _isValidAttribute(lcTag, lcName, value);
  };
  DOMPurify.addHook = function(entryPoint, hookFunction) {
    if (typeof hookFunction !== "function") return;
    if (!objectHasOwnProperty(hooks, entryPoint)) return;
    arrayPush(hooks[entryPoint], hookFunction);
  };
  DOMPurify.removeHook = function(entryPoint, hookFunction) {
    if (!objectHasOwnProperty(hooks, entryPoint)) return;
    if (hookFunction !== void 0) {
      const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
      return index === -1 ? void 0 : arraySplice(hooks[entryPoint], index, 1)[0];
    }
    return arrayPop(hooks[entryPoint]);
  };
  DOMPurify.removeHooks = function(entryPoint) {
    if (!objectHasOwnProperty(hooks, entryPoint)) return;
    hooks[entryPoint] = [];
  };
  DOMPurify.removeAllHooks = function() {
    hooks = _createHooksMap();
  };
  return DOMPurify;
}
var purify_default = createDOMPurify();

// ../../node_modules/.pnpm/html-react-parser@5.2.17_@types+react@18.3.12_react@18.3.1/node_modules/html-react-parser/esm/index.mjs
var import_lib = __toESM(require_lib4(), 1);
var import_lib2 = __toESM(require_lib4(), 1);
var esm_default = import_lib.default.default || import_lib.default;

// ../../node_modules/.pnpm/@ant-design+x-markdown@2.9._a775707fb3dd5b8f608e56bd9e660169/node_modules/@ant-design/x-markdown/es/XMarkdown/core/Renderer.js
import React8 from "react";

// ../../node_modules/.pnpm/@ant-design+x-markdown@2.9._a775707fb3dd5b8f608e56bd9e660169/node_modules/@ant-design/x-markdown/es/XMarkdown/AnimationText.js
import React7, { useEffect as useEffect9, useMemo as useMemo16, useRef as useRef6, useState as useState7 } from "react";
var AnimationText = /* @__PURE__ */ React7.memo((props) => {
  const {
    text: text2,
    animationConfig
  } = props;
  const {
    fadeDuration = 200,
    easing = "ease-in-out"
  } = animationConfig || {};
  const [chunks, setChunks] = useState7([]);
  const prevTextRef = useRef6("");
  useEffect9(() => {
    if (text2 === prevTextRef.current) return;
    if (!(prevTextRef.current && text2.indexOf(prevTextRef.current) === 0)) {
      setChunks([text2]);
      prevTextRef.current = text2;
      return;
    }
    const newText = text2.slice(prevTextRef.current.length);
    if (!newText) return;
    setChunks((prev) => [...prev, newText]);
    prevTextRef.current = text2;
  }, [text2]);
  const animationStyle = useMemo16(() => ({
    animation: `x-markdown-fade-in ${fadeDuration}ms ${easing} forwards`,
    color: "inherit"
  }), [fadeDuration, easing]);
  return /* @__PURE__ */ React7.createElement(React7.Fragment, null, chunks.map((text3, index) => /* @__PURE__ */ React7.createElement("span", {
    style: animationStyle,
    key: `animation-text-${index}`
  }, text3)));
});
var AnimationText_default = AnimationText;

// ../../node_modules/.pnpm/@ant-design+x-markdown@2.9._a775707fb3dd5b8f608e56bd9e660169/node_modules/@ant-design/x-markdown/es/XMarkdown/core/detectUnclosedComponentTags.js
var WHITESPACE_REGEX = /\s/;
var TAG_NAME_CHAR_REGEX = /[a-zA-Z0-9-]/;
var VOID_ELEMENTS = /* @__PURE__ */ new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
var COMMENT_START = "<!--";
var COMMENT_END = "-->";
var CDATA_START = "<![CDATA[";
var CDATA_END = "]]>";
var getTagInstanceId = (tagName, instance) => `${tagName}-${instance}`;
var skipComment = (html3, pos) => {
  if (!html3.startsWith(COMMENT_START, pos)) {
    return pos;
  }
  const endPos = html3.indexOf(COMMENT_END, pos + COMMENT_START.length);
  return endPos === -1 ? html3.length : endPos + COMMENT_END.length;
};
var skipCDATA = (html3, pos) => {
  if (!html3.startsWith(CDATA_START, pos)) {
    return pos;
  }
  const endPos = html3.indexOf(CDATA_END, pos + CDATA_START.length);
  return endPos === -1 ? html3.length : endPos + CDATA_END.length;
};
var parseClosingTag = (html3, pos) => {
  if (html3[pos + 1] !== "/") {
    return null;
  }
  let scanPos = pos + 2;
  let tagName = "";
  while (scanPos < html3.length && WHITESPACE_REGEX.test(html3[scanPos])) {
    scanPos++;
  }
  while (scanPos < html3.length && TAG_NAME_CHAR_REGEX.test(html3[scanPos])) {
    tagName += html3[scanPos];
    scanPos++;
  }
  while (scanPos < html3.length && WHITESPACE_REGEX.test(html3[scanPos])) {
    scanPos++;
  }
  if (!tagName || html3[scanPos] !== ">") {
    return null;
  }
  return {
    tagName: tagName.toLowerCase(),
    endPos: scanPos + 1
  };
};
var parseOpeningTag = (html3, pos) => {
  let scanPos = pos + 1;
  let tagName = "";
  while (scanPos < html3.length && TAG_NAME_CHAR_REGEX.test(html3[scanPos])) {
    tagName += html3[scanPos];
    scanPos++;
  }
  if (!tagName) {
    return null;
  }
  let foundEnd = false;
  let isSelfClosing = false;
  while (scanPos < html3.length) {
    if (html3[scanPos] === ">") {
      foundEnd = true;
      isSelfClosing = html3[scanPos - 1] === "/";
      break;
    }
    if (html3[scanPos] === '"' || html3[scanPos] === "'") {
      const quoteChar = html3[scanPos];
      scanPos++;
      while (scanPos < html3.length) {
        if (html3[scanPos] === "\\" && scanPos + 1 < html3.length) {
          scanPos += 2;
          continue;
        }
        if (html3[scanPos] === quoteChar) {
          scanPos++;
          break;
        }
        scanPos++;
      }
      continue;
    }
    scanPos++;
  }
  return {
    tagName: tagName.toLowerCase(),
    endPos: foundEnd ? scanPos + 1 : html3.length,
    foundEnd,
    isSelfClosing
  };
};
function detectUnclosedComponentTags(html3, componentNames) {
  const trackedTags = new Set(Array.from(componentNames, (tagName) => tagName.toLowerCase()));
  if (trackedTags.size === 0 || html3.length === 0) {
    return /* @__PURE__ */ new Set();
  }
  const unclosedTags = /* @__PURE__ */ new Set();
  const tagCounts = {};
  const openTagIndexes = {};
  let pos = 0;
  while (pos < html3.length) {
    const afterComment = skipComment(html3, pos);
    if (afterComment !== pos) {
      pos = afterComment;
      continue;
    }
    const afterCDATA = skipCDATA(html3, pos);
    if (afterCDATA !== pos) {
      pos = afterCDATA;
      continue;
    }
    if (html3[pos] !== "<") {
      pos++;
      continue;
    }
    const closingTag = parseClosingTag(html3, pos);
    if (closingTag) {
      const pendingIndexes = openTagIndexes[closingTag.tagName];
      if (trackedTags.has(closingTag.tagName) && pendingIndexes?.length) {
        pendingIndexes.pop();
      }
      pos = closingTag.endPos;
      continue;
    }
    const openingTag = parseOpeningTag(html3, pos);
    if (!openingTag || !trackedTags.has(openingTag.tagName)) {
      pos++;
      continue;
    }
    tagCounts[openingTag.tagName] = (tagCounts[openingTag.tagName] ?? 0) + 1;
    const instance = tagCounts[openingTag.tagName];
    if (!openingTag.foundEnd) {
      unclosedTags.add(getTagInstanceId(openingTag.tagName, instance));
    } else if (!openingTag.isSelfClosing && !VOID_ELEMENTS.has(openingTag.tagName)) {
      var _openingTag$tagName;
      openTagIndexes[_openingTag$tagName = openingTag.tagName] ?? (openTagIndexes[_openingTag$tagName] = []);
      openTagIndexes[openingTag.tagName].push(instance);
    }
    pos = openingTag.endPos;
  }
  for (const [tagName, pendingIndexes] of Object.entries(openTagIndexes)) {
    pendingIndexes.forEach((instance) => {
      unclosedTags.add(getTagInstanceId(tagName, instance));
    });
  }
  return unclosedTags;
}

// ../../node_modules/.pnpm/@ant-design+x-markdown@2.9._a775707fb3dd5b8f608e56bd9e660169/node_modules/@ant-design/x-markdown/es/XMarkdown/core/Renderer.js
var patchedDOMPurify = null;
function createPatchedDOMPurify() {
  if (patchedDOMPurify) return patchedDOMPurify;
  if (typeof window !== "undefined" && typeof Node !== "undefined") {
    try {
      const template = document.createElement("template");
      template.innerHTML = "<test-detect></test-detect>";
      const testEl = template.content.firstChild;
      if (testEl) {
        const nodeNameGetter = Object.getOwnPropertyDescriptor(Node.prototype, "nodeName")?.get;
        const nodeValueGetter = Object.getOwnPropertyDescriptor(Node.prototype, "nodeValue")?.get;
        const needsNodeNamePatch = nodeNameGetter && testEl.nodeName && !nodeNameGetter.call(testEl);
        if (needsNodeNamePatch) {
          const originalNodeNameGet = nodeNameGetter;
          Object.defineProperty(Node.prototype, "nodeName", {
            get: function() {
              const value = originalNodeNameGet.call(this);
              if (value) return value;
              if (this.nodeType === 1 && "tagName" in this) {
                return this.tagName;
              }
              switch (this.nodeType) {
                case 3:
                  return "#text";
                case 4:
                  return "#cdata-section";
                case 7:
                  return "#processing-instruction";
                case 8:
                  return "#comment";
                case 9:
                  return "#document";
                case 11:
                  return "#document-fragment";
              }
              return value;
            },
            configurable: true,
            enumerable: true
          });
        }
        const needsNodeValuePatch = nodeValueGetter && (() => {
          template.innerHTML = "<div>test</div>";
          const textNode = template.content.firstChild?.firstChild;
          if (!textNode) return false;
          const viaGetter = nodeValueGetter.call(textNode);
          const viaDirect = textNode.nodeValue;
          return viaDirect != null && viaGetter == null;
        })();
        if (needsNodeValuePatch) {
          const originalNodeValueGet = nodeValueGetter;
          Object.defineProperty(Node.prototype, "nodeValue", {
            get: function() {
              const value = originalNodeValueGet.call(this);
              if (value !== null && value !== void 0) return value;
              if ((this.nodeType === 3 || this.nodeType === 4 || this.nodeType === 8) && "data" in this) {
                return this.data;
              }
              return value;
            },
            configurable: true,
            enumerable: true
          });
        }
        if (needsNodeNamePatch || needsNodeValuePatch) {
          patchedDOMPurify = purify_default(window);
          return patchedDOMPurify;
        }
      }
    } catch {
    }
  }
  patchedDOMPurify = purify_default;
  return patchedDOMPurify;
}
var Renderer = class _Renderer2 {
  options;
  static NON_WHITESPACE_REGEX = /[^\r\n\s]+/;
  constructor(options2) {
    this.options = options2;
  }
  detectUnclosedTags(htmlString) {
    return detectUnclosedComponentTags(htmlString, Object.keys(this.options.components ?? {}));
  }
  /**
   * Configure DOMPurify to preserve components and target attributes, filter everything else
   */
  configureDOMPurify() {
    const customComponents = Object.keys(this.options.components || {});
    const userConfig = this.options.dompurifyConfig || {};
    const allowedTags = Array.isArray(userConfig.ADD_TAGS) ? userConfig.ADD_TAGS : [];
    const addAttr = Array.isArray(userConfig.ADD_ATTR) ? userConfig.ADD_ATTR : [];
    return {
      ...userConfig,
      ADD_TAGS: Array.from(/* @__PURE__ */ new Set([...customComponents, ...allowedTags])),
      ADD_ATTR: Array.from(/* @__PURE__ */ new Set(["target", "rel", ...addAttr]))
    };
  }
  createReplaceElement(unclosedTags, cidRef) {
    const {
      enableAnimation,
      animationConfig
    } = this.options.streaming || {};
    return (domNode) => {
      const key = `x-markdown-component-${cidRef.current++}`;
      const isValidTextNode = domNode.type === "text" && domNode.data && _Renderer2.NON_WHITESPACE_REGEX.test(domNode.data);
      const parentTagName = domNode.parent?.name;
      const isParentCustomComponent = parentTagName && this.options.components?.[parentTagName];
      const shouldReplaceText = enableAnimation && isValidTextNode && !isParentCustomComponent;
      if (shouldReplaceText) {
        return /* @__PURE__ */ React8.createElement(AnimationText_default, {
          text: domNode.data,
          key,
          animationConfig
        });
      }
      if (!("name" in domNode)) return;
      const {
        name,
        attribs,
        children
      } = domNode;
      const renderElement = this.options.components?.[name];
      if (renderElement) {
        cidRef.tagIndexes[name] = (cidRef.tagIndexes[name] ?? 0) + 1;
        const streamStatus = unclosedTags?.has(getTagInstanceId(name, cidRef.tagIndexes[name])) ? "loading" : "done";
        const props = {
          domNode,
          streamStatus,
          key,
          ...attribs,
          ...attribs.disabled !== void 0 && {
            disabled: true
          },
          ...attribs.checked !== void 0 && {
            checked: true
          }
        };
        const classes = [props.className, props.classname, props.class].filter(Boolean).join(" ").trim();
        props.className = classes || "";
        if (name === "code") {
          const {
            "data-block": block2 = "false",
            "data-state": codeStreamStatus = "done"
          } = attribs || {};
          props.block = block2 === "true";
          props.streamStatus = codeStreamStatus === "loading" ? "loading" : "done";
          const langFromData = attribs?.["data-lang"];
          const langFromClass = attribs?.class?.match(/(?:^|\s)language-([^\s]+)/)?.[1] ?? attribs?.class?.match(/(?:^|\s)lang-([^\s]+)/)?.[1];
          const lang = langFromData || langFromClass;
          if (lang) {
            props.lang = lang;
          }
        }
        if (children) {
          props.children = this.processChildren(children, unclosedTags, cidRef);
        }
        return /* @__PURE__ */ React8.createElement(renderElement, props);
      }
    };
  }
  processChildren(children, unclosedTags, cidRef) {
    return (0, import_lib2.domToReact)(children, {
      replace: this.createReplaceElement(unclosedTags, cidRef)
    });
  }
  processHtml(htmlString) {
    if (typeof purify_default.sanitize !== "function") {
      return null;
    }
    const unclosedTags = this.detectUnclosedTags(htmlString);
    const cidRef = {
      current: 0,
      tagIndexes: {}
    };
    const purify = createPatchedDOMPurify();
    const purifyConfig = this.configureDOMPurify();
    const cleanHtml = purify.sanitize(htmlString, purifyConfig);
    return esm_default(cleanHtml, {
      replace: this.createReplaceElement(unclosedTags, cidRef)
    });
  }
  render(html3) {
    return this.processHtml(html3);
  }
};
var Renderer_default = Renderer;

// ../../node_modules/.pnpm/@ant-design+x-markdown@2.9._a775707fb3dd5b8f608e56bd9e660169/node_modules/@ant-design/x-markdown/es/XMarkdown/DebugPanel/DebugPanel.js
import React9, { useCallback as useCallback8, useEffect as useEffect10, useRef as useRef7, useState as useState8 } from "react";
var CONSTANTS = {
  FPS_THRESHOLD: {
    GOOD: 55,
    WARNING: 40
  },
  COLORS: {
    GOOD: "#52c41a",
    WARNING: "#faad14",
    DANGER: "#ff4d4f"
  },
  CHART: {
    WIDTH: 750,
    HEIGHT: 400,
    PADDING: 80
  }
};
var getInitialPosition = () => {
  if (typeof window === "undefined") {
    return {
      x: 12,
      y: 12
    };
  }
  return {
    x: window.innerWidth - 220,
    y: window.innerHeight / 2 - 100
  };
};
var DebugPanel = () => {
  const [fps, setFps] = useState8(0);
  const [memory, setMemory] = useState8(0);
  const [isRecording, setIsRecording] = useState8(false);
  const [showModal, setShowModal] = useState8(false);
  const [records, setRecords] = useState8([]);
  const [position, setPosition] = useState8(getInitialPosition());
  const [isMounted, setIsMounted] = useState8(false);
  const recordingRef = useRef7([]);
  const frameTimesRef = useRef7([]);
  const lastTimeRef = useRef7(0);
  const frameCountRef = useRef7(0);
  const animationRef = useRef7(void 0);
  const dragRef = useRef7({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0
  });
  useEffect10(() => {
    if (typeof window === "undefined") return;
    if (!isMounted) {
      setIsMounted(true);
      lastTimeRef.current = performance.now();
    }
    const update = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) frameTimesRef.current.shift();
      frameCountRef.current++;
      if (delta >= 1e3) {
        const currentFps = Math.round(frameCountRef.current * 1e3 / delta);
        const currentMemory = getMemoryUsage();
        setFps(currentFps);
        setMemory(currentMemory);
        if (isRecording) {
          recordingRef.current.push({
            timestamp: Date.now(),
            fps: currentFps,
            memory: currentMemory
          });
        }
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      animationRef.current = requestAnimationFrame(update);
    };
    animationRef.current = requestAnimationFrame(update);
    return () => {
      if (animationRef.current !== void 0) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, isMounted]);
  const getMemoryUsage = () => {
    const perf = performance;
    return perf.memory ? Math.round(perf.memory.usedJSHeapSize / 1024 / 1024) : 0;
  };
  const formatMemory = (mb) => {
    if (mb < 1) return `${Math.round(mb * 1024)} KB`;
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(2)} MB`;
  };
  const getFpsColor = (value) => {
    if (value >= CONSTANTS.FPS_THRESHOLD.GOOD) return CONSTANTS.COLORS.GOOD;
    if (value >= CONSTANTS.FPS_THRESHOLD.WARNING) return CONSTANTS.COLORS.WARNING;
    return CONSTANTS.COLORS.DANGER;
  };
  const toggleRecording = useCallback8(() => {
    if (isRecording) {
      setIsRecording(false);
      setRecords([...recordingRef.current]);
      setShowModal(true);
    } else {
      recordingRef.current = [];
      setIsRecording(true);
    }
  }, [isRecording]);
  const handleMouseDown = useCallback8((e) => {
    if (e.target.closest(".x-markdown-debug-action")) return;
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
  }, [position]);
  const handleMouseMove = useCallback8((e) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy
    });
  }, []);
  const handleMouseUp = useCallback8(() => {
    dragRef.current.isDragging = false;
  }, []);
  useEffect10(() => {
    if (typeof window === "undefined") return;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  const PerformanceChart = () => {
    if (!records.length) return null;
    const {
      WIDTH,
      HEIGHT,
      PADDING
    } = CONSTANTS.CHART;
    const chartWidth = WIDTH - PADDING * 2;
    const chartHeight = HEIGHT - PADDING * 2;
    const startTime = records[0]?.timestamp ?? 0;
    const endTime = records[records.length - 1]?.timestamp ?? 0;
    const duration = endTime - startTime || 1;
    const maxFps = Math.max(...records.map((r) => r.fps), 60);
    const maxMemory = Math.max(...records.map((r) => r.memory), 0) * 1.1;
    const avgFps = records.length > 0 ? records.reduce((sum, r) => sum + r.fps, 0) / records.length : 0;
    const avgMemory = records.length > 0 ? records.reduce((sum, r) => sum + r.memory, 0) / records.length : 0;
    const minFps = records.length > 0 ? Math.min(...records.map((r) => r.fps)) : 0;
    const maxFpsValue = records.length > 0 ? Math.max(...records.map((r) => r.fps)) : 0;
    const createPoints = (key, max) => records.map((r) => {
      const x = PADDING + (r.timestamp - startTime) / duration * chartWidth;
      const y = PADDING + chartHeight - r[key] / max * chartHeight;
      return `${x},${y}`;
    }).join(" ");
    return /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-modal-content"
    }, /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stats-summary"
    }, /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stat-item"
    }, /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stat-label"
    }, "Duration"), /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stat-value"
    }, (duration / 1e3).toFixed(2), "s")), /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stat-item"
    }, /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stat-label"
    }, "FPS Avg"), /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stat-value",
      style: {
        color: getFpsColor(avgFps)
      }
    }, avgFps.toFixed(1))), /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stat-item"
    }, /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stat-label"
    }, "FPS Range"), /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stat-value"
    }, minFps, " - ", maxFpsValue)), /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stat-item"
    }, /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stat-label"
    }, "Memory Avg"), /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-stat-value"
    }, formatMemory(avgMemory)))), /* @__PURE__ */ React9.createElement("svg", {
      width: WIDTH,
      height: HEIGHT,
      className: "x-markdown-debug-chart-full",
      role: "img",
      "aria-label": "Performance chart showing FPS and memory usage over time"
    }, /* @__PURE__ */ React9.createElement("title", null, "Performance Chart"), [0, 0.25, 0.5, 0.75, 1].map((ratio) => /* @__PURE__ */ React9.createElement("g", {
      key: ratio
    }, /* @__PURE__ */ React9.createElement("line", {
      x1: PADDING,
      y1: PADDING + chartHeight * ratio,
      x2: WIDTH - PADDING,
      y2: PADDING + chartHeight * ratio,
      stroke: "rgba(255,255,255,0.1)",
      strokeWidth: "1"
    }), /* @__PURE__ */ React9.createElement("line", {
      x1: PADDING + chartWidth * ratio,
      y1: PADDING,
      x2: PADDING + chartWidth * ratio,
      y2: HEIGHT - PADDING,
      stroke: "rgba(255,255,255,0.1)",
      strokeWidth: "1"
    }))), /* @__PURE__ */ React9.createElement("polyline", {
      points: createPoints("fps", maxFps),
      fill: "none",
      stroke: CONSTANTS.COLORS.GOOD,
      strokeWidth: "2",
      className: "fps-line"
    }), /* @__PURE__ */ React9.createElement("polyline", {
      points: createPoints("memory", maxMemory),
      fill: "none",
      stroke: "#1890ff",
      strokeWidth: "2",
      className: "memory-line"
    }), /* @__PURE__ */ React9.createElement("text", {
      x: PADDING - 10,
      y: PADDING,
      fill: CONSTANTS.COLORS.GOOD,
      fontSize: "12",
      textAnchor: "end"
    }, maxFps.toFixed(0)), /* @__PURE__ */ React9.createElement("text", {
      x: PADDING - 10,
      y: HEIGHT - PADDING,
      fill: CONSTANTS.COLORS.GOOD,
      fontSize: "12",
      textAnchor: "end"
    }, "0"), /* @__PURE__ */ React9.createElement("text", {
      x: PADDING - 10,
      y: PADDING - 15,
      fill: CONSTANTS.COLORS.GOOD,
      fontSize: "14",
      fontWeight: "bold",
      textAnchor: "end"
    }, "FPS"), /* @__PURE__ */ React9.createElement("text", {
      x: WIDTH - PADDING + 10,
      y: PADDING + 20,
      fill: "#1890ff",
      fontSize: "12",
      textAnchor: "start"
    }, formatMemory(maxMemory)), /* @__PURE__ */ React9.createElement("text", {
      x: WIDTH - PADDING + 10,
      y: HEIGHT - PADDING,
      fill: "#1890ff",
      fontSize: "12",
      textAnchor: "start"
    }, formatMemory(0)), /* @__PURE__ */ React9.createElement("text", {
      x: WIDTH - PADDING + 10,
      y: PADDING + 5,
      fill: "#1890ff",
      fontSize: "14",
      fontWeight: "bold",
      textAnchor: "start"
    }, "Memory"), /* @__PURE__ */ React9.createElement("text", {
      x: PADDING,
      y: HEIGHT - PADDING + 20,
      fill: "rgba(255,255,255,0.6)",
      fontSize: "12",
      textAnchor: "middle"
    }, "0s"), /* @__PURE__ */ React9.createElement("text", {
      x: WIDTH - PADDING,
      y: HEIGHT - PADDING + 20,
      fill: "rgba(255,255,255,0.6)",
      fontSize: "12",
      textAnchor: "middle"
    }, (duration / 1e3).toFixed(1), "s")), /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-legend"
    }, /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-legend-item"
    }, /* @__PURE__ */ React9.createElement("span", {
      className: "x-markdown-debug-legend-color",
      style: {
        backgroundColor: CONSTANTS.COLORS.GOOD
      }
    }), /* @__PURE__ */ React9.createElement("span", null, "FPS")), /* @__PURE__ */ React9.createElement("div", {
      className: "x-markdown-debug-legend-item"
    }, /* @__PURE__ */ React9.createElement("span", {
      className: "x-markdown-debug-legend-color",
      style: {
        backgroundColor: "#1890ff"
      }
    }), /* @__PURE__ */ React9.createElement("span", null, "Memory"))));
  };
  return /* @__PURE__ */ React9.createElement(React9.Fragment, null, /* @__PURE__ */ React9.createElement("div", {
    className: "x-markdown-debug-panel",
    style: {
      left: position.x,
      top: position.y,
      cursor: dragRef.current.isDragging ? "grabbing" : "grab"
    },
    onMouseDown: handleMouseDown
  }, /* @__PURE__ */ React9.createElement("div", {
    className: "x-markdown-debug-row"
  }, /* @__PURE__ */ React9.createElement("span", {
    className: "x-markdown-debug-label"
  }, "FPS"), /* @__PURE__ */ React9.createElement("span", {
    className: "x-markdown-debug-value",
    style: {
      color: getFpsColor(fps)
    }
  }, fps)), /* @__PURE__ */ React9.createElement("div", {
    className: "x-markdown-debug-row"
  }, /* @__PURE__ */ React9.createElement("span", {
    className: "x-markdown-debug-label"
  }, "Memory"), /* @__PURE__ */ React9.createElement("span", {
    className: "x-markdown-debug-value"
  }, formatMemory(memory))), /* @__PURE__ */ React9.createElement("div", {
    className: "x-markdown-debug-actions"
  }, /* @__PURE__ */ React9.createElement("button", {
    type: "button",
    className: `x-markdown-debug-action x-markdown-debug-record-btn ${isRecording ? "recording" : ""}`,
    onClick: toggleRecording
  }, isRecording ? "⏹ Stop" : "⏺ Record"), records.length > 0 && !isRecording && /* @__PURE__ */ React9.createElement("button", {
    type: "button",
    className: "x-markdown-debug-action",
    onClick: () => setShowModal(true)
  }, "📊 View"))), showModal && records.length > 0 ? /* @__PURE__ */ React9.createElement("div", {
    className: "x-markdown-debug-modal-overlay",
    onClick: () => setShowModal(false)
  }, /* @__PURE__ */ React9.createElement("div", {
    className: "x-markdown-debug-modal",
    onClick: (e) => e.stopPropagation()
  }, /* @__PURE__ */ React9.createElement("div", {
    className: "x-markdown-debug-modal-header"
  }, /* @__PURE__ */ React9.createElement("span", {
    style: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "600"
    }
  }, "Performance Recording"), /* @__PURE__ */ React9.createElement("button", {
    type: "button",
    className: "x-markdown-debug-close-btn",
    onClick: () => setShowModal(false)
  }, "✕")), /* @__PURE__ */ React9.createElement(PerformanceChart, null))) : null);
};
var DebugPanel_default = DebugPanel;

// ../../node_modules/.pnpm/@ant-design+x-markdown@2.9._a775707fb3dd5b8f608e56bd9e660169/node_modules/@ant-design/x-markdown/es/XMarkdown/hooks/useStreaming.js
import { useCallback as useCallback9, useEffect as useEffect11, useRef as useRef8, useState as useState9 } from "react";

// ../../node_modules/.pnpm/@ant-design+x-markdown@2.9._a775707fb3dd5b8f608e56bd9e660169/node_modules/@ant-design/x-markdown/es/XMarkdown/interface.js
var StreamCacheTokenType = /* @__PURE__ */ (function(StreamCacheTokenType2) {
  StreamCacheTokenType2["Text"] = "text";
  StreamCacheTokenType2["Link"] = "link";
  StreamCacheTokenType2["Image"] = "image";
  StreamCacheTokenType2["Html"] = "html";
  StreamCacheTokenType2["Emphasis"] = "emphasis";
  StreamCacheTokenType2["List"] = "list";
  StreamCacheTokenType2["Table"] = "table";
  StreamCacheTokenType2["InlineCode"] = "inline-code";
  return StreamCacheTokenType2;
})({});

// ../../node_modules/.pnpm/@ant-design+x-markdown@2.9._a775707fb3dd5b8f608e56bd9e660169/node_modules/@ant-design/x-markdown/es/XMarkdown/hooks/useStreaming.js
var STREAM_INCOMPLETE_REGEX = {
  image: [/^!\[[^\]\r\n]{0,1000}$/, /^!\[[^\r\n]{0,1000}\]\(*[^)\r\n]{0,1000}$/],
  link: [/^\[[^\]\r\n]{0,1000}$/, /^\[[^\r\n]{0,1000}\]\(*[^)\r\n]{0,1000}$/],
  html: [/^<\/$/, /^<\/?[a-zA-Z][a-zA-Z0-9-]{0,100}[^>\r\n]{0,1000}$/],
  commonEmphasis: [/^(\*{1,3}|_{1,3})(?!\s)(?!.*\1$)[^\r\n]{0,1000}$/],
  // regex2 matches cases like "- **" (list item with emphasis start).
  list: [/^[-+*]\s{0,3}$/, /^[-+*]\s{1,3}(\*{1,3}|_{1,3})(?!\s)(?!.*\1$)[^\r\n]{0,1000}$/],
  "inline-code": [/^`[^`\r\n]{0,300}$/]
};
var isTableInComplete = (markdown) => {
  if (markdown.includes("\n\n")) return false;
  const lines = markdown.split("\n");
  if (lines.length <= 1) return true;
  const [header, separator] = lines;
  const trimmedHeader = header.trim();
  if (!/^\|.*\|$/.test(trimmedHeader)) return false;
  const trimmedSeparator = separator.trim();
  const columns = trimmedSeparator.split("|").map((col) => col.trim()).filter(Boolean);
  const separatorRegex = /^:?-+:?$/;
  return columns.every((col, index) => index === columns.length - 1 ? col === ":" || separatorRegex.test(col) : separatorRegex.test(col));
};
var tokenRecognizerMap = {
  [StreamCacheTokenType.Link]: {
    tokenType: StreamCacheTokenType.Link,
    isStartOfToken: (markdown) => markdown.startsWith("["),
    isStreamingValid: (markdown) => STREAM_INCOMPLETE_REGEX.link.some((re) => re.test(markdown))
  },
  [StreamCacheTokenType.Image]: {
    tokenType: StreamCacheTokenType.Image,
    isStartOfToken: (markdown) => markdown.startsWith("!"),
    isStreamingValid: (markdown) => STREAM_INCOMPLETE_REGEX.image.some((re) => re.test(markdown))
  },
  [StreamCacheTokenType.Html]: {
    tokenType: StreamCacheTokenType.Html,
    isStartOfToken: (markdown) => markdown.startsWith("<"),
    isStreamingValid: (markdown) => STREAM_INCOMPLETE_REGEX.html.some((re) => re.test(markdown))
  },
  [StreamCacheTokenType.Emphasis]: {
    tokenType: StreamCacheTokenType.Emphasis,
    isStartOfToken: (markdown) => markdown.startsWith("*") || markdown.startsWith("_"),
    isStreamingValid: (markdown) => STREAM_INCOMPLETE_REGEX.commonEmphasis.some((re) => re.test(markdown))
  },
  [StreamCacheTokenType.List]: {
    tokenType: StreamCacheTokenType.List,
    isStartOfToken: (markdown) => /^[-+*]/.test(markdown),
    isStreamingValid: (markdown) => STREAM_INCOMPLETE_REGEX.list.some((re) => re.test(markdown)),
    // On backtick after list, commit only the prefix; treat the rest as inline code.
    getCommitPrefix: (pending) => {
      const listPrefix = pending.match(/^([-+*]\s{0,3})/)?.[1];
      const rest = listPrefix ? pending.slice(listPrefix.length) : "";
      return listPrefix && rest.startsWith("`") ? listPrefix : null;
    }
  },
  [StreamCacheTokenType.Table]: {
    tokenType: StreamCacheTokenType.Table,
    isStartOfToken: (markdown) => markdown.startsWith("|"),
    isStreamingValid: isTableInComplete
  },
  [StreamCacheTokenType.InlineCode]: {
    tokenType: StreamCacheTokenType.InlineCode,
    isStartOfToken: (markdown) => markdown.startsWith("`"),
    isStreamingValid: (markdown) => STREAM_INCOMPLETE_REGEX["inline-code"].some((re) => re.test(markdown))
  }
};
var recognize = (cache, tokenType) => {
  const recognizer = tokenRecognizerMap[tokenType];
  if (!recognizer) return;
  const {
    token,
    pending
  } = cache;
  if (token === StreamCacheTokenType.Text && recognizer.isStartOfToken(pending)) {
    cache.token = tokenType;
    return;
  }
  if (token === tokenType && !recognizer.isStreamingValid(pending)) {
    const prefix = recognizer.getCommitPrefix?.(pending);
    if (prefix) {
      cache.completeMarkdown += prefix;
      cache.pending = pending.slice(prefix.length);
      cache.token = StreamCacheTokenType.Text;
      return;
    }
    commitCache(cache);
  }
};
var recognizeHandlers = Object.values(tokenRecognizerMap).map((rec) => ({
  tokenType: rec.tokenType,
  recognize: (cache) => recognize(cache, rec.tokenType)
}));
var getInitialFenceState = () => ({
  inFenced: false,
  fenceChar: "",
  fenceLen: 0,
  lineFenceChar: "",
  lineFenceLen: 0,
  lineFenceRunEnded: false,
  lineTailBlank: true
});
var getInitialCache = () => ({
  pending: "",
  token: StreamCacheTokenType.Text,
  processedLength: 0,
  completeMarkdown: "",
  fence: getInitialFenceState()
});
var commitCache = (cache) => {
  if (cache.pending) {
    cache.completeMarkdown += cache.pending;
    cache.pending = "";
  }
  cache.token = StreamCacheTokenType.Text;
};
var feedFenceState = (fence, char) => {
  if (char === "\n") {
    if (fence.lineFenceLen >= 3) {
      if (!fence.inFenced) {
        fence.inFenced = true;
        fence.fenceChar = fence.lineFenceChar;
        fence.fenceLen = fence.lineFenceLen;
      } else if (fence.lineFenceChar === fence.fenceChar && fence.lineFenceLen >= fence.fenceLen && fence.lineTailBlank) {
        fence.inFenced = false;
        fence.fenceChar = "";
        fence.fenceLen = 0;
      }
    }
    fence.lineFenceChar = "";
    fence.lineFenceLen = 0;
    fence.lineFenceRunEnded = false;
    fence.lineTailBlank = true;
    return;
  }
  if (!fence.lineFenceRunEnded) {
    if (fence.lineFenceLen === 0 && (char === "`" || char === "~")) {
      fence.lineFenceChar = char;
      fence.lineFenceLen = 1;
    } else if (fence.lineFenceLen > 0 && char === fence.lineFenceChar) {
      fence.lineFenceLen += 1;
    } else {
      fence.lineFenceRunEnded = true;
      fence.lineTailBlank = fence.lineTailBlank && /\s/.test(char);
    }
  } else {
    fence.lineTailBlank = fence.lineTailBlank && /\s/.test(char);
  }
};
var isInCodeBlock = (fence) => fence.inFenced || fence.lineFenceLen >= 3;
var sanitizeForURIComponent = (input) => {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);
    if (charCode >= 55296 && charCode <= 56319) {
      if (i + 1 < input.length && input.charCodeAt(i + 1) >= 56320 && input.charCodeAt(i + 1) <= 57343) {
        result += input[i] + input[i + 1];
        i++;
      }
    } else if (charCode < 56320 || charCode > 57343) {
      result += input[i];
    }
  }
  return result;
};
var safeEncodeURIComponent = (str) => {
  try {
    return encodeURIComponent(str);
  } catch (e) {
    if (e instanceof URIError) {
      return encodeURIComponent(sanitizeForURIComponent(str));
    }
    return "";
  }
};
var useStreaming = (input, config) => {
  const {
    streaming,
    components: components2 = {}
  } = config || {};
  const {
    hasNextChunk: enableCache = false,
    incompleteMarkdownComponentMap
  } = streaming || {};
  const [streamingOutput, setStreamingOutput] = useState9("");
  const output = enableCache ? streamingOutput : typeof input === "string" ? input : "";
  const cacheRef = useRef8(getInitialCache());
  const handleIncompleteMarkdown = useCallback9((cache) => {
    const {
      token,
      pending
    } = cache;
    if (token === StreamCacheTokenType.Text) return;
    if (token === StreamCacheTokenType.Image && pending === "!") return void 0;
    if (token === StreamCacheTokenType.Table && pending.split("\n").length > 2) {
      return pending;
    }
    const componentMap = incompleteMarkdownComponentMap || {};
    const componentName = componentMap[token] || `incomplete-${token}`;
    const encodedPending = safeEncodeURIComponent(pending);
    return components2?.[componentName] ? `<${componentName} data-raw="${encodedPending}" />` : void 0;
  }, [incompleteMarkdownComponentMap, components2]);
  const processStreaming = useCallback9((text2) => {
    if (!text2) {
      setStreamingOutput("");
      cacheRef.current = getInitialCache();
      return;
    }
    const expectedPrefix = cacheRef.current.completeMarkdown + cacheRef.current.pending;
    if (!text2.startsWith(expectedPrefix)) {
      cacheRef.current = getInitialCache();
    }
    const cache = cacheRef.current;
    const chunk = text2.slice(cache.processedLength);
    if (!chunk) return;
    cache.processedLength += chunk.length;
    for (const char of chunk) {
      cache.pending += char;
      feedFenceState(cache.fence, char);
      if (isInCodeBlock(cache.fence)) {
        commitCache(cache);
        continue;
      }
      if (cache.token === StreamCacheTokenType.Text) {
        for (const handler of recognizeHandlers) handler.recognize(cache);
      } else {
        const handler = recognizeHandlers.find((handler2) => handler2.tokenType === cache.token);
        handler?.recognize(cache);
        const tokenAfterRecognize = cache.token;
        if (tokenAfterRecognize === StreamCacheTokenType.Text) {
          for (const h of recognizeHandlers) h.recognize(cache);
        }
      }
      if (cache.token === StreamCacheTokenType.Text) {
        commitCache(cache);
      }
    }
    const incompletePlaceholder = handleIncompleteMarkdown(cache);
    setStreamingOutput(cache.completeMarkdown + (incompletePlaceholder || ""));
  }, [handleIncompleteMarkdown]);
  useEffect11(() => {
    if (typeof input !== "string") {
      console.error(`X-Markdown: input must be string, not ${typeof input}.`);
      setStreamingOutput("");
      return;
    }
    if (enableCache) {
      processStreaming(input);
    }
  }, [input, enableCache, processStreaming]);
  return output;
};
var useStreaming_default = useStreaming;

// ../../node_modules/.pnpm/@ant-design+x-markdown@2.9._a775707fb3dd5b8f608e56bd9e660169/node_modules/@ant-design/x-markdown/es/XMarkdown/utils/tail.js
var DEFAULT_TAIL_CONTENT = "▋";
var resolveTailContent = (tail) => {
  if (!tail) {
    return null;
  }
  if (typeof tail === "boolean") {
    return DEFAULT_TAIL_CONTENT;
  }
  return tail.content || DEFAULT_TAIL_CONTENT;
};

// ../../node_modules/.pnpm/@ant-design+x-markdown@2.9._a775707fb3dd5b8f608e56bd9e660169/node_modules/@ant-design/x-markdown/es/XMarkdown/index.js
var XMarkdown = /* @__PURE__ */ React10.memo((props) => {
  const {
    streaming,
    config,
    components: components2,
    paragraphTag,
    content,
    children,
    rootClassName,
    className,
    style,
    openLinksInNewTab,
    dompurifyConfig: dompurifyConfig2,
    protectCustomTagNewlines,
    disableCustomTagBlockMarkdown,
    escapeRawHtml,
    debug,
    disableDefaultStyles
  } = props;
  const tailContent = useMemo17(() => resolveTailContent(streaming?.tail), [streaming?.tail]);
  const TailComponent = typeof streaming?.tail === "object" ? streaming.tail.component : void 0;
  const shouldShowTail = !!streaming?.hasNextChunk && tailContent;
  const disableStyleCls = useMemo17(() => {
    if (disableDefaultStyles === true) {
      return "x-md-disable-all";
    }
    if (Array.isArray(disableDefaultStyles)) {
      return disableDefaultStyles.map((tag2) => `x-md-disable-${tag2}`);
    }
    return void 0;
  }, [disableDefaultStyles]);
  const mergedCls = clsx("x-markdown", disableStyleCls, rootClassName, className);
  const output = useStreaming_default(content || children || "", {
    streaming,
    components: components2
  });
  const mergedComponents = useMemo17(() => {
    if (!shouldShowTail) {
      return components2;
    }
    const TailElement = TailComponent ? /* @__PURE__ */ React10.createElement(TailComponent, {
      content: tailContent
    }) : /* @__PURE__ */ React10.createElement("span", {
      className: "xmd-tail"
    }, tailContent);
    return {
      ...components2,
      "xmd-tail": () => TailElement
    };
  }, [shouldShowTail, components2, TailComponent, tailContent]);
  const parser2 = useMemo17(() => new Parser_default({
    markedConfig: config,
    paragraphTag,
    openLinksInNewTab,
    components: mergedComponents,
    protectCustomTagNewlines,
    disableCustomTagBlockMarkdown,
    escapeRawHtml
  }), [config, paragraphTag, openLinksInNewTab, mergedComponents, protectCustomTagNewlines, disableCustomTagBlockMarkdown, escapeRawHtml]);
  const renderer = useMemo17(() => new Renderer_default({
    components: mergedComponents,
    dompurifyConfig: dompurifyConfig2,
    streaming
  }), [mergedComponents, dompurifyConfig2, streaming]);
  const htmlString = useMemo17(() => {
    if (!output) {
      return "";
    }
    return parser2.parse(output, {
      injectTail: !!shouldShowTail
    });
  }, [output, parser2, shouldShowTail]);
  const renderedContent = useMemo17(() => htmlString ? renderer.render(htmlString) : null, [htmlString, renderer]);
  if (!output) {
    return null;
  }
  return /* @__PURE__ */ React10.createElement(React10.Fragment, null, /* @__PURE__ */ React10.createElement("div", {
    className: mergedCls,
    style
  }, renderedContent), debug ? /* @__PURE__ */ React10.createElement(DebugPanel_default, null) : null);
});
if (true) {
  XMarkdown.displayName = "XMarkdown";
}
var XMarkdown_default = XMarkdown;

// ../web-ui/src/conversation/markdown.tsx
import {
  createContext as createContext7,
  useContext as useContext6,
  useEffect as useEffect12,
  useLayoutEffect as useLayoutEffect4,
  useMemo as useMemo19,
  useRef as useRef10,
  useState as useState11
} from "react";

// ../web-ui/src/conversation/markdown-policy.ts
function escapeMarkdownHtml(text2) {
  return text2.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function decodeMarkdownEntities(text2) {
  if (!text2.includes("&")) return text2;
  const escapedTags = text2.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return new DOMParser().parseFromString(escapedTags, "text/html").documentElement.textContent ?? text2;
}
function hasControl(text2) {
  return [...text2].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 32 || code >= 127 && code <= 159;
  });
}
function safeMarkdownHref(raw) {
  const decoded = decodeMarkdownEntities(raw);
  if (decoded.startsWith("#")) {
    try {
      return hasControl(decoded) || hasControl(decodeURIComponent(decoded.slice(1))) ? void 0 : decoded;
    } catch {
      return void 0;
    }
  }
  if (hasControl(decoded)) return void 0;
  try {
    const url = new URL(decoded);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : void 0;
  } catch {
    return void 0;
  }
}
function protectEscapedMarkdownTags(source2) {
  const literals = /* @__PURE__ */ new Map();
  let index = 0;
  let prefix = "AGH_LITERAL_";
  while (source2.includes(prefix)) prefix += "_";
  let fence;
  let inlineTicks = 0;
  let content = "";
  for (const line of source2.match(/[^\n]*(?:\n|$)/g) ?? []) {
    if (!line) continue;
    const fenceMark = /^ {0,3}(`{3,}|~{3,})([^\n]*)/.exec(line);
    if (fence) {
      content += line;
      if (fenceMark && fenceMark[1]?.[0] === fence.char && fenceMark[1].length >= fence.length && !fenceMark[2]?.trim())
        fence = void 0;
      continue;
    }
    if (fenceMark && !inlineTicks) {
      fence = { char: fenceMark[1]?.[0] ?? "", length: fenceMark[1]?.length ?? 0 };
      content += line;
      continue;
    }
    for (let cursor = 0; cursor < line.length; ) {
      if (line[cursor] === "`") {
        const run = /^`+/.exec(line.slice(cursor))?.[0] ?? "`";
        if (inlineTicks === run.length) inlineTicks = 0;
        else if (!inlineTicks && line.indexOf(run, cursor + run.length) >= 0) inlineTicks = run.length;
        content += run;
        cursor += run.length;
        continue;
      }
      if (!inlineTicks && line[cursor] === "\\" && line[cursor + 1] === "<") {
        const match = /^\\<[^>\n]*(?:>|(?=\n|$))/.exec(line.slice(cursor));
        if (match) {
          const key = `${prefix}${index++}`;
          literals.set(key, match[0].slice(1));
          content += key;
          cursor += match[0].length;
          continue;
        }
      }
      content += line[cursor++];
    }
  }
  return { content, literals };
}

// ../web-ui/src/conversation/markdown-reveal.tsx
import { createContext as createContext6, Fragment as Fragment6, useContext as useContext5, useLayoutEffect as useLayoutEffect3, useRef as useRef9 } from "react";

// ../web-ui/src/conversation/markdown-snapshot.ts
import { useLayoutEffect as useLayoutEffect2, useMemo as useMemo18, useState as useState10 } from "react";
function interactionInside(element) {
  if (!element) return false;
  const document2 = element.ownerDocument;
  if (element.contains(document2.activeElement)) return true;
  const selection = document2.getSelection();
  if (!selection || selection.isCollapsed) return false;
  if (element.contains(selection.anchorNode) || element.contains(selection.focusNode)) return true;
  for (let index = 0; index < selection.rangeCount; index++) {
    if (selection.getRangeAt(index).intersectsNode(element)) return true;
  }
  return false;
}
function useInteractionSnapshot(host, next, deferred, release) {
  const [shown, setShown] = useState10(() => next);
  useLayoutEffect2(() => {
    const element = host.current;
    const document2 = element?.ownerDocument;
    const apply3 = (held = false) => setShown(() => held && deferred ? deferred(next) : next);
    if (!document2 || !interactionInside(element)) {
      apply3();
      return;
    }
    let alive = true;
    const stop = () => {
      document2.removeEventListener("selectionchange", flush);
      document2.removeEventListener("pointerup", flush);
      document2.removeEventListener("keyup", flush);
      document2.removeEventListener("focusout", afterFocusOut);
    };
    const flush = () => {
      if (!alive || interactionInside(host.current)) return;
      if (release) release(() => apply3(true));
      else apply3(true);
      stop();
    };
    const afterFocusOut = () => queueMicrotask(flush);
    document2.addEventListener("selectionchange", flush);
    document2.addEventListener("pointerup", flush);
    document2.addEventListener("keyup", flush);
    document2.addEventListener("focusout", afterFocusOut);
    return () => {
      alive = false;
      stop();
    };
  }, [host, next, deferred, release]);
  return shown;
}
function useMarkdownSnapshot(host, source2, streaming, release) {
  const next = useMemo18(() => ({ source: source2, streaming, reveal: true }), [source2, streaming]);
  return useInteractionSnapshot(host, next, directSnapshot, release);
}
function directSnapshot(next) {
  return { ...next, reveal: false };
}

// ../web-ui/src/conversation/markdown-reveal.tsx
import { Fragment as Fragment7, jsx as jsx23 } from "react/jsx-runtime";
var MarkdownRevealOwner = createContext6(void 0);
function RevealRoot({ domNode, children }) {
  const owner = useContext5(MarkdownRevealOwner);
  const raw = domNode.attribs["data-agnes-plan"];
  useLayoutEffect3(() => {
    if (owner && raw) owner.committed.current = { ...JSON.parse(raw), source: owner.source };
  }, [owner, raw]);
  return /* @__PURE__ */ jsx23(Fragment7, { children });
}
function encodeData(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}
var DURATION = 480;
var MAX_TEXT = 65536;
var MAX_VISITS = 4096;
var MAX_RANGES = 32;
var MAX_FRAGMENTS = 128;
var EXCLUDED = 'button,input,select,textarea,.code-toolbar,script,style,[hidden],[aria-hidden="true"]';
function splitsPair(value, offset) {
  const before = value.charCodeAt(offset - 1);
  const after = value.charCodeAt(offset);
  return before >= 55296 && before <= 56319 && after >= 56320 && after <= 57343;
}
function planMarkdownReveal(html3, source2, streaming, host, previous) {
  const parsed = new DOMParser().parseFromString(html3, "text/html");
  for (const span of parsed.querySelectorAll("[data-agnes-literal]"))
    span.textContent = span.getAttribute("data-agnes-literal") ?? "";
  const segments = [];
  const values = [];
  let length = 0;
  let visited = 0;
  const walker = parsed.createTreeWalker(parsed.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let valid = true;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (++visited > MAX_VISITS) {
      valid = false;
      break;
    }
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const text2 = node;
    const parent = text2.parentElement;
    if (parent?.closest(EXCLUDED) || !text2.length || parent === parsed.body && !text2.data.trim()) continue;
    const end = length + text2.length;
    if (end > MAX_TEXT) {
      valid = false;
      break;
    }
    segments.push({ node: text2, start: length, end });
    values.push(text2.data);
    length = end;
  }
  const value = values.join("");
  const view = host?.ownerDocument.defaultView;
  const visible = Boolean(
    host?.isConnected && !host.closest('[hidden],[aria-hidden="true"],details:not([open])') && host.ownerDocument.visibilityState !== "hidden"
  );
  const allowed = valid && streaming && visible && !interactionInside(host) && view && typeof view.matchMedia === "function" && !view.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const now = view?.performance.now() ?? 0;
  let serial = previous?.serial ?? 0;
  let ranges = [];
  if (allowed && previous?.value !== void 0 && source2.startsWith(previous.source) && value.startsWith(previous.value) && !splitsPair(value, previous.value.length)) {
    ranges = previous.ranges.filter((range) => now - range.at < DURATION);
    if (value.length > previous.value.length)
      ranges.push({ start: previous.value.length, end: value.length, at: now, id: ++serial });
    ranges = ranges.slice(-MAX_RANGES);
  }
  const plans = [];
  let fragments = 0;
  for (const segment of segments) {
    const pieces = [];
    let cursor = 0;
    for (const range of ranges) {
      const start = Math.max(range.start, segment.start) - segment.start;
      const end = Math.min(range.end, segment.end) - segment.start;
      if (start >= end) continue;
      if (++fragments > MAX_FRAGMENTS || splitsPair(segment.node.data, start) || splitsPair(segment.node.data, end))
        valid = false;
      if (start > cursor) pieces.push({ text: segment.node.data.slice(cursor, start), start: cursor });
      pieces.push({
        text: segment.node.data.slice(start, end),
        start,
        id: range.id,
        delay: -Math.max(0, now - range.at)
      });
      cursor = end;
    }
    if (cursor < segment.node.length) pieces.push({ text: segment.node.data.slice(cursor), start: cursor });
    plans.push({ node: segment.node, pieces });
  }
  if (!valid) ranges = [];
  for (const [index, { node, pieces }] of plans.entries()) {
    const span = parsed.createElement("span");
    span.setAttribute("key", `agnes-text-${index}`);
    span.setAttribute("data-agnes-pieces", encodeData(valid ? pieces : [{ text: node.data, start: 0 }]));
    node.replaceWith(span);
  }
  const data = { value: valid ? value : void 0, ranges, serial };
  return `<agnes-reveal-root data-agnes-plan="${escapeMarkdownHtml(encodeData(data))}">${parsed.body.innerHTML}</agnes-reveal-root>`;
}
function RevealText({ domNode, children }) {
  const attribs = domNode.attribs;
  const raw = attribs?.["data-agnes-pieces"];
  const delays = useRef9(/* @__PURE__ */ new Map());
  if (raw === void 0) {
    const literal = attribs?.["data-agnes-literal"];
    return literal === void 0 ? /* @__PURE__ */ jsx23("span", { children }) : children;
  }
  const pieces = JSON.parse(raw);
  const active = new Set(pieces.flatMap((piece) => piece.id === void 0 ? [] : [piece.id]));
  for (const id of delays.current.keys()) if (!active.has(id)) delays.current.delete(id);
  return /* @__PURE__ */ jsx23(Fragment7, { children: pieces.map((piece) => {
    if (piece.id === void 0) return /* @__PURE__ */ jsx23(Fragment6, { children: piece.text }, `plain-${piece.start}`);
    if (!delays.current.has(piece.id)) delays.current.set(piece.id, piece.delay ?? 0);
    return /* @__PURE__ */ jsx23(
      "span",
      {
        className: "message-reveal-fragment",
        style: {
          animationDuration: `${DURATION}ms`,
          animationDelay: `${delays.current.get(piece.id)}ms`
        },
        children: piece.text
      },
      piece.id
    );
  }) });
}

// ../web-ui/src/conversation/markdown.tsx
import { Fragment as Fragment8, jsx as jsx24, jsxs as jsxs5 } from "react/jsx-runtime";
var Callbacks = createContext7({});
var dompurifyConfig = { ADD_ATTR: ["key"] };
function defaultFragment(id) {
  const target = document.getElementById(id);
  if (!target?.matches("h1, h2, h3, h4, h5, h6")) return;
  target.scrollIntoView({ block: "nearest" });
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
}
function Link({ children, title, ...props }) {
  const { onFragment } = useContext6(Callbacks);
  const safe = safeMarkdownHref(typeof props.href === "string" ? props.href : "");
  if (!safe) return /* @__PURE__ */ jsx24(Fragment8, { children });
  if (safe.startsWith("#")) {
    return /* @__PURE__ */ jsx24(
      "a",
      {
        href: safe,
        title,
        onClick: (event) => {
          event.preventDefault();
          try {
            ;
            (onFragment ?? defaultFragment)(decodeURIComponent(safe.slice(1)));
          } catch {
          }
        },
        children
      }
    );
  }
  return /* @__PURE__ */ jsx24("a", { href: safe, title, target: "_blank", rel: "noopener noreferrer", children });
}
function CodeBlock({ children, domNode }) {
  const { onCopy: writeCode, onRelease, syntax, t = fallbackT } = useContext6(Callbacks);
  const node = domNode;
  const label = node.children?.find((child) => child.name === "code")?.attribs?.["data-lang"]?.trim().split(/\s+/, 1)[0] || "text";
  const codeRef = useRef10(null);
  const timer = useRef10(void 0);
  const mounted = useRef10(true);
  const [state, setState] = useState11("idle");
  useEffect12(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current !== void 0) clearTimeout(timer.current);
    };
  }, []);
  const copy = async () => {
    const displayed = codeRef.current?.textContent ?? "";
    const text2 = syntax === "immediate" ? displayed : displayed.replace(/\n$/, "");
    try {
      if (writeCode) await writeCode(text2);
      else await navigator.clipboard.writeText(text2);
      if (mounted.current) (onRelease ?? ((commit) => commit()))(() => setState("success"));
    } catch {
      if (mounted.current) (onRelease ?? ((commit) => commit()))(() => setState("failure"));
    }
    if (!mounted.current) return;
    if (timer.current !== void 0) clearTimeout(timer.current);
    timer.current = setTimeout(() => (onRelease ?? ((commit) => commit()))(() => setState("idle")), 1600);
  };
  return /* @__PURE__ */ jsxs5("div", { className: "code-block", children: [
    /* @__PURE__ */ jsxs5("div", { className: "code-toolbar", children: [
      /* @__PURE__ */ jsx24("span", { className: "code-language", children: label }),
      /* @__PURE__ */ jsx24(
        "button",
        {
          type: "button",
          className: "code-copy",
          "aria-label": t("markdown.copyCode"),
          "aria-live": "polite",
          "data-copy-state": state,
          onClick: copy,
          children: state === "success" ? t("markdown.copied") : state === "failure" ? t("markdown.copyFailed") : t("markdown.copy")
        }
      )
    ] }),
    /* @__PURE__ */ jsx24("pre", { ref: codeRef, children })
  ] });
}
var components = {
  a: Link,
  pre: CodeBlock,
  img: ({ alt }) => /* @__PURE__ */ jsx24(Fragment8, { children: alt }),
  span: RevealText,
  "agnes-reveal-root": RevealRoot,
  table: TableScroll
};
function TableScroll({ children }) {
  const { t = fallbackT } = useContext6(Callbacks);
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: focus enables keyboard scrolling of wide tables.
    /* @__PURE__ */ jsx24("section", { className: "table-scroll", tabIndex: 0, "aria-label": t("markdown.tableScroll"), children: /* @__PURE__ */ jsx24("table", { children }) })
  );
}
function ConversationMarkdown({
  source: source2,
  part,
  streaming = false,
  theme = "light",
  onCopy,
  onFragment,
  onRelease,
  syntax = "streaming",
  t
}) {
  const host = useRef10(null);
  const shown = useMarkdownSnapshot(host, source2, streaming, onRelease);
  const reveal = useRef10(
    source2 ? void 0 : { source: "", value: "", ranges: [], serial: 0 }
  );
  useLayoutEffect4(() => {
    if (!shown.source)
      reveal.current = { source: "", value: "", ranges: [], serial: reveal.current?.serial ?? 0 };
  }, [shown.source]);
  const revealOwner = useMemo19(() => ({ source: shown.source, committed: reveal }), [shown.source]);
  const protectedSource = useMemo19(() => protectEscapedMarkdownTags(shown.source), [shown.source]);
  const content = shown.streaming && /(?:^|\n)\[[^\]\n]+\]:\s+\S+[^\n]$/.test(protectedSource.content) ? `${protectedSource.content}
` : protectedSource.content;
  const config = useMemo19(
    () => ({
      hooks: {
        postprocess(html3) {
          let codeIndex = 0;
          const keyed = html3.replace(/<pre>/g, () => `<pre key="agnes-code-${codeIndex++}">`);
          return planMarkdownReveal(
            keyed,
            shown.source,
            shown.streaming && shown.reveal,
            host.current,
            reveal.current
          );
        }
      },
      renderer: {
        tablecell(token) {
          const tag2 = token.header ? "th" : "td";
          const scope = token.header ? ' scope="col"' : "";
          const align = token.align ? ` data-align="${token.align}"` : "";
          return `<${tag2}${scope}${align}>${this.parser.parseInline(token.tokens)}</${tag2}>`;
        },
        code(token) {
          if (syntax !== "immediate") return false;
          const lang = token.lang ? ` data-lang="${escapeMarkdownHtml(token.lang)}"` : "";
          return `<pre><code data-block="true"${lang}>${escapeMarkdownHtml(token.text)}</code></pre>
`;
        },
        link(token) {
          const href = safeMarkdownHref(token.href);
          if (!href) return escapeMarkdownHtml(token.raw);
          const label = this.parser.parseInline(token.tokens);
          const title = token.title ? ` title="${escapeMarkdownHtml(token.title)}"` : "";
          return `<a href="${escapeMarkdownHtml(href)}"${title}>${label}</a>`;
        },
        image(token) {
          return escapeMarkdownHtml(decodeMarkdownEntities(token.text));
        },
        html(token) {
          return escapeMarkdownHtml(token.raw);
        },
        text(token) {
          const text2 = token;
          let value = text2.tokens ? this.parser.parseInline(text2.tokens) : text2.text;
          for (const [key, literal] of protectedSource.literals)
            value = value.replaceAll(
              key,
              `<span data-agnes-literal="${escapeMarkdownHtml(decodeMarkdownEntities(literal))}"></span>`
            );
          return value;
        }
      }
    }),
    [protectedSource, shown, syntax]
  );
  const callbacks = useMemo19(
    () => ({ onCopy, onFragment, onRelease, syntax, t }),
    [onCopy, onFragment, onRelease, syntax, t]
  );
  const stream = useMemo19(
    () => ({ hasNextChunk: shown.streaming && syntax === "streaming", enableAnimation: false }),
    [shown.streaming, syntax]
  );
  return /* @__PURE__ */ jsx24("div", { ref: host, "data-conversation-markdown": part, children: /* @__PURE__ */ jsx24(MarkdownRevealOwner.Provider, { value: revealOwner, children: /* @__PURE__ */ jsx24(Callbacks.Provider, { value: callbacks, children: /* @__PURE__ */ jsx24(
    XMarkdown_default,
    {
      content,
      rootClassName: `conversation-markdown markdown x-markdown-${theme}`,
      config,
      components,
      dompurifyConfig,
      escapeRawHtml: true,
      streaming: stream
    },
    shown.source ? "content" : "empty"
  ) }) }) });
}

// ../web-ui/src/conversation/document-preview.tsx
import { jsx as jsx25 } from "react/jsx-runtime";
function DocumentPreview({
  kind,
  content = "",
  title,
  resourceUrl,
  theme = "light",
  onCopy,
  onFragment,
  t = fallbackT
}) {
  const html3 = useMemo20(
    () => kind === "html" ? htmlNodes(sanitizeDocumentHtml(content)) : void 0,
    [kind, content]
  );
  const url = documentResourceUrl(resourceUrl);
  const unavailable = (kind === "image" || kind === "pdf") && !url ? t("doc.preview.unavailable", {
    kind: t(kind === "image" ? "doc.kind.image" : "doc.kind.pdf"),
    reason: t(resourceUrl ? "doc.reason.unauthorized" : "doc.reason.unavailable")
  }) : void 0;
  let children;
  switch (kind) {
    case "text":
      children = /* @__PURE__ */ jsx25("pre", { children: content });
      break;
    case "code":
      children = /* @__PURE__ */ jsx25("pre", { children: /* @__PURE__ */ jsx25("code", { children: content }) });
      break;
    case "html":
      children = html3;
      break;
    case "markdown":
      children = content ? /* @__PURE__ */ jsx25(
        ConversationMarkdown,
        {
          source: content,
          part: "body",
          syntax: "immediate",
          theme,
          onCopy,
          onFragment,
          t
        }
      ) : void 0;
      break;
    case "image":
      children = url ? /* @__PURE__ */ jsx25("img", { src: url, alt: title ?? t("doc.imageFallback"), decoding: "async" }) : void 0;
      break;
    case "pdf":
      children = url ? /* @__PURE__ */ jsx25("iframe", { src: url, title: title ?? t("doc.pdfFallback"), sandbox: "" }) : void 0;
      break;
  }
  return /* @__PURE__ */ jsx25("section", { "data-document-preview": kind, "aria-label": title || void 0, "data-preview-error": unavailable, children: unavailable ? /* @__PURE__ */ jsx25("p", { className: "document-preview-unavailable", children: unavailable }) : children });
}
function htmlNodes(parent) {
  return Array.from(parent.childNodes, (node, key) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
    const element = node;
    const props = { key };
    const names = { class: "className", colspan: "colSpan", rowspan: "rowSpan" };
    for (const attribute of Array.from(element.attributes))
      props[names[attribute.name] ?? attribute.name] = attribute.value;
    return createElement(element.tagName.toLowerCase(), props, ...htmlNodes(element));
  });
}

// ../protocol-validation/src/safe-image.ts
var USER_MESSAGE_IMAGE_LIMITS = Object.freeze({
  maxBytesPerImage: 100 * 1024 * 1024,
  // Matches the 1456 edge limit the vision paths enforce: a full-HD screenshot is 2,073,600px,
  // which a round 2,000,000 rejects along with most Retina and phone captures.
  maxPixelsPerImage: 1456 * 1456,
  maxAggregateBytes: 100 * 1024 * 1024,
  maxAggregatePixels: 8e6
});
var SafeImageError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "SafeImageError";
    this.code = code;
  }
};
var BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var BASE64_VALUE = new Int16Array(128).fill(-1);
for (let i = 0; i < BASE64.length; i += 1) BASE64_VALUE[BASE64.charCodeAt(i)] = i;
var typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
var typedArrayByteLength = Object.getOwnPropertyDescriptor(typedArrayPrototype, "byteLength")?.get;
function positiveLimit(value, name) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new TypeError(`${name} must be a positive safe integer`);
  return value;
}
function checkedLimits(input) {
  return {
    maxBytesPerImage: positiveLimit(input.maxBytesPerImage, "maxBytesPerImage"),
    maxPixelsPerImage: positiveLimit(input.maxPixelsPerImage, "maxPixelsPerImage"),
    maxAggregateBytes: positiveLimit(input.maxAggregateBytes, "maxAggregateBytes"),
    maxAggregatePixels: positiveLimit(input.maxAggregatePixels, "maxAggregatePixels")
  };
}
function decodeBase64(value, maxBytes) {
  if (value.length === 0 || value.length % 4 !== 0)
    throw new SafeImageError("BASE64_INVALID", "image data is not padded standard base64");
  const maxEncodedLength = Math.ceil(maxBytes / 3) * 4;
  if (value.length > maxEncodedLength)
    throw new SafeImageError("BYTE_LIMIT", "encoded image exceeds byte limit");
  let padding = 0;
  if (value.endsWith("==")) padding = 2;
  else if (value.endsWith("=")) padding = 1;
  const byteLength = value.length / 4 * 3 - padding;
  if (byteLength > maxBytes) throw new SafeImageError("BYTE_LIMIT", "decoded image exceeds byte limit");
  const bytes = new Uint8Array(byteLength);
  let out = 0;
  for (let offset = 0; offset < value.length; offset += 4) {
    const last = offset + 4 === value.length;
    const a = value.charCodeAt(offset);
    const b = value.charCodeAt(offset + 1);
    const c = value.charCodeAt(offset + 2);
    const d = value.charCodeAt(offset + 3);
    const va = a < 128 ? BASE64_VALUE[a] ?? -1 : -1;
    const vb = b < 128 ? BASE64_VALUE[b] ?? -1 : -1;
    if (va < 0 || vb < 0)
      throw new SafeImageError("BASE64_INVALID", "image data contains invalid base64 characters");
    const cPad = c === 61;
    const dPad = d === 61;
    const vc = cPad ? 0 : c < 128 ? BASE64_VALUE[c] ?? -1 : -1;
    const vd = dPad ? 0 : d < 128 ? BASE64_VALUE[d] ?? -1 : -1;
    if (!last && (cPad || dPad) || cPad && !dPad || vc < 0 || vd < 0)
      throw new SafeImageError("BASE64_INVALID", "image data has invalid base64 padding");
    if (cPad && (vb & 15) !== 0 || dPad && !cPad && (vc & 3) !== 0)
      throw new SafeImageError("BASE64_INVALID", "image data is non-canonical base64");
    if (out < byteLength) bytes[out++] = va << 2 | vb >> 4;
    if (out < byteLength) bytes[out++] = (vb & 15) << 4 | vc >> 2;
    if (out < byteLength) bytes[out++] = (vc & 3) << 6 | vd;
  }
  return bytes;
}
function u16(bytes, offset) {
  return bytes[offset] << 8 | bytes[offset + 1];
}
function u32(bytes, offset) {
  return bytes[offset] * 16777216 + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}
function dimensions(width, height, maxPixels) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1)
    throw new SafeImageError("DIMENSIONS_INVALID", "image dimensions must be positive integers");
  if (width > Math.floor(maxPixels / height))
    throw new SafeImageError("PIXEL_LIMIT", "image dimensions exceed pixel limit");
  return { width, height, pixels: width * height };
}
var PNG_MAGIC = [137, 80, 78, 71, 13, 10, 26, 10];
var CRC32_TABLE = new Uint32Array(256);
for (let index = 0; index < CRC32_TABLE.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) === 1 ? 3988292384 ^ value >>> 1 : value >>> 1;
  CRC32_TABLE[index] = value >>> 0;
}
function crc32(bytes, start, end) {
  let crc = 4294967295;
  for (let offset = start; offset < end; offset += 1)
    crc = CRC32_TABLE[(crc ^ bytes[offset]) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
var BitReader = class {
  bytes;
  bitOffset = 0;
  constructor(bytes) {
    this.bytes = bytes;
  }
  read(count3) {
    if (count3 < 0 || count3 > 24 || this.bitOffset + count3 > this.bytes.length * 8)
      throw new SafeImageError("FORMAT_INVALID", "truncated PNG deflate stream");
    let value = 0;
    for (let bit = 0; bit < count3; bit += 1) {
      const offset = this.bitOffset + bit;
      value |= (this.bytes[offset >>> 3] >>> (offset & 7) & 1) << bit;
    }
    this.bitOffset += count3;
    return value;
  }
  align() {
    this.bitOffset = this.bitOffset + 7 & ~7;
  }
};
function reverseBits(value, length) {
  let reversed = 0;
  for (let bit = 0; bit < length; bit += 1) reversed = reversed << 1 | value >>> bit & 1;
  return reversed;
}
function huffman(lengths, options2 = {}) {
  const counts = new Uint16Array(16);
  let maxLength = 0;
  for (const length of lengths) {
    if (!Number.isInteger(length) || length < 0 || length > 15)
      throw new SafeImageError("FORMAT_INVALID", "PNG deflate tree has an invalid code length");
    if (length > 0) {
      counts[length] = counts[length] + 1;
      maxLength = Math.max(maxLength, length);
    }
  }
  if (maxLength === 0) {
    if (options2.allowEmpty) return void 0;
    throw new SafeImageError("FORMAT_INVALID", "PNG deflate tree is empty");
  }
  let available = 1;
  for (let length = 1; length <= 15; length += 1) {
    available = available * 2 - counts[length];
    if (available < 0) throw new SafeImageError("FORMAT_INVALID", "PNG deflate tree is oversubscribed");
  }
  if (available > 0 && !(options2.allowSingleIncomplete && maxLength === 1 && counts[1] === 1))
    throw new SafeImageError("FORMAT_INVALID", "PNG deflate tree is incomplete");
  const next = new Uint16Array(16);
  let code = 0;
  for (let length = 1; length <= 15; length += 1) {
    code = code + counts[length - 1] << 1;
    next[length] = code;
  }
  const byLength = Array.from({ length: maxLength + 1 }, () => /* @__PURE__ */ new Map());
  for (let symbol = 0; symbol < lengths.length; symbol += 1) {
    const length = lengths[symbol];
    if (length === 0) continue;
    const canonical = next[length];
    next[length] = canonical + 1;
    byLength[length]?.set(reverseBits(canonical, length), symbol);
  }
  return { byLength, maxLength };
}
function decodeSymbol(reader, tree) {
  if (!tree) throw new SafeImageError("FORMAT_INVALID", "PNG deflate distance tree is missing");
  let code = 0;
  for (let length = 1; length <= tree.maxLength; length += 1) {
    code |= reader.read(1) << length - 1;
    const symbol = tree.byLength[length]?.get(code);
    if (symbol !== void 0) return symbol;
  }
  throw new SafeImageError("FORMAT_INVALID", "PNG deflate stream uses an invalid Huffman code");
}
var FIXED_LITERAL_LENGTHS = Array.from(
  { length: 288 },
  (_, symbol) => symbol <= 143 ? 8 : symbol <= 255 ? 9 : symbol <= 279 ? 7 : 8
);
var FIXED_DISTANCE_LENGTHS = Array.from({ length: 32 }, () => 5);
var FIXED_LITERAL_TREE = huffman(FIXED_LITERAL_LENGTHS);
var FIXED_DISTANCE_TREE = huffman(FIXED_DISTANCE_LENGTHS);
var LENGTH_BASE = [
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258
];
var LENGTH_EXTRA = [
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
  0
];
var DISTANCE_BASE = [
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577
];
var DISTANCE_EXTRA = [
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
  13
];
var CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
function dynamicTrees(reader) {
  const literalCount = reader.read(5) + 257;
  if (literalCount > 286) throw new SafeImageError("FORMAT_INVALID", "PNG deflate literal count is reserved");
  const distanceCount = reader.read(5) + 1;
  const codeLengthCount = reader.read(4) + 4;
  const codeLengths = new Array(19).fill(0);
  for (let index = 0; index < codeLengthCount; index += 1)
    codeLengths[CODE_LENGTH_ORDER[index]] = reader.read(3);
  const codeLengthTree = huffman(codeLengths);
  const lengths = [];
  while (lengths.length < literalCount + distanceCount) {
    const symbol = decodeSymbol(reader, codeLengthTree);
    if (symbol <= 15) {
      lengths.push(symbol);
      continue;
    }
    let repeat;
    let value;
    if (symbol === 16) {
      if (lengths.length === 0)
        throw new SafeImageError("FORMAT_INVALID", "PNG deflate repeats a missing code length");
      repeat = reader.read(2) + 3;
      value = lengths[lengths.length - 1];
    } else if (symbol === 17) {
      repeat = reader.read(3) + 3;
      value = 0;
    } else if (symbol === 18) {
      repeat = reader.read(7) + 11;
      value = 0;
    } else throw new SafeImageError("FORMAT_INVALID", "PNG deflate code-length symbol is invalid");
    if (lengths.length + repeat > literalCount + distanceCount)
      throw new SafeImageError("FORMAT_INVALID", "PNG deflate code lengths overflow their trees");
    for (let count3 = 0; count3 < repeat; count3 += 1) lengths.push(value);
  }
  if (lengths[256] === 0)
    throw new SafeImageError("FORMAT_INVALID", "PNG deflate literal tree has no end marker");
  return [
    huffman(lengths.slice(0, literalCount), { allowSingleIncomplete: true }),
    huffman(lengths.slice(literalCount), { allowEmpty: true, allowSingleIncomplete: true })
  ];
}
function inflateSink(expected, rowLengths, maxDistance) {
  const window2 = new Uint8Array(32768);
  let output = 0;
  let row = 0;
  let withinRow = 0;
  let adlerA = 1;
  let adlerB = 0;
  const write = (value) => {
    if (output >= expected)
      throw new SafeImageError("PIXEL_LIMIT", "PNG decompressed data exceeds its scanline bound");
    if (withinRow === 0 && value > 4)
      throw new SafeImageError("FORMAT_INVALID", "PNG scanline uses an invalid filter");
    window2[output & 32767] = value;
    output += 1;
    withinRow += 1;
    adlerA = (adlerA + value) % 65521;
    adlerB = (adlerB + adlerA) % 65521;
    if (withinRow === rowLengths[row]) {
      row += 1;
      withinRow = 0;
    }
  };
  return {
    expected,
    rowLengths,
    write,
    finish: () => {
      if (output !== expected || row !== rowLengths.length || withinRow !== 0)
        throw new SafeImageError("FORMAT_INVALID", "PNG decompressed data does not match its scanlines");
    },
    adler: () => (adlerB << 16 | adlerA) >>> 0,
    produced: () => output,
    prior: (distance) => {
      if (distance < 1 || distance > Math.min(output, maxDistance))
        throw new SafeImageError("FORMAT_INVALID", "PNG deflate stream uses an invalid distance");
      return window2[output - distance & 32767];
    }
  };
}
function inflateCodes(reader, literalTree, distanceTree, sink) {
  for (; ; ) {
    const symbol = decodeSymbol(reader, literalTree);
    if (symbol < 256) {
      sink.write(symbol);
      continue;
    }
    if (symbol === 256) return;
    if (symbol < 257 || symbol > 285)
      throw new SafeImageError("FORMAT_INVALID", "PNG deflate stream uses an invalid length");
    const lengthIndex = symbol - 257;
    const length = LENGTH_BASE[lengthIndex] + reader.read(LENGTH_EXTRA[lengthIndex]);
    const distanceSymbol = decodeSymbol(reader, distanceTree);
    if (distanceSymbol > 29)
      throw new SafeImageError("FORMAT_INVALID", "PNG deflate stream uses an invalid distance");
    const distance = DISTANCE_BASE[distanceSymbol] + reader.read(DISTANCE_EXTRA[distanceSymbol]);
    for (let copied = 0; copied < length; copied += 1) sink.write(sink.prior(distance));
  }
}
function inflateZlib(compressed, expected, rowLengths) {
  if (compressed.length < 6) throw new SafeImageError("FORMAT_INVALID", "PNG zlib stream is truncated");
  const cmf = compressed[0];
  const flags = compressed[1];
  if ((cmf & 15) !== 8 || cmf >>> 4 > 7 || (cmf << 8 | flags) % 31 !== 0 || (flags & 32) !== 0)
    throw new SafeImageError("FORMAT_INVALID", "PNG zlib header is invalid or unsupported");
  const deflate = compressed.subarray(2, compressed.length - 4);
  const reader = new BitReader(deflate);
  const sink = inflateSink(expected, rowLengths, 1 << (cmf >>> 4) + 8);
  let final = false;
  while (!final) {
    final = reader.read(1) === 1;
    const blockType = reader.read(2);
    if (blockType === 0) {
      reader.align();
      const length = reader.read(16);
      const inverse = reader.read(16);
      if ((length ^ 65535) !== inverse)
        throw new SafeImageError("FORMAT_INVALID", "PNG deflate stored block length is invalid");
      for (let index = 0; index < length; index += 1) sink.write(reader.read(8));
    } else if (blockType === 1) inflateCodes(reader, FIXED_LITERAL_TREE, FIXED_DISTANCE_TREE, sink);
    else if (blockType === 2) {
      const [literalTree, distanceTree] = dynamicTrees(reader);
      inflateCodes(reader, literalTree, distanceTree, sink);
    } else throw new SafeImageError("FORMAT_INVALID", "PNG deflate block type is reserved");
  }
  sink.finish();
  if (Math.ceil(reader.bitOffset / 8) !== deflate.length)
    throw new SafeImageError("FORMAT_INVALID", "PNG zlib stream has trailing compressed data");
  const expectedAdler = u32(compressed, compressed.length - 4);
  if (sink.adler() !== expectedAdler)
    throw new SafeImageError("FORMAT_INVALID", "PNG zlib checksum does not match");
}
var ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2]
];
function pngScanlines(width, height, bitDepth, colorType, interlace) {
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : 4;
  const bitsPerPixel = channels * bitDepth;
  const rows = [];
  const passes = interlace === 0 ? [[0, 0, 1, 1]] : ADAM7;
  for (const [xStart, yStart, xStep, yStep] of passes) {
    const passWidth = width <= xStart ? 0 : Math.ceil((width - xStart) / xStep);
    const passHeight = height <= yStart ? 0 : Math.ceil((height - yStart) / yStep);
    if (passWidth === 0 || passHeight === 0) continue;
    const rowLength = 1 + Math.ceil(passWidth * bitsPerPixel / 8);
    if (!Number.isSafeInteger(rowLength) || !Number.isSafeInteger(rowLength * passHeight))
      throw new SafeImageError("PIXEL_LIMIT", "PNG scanline size is unsafe");
    for (let row = 0; row < passHeight; row += 1) rows.push(rowLength);
  }
  return rows;
}
function rejectCompressedAncillary(type, data) {
  if (type === "acTL" || type === "fcTL" || type === "fdAT")
    throw new SafeImageError("FORMAT_INVALID", "animated PNG chunks are not accepted");
  if (type === "zTXt" || type === "iCCP")
    throw new SafeImageError("FORMAT_INVALID", "PNG compressed ancillary chunks are not accepted");
  if (type !== "iTXt") return;
  const keywordEnd = data.indexOf(0);
  if (keywordEnd < 1 || keywordEnd > 79 || keywordEnd + 2 >= data.length || data[keywordEnd + 1] !== 0 && data[keywordEnd + 1] !== 1 || data[keywordEnd + 2] !== 0)
    throw new SafeImageError("FORMAT_INVALID", "PNG iTXt compression fields are invalid");
  if (data[keywordEnd + 1] === 1)
    throw new SafeImageError("FORMAT_INVALID", "PNG compressed ancillary chunks are not accepted");
}
function pngDimensions(bytes, maxPixels) {
  if (bytes.length < 33 || !PNG_MAGIC.every((value, index) => bytes[index] === value))
    throw new SafeImageError("FORMAT_INVALID", "invalid PNG signature or header");
  let offset = PNG_MAGIC.length;
  let size;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let sawData = false;
  let endedData = false;
  let sawPalette = false;
  const dataChunks = [];
  let compressedLength = 0;
  for (; ; ) {
    if (offset + 12 > bytes.length) throw new SafeImageError("FORMAT_INVALID", "truncated PNG chunk");
    const length = u32(bytes, offset);
    const dataOffset = offset + 8;
    const end = dataOffset + length + 4;
    if (!Number.isSafeInteger(end) || end > bytes.length)
      throw new SafeImageError("FORMAT_INVALID", "truncated PNG chunk data");
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );
    if (!/^[A-Za-z]{4}$/.test(type) || (bytes[offset + 6] & 32) !== 0)
      throw new SafeImageError("FORMAT_INVALID", "PNG chunk type is invalid");
    if (crc32(bytes, offset + 4, dataOffset + length) !== u32(bytes, dataOffset + length))
      throw new SafeImageError("FORMAT_INVALID", `PNG ${type} CRC does not match`);
    if (!size) {
      if (type !== "IHDR" || length !== 13)
        throw new SafeImageError("FORMAT_INVALID", "PNG must begin with a complete IHDR");
      bitDepth = bytes[dataOffset + 8];
      colorType = bytes[dataOffset + 9];
      interlace = bytes[dataOffset + 12];
      const validDepth = colorType === 0 && [1, 2, 4, 8, 16].includes(bitDepth) || colorType === 2 && [8, 16].includes(bitDepth) || colorType === 3 && [1, 2, 4, 8].includes(bitDepth) || (colorType === 4 || colorType === 6) && [8, 16].includes(bitDepth);
      if (!validDepth || bytes[dataOffset + 10] !== 0 || bytes[dataOffset + 11] !== 0 || interlace > 1)
        throw new SafeImageError(
          "FORMAT_INVALID",
          "PNG IHDR uses unsupported compression, filter, or interlace"
        );
      size = dimensions(u32(bytes, dataOffset), u32(bytes, dataOffset + 4), maxPixels);
    } else if (type === "IHDR")
      throw new SafeImageError("FORMAT_INVALID", "PNG contains multiple IHDR chunks");
    else if (type === "PLTE") {
      if (sawPalette || sawData || colorType === 0 || colorType === 4 || length === 0 || length % 3 !== 0 || length > 768 || colorType === 3 && length / 3 > 2 ** bitDepth)
        throw new SafeImageError("FORMAT_INVALID", "PNG palette is misplaced or invalid");
      sawPalette = true;
    } else if (type === "IDAT") {
      if (endedData) throw new SafeImageError("FORMAT_INVALID", "PNG IDAT chunks must be consecutive");
      sawData = true;
      compressedLength += length;
      dataChunks.push(bytes.subarray(dataOffset, dataOffset + length));
    } else if (sawData && type !== "IEND") endedData = true;
    rejectCompressedAncillary(type, bytes.subarray(dataOffset, dataOffset + length));
    if ((bytes[offset + 4] & 32) === 0 && !["IHDR", "PLTE", "IDAT", "IEND"].includes(type))
      throw new SafeImageError("FORMAT_INVALID", `PNG critical chunk ${type} is unsupported`);
    if (type === "IEND") {
      if (length !== 0 || !sawData || end !== bytes.length || colorType === 3 && !sawPalette)
        throw new SafeImageError("FORMAT_INVALID", "PNG has an invalid or non-terminal IEND");
      const compressed = new Uint8Array(compressedLength);
      let writeOffset = 0;
      for (const chunk of dataChunks) {
        compressed.set(chunk, writeOffset);
        writeOffset += chunk.length;
      }
      const rows = pngScanlines(size.width, size.height, bitDepth, colorType, interlace);
      const expected = rows.reduce((sum, rowLength) => sum + rowLength, 0);
      if (!Number.isSafeInteger(expected))
        throw new SafeImageError("PIXEL_LIMIT", "PNG decompressed scanline size is unsafe");
      inflateZlib(compressed, expected, rows);
      return size;
    }
    offset = end;
  }
}
function isStartOfFrame(marker) {
  return marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker);
}
function jpegDimensions(bytes, maxPixels) {
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216)
    throw new SafeImageError("FORMAT_INVALID", "invalid JPEG signature");
  let offset = 2;
  let size;
  let sawScan = false;
  while (offset < bytes.length) {
    if (bytes[offset] !== 255) throw new SafeImageError("FORMAT_INVALID", "JPEG marker prefix is missing");
    while (offset < bytes.length && bytes[offset] === 255) offset += 1;
    if (offset >= bytes.length) throw new SafeImageError("FORMAT_INVALID", "truncated JPEG marker");
    const marker = bytes[offset++];
    if (marker === 0)
      throw new SafeImageError("FORMAT_INVALID", "unexpected stuffed byte outside JPEG scan");
    if (marker === 217) {
      if (!size || !sawScan) throw new SafeImageError("FORMAT_INVALID", "JPEG ended before image data");
      return size;
    }
    if (marker === 216 || marker === 1 || marker >= 208 && marker <= 215) continue;
    if (offset + 2 > bytes.length) throw new SafeImageError("FORMAT_INVALID", "truncated JPEG segment length");
    const length = u16(bytes, offset);
    if (length < 2 || offset + length > bytes.length)
      throw new SafeImageError("FORMAT_INVALID", "truncated JPEG segment");
    if (isStartOfFrame(marker)) {
      if (length < 8) throw new SafeImageError("FORMAT_INVALID", "JPEG frame header is too short");
      const found = dimensions(u16(bytes, offset + 5), u16(bytes, offset + 3), maxPixels);
      if (size && (size.width !== found.width || size.height !== found.height))
        throw new SafeImageError("FORMAT_INVALID", "JPEG frame dimensions disagree");
      size = found;
    }
    offset += length;
    if (marker !== 218) continue;
    if (!size) throw new SafeImageError("FORMAT_INVALID", "JPEG scan precedes its frame header");
    sawScan = true;
    for (; ; ) {
      if (offset >= bytes.length) throw new SafeImageError("FORMAT_INVALID", "truncated JPEG scan data");
      if (bytes[offset++] !== 255) continue;
      if (offset >= bytes.length) throw new SafeImageError("FORMAT_INVALID", "truncated JPEG scan marker");
      const markerOffset = offset - 1;
      while (offset < bytes.length && bytes[offset] === 255) offset += 1;
      if (offset >= bytes.length) throw new SafeImageError("FORMAT_INVALID", "truncated JPEG scan marker");
      const next = bytes[offset];
      if (next === 0 || next >= 208 && next <= 215) {
        offset += 1;
        continue;
      }
      offset = markerOffset;
      break;
    }
  }
  throw new SafeImageError("FORMAT_INVALID", "JPEG is missing EOI");
}
function detectedMime(bytes) {
  if (PNG_MAGIC.every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216) return "image/jpeg";
  throw new SafeImageError("FORMAT_INVALID", "image magic is neither PNG nor JPEG");
}
function inspectSafeImage(bytes, mimeType, limits) {
  if (mimeType !== "image/png" && mimeType !== "image/jpeg")
    throw new SafeImageError("MIME_MISMATCH", "declared image MIME is unsupported");
  const mime = detectedMime(bytes);
  if (mime !== mimeType)
    throw new SafeImageError("MIME_MISMATCH", "declared image MIME does not match image magic");
  const size = mime === "image/png" ? pngDimensions(bytes, limits.maxPixelsPerImage) : jpegDimensions(bytes, limits.maxPixelsPerImage);
  return Object.freeze({ bytes, mime, ...size });
}
function decodeSafeImage(input, limitsInput) {
  const limits = checkedLimits(limitsInput);
  const bytes = decodeBase64(input.data, limits.maxBytesPerImage);
  return inspectSafeImage(bytes, input.mimeType, limits);
}

// ../protocol-validation/src/attachments.ts
var USER_MESSAGE_ATTACHMENT_LIMITS = Object.freeze({
  maxCount: 50,
  maxAggregateBytes: USER_MESSAGE_IMAGE_LIMITS.maxAggregateBytes
});

// ../protocol-validation/src/json-data.ts
var encoder = new TextEncoder();

// ../web-ui/src/conversation/messages.tsx
import {
  createContext as createContext8,
  useCallback as useCallback10,
  useContext as useContext7,
  useEffect as useEffect13,
  useLayoutEffect as useLayoutEffect5,
  useMemo as useMemo21,
  useRef as useRef11,
  useState as useState12
} from "react";
import { createPortal, flushSync as flushSync2 } from "react-dom";
import { Fragment as Fragment9, jsx as jsx26, jsxs as jsxs6 } from "react/jsx-runtime";
var fallbackT2 = (key) => key;
var SHELL_EXIT = /\n?\[exit (-?\d+)\](?: \[output truncated by sandbox\])?\s*$/;
function toolOutcome(node, t = fallbackT2) {
  const preview = node.resultPreview;
  const exit = node.name === "shell" && node.status === "failed" && preview !== void 0 ? SHELL_EXIT.exec(preview) : null;
  if (exit && preview !== void 0)
    return {
      label: t("tool.status.exitCode", { code: Number(exit[1]) }),
      section: t("tool.detail.result"),
      text: preview.slice(0, exit.index).trimEnd() || t("tool.detail.noOutput")
    };
  return {
    label: t(toolLabelKeys[node.status]),
    section: t(node.status === "failed" ? "tool.detail.error" : "tool.detail.result"),
    text: preview
  };
}
var ConversationMessageContext = createContext8(null);
var ConversationMessageTargetContext = createContext8(null);
var registerConversationMessageTargetContext = createContext8(null);
var approvalLabelKeys = {
  pending: "timeline.approval.pending",
  decided: "timeline.approval.decided",
  expired: "timeline.approval.expired"
};
var verdictLabelKeys = {
  "allowed-once": "timeline.decision.allowedOnce",
  "allowed-session": "timeline.decision.allowedSession",
  "allowed-permanent": "timeline.decision.allowedPermanent",
  rejected: "timeline.decision.rejected",
  cancelled: "timeline.decision.cancelled"
};
var reasonLabelKeys = {
  user_rejected: "timeline.reason.userRejected",
  timeout: "timeline.reason.timeout",
  no_approver: "timeline.reason.noApprover",
  stopped: "timeline.reason.stopped",
  policy_denied: "timeline.reason.policyDenied",
  subagent_scope: "timeline.reason.subagentScope"
};
var toolLabelKeys = {
  planned: "tool.status.planned",
  awaiting_approval: "tool.status.awaitingApproval",
  running: "tool.status.running",
  completed: "tool.status.completed",
  failed: "tool.status.failed",
  cancelled: "tool.status.cancelled"
};
var approvalStatus = (node, t) => node.state === "decided" && node.decision ? (() => {
  const key = (node.decision.reason ? reasonLabelKeys[node.decision.reason] : void 0) ?? verdictLabelKeys[node.decision.verdict];
  return key === void 0 ? t(approvalLabelKeys.decided) : t(key);
})() : t(approvalLabelKeys[node.state]);
var USER_MESSAGE_IMAGE_THUMBNAIL = { width: 72, height: 56 };
function imageBlobBytes(bytes) {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}
function UserMessageImage({
  image,
  index,
  allowed,
  t
}) {
  const [previewUrl, setPreviewUrl] = useState12();
  const [unavailable, setUnavailable] = useState12(false);
  const { data, mimeType } = image;
  useEffect13(() => {
    if (!allowed) {
      setUnavailable(true);
      return;
    }
    let url;
    try {
      const decoded = decodeSafeImage({ data, mimeType }, USER_MESSAGE_IMAGE_LIMITS);
      url = URL.createObjectURL(new Blob([imageBlobBytes(decoded.bytes)], { type: decoded.mime }));
      setPreviewUrl(url);
      setUnavailable(false);
    } catch {
      setUnavailable(true);
      return;
    }
    return () => URL.revokeObjectURL(url);
  }, [allowed, data, mimeType]);
  if (unavailable)
    return /* @__PURE__ */ jsx26("span", { className: "user-message-image-unavailable", role: "status", children: t("conversation.imageUnavailable") });
  if (!previewUrl) return null;
  return /* @__PURE__ */ jsx26(
    image_default,
    {
      className: "user-message-image",
      src: previewUrl,
      alt: t("conversation.imageAlt", { index: index + 1 }),
      width: USER_MESSAGE_IMAGE_THUMBNAIL.width,
      height: USER_MESSAGE_IMAGE_THUMBNAIL.height
    }
  );
}
function UserMessageImages({ node, t }) {
  const images = node.content.filter((block2) => block2.type === "image");
  if (images.length === 0) return null;
  let imageBytes = 0;
  const imageKeys = /* @__PURE__ */ new Map();
  return (
    // 同一条消息的图片归到一个预览组：点开大图后能用左右箭头在几张之间翻。
    /* @__PURE__ */ jsx26(image_default.PreviewGroup, { children: /* @__PURE__ */ jsx26("div", { className: "user-message-images", children: images.map((block2, index) => {
      const decodedLength = Math.floor(block2.data.length * 3 / 4) - (block2.data.endsWith("==") ? 2 : block2.data.endsWith("=") ? 1 : 0);
      const allowed = decodedLength > 0 && decodedLength <= USER_MESSAGE_IMAGE_LIMITS.maxBytesPerImage && imageBytes + decodedLength <= USER_MESSAGE_IMAGE_LIMITS.maxAggregateBytes;
      if (allowed) imageBytes += decodedLength;
      const imageKey = `${block2.mimeType}:${block2.data.length}:${block2.data.slice(0, 16)}:${block2.data.slice(-16)}`;
      const occurrence = imageKeys.get(imageKey) ?? 0;
      imageKeys.set(imageKey, occurrence + 1);
      return /* @__PURE__ */ jsx26(
        UserMessageImage,
        {
          image: block2,
          index,
          allowed,
          t
        },
        `${imageKey}:${occurrence}`
      );
    }) }) })
  );
}
function UserMessage({ node, t }) {
  const value = node.content.filter((block2) => block2.type === "text").map((block2) => block2.text).join("\n");
  return /* @__PURE__ */ jsxs6(Fragment9, { children: [
    /* @__PURE__ */ jsx26("p", { className: "node-label", children: t("timeline.userLabel") }),
    /* @__PURE__ */ jsx26(UserMessageImages, { node, t }),
    /* @__PURE__ */ jsx26(UserMessageFiles, { node }),
    /* @__PURE__ */ jsx26("div", { className: "node-body", children: value })
  ] });
}
function UserMessageFiles({ node }) {
  const files = node.content.filter((block2) => block2.type === "file");
  if (files.length === 0) return null;
  const occurrences = /* @__PURE__ */ new Map();
  return /* @__PURE__ */ jsx26("ul", { className: "user-message-files", children: files.map((file) => {
    const key = `${file.name}:${file.mimeType}:${file.data.length}`;
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    return /* @__PURE__ */ jsxs6("li", { title: file.name, children: [
      /* @__PURE__ */ jsx26("span", { children: file.name }),
      /* @__PURE__ */ jsx26("small", { children: file.mimeType })
    ] }, `${key}:${occurrence}`);
  }) });
}
function AssistantMessage({
  node,
  state,
  renderMarkdown,
  hideThinking = false,
  thinkingHost,
  t
}) {
  const active = Boolean(node.thinking?.trim()) && state.streaming && node.text.trim() === "";
  const wasActive = useRef11(active);
  const initiallyActive = useRef11(active);
  const disclosure = useRef11(null);
  const shownActive = useInteractionSnapshot(disclosure, active);
  const shownThinking = useInteractionSnapshot(disclosure, Boolean(node.thinking?.trim()));
  useLayoutEffect5(() => {
    if (disclosure.current && wasActive.current !== shownActive) disclosure.current.open = shownActive;
    wasActive.current = shownActive;
  }, [shownActive]);
  useLayoutEffect5(() => {
    if (disclosure.current) disclosure.current.open = initiallyActive.current;
  }, []);
  const body = node.lostChars !== void 0 && !node.text ? t("timeline.lostOutput", { count: node.lostChars }) : node.text;
  return /* @__PURE__ */ jsxs6(Fragment9, { children: [
    /* @__PURE__ */ jsx26("p", { className: "node-label", children: "Agnes" }),
    !hideThinking && /* @__PURE__ */ jsxs6("details", { ref: disclosure, className: "thinking", hidden: !shownThinking, children: [
      /* @__PURE__ */ jsx26("summary", { children: t("timeline.thinkingSummary") }),
      /* @__PURE__ */ jsx26("div", { ref: thinkingHost, className: "thinking-content markdown", children: renderMarkdown ? renderMarkdown(node.thinking ?? "", "thinking", state) : node.thinking })
    ] }),
    /* @__PURE__ */ jsx26("div", { className: "node-body markdown", children: renderMarkdown ? renderMarkdown(body, "body", state) : body }, "body")
  ] });
}
function UserTextPart({ text: text2 }) {
  return /* @__PURE__ */ jsx26(
    "div",
    {
      className: "node-body aui:mt-0 aui:rounded-none aui:border-0 aui:bg-transparent aui:p-0 aui:text-sm aui:leading-5 aui:text-[var(--agnes-text-primary)]",
      "data-assistant-ui-part": "text",
      children: text2
    }
  );
}
function AssistantTextPart({ text: text2 }) {
  const context = useContext7(ConversationMessageContext);
  const node = context?.node;
  const t = context?.props.t ?? fallbackT2;
  const source2 = node?.kind === "assistant" && node.lostChars !== void 0 && !node.text ? t("timeline.lostOutput", { count: node.lostChars }) : text2;
  const state = node ? markdownState(node, context?.turnStatus) : void 0;
  return /* @__PURE__ */ jsx26("div", { className: "node-body markdown", "data-assistant-ui-part": "text", children: context?.props.renderMarkdown ? context.props.renderMarkdown(source2, "body", state) : source2 });
}
function AssistantReasoningPart({ text: text2 }) {
  const context = useContext7(ConversationMessageContext);
  const node = context?.node;
  const assistant = node?.kind === "assistant" ? node : void 0;
  const state = assistant ? markdownState(assistant, context?.turnStatus) : void 0;
  const active = Boolean(text2.trim()) && Boolean(state?.streaming) && !assistant?.text.trim();
  const wasActive = useRef11(active);
  const initiallyActive = useRef11(active);
  const disclosure = useRef11(null);
  const shownActive = useInteractionSnapshot(disclosure, active);
  const shownThinking = useInteractionSnapshot(disclosure, Boolean(text2.trim()));
  useLayoutEffect5(() => {
    if (disclosure.current && wasActive.current !== shownActive) disclosure.current.open = shownActive;
    wasActive.current = shownActive;
  }, [shownActive]);
  useLayoutEffect5(() => {
    if (disclosure.current) disclosure.current.open = initiallyActive.current;
  }, []);
  if (!context || !assistant || context.hideThinking) return null;
  const t = context.props.t ?? fallbackT2;
  return /* @__PURE__ */ jsxs6("details", { ref: disclosure, className: "thinking", "data-assistant-ui-part": "reasoning", hidden: !shownThinking, children: [
    /* @__PURE__ */ jsx26("summary", { children: t("timeline.thinkingSummary") }),
    /* @__PURE__ */ jsx26("div", { ref: context.thinkingHost, className: "thinking-content markdown", children: context.props.renderMarkdown ? context.props.renderMarkdown(text2, "thinking", state) : text2 })
  ] });
}
var userMessageParts = { Text: UserTextPart };
var assistantMessageParts = { Text: AssistantTextPart, Reasoning: AssistantReasoningPart };
function ConversationMessageView() {
  const context = useContext7(ConversationMessageContext);
  if (!context) return null;
  const { node, props, hideThinking, turnStatus, thinkingHost } = context;
  const t = props.t ?? fallbackT2;
  const native = nativeContent(node, props, hideThinking, turnStatus, thinkingHost);
  const className = node.kind === "user" ? "aui-user-message-root aui:mx-auto aui:grid aui:w-full aui:auto-rows-auto aui:grid-cols-[minmax(72px,1fr)_auto] aui:gap-y-2 aui:px-2" : node.kind === "assistant" ? "aui-assistant-message-root aui:relative aui:mx-auto aui:flex aui:w-full aui:flex-col aui:items-start" : void 0;
  return /* @__PURE__ */ jsx26(
    message_exports.Root,
    {
      ...className ? { className } : {},
      ...node.kind === "user" || node.kind === "assistant" ? { "data-agnes-assistant-ui-message": node.kind } : {},
      children: node.kind === "user" ? /* @__PURE__ */ jsx26(
        "div",
        {
          "data-slot": "user-message",
          className: "aui-user-message-content-wrapper aui:relative aui:col-start-2 aui:min-w-0",
          children: /* @__PURE__ */ jsxs6("div", { className: "aui-user-message-content aui:rounded-3xl aui:border aui:border-[var(--agnes-line-primary)] aui:bg-[var(--agnes-bg-card)] aui:px-5 aui:py-2.5 aui:text-sm aui:leading-relaxed aui:text-[var(--agnes-text-primary)]", children: [
            /* @__PURE__ */ jsx26("p", { className: "node-label", children: t("timeline.userLabel") }),
            /* @__PURE__ */ jsx26(UserMessageImages, { node, t }),
            /* @__PURE__ */ jsx26(UserMessageFiles, { node }),
            /* @__PURE__ */ jsx26(message_exports.Parts, { components: userMessageParts })
          ] })
        }
      ) : node.kind === "assistant" ? /* @__PURE__ */ jsxs6(Fragment9, { children: [
        /* @__PURE__ */ jsx26("p", { className: "node-label", children: "Agnes" }),
        /* @__PURE__ */ jsx26("div", { className: "aui-assistant-message-content aui:mx-2 aui:self-stretch aui:min-w-0 aui:min-h-[4.25rem] aui:text-sm aui:leading-relaxed aui:text-[var(--agnes-text-primary)]", children: /* @__PURE__ */ jsx26(message_exports.Parts, { components: assistantMessageParts }) })
      ] }) : native
    }
  );
}
function AssistantUiMessagePortal() {
  const id = useAssistantState(({ message }) => message.id);
  const targetContext = useContext7(ConversationMessageTargetContext);
  const target = targetContext?.targets.get(id);
  const isAgnesMessage = target?.context.node.kind === "user" || target?.context.node.kind === "assistant";
  useLayoutEffect5(() => {
    if (!target || !isAgnesMessage) return;
    target.element.dataset.agnesAssistantUiReady = "true";
    return () => {
      delete target.element.dataset.agnesAssistantUiReady;
    };
  }, [target, isAgnesMessage]);
  if (!target || !isAgnesMessage) return null;
  return createPortal(
    /* @__PURE__ */ jsx26(ConversationMessageContext.Provider, { value: target.context, children: /* @__PURE__ */ jsx26(ConversationMessageView, {}) }),
    target.element,
    id
  );
}
var assistantUiMessageComponents = { Message: AssistantUiMessagePortal };
function ConversationToolCard({
  node,
  icon,
  onExpandedChange,
  t = fallbackT2
}) {
  const [expanded, setExpanded] = useState12(false);
  const cardHost = useRef11(null);
  const detailHost = useRef11(null);
  useLayoutEffect5(() => {
    const article = cardHost.current?.closest(".timeline-node.tool");
    if (article && (expanded || article.dataset.expanded !== void 0))
      article.dataset.expanded = String(expanded);
  }, [expanded]);
  const summary = node.summary.trim();
  const remainder = summary.startsWith(node.name) ? summary.slice(node.name.length).trim() : summary;
  const meaningful = summary && summary !== node.name && remainder && !remainder.startsWith("{") && !remainder.startsWith("[");
  const outcome = toolOutcome(node, t);
  const nextDetail = [
    t("tool.detail.header", { name: node.name }),
    t("tool.detail.status", { status: outcome.label }),
    ...node.argsPreview ? ["", t("tool.detail.args"), node.argsPreview] : [],
    ...outcome.text ? ["", outcome.section, outcome.text] : []
  ].join("\n");
  const detail = useInteractionSnapshot(detailHost, nextDetail);
  return /* @__PURE__ */ jsxs6(
    "div",
    {
      ref: cardHost,
      "data-agnes-tool-card": "",
      "data-status": node.status,
      "data-expanded": expanded ? "true" : void 0,
      children: [
        /* @__PURE__ */ jsxs6("div", { className: "tool-head", children: [
          /* @__PURE__ */ jsxs6("div", { className: "tool-meta", children: [
            icon,
            /* @__PURE__ */ jsx26("span", { className: "tool-name", children: node.name }),
            /* @__PURE__ */ jsx26("span", { className: "tool-status", children: outcome.label })
          ] }),
          /* @__PURE__ */ jsx26(
            "button",
            {
              type: "button",
              className: "tool-detail",
              "aria-expanded": expanded,
              onClick: () => {
                const next = !expanded;
                onExpandedChange?.(next);
                flushSync2(() => setExpanded(next));
              },
              children: expanded ? t("tool.detail.collapse") : t("tool.detail.expand")
            }
          )
        ] }),
        /* @__PURE__ */ jsx26("div", { className: "tool-summary", hidden: !meaningful, children: meaningful ? summary : "" }),
        /* @__PURE__ */ jsx26("div", { className: "tool-detail-body", children: /* @__PURE__ */ jsx26("div", { className: "tool-detail-inner", children: /* @__PURE__ */ jsx26("div", { ref: detailHost, className: "tool-detail-text", children: detail }) }) })
      ]
    }
  );
}
function markdownState(node, turnStatus) {
  return {
    nodeId: node.id,
    streaming: node.kind === "assistant" && node.streaming === true && (turnStatus === void 0 || turnStatus === "running" || turnStatus === "waiting"),
    ...turnStatus ? { turnStatus } : {}
  };
}
function nativeContent(node, props, hideThinking = false, turnStatus, thinkingHost) {
  const t = props.t ?? fallbackT2;
  switch (node.kind) {
    case "user":
      return /* @__PURE__ */ jsx26(UserMessage, { node, t });
    case "assistant":
      return /* @__PURE__ */ jsx26(
        AssistantMessage,
        {
          node,
          state: markdownState(node, turnStatus),
          renderMarkdown: props.renderMarkdown,
          hideThinking,
          thinkingHost,
          t
        }
      );
    case "tool":
      return props.renderTool ? props.renderTool(node) : /* @__PURE__ */ jsx26(ConversationToolCard, { node, t });
    case "approval":
      return /* @__PURE__ */ jsxs6(Fragment9, { children: [
        /* @__PURE__ */ jsxs6("div", { className: "approval-head", children: [
          /* @__PURE__ */ jsx26("span", { className: "node-label", children: t("timeline.approvalTitle") }),
          /* @__PURE__ */ jsx26("span", { className: "tool-status", children: approvalStatus(node, t) })
        ] }),
        /* @__PURE__ */ jsx26("div", { className: "approval-summary", children: node.summary })
      ] });
    case "cost":
      return props.renderCost ? props.renderCost(node) : /* @__PURE__ */ jsx26(ConversationCost, { node, t });
    case "artifact":
      return /* @__PURE__ */ jsxs6(Fragment9, { children: [
        /* @__PURE__ */ jsx26("p", { className: "node-label", children: t("timeline.artifactLabel") }),
        /* @__PURE__ */ jsx26("div", { className: "node-body", children: node.name })
      ] });
    case "compaction":
      return /* @__PURE__ */ jsxs6(Fragment9, { children: [
        /* @__PURE__ */ jsx26("p", { className: "node-label", children: t("timeline.compactionLabel") }),
        /* @__PURE__ */ jsx26("div", { className: "node-body", children: node.summary ?? t("timeline.compactionFallback", { range: node.range.join("–") }) })
      ] });
    case "slot":
      return props.renderSlot ? props.renderSlot(node) : /* @__PURE__ */ jsx26("div", { "data-slot-state": "empty", children: t("slot.notReady") });
    case "contribute-conflict":
      return /* @__PURE__ */ jsxs6(Fragment9, { children: [
        /* @__PURE__ */ jsx26("p", { className: "node-label", children: t("timeline.conflictLabel") }),
        /* @__PURE__ */ jsxs6("div", { className: "node-body", children: [
          node.key,
          t("timeline.conflictJoiner"),
          node.ops.join(t("timeline.conflictOpsJoiner"))
        ] })
      ] });
    case "context":
    case "context-sections":
      return null;
  }
}
function isEmptyStreamingAssistant(node) {
  return node.kind === "assistant" && node.streaming === true && !node.text.trim() && !node.thinking?.trim() && node.lostChars === void 0;
}
function Message({
  node,
  props,
  hideThinking = false,
  turnStatus,
  thinkingHost
}) {
  const messageTarget = useRef11(null);
  const registerTarget = useContext7(registerConversationMessageTargetContext);
  const native = nativeContent(node, props, hideThinking, turnStatus, thinkingHost);
  const usesAssistantUi = node.kind === "user" || node.kind === "assistant";
  const context = useMemo21(
    () => ({
      node,
      props,
      hideThinking,
      ...turnStatus ? { turnStatus } : {},
      ...thinkingHost ? { thinkingHost } : {}
    }),
    [hideThinking, node, props, thinkingHost, turnStatus]
  );
  useLayoutEffect5(() => {
    const element = messageTarget.current;
    if (!element || !usesAssistantUi || !registerTarget) return;
    registerTarget(node.id, { element, context });
  }, [context, node.id, registerTarget, usesAssistantUi]);
  useLayoutEffect5(
    () => () => {
      if (usesAssistantUi) registerTarget?.(node.id, void 0);
    },
    [node.id, registerTarget, usesAssistantUi]
  );
  const content = usesAssistantUi ? /* @__PURE__ */ jsxs6(Fragment9, { children: [
    /* @__PURE__ */ jsx26("div", { ref: messageTarget, "data-agnes-assistant-ui-target": "" }),
    /* @__PURE__ */ jsx26("div", { "data-agnes-assistant-ui-fallback": "", children: native })
  ] }) : native;
  return /* @__PURE__ */ jsx26(
    "article",
    {
      className: `timeline-node ${node.kind}`,
      "data-node-id": node.id,
      "data-node-kind": node.kind,
      hidden: isEmptyStreamingAssistant(node),
      ...node.kind === "assistant" ? { "data-streaming": String(markdownState(node, turnStatus).streaming) } : {},
      ...node.kind === "tool" ? {
        "data-status": node.status,
        // 无障碍标签要带上工具名：只报状态会让读屏用户听不出是哪次调用。
        "aria-label": props.t("tool.card.aria", {
          name: node.name,
          status: toolOutcome(node, props.t).label
        })
      } : {},
      ...node.kind === "approval" ? { "data-state": node.state, "aria-label": approvalStatus(node, props.t) } : {},
      ...node.kind === "contribute-conflict" ? { role: "note" } : {},
      children: props.renderNode ? props.renderNode(node, content) : content
    }
  );
}
var TURN_STATUS_KEYS = {
  running: "turn.status.running",
  waiting: "turn.status.waiting",
  completed: "turn.status.completed",
  failed: "turn.status.failed",
  cancelled: "turn.status.cancelled"
};
function Turn({
  turn,
  nodes,
  ownerByNodeId,
  props
}) {
  const details = useRef11(null);
  const thinkingHost = useRef11(null);
  const thinkingFinalId = useInteractionSnapshot(thinkingHost, turn.finalAssistantId);
  const preference = useRef11(void 0);
  const wasActive = useRef11(void 0);
  const active = !turn.endedAt && (turn.status === "running" || turn.status === "waiting");
  const processActive = turn.status === "running" || turn.status === "waiting";
  const response = useRef11(null);
  const shownProcessActive = useInteractionSnapshot(response, processActive);
  const [processOpen, setProcessOpen] = useState12(processActive);
  const [now, setNow] = useState12(() => Date.now());
  useEffect13(() => {
    if (!active) return;
    const clock = setInterval(() => {
      if (document.visibilityState !== "hidden") setNow(Date.now());
    }, 1e3);
    return () => clearInterval(clock);
  }, [active]);
  useLayoutEffect5(() => {
    if (wasActive.current && !shownProcessActive) preference.current = false;
    wasActive.current = shownProcessActive;
    const open = preference.current ?? shownProcessActive;
    if (details.current) details.current.open = open;
    setProcessOpen(open);
  }, [shownProcessActive]);
  const members = turn.nodeIds.flatMap((id) => {
    const node = nodes.get(id);
    return node && ownerByNodeId.get(id) === turn.id ? [node] : [];
  });
  const users = members.filter((node) => node.kind === "user");
  const others = members.filter((node) => node.kind !== "user");
  const pendingApproval = others.some((node) => node.kind === "approval" && node.state === "pending");
  const awaitingToolApproval = others.some(
    (node) => node.kind === "tool" && node.status === "awaiting_approval"
  );
  const runningTool = others.some((node) => node.kind === "tool" && node.status === "running");
  const latestStreaming = others.filter((node) => node.kind === "assistant" && node.streaming === true).sort((a, b) => b.seq - a.seq)[0];
  let status = props.t(TURN_STATUS_KEYS[turn.status]);
  if (processActive) {
    if (pendingApproval || awaitingToolApproval) status = props.t("turn.status.awaitingApproval");
    else if (turn.status === "waiting") status = props.t(TURN_STATUS_KEYS.waiting);
    else if (runningTool) status = props.t("turn.status.runningTool");
    else if (latestStreaming?.text.trim()) status = props.t("turn.status.replying");
    else if (latestStreaming?.thinking?.trim()) status = props.t("turn.status.thinking");
    else status = props.t("turn.status.preparing");
  }
  const startedAt = Date.parse(turn.startedAt);
  const duration = active && Number.isFinite(startedAt) ? props.t("turn.duration.s", { n: Math.floor(Math.max(0, now - startedAt) / 1e3) }) : turn.durationMs === void 0 ? void 0 : turn.durationMs < 1e3 ? props.t("turn.duration.ms", { n: turn.durationMs }) : turn.durationMs < 6e4 ? props.t("turn.duration.s", {
    n: (turn.durationMs / 1e3).toFixed(turn.durationMs < 1e4 ? 1 : 0)
  }) : props.t("turn.duration.minSec", {
    min: Math.floor(turn.durationMs / 6e4),
    sec: Math.round(turn.durationMs % 6e4 / 1e3)
  });
  const statusText = duration ? `${status}${props.t("turn.elapsedSuffix", { duration })}` : status;
  const finalNode = members.find((node) => node.id === turn.finalAssistantId);
  const finalText = finalNode?.kind === "assistant" ? finalNode.text : "";
  const finalThinking = finalNode?.kind === "assistant" ? finalNode.thinking?.trim() : void 0;
  const processCount = others.filter(
    (node) => node.id !== turn.finalAssistantId && !isEmptyStreamingAssistant(node) && !(node.kind === "approval" && node.state === "pending")
  ).length + (finalThinking ? 1 : 0);
  const ordered = [...others].sort((a, b) => {
    const rank = (node) => node.id === turn.finalAssistantId ? 2 : node.kind === "approval" && node.state === "pending" ? 1 : 0;
    return rank(a) - rank(b);
  });
  const settled = !processActive && Boolean(turn.finalAssistantId);
  return /* @__PURE__ */ jsxs6(
    "section",
    {
      className: "conversation-turn",
      "data-turn-id": turn.id,
      "data-status": turn.status,
      "data-inherited": String(turn.inherited),
      children: [
        /* @__PURE__ */ jsx26("div", { className: "turn-user", children: users.map((node) => /* @__PURE__ */ jsx26(Message, { node, props }, node.id)) }),
        /* @__PURE__ */ jsxs6("div", { ref: response, className: "turn-response", children: [
          /* @__PURE__ */ jsxs6("span", { className: "process-identity", children: [
            /* @__PURE__ */ jsx26("span", { className: "process-avatar", children: /* @__PURE__ */ jsx26("span", { className: "agnes-mark process-avatar-mark", "aria-hidden": "true" }) }),
            /* @__PURE__ */ jsx26("span", { className: "process-name", children: "Agnes Harness" })
          ] }),
          /* @__PURE__ */ jsx26("p", { className: "turn-status", "data-agnes-dynamic": "turn-process", hidden: processCount > 0, children: statusText }),
          /* @__PURE__ */ jsxs6(
            "details",
            {
              ref: details,
              className: "turn-process",
              hidden: processCount === 0,
              onToggle: () => {
                const open = details.current?.open ?? false;
                preference.current = open;
                setProcessOpen(open);
              },
              children: [
                /* @__PURE__ */ jsx26("summary", { children: /* @__PURE__ */ jsxs6("span", { className: "process-row", children: [
                  /* @__PURE__ */ jsx26("span", { className: "process-label", "data-agnes-dynamic": "turn-process", children: statusText }),
                  /* @__PURE__ */ jsx26("svg", { className: "icon process-chevron", viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ jsx26("path", { d: "m6 9 6 6 6-6" }) })
                ] }) }),
                finalThinking && thinkingFinalId === turn.finalAssistantId && /* @__PURE__ */ jsx26("div", { className: "turn-process-body", children: /* @__PURE__ */ jsxs6("details", { className: "thinking", children: [
                  /* @__PURE__ */ jsx26("summary", { children: props.t("timeline.thinkingSummary") }),
                  /* @__PURE__ */ jsx26("div", { className: "thinking-content markdown", children: props.renderMarkdown ? props.renderMarkdown(finalThinking, "thinking", {
                    nodeId: finalNode?.id ?? "",
                    streaming: finalNode ? markdownState(finalNode, turn.status).streaming : false,
                    turnStatus: turn.status
                  }) : finalThinking })
                ] }) })
              ]
            }
          ),
          turn.status === "failed" && /* @__PURE__ */ jsx26("p", { className: "turn-error", role: "alert", children: turn.error ? props.t("turn.error.codeJoin", { code: turn.error.code, message: turn.error.message }) : props.t("turn.error.noDetail", {
            reason: turn.reason ?? props.t("turn.error.unknownReason")
          }) }),
          /* @__PURE__ */ jsx26("div", { className: "turn-node-flow", children: ordered.map((node) => {
            const final = node.id === turn.finalAssistantId;
            const attention = node.kind === "approval" && node.state === "pending";
            return /* @__PURE__ */ jsx26(
              "div",
              {
                className: final ? "turn-final" : attention ? "turn-attention" : "turn-process-body",
                hidden: isEmptyStreamingAssistant(node) || !final && !attention && !processOpen,
                children: /* @__PURE__ */ jsx26(
                  Message,
                  {
                    node,
                    props,
                    hideThinking: final && thinkingFinalId === turn.finalAssistantId,
                    turnStatus: turn.status,
                    thinkingHost: node.id === (turn.finalAssistantId ?? latestStreaming?.id) ? thinkingHost : void 0
                  }
                )
              },
              node.id
            );
          }) }),
          props.renderTurnActions?.(turn, finalText, settled)
        ] })
      ]
    }
  );
}
function ConversationMessages(props) {
  const messages = useThread((state) => state.messages);
  const targetsRef = useRef11(/* @__PURE__ */ new Map());
  const [targetVersion, setTargetVersion] = useState12(0);
  const registerMessageTarget = useCallback10((id, target) => {
    const current = targetsRef.current.get(id);
    if (!target) {
      if (!current) return;
      targetsRef.current.delete(id);
      setTargetVersion((version) => version + 1);
      return;
    }
    if (current?.element === target.element && current.context.node === target.context.node && current.context.props === target.context.props && current.context.hideThinking === target.context.hideThinking && current.context.turnStatus === target.context.turnStatus && current.context.thinkingHost === target.context.thinkingHost)
      return;
    targetsRef.current.set(id, target);
    setTargetVersion((version) => version + 1);
  }, []);
  const targetContext = useMemo21(
    () => ({ targets: targetsRef.current, version: targetVersion }),
    [targetVersion]
  );
  const visible = props.visibleNodeIds ? new Set(props.visibleNodeIds) : void 0;
  const nodes = /* @__PURE__ */ new Map();
  for (const message of messages) {
    const custom = message.metadata.custom;
    const node = custom?.node;
    if (node && (!visible || visible.has(message.id)) && node.kind !== "context" && node.kind !== "context-sections")
      nodes.set(message.id, node);
  }
  if (props.turns?.length) {
    const assigned = new Set(props.turns.flatMap((turn) => turn.nodeIds));
    const ownerByNodeId = new Map(
      props.turns.flatMap((turn) => turn.nodeIds.map((id) => [id, turn.id]))
    );
    return /* @__PURE__ */ jsx26(ConversationMessageTargetContext.Provider, { value: targetContext, children: /* @__PURE__ */ jsx26(registerConversationMessageTargetContext.Provider, { value: registerMessageTarget, children: /* @__PURE__ */ jsxs6("section", { "data-agnes-conversation-messages": "", children: [
      /* @__PURE__ */ jsx26(thread_exports.Messages, { components: assistantUiMessageComponents }),
      props.turns.map((turn) => /* @__PURE__ */ jsx26(Turn, { turn, nodes, ownerByNodeId, props }, turn.id)),
      /* @__PURE__ */ jsx26(
        "section",
        {
          className: "timeline-unassigned",
          hidden: [...nodes.keys()].every((id) => assigned.has(id)),
          children: [...nodes].filter(([id]) => !assigned.has(id)).map(([id, node]) => /* @__PURE__ */ jsx26(Message, { node, props }, id))
        }
      )
    ] }) }) });
  }
  return /* @__PURE__ */ jsx26(ConversationMessageTargetContext.Provider, { value: targetContext, children: /* @__PURE__ */ jsx26(registerConversationMessageTargetContext.Provider, { value: registerMessageTarget, children: /* @__PURE__ */ jsxs6("section", { "data-agnes-conversation-messages": "", children: [
    /* @__PURE__ */ jsx26(thread_exports.Messages, { components: assistantUiMessageComponents }),
    messages.map((message) => {
      if (visible && !visible.has(message.id)) return null;
      const custom = message.metadata.custom;
      const node = custom?.node;
      return node && node.kind !== "context" && node.kind !== "context-sections" ? /* @__PURE__ */ jsx26(Message, { node, props, turnStatus: custom?.turnStatus }, message.id) : null;
    })
  ] }) }) });
}

// ../web-ui/src/conversation/runtime.ts
import { useMemo as useMemo22, useSyncExternalStore as useSyncExternalStore3 } from "react";
function createConversationProjectionStore(initial) {
  let snapshot = initial;
  const listeners = /* @__PURE__ */ new Set();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update: (projection) => {
      snapshot = projection;
      for (const listener of listeners) listener();
    }
  };
}
function userText(node) {
  return node.content.filter(
    (block2) => block2.type === "text"
  ).map((block2) => block2.text).join("\n");
}
function displayText(node, t = (key) => key) {
  switch (node.kind) {
    case "user":
      return userText(node);
    case "assistant":
      return node.text || (node.lostChars === void 0 ? "" : t("runtime.lostOutput", { count: node.lostChars }));
    case "tool":
      return `${node.name}: ${node.summary}`;
    case "approval":
      return `${node.state}: ${node.summary}`;
    case "cost":
      return `${node.source}: ${node.credits ?? t("cost.summary.noBilling")}`;
    case "artifact":
      return node.name;
    case "compaction":
      return node.summary ?? t("runtime.compactionFallback", { range: node.range.join("–") });
    case "slot":
      return `${node.fill.slot}: ${node.fill.extId}`;
    case "contribute-conflict":
      return `${node.key}: ${node.ops.join(",")}`;
  }
}
function isConversationNode(node) {
  if (node.kind === "context" || node.kind === "context-sections") return false;
  if (node.kind === "assistant")
    return Boolean(
      node.streaming || node.text.trim() || node.thinking?.trim() || node.lostChars !== void 0
    );
  return true;
}
function messageStatus(node, owner) {
  if (node.kind === "user") return void 0;
  if (owner?.status === "cancelled") return { type: "incomplete", reason: "cancelled" };
  if (owner?.status === "failed") return { type: "incomplete", reason: "error" };
  if (node.kind === "assistant" && node.streaming && owner?.status !== "completed") return { type: "running" };
  return { type: "complete", reason: "stop" };
}
function projectConversationMessages(projection, t = fallbackT) {
  const ownerByNodeId = new Map(
    projection.turns?.flatMap((turn) => turn.nodeIds.map((id) => [id, turn]))
  );
  const messages = /* @__PURE__ */ new Map();
  for (const node of projection.nodes) {
    if (!isConversationNode(node)) continue;
    const owner = ownerByNodeId.get(node.id);
    const text2 = displayText(node, t);
    const status = messageStatus(node, owner);
    messages.set(node.id, {
      id: node.id,
      role: node.kind === "user" ? "user" : "assistant",
      content: node.kind === "assistant" && node.thinking ? [
        { type: "reasoning", text: node.thinking },
        { type: "text", text: text2 }
      ] : text2,
      ...status ? { status } : {},
      metadata: {
        custom: {
          kind: node.kind,
          node,
          ...owner ? { turnId: owner.id, turnStatus: owner.status } : {},
          ...owner?.reason ? { turnReason: owner.reason } : {},
          isFinal: owner?.finalAssistantId === node.id
        }
      }
    });
  }
  return [...messages.values()];
}
function useConversationRuntime(store, t = fallbackT) {
  const projection = useSyncExternalStore3(store.subscribe, store.getSnapshot, store.getSnapshot);
  const messages = useMemo22(() => projectConversationMessages(projection, t), [projection, t]);
  const messageRepository = useMemo22(() => ExportedMessageRepository.fromArray(messages), [messages]);
  const lastMessage = messages.at(-1);
  return useExternalStoreRuntime({
    messageRepository,
    isDisabled: true,
    isRunning: lastMessage?.role === "assistant" && lastMessage.status?.type === "running",
    onNew: async () => {
      throw new Error("The conversation projection cannot submit a request");
    }
  });
}

// ../web-ui/src/conversation/turn-actions.tsx
import {
  Fragment as Fragment10,
  useCallback as useCallback11,
  useImperativeHandle,
  useLayoutEffect as useLayoutEffect6,
  useRef as useRef12,
  useState as useState13
} from "react";
import { jsx as jsx27, jsxs as jsxs7 } from "react/jsx-runtime";
var durationLabel = (ms, t) => {
  if (ms === void 0) return void 0;
  if (ms < 1e3) return t("turn.duration.ms", { n: ms });
  if (ms < 6e4) return t("turn.duration.s", { n: (ms / 1e3).toFixed(ms < 1e4 ? 1 : 0) });
  return t("turn.duration.minSec", { min: Math.floor(ms / 6e4), sec: Math.round(ms % 6e4 / 1e3) });
};
var sourceLabel = (source2, t) => t(source2 === "estimated" ? "cost.source.estimated" : "cost.source.gateway");
var latestModel = (turn) => {
  if (turn.finalModel !== void 0) return turn.finalModel;
  for (let i = turn.usage.calls.length - 1; i >= 0; i--) {
    const call = turn.usage.calls[i];
    if (call?.purpose === "inference" && !call.adjustment) return call.model;
  }
  return void 0;
};
function positionUsage(meta, usage) {
  const doc = meta.ownerDocument;
  const box = meta.getBoundingClientRect();
  const width = doc.documentElement.clientWidth || doc.defaultView?.innerWidth || 0;
  const height = doc.documentElement.clientHeight || doc.defaultView?.innerHeight || 0;
  const gutter = 12;
  const gap = 8;
  const panelWidth = Math.max(0, Math.min(400, width - gutter * 2));
  const below = Math.max(0, height - box.bottom - gutter - gap);
  const above = Math.max(0, box.top - gutter - gap);
  usage.style.width = `${panelWidth}px`;
  usage.style.left = `${Math.min(Math.max(gutter, box.right - panelWidth), Math.max(gutter, width - panelWidth - gutter))}px`;
  usage.style.right = "auto";
  if (below >= 220 || below >= above) {
    usage.style.top = `${Math.max(gutter, box.bottom + gap)}px`;
    usage.style.bottom = "auto";
    usage.style.maxHeight = `${below}px`;
  } else {
    usage.style.top = "auto";
    usage.style.bottom = `${Math.max(gutter, height - box.top + gap)}px`;
    usage.style.maxHeight = `${above}px`;
  }
}
function legacyCopy(text2, doc) {
  const active = doc.activeElement;
  const selection = doc.getSelection();
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
  const textarea = doc.createElement("textarea");
  textarea.value = text2;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  doc.body.append(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = doc.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    selection?.removeAllRanges();
    for (const range of ranges) selection?.addRange(range);
    active?.focus?.({ preventScroll: true });
  }
  return copied;
}
function Icon({ paths }) {
  return /* @__PURE__ */ jsx27("svg", { className: "icon", viewBox: "0 0 24 24", "aria-hidden": "true", children: paths.map((path) => /* @__PURE__ */ jsx27("path", { d: path }, path)) });
}
function ConversationTurnActions({
  turn,
  finalText,
  settled,
  t = fallbackT,
  localeTag = "en-US",
  onFork,
  bindAutoDismiss,
  feedbackRef
}) {
  const details = useRef12(null);
  const summary = useRef12(null);
  const usage = useRef12(null);
  const footer = useRef12(null);
  const currentId = useRef12(turn.id);
  currentId.current = turn.id;
  const lastId = useRef12(turn.id);
  const epoch = useRef12(0);
  const mounted = useRef12(false);
  const timer = useRef12(void 0);
  const pending = useRef12(void 0);
  const [pendingId, setPendingId] = useState13();
  const [feedback, setFeedback] = useState13();
  const clear = useCallback11(() => {
    if (timer.current !== void 0) clearTimeout(timer.current);
    timer.current = void 0;
    setFeedback(void 0);
  }, []);
  const report = useCallback11(
    (message, durationMs) => {
      clear();
      const id = currentId.current;
      const generation = epoch.current;
      setFeedback({ id, message });
      if (durationMs !== void 0)
        timer.current = setTimeout(() => {
          timer.current = void 0;
          if (mounted.current && currentId.current === id && epoch.current === generation)
            setFeedback((value) => value?.id === id && value.message === message ? void 0 : value);
        }, durationMs);
    },
    [clear]
  );
  useImperativeHandle(feedbackRef, () => ({ clear, report }), [clear, report]);
  useLayoutEffect6(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      epoch.current++;
      if (timer.current !== void 0) clearTimeout(timer.current);
      timer.current = void 0;
    };
  }, []);
  useLayoutEffect6(() => {
    if (lastId.current === turn.id) return;
    lastId.current = turn.id;
    epoch.current++;
    clear();
    pending.current = void 0;
    setPendingId(void 0);
    if (details.current) details.current.open = false;
  }, [turn.id, clear]);
  useLayoutEffect6(() => {
    const element = details.current;
    if (!element) return;
    if (bindAutoDismiss) {
      bindAutoDismiss(element);
      return;
    }
    const doc = element.ownerDocument;
    const dismiss = (event) => {
      if (element.isConnected && element.open && !event.composedPath().includes(element)) element.open = false;
    };
    doc.addEventListener("click", dismiss);
    return () => doc.removeEventListener("click", dismiss);
  }, [bindAutoDismiss]);
  useLayoutEffect6(() => {
    if (details.current?.open && summary.current && usage.current)
      positionUsage(summary.current, usage.current);
  });
  const copy = () => {
    if (!finalText) return;
    const id = turn.id;
    const generation = epoch.current;
    const doc = footer.current?.ownerDocument;
    if (!doc) return;
    const valid = () => mounted.current && currentId.current === id && epoch.current === generation;
    const fallback = () => {
      const copied = legacyCopy(finalText, doc);
      if (valid())
        report(copied ? t("turnactions.copied") : t("turnactions.copyFailed"), copied ? 1600 : void 0);
    };
    const clipboard = doc.defaultView?.navigator.clipboard;
    if (!clipboard?.writeText) return fallback();
    try {
      void Promise.resolve(clipboard.writeText(finalText)).then(
        () => {
          if (valid()) report(t("turnactions.copied"), 1600);
        },
        () => {
          if (valid()) fallback();
        }
      );
    } catch {
      fallback();
    }
  };
  const fork = () => {
    if (!turn.forkable || !onFork || pending.current?.id === turn.id) return;
    const id = turn.id;
    const generation = epoch.current;
    const token = Symbol(id);
    pending.current = { id, token };
    setPendingId(id);
    clear();
    try {
      void Promise.resolve(onFork(turn)).then(void 0, () => {
        if (mounted.current && currentId.current === id && epoch.current === generation)
          report(t("turnactions.forkFailed"));
      }).finally(() => {
        if (pending.current?.token === token) {
          pending.current = void 0;
          if (mounted.current && currentId.current === id && epoch.current === generation)
            setPendingId(void 0);
        }
      });
    } catch {
      pending.current = void 0;
      setPendingId(void 0);
      report(t("turnactions.forkFailed"));
    }
  };
  const facts = [
    turn.inherited ? t("turnactions.inherited") : void 0,
    turn.endedAt ? new Intl.DateTimeFormat(localeTag, { hour: "2-digit", minute: "2-digit" }).format(
      new Date(turn.endedAt)
    ) : void 0,
    latestModel(turn)
  ].filter(Boolean);
  const { totals, cost, credits: credits2, billingComplete } = turn.usage;
  const duration = durationLabel(turn.durationMs, t);
  const rows = [
    [t("turnactions.rows.tokensIn"), totals.input.toLocaleString()],
    [t("turnactions.rows.tokensOut"), totals.output.toLocaleString()],
    [
      t("turnactions.rows.cache"),
      `${totals.cacheRead.toLocaleString()} / ${totals.cacheWrite.toLocaleString()}`
    ],
    ...cost ? [
      [
        t("turnactions.rows.cost"),
        `$${(cost.usdMicros / 1e6).toFixed(6)} · ${sourceLabel(cost.source, t)}${cost.subscription ? t("turnactions.subscription") : ""}${billingComplete ? "" : t("turnactions.billingPartial")}`
      ]
    ] : [],
    ...credits2 ? [
      [
        t("turnactions.rows.credits"),
        `${credits2.amount.toFixed(8).replace(/\.?0+$/, "")} credits · ${sourceLabel(credits2.source, t)}${credits2.complete ? "" : t("turnactions.creditsPartial")}`
      ]
    ] : [],
    ...duration ? [[t("turnactions.rows.duration"), duration]] : []
  ];
  return /* @__PURE__ */ jsxs7("footer", { ref: footer, className: "turn-footer", hidden: !settled, children: [
    /* @__PURE__ */ jsx27(
      "button",
      {
        type: "button",
        className: "turn-action",
        "aria-label": t("turnactions.copy"),
        title: t("turnactions.copy"),
        hidden: !settled,
        disabled: !finalText,
        onClick: copy,
        children: /* @__PURE__ */ jsx27(
          Icon,
          {
            paths: [
              "M9 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z",
              "M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2"
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ jsx27(
      "button",
      {
        type: "button",
        className: "turn-action",
        "aria-label": t("turnactions.fork"),
        title: t("turnactions.fork"),
        hidden: !settled || !turn.forkable,
        disabled: pendingId === turn.id || !turn.forkable || !onFork,
        onClick: fork,
        children: /* @__PURE__ */ jsx27(Icon, { paths: ["M6 3v5a4 4 0 0 0 4 4h8", "m14 8 4 4-4 4", "M6 21v-5a4 4 0 0 1 4-4"] })
      }
    ),
    /* @__PURE__ */ jsxs7(
      "details",
      {
        ref: details,
        className: "turn-usage",
        hidden: !settled,
        onToggle: () => {
          if (details.current?.open && summary.current && usage.current)
            positionUsage(summary.current, usage.current);
        },
        children: [
          /* @__PURE__ */ jsx27("summary", { ref: summary, className: "turn-meta", "aria-label": t("turnactions.metaAria"), children: settled ? facts.join(" · ") : "" }),
          /* @__PURE__ */ jsx27("dl", { ref: usage, className: "turn-usage-grid", children: settled && rows.map(([name, value]) => /* @__PURE__ */ jsxs7(Fragment10, { children: [
            /* @__PURE__ */ jsx27("dt", { children: name }),
            /* @__PURE__ */ jsx27("dd", { children: value })
          ] }, name)) })
        ]
      }
    ),
    /* @__PURE__ */ jsx27("span", { className: "turn-feedback", role: "status", children: feedback?.id === turn.id ? feedback.message : "" })
  ] });
}

// ../web-ui/src/conversation/usage.tsx
import { Fragment as Fragment11, useLayoutEffect as useLayoutEffect7, useRef as useRef13 } from "react";
import { jsx as jsx28, jsxs as jsxs8 } from "react/jsx-runtime";
var compact2 = (n) => n < 1e3 ? String(n) : `${(n / (n >= 1e6 ? 1e6 : 1e3)).toFixed(1)}${n >= 1e6 ? "M" : "K"}`;
var count2 = (n) => n.toLocaleString("en-US");
function ConversationUsage({ usage, connected, t = fallbackT }) {
  const details = useRef13(null);
  useLayoutEffect7(() => {
    const element = details.current;
    if (!element) return;
    const doc = element.ownerDocument;
    const dismiss = (event) => {
      if (element.open && !event.composedPath().includes(element)) element.open = false;
    };
    doc.addEventListener("click", dismiss);
    return () => doc.removeEventListener("click", dismiss);
  }, []);
  useLayoutEffect7(() => {
    if (!usage && details.current) details.current.open = false;
  }, [usage]);
  const pct = usage ? (usage.context.tokens / usage.context.window * 100).toFixed(1) : "";
  const fill = `${Math.min(100, Number(pct))}%`;
  const stale = connected ? "" : t("usage.stale");
  const caption = usage ? t("usage.caption", {
    used: compact2(usage.context.tokens),
    window: compact2(usage.context.window),
    stale
  }) : "";
  const summary = usage ? t("usage.summary", {
    used: compact2(usage.context.tokens),
    window: compact2(usage.context.window),
    pct,
    stale
  }) : "";
  const rows = usage ? [
    [t("usage.rows.context"), `${count2(usage.context.tokens)} Token`],
    [t("usage.rows.window"), `${count2(usage.context.window)} Token`],
    ...usage.model.maxTokens ? [[t("usage.rows.maxOutput"), `${count2(usage.model.maxTokens)} Token`]] : [],
    [t("usage.rows.autoCompact"), usage.context.autoCompact ? t("usage.enabled") : t("usage.disabled")]
  ] : [];
  return /* @__PURE__ */ jsxs8(
    "details",
    {
      ref: details,
      className: "usage-disclosure session-usage",
      hidden: !usage,
      "data-pressure": usage ? Number(pct) > 90 ? "high" : Number(pct) > 70 ? "medium" : "normal" : void 0,
      children: [
        /* @__PURE__ */ jsxs8(
          "summary",
          {
            "aria-label": usage ? t("usage.viewAria", { summary }) : t("usage.viewAriaFallback"),
            title: t("usage.title"),
            children: [
              /* @__PURE__ */ jsx28("span", { className: "usage-ring", "aria-hidden": "true", style: { "--usage-pct": fill } }),
              /* @__PURE__ */ jsx28("span", { className: "usage-summary-label", children: summary })
            ]
          }
        ),
        /* @__PURE__ */ jsxs8("div", { className: "usage-popover", children: [
          /* @__PURE__ */ jsxs8("div", { className: "usage-popover-head", children: [
            /* @__PURE__ */ jsx28("p", { className: "usage-popover-title", children: t("usage.usedTitle") }),
            /* @__PURE__ */ jsx28("p", { className: "usage-context-value", children: usage ? `${pct}%` : "" }),
            /* @__PURE__ */ jsx28("p", { className: "usage-context-caption", children: caption })
          ] }),
          /* @__PURE__ */ jsx28("div", { className: "usage-bar", "aria-hidden": "true", children: /* @__PURE__ */ jsx28("span", { style: { width: fill } }) }),
          /* @__PURE__ */ jsx28("dl", { className: "usage-grid", children: rows.map(([name, value]) => /* @__PURE__ */ jsxs8(Fragment11, { children: [
            /* @__PURE__ */ jsx28("dt", { children: name }),
            /* @__PURE__ */ jsx28("dd", { children: value })
          ] }, name)) }),
          /* @__PURE__ */ jsx28("p", { className: "usage-note", children: t("usage.note") })
        ] })
      ]
    }
  );
}
export {
  AssistantRuntimeProvider,
  ConversationCost,
  ConversationMarkdown,
  ConversationMessages,
  ConversationToolCard,
  ConversationTurnActions,
  ConversationUsage,
  DocumentPreview,
  costDetails,
  costSummary,
  createConversationProjectionStore,
  documentResourceUrl,
  projectConversationMessages,
  sanitizeDocumentHtml,
  toolOutcome,
  useConversationRuntime,
  useExternalStoreRuntime
};
/*! Bundled license information:

dompurify/dist/purify.es.mjs:
  (*! @license DOMPurify 3.4.16 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.4.16/LICENSE *)
  (*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE *)
*/
