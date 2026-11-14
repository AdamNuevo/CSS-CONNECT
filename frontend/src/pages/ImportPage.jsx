import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import Stepper from "../components/Stepper.jsx";
import { useToast } from "../components/Toast.jsx";
import { api } from "../api.js";

const MAX = 5 * 1024 * 1024;
export const IMPORT_STEPS = ["Upload file", "Review", "Create accounts"];

const TEMPLATE = [
  "id_number,full_name,email,role,program,year,section,academic_status,department,position,specialization",
  "23-0001,Juan Dela Cruz,juan.delacruz@qcu.edu.ph,Student,BSIT,3,A,Regular,,,",
  "FAC-2026-001,Prof. Ana Santos,ana.santos@qcu.edu.ph,Faculty,,,,,IT Program,Instructor,Web Development",
  ""
].join("\n");

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "ccs-accounts-template.csv" });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ImportPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const input = useRef();
  const [drag, setDrag] = useState(false);
  const [fileName, setFileName] = useState("");

  async function take(file) {
    if (!file || fileName) return;
    if (!/\.csv$/i.test(file.name)) return toast("Please choose a .csv file.", "error");
    if (file.size > MAX) return toast("File is larger than 5 MB.", "error");

    setFileName(file.name);
    const form = new FormData();
    form.append("file", file);
    try {
      // the server reads the file and checks every row; nothing is created yet
      const result = await api("/import/preview", { method: "POST", form });
      navigate("/review", { state: result });
    } catch (err) {
      toast(err.message, "error");
      setFileName("");
    }
  }

  const over = (e) => { e.preventDefault(); setDrag(true); };
  const leave = (e) => { e.preventDefault(); setDrag(false); };

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Import accounts</h2>
          <p className="lead">Create student, faculty and dean accounts in bulk</p>
        </div>
        <Stepper steps={IMPORT_STEPS} current={1} />
      </div>

      <div className="import-grid">
        <section className="card">
          <div className="card-head">
            <h2>Upload account list</h2>
            <button className="btn" onClick={downloadTemplate}><Icon name="download" />Download template</button>
          </div>
          <div
            className={"dropzone" + (drag ? " drag" : "") + (fileName ? " busy" : "")}
            onDragEnter={over}
            onDragOver={over}
            onDragLeave={leave}
            onDrop={(e) => { leave(e); take(e.dataTransfer.files[0]); }}
          >
            <span className="dz-icon"><Icon name={fileName ? "file" : "upload"} /></span>
            <h3>{fileName ? "Checking your file…" : "Drop your CSV file here"}</h3>
            {fileName
              ? <p><span className="file-name">{fileName}</span></p>
              : <p>or choose a file from your computer. CSV only, max 5 MB, up to 2,000 rows.</p>}
            {!fileName && <button className="btn primary" type="button" onClick={() => input.current.click()}>Choose file</button>}
            <input
              type="file"
              ref={input}
              accept=".csv,text/csv"
              hidden
              onChange={(e) => { take(e.target.files[0]); e.target.value = ""; }}
            />
          </div>
        </section>

        <aside className="card">
          <div className="card-head"><h2>How it works</h2></div>
          <ol className="steps">
            <li><span className="step-n">1</span><div><strong>Download the template</strong><small>Students need program (BSIT, BSIS, BSCS), year and section. Faculty and dean rows need a department.</small></div></li>
            <li><span className="step-n">2</span><div><strong>Fill in the list</strong><small>Use the official list from the registrar. One row per person, all emails ending in @qcu.edu.ph.</small></div></li>
            <li><span className="step-n">3</span><div><strong>Upload and review</strong><small>We check every row before anything is created.</small></div></li>
            <li><span className="step-n">4</span><div><strong>Confirm</strong><small>Accounts are created with a default password. Users must change it on first sign-in.</small></div></li>
          </ol>
        </aside>
      </div>
    </>
  );
}
