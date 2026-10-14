import {
  mountResourceAdmin
} from "./chunk-UUJS66GJ.js";
import "./chunk-Q3P2MODL.js";

// ../resource-control-web/src/standalone.ts
var workspaceId = new URLSearchParams(location.search).get("workspaceId");
document.getElementById("resource-return")?.addEventListener("click", () => {
  location.href = "/";
});
mountResourceAdmin(workspaceId ? { workspaceId } : {});
