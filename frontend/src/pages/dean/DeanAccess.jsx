import { useState, useEffect } from "react";
import Icon from "../../components/Icon.jsx";
import Avatar from "../../components/Avatar.jsx";
import { api } from "../../api.js";

// iOS/Modern style Toggle switch component
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        background: checked ? "var(--primary)" : "#cbd5e1",
        border: 0,
        position: "relative",
        cursor: "pointer",
        transition: "background .2s",
        padding: 2,
        flexShrink: 0
      }}
    >
      <span
        style={{
          display: "block",
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transform: checked ? "translateX(20px)" : "translateX(0)",
          transition: "transform .2s"
        }}
      />
    </button>
  );
}

export default function DeanAccess() {
  const [saved, setSaved] = useState(false);
  const [users, setUsers] = useState([]);

  // Left card state: Research document access
  const [docAccess, setDocAccess] = useState({
    public: true,
    students: true,
    faculty: true
  });

  // Right card state: Academic information visibility
  const [visibility, setVisibility] = useState({
    students: { faculty: true, students: true, public: false },
    grades: { faculty: true, students: false, public: false },
    evaluations: { faculty: true, students: false, public: false },
    research: { faculty: true, students: true, public: true }
  });

  useEffect(() => {
    api("/dean/access")
      .then((data) => setUsers(data || []))
      .catch(() => {});
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Access settings</h2>
          <p className="lead">Choose who can see academic information and research documents</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={handleSave}>
            {saved ? "Saved successfully!" : "Save changes"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24, alignItems: "start" }}>
        {/* Left Card: Research document access matching "Dean web — Access settings.png" */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2>Research document access</h2>
            <span
              style={{
                background: "#fdf0d2",
                color: "#7d5208",
                fontSize: 12,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 999
              }}
            >
              Pending confirmation
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Row 1: Public */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div>
                <strong style={{ display: "block", fontSize: 14 }}>Public</strong>
                <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, display: "block", marginTop: 2 }}>
                  Basic information only: title, researchers, program, academic year, abstract and keywords.
                </span>
              </div>
              <Toggle
                checked={docAccess.public}
                onChange={(val) => setDocAccess((prev) => ({ ...prev, public: val }))}
              />
            </div>

            {/* Row 2: CCS students */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div>
                <strong style={{ display: "block", fontSize: 14 }}>CCS students</strong>
                <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, display: "block", marginTop: 2 }}>
                  Basic information plus additional research details and documents.
                </span>
              </div>
              <Toggle
                checked={docAccess.students}
                onChange={(val) => setDocAccess((prev) => ({ ...prev, students: val }))}
              />
            </div>

            {/* Row 3: Faculty */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div>
                <strong style={{ display: "block", fontSize: 14 }}>Faculty</strong>
                <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, display: "block", marginTop: 2 }}>
                  Full access to the research and capstone papers.
                </span>
              </div>
              <Toggle
                checked={docAccess.faculty}
                onChange={(val) => setDocAccess((prev) => ({ ...prev, faculty: val }))}
              />
            </div>
          </div>
        </div>

        {/* Right Card: Academic information visibility matching screenshot */}
        <div className="card flush">
          <div style={{ padding: "20px 24px 12px" }}>
            <h2>Academic information visibility</h2>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Academic information</th>
                  <th scope="col" style={{ textAlign: "center" }}>Faculty</th>
                  <th scope="col" style={{ textAlign: "center" }}>Students</th>
                  <th scope="col" style={{ textAlign: "center" }}>Public</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Student records</td>
                  <td style={{ textAlign: "center" }}>
                    <Toggle
                      checked={visibility.students.faculty}
                      onChange={(v) => setVisibility((p) => ({ ...p, students: { ...p.students, faculty: v } }))}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Toggle
                      checked={visibility.students.students}
                      onChange={(v) => setVisibility((p) => ({ ...p, students: { ...p.students, students: v } }))}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Toggle
                      checked={visibility.students.public}
                      onChange={(v) => setVisibility((p) => ({ ...p, students: { ...p.students, public: v } }))}
                    />
                  </td>
                </tr>

                <tr>
                  <td>Grades</td>
                  <td style={{ textAlign: "center" }}>
                    <Toggle
                      checked={visibility.grades.faculty}
                      onChange={(v) => setVisibility((p) => ({ ...p, grades: { ...p.grades, faculty: v } }))}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Toggle
                      checked={visibility.grades.students}
                      onChange={(v) => setVisibility((p) => ({ ...p, grades: { ...p.grades, students: v } }))}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Toggle
                      checked={visibility.grades.public}
                      onChange={(v) => setVisibility((p) => ({ ...p, grades: { ...p.grades, public: v } }))}
                    />
                  </td>
                </tr>

                <tr>
                  <td>Faculty evaluation results</td>
                  <td style={{ textAlign: "center" }}>
                    <Toggle
                      checked={visibility.evaluations.faculty}
                      onChange={(v) => setVisibility((p) => ({ ...p, evaluations: { ...p.evaluations, faculty: v } }))}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Toggle
                      checked={visibility.evaluations.students}
                      onChange={(v) => setVisibility((p) => ({ ...p, evaluations: { ...p.evaluations, students: v } }))}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Toggle
                      checked={visibility.evaluations.public}
                      onChange={(v) => setVisibility((p) => ({ ...p, evaluations: { ...p.evaluations, public: v } }))}
                    />
                  </td>
                </tr>

                <tr>
                  <td>Research documents</td>
                  <td style={{ textAlign: "center" }}>
                    <Toggle
                      checked={visibility.research.faculty}
                      onChange={(v) => setVisibility((p) => ({ ...p, research: { ...p.research, faculty: v } }))}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Toggle
                      checked={visibility.research.students}
                      onChange={(v) => setVisibility((p) => ({ ...p, research: { ...p.research, students: v } }))}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Toggle
                      checked={visibility.research.public}
                      onChange={(v) => setVisibility((p) => ({ ...p, research: { ...p.research, public: v } }))}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Authorized Management Accounts section (Requirement 8.K) */}
      <div className="card flush" style={{ marginTop: 24 }}>
        <div style={{ padding: "20px 24px 12px" }}>
          <h2>Authorized administrative accounts</h2>
          <p className="sub-plain">Registrar and Dean portal authorized users</p>
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="person">
                      <Avatar name={u.name} photo={u.photo} />
                      <span>
                        {u.name}
                        <small>{u.email}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        background: u.role === "Dean" ? "var(--primary-soft)" : "var(--idle-bg)",
                        color: u.role === "Dean" ? "var(--primary)" : "var(--text)",
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 12
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td>{u.department || "College of Computer Studies"}</td>
                  <td>
                    <span className="badge ok">{u.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
