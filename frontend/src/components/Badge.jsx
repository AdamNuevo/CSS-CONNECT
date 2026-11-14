import { STATUS_CLASS } from "../data.js";

// A dot plus the label, so status never relies on colour alone.
// `tone` ("ok" | "warn" | "bad" | "idle") overrides the colour looked up from the label.
export default function Badge({ status, tone }) {
  return <span className={"badge " + (tone || STATUS_CLASS[status] || "idle")}><i className="dot" />{status}</span>;
}
