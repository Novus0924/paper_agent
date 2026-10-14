import {
  require_react_dom
} from "./chunk-227C4OM4.js";
import {
  __commonJS,
  __toESM
} from "./chunk-XN6FCX3X.js";

// ../../node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/client.js
var require_client = __commonJS({
  "../../node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/client.js"(exports) {
    "use strict";
    var m = require_react_dom();
    if (false) {
      exports.createRoot = m.createRoot;
      exports.hydrateRoot = m.hydrateRoot;
    } else {
      i = m.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
      exports.createRoot = function(c, o) {
        i.usingClientEntryPoint = true;
        try {
          return m.createRoot(c, o);
        } finally {
          i.usingClientEntryPoint = false;
        }
      };
      exports.hydrateRoot = function(c, h, o) {
        i.usingClientEntryPoint = true;
        try {
          return m.hydrateRoot(c, h, o);
        } finally {
          i.usingClientEntryPoint = false;
        }
      };
    }
    var i;
  }
});

// tools/vendor/react-dom-client-entry.js
var import_client = __toESM(require_client(), 1);
var { createRoot, hydrateRoot } = import_client.default;
var react_dom_client_entry_default = import_client.default;
export {
  createRoot,
  react_dom_client_entry_default as default,
  hydrateRoot
};
