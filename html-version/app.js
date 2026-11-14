/* CCS Connect — Registrar web (shared shell + page behaviour) */
(function () {
  "use strict";

  /* ---------- Icons ---------- */
  const ICONS = {
    home: '<path d="M3 8.5 8 4l5 4.5V13H3z"/>',
    upload: '<path d="M8 11V3m0 0L5 6m3-3 3 3M3 13h10"/>',
    user: '<circle cx="8" cy="5.5" r="2.5"/><path d="M3 13c.5-2.5 2.5-3.5 5-3.5s4.500 1 5 3.5"/>',
    users: '<circle cx="6" cy="5.500" r="2.200"/><path d="M2 13c.4-2.200 2-3.200 4-3.200s3.600 1 4 3.200M10.500 3.600a2.200 2.200 0 0 1 0 4M12 9.800c1.200.4 1.900 1.400 2 3.200"/>',
    plus: '<path d="M8 3v10M3 8h10"/>',
    check: '<path d="m3 8.500 3.200 3L13 4.500"/>',
    clock: '<circle cx="8" cy="8" r="5.500"/><path d="M8 5v3.200l2 1.300"/>',
    x: '<path d="m4 4 8 8M12 4l-8 8"/>',
    search: '<circle cx="7" cy="7" r="4"/><path d="m10 10 3 3"/>',
    download: '<path d="M8 3v8m0 0L5 8m3 3 3-3M3 13h10"/>',
    file: '<path d="M4 2.500h5l3 3V13.500H4z"/><path d="M9 2.500v3h3M6 8.500h4M6 10.500h4"/>',
    key: '<circle cx="5.500" cy="10.500" r="2.500"/><path d="m7.500 8.500 5-5M10.500 5.500l1.500 1.500"/>',
    pencil: '<path d="m3 13 .7-3L10.500 3.200a1.200 1.200 0 0 1 1.700 0l.6.6a1.200 1.200 0 0 1 0 1.700L6 12.300z"/>',
    lock: '<rect x="3.500" y="7" width="9" height="6" rx="1.500"/><path d="M5.500 7V5.500a2.500 2.500 0 0 1 5 0V7"/>',
    logout: '<path d="M6.500 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.500M10 5.500 12.500 8 10 10.500M12.500 8H6.500"/>'
  };
  const icon = (n, cls) => `<svg viewBox="0 0 16 16" aria-hidden="true"${cls ? ` class="${cls}"` : ""}>${ICONS[n]}</svg>`;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const initials = (name) =>
    name.replace(/^(Prof\.|Engr\.|Dr\.|Ms\.|Mr\.)\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ---------- Shell ---------- */
  const NAV = [
    { id: "dashboard", label: "Dashboard", href: "index.html", icon: "home" },
    { id: "import", label: "Import accounts", href: "import.html", icon: "upload" },
    { id: "students", label: "Students", href: "students.html", icon: "user" },
    { id: "faculty", label: "Faculty", href: "faculty.html", icon: "users" },
    { id: "add", label: "Add person", href: "add-person.html", icon: "plus" }
  ];
  const body = document.body;
  const page = body.dataset.page;
  const title = body.dataset.title || "";

  const isActive = (n) => n.id === page || (page === "review" && n.id === "import");
  $("#sidebar").innerHTML = `
    <a class="brand" href="index.html" aria-label="CCS Connect home">
      <span class="brand-logo"></span>
      <span><span class="brand-name">CCS Connect</span><span class="brand-sub" style="display:block">Quezon City University</span></span>
    </a>
    <nav class="nav" aria-label="Main">
      ${NAV.map((n) => `<a href="${n.href}" class="${isActive(n) ? "active" : ""}"${isActive(n) ? ' aria-current="page"' : ""}>${icon(n.icon)}${n.label}</a>`).join("")}
    </nav>
    <a class="sidebar-user" href="profile.html" aria-label="Your profile">
      <span class="avatar lg">RA</span>
      <span><strong>Ms. Rosa Alvarez</strong><span>Registrar</span></span>
    </a>`;
  $("#sidebar").className = "sidebar";

  $("#topbar").className = "topbar";
  $("#topbar").innerHTML = `
    <h1>${title}</h1>
    <div class="topbar-right">
      <label class="search">${icon("search")}<input type="search" id="globalSearch" placeholder="Search by name or student no." aria-label="Search by name or student number"></label>
      <a class="avatar lg" href="profile.html" aria-label="Your profile" style="width:26px;height:26px">RA</a>
    </div>`;

  /* hydrate <i data-i="name"> placeholders with inline SVG icons */
  $$("i[data-i]").forEach((el) => { el.outerHTML = icon(el.dataset.i, el.className); });

  /* ---------- Data ---------- */
  const STUDENTS = [
    { no: "23-0012", name: "Juan Dela Cruz", section: "BSIT 3-A", email: "juan.delacruz@qcu.edu.ph", status: "Activated" },
    { no: "23-0098", name: "Maria Lopez", section: "BSCS 2-B", email: "maria.lopez@qcu.edu.ph", status: "Reset requested" },
    { no: "23-0211", name: "Rico Navarro", section: "BSIT 3-A", email: "rico.navarro@qcu.edu.ph", status: "Activated" },
    { no: "23-0377", name: "Ella Bautista", section: "BSIT 3-A", email: "ella.bautista@qcu.edu.ph", status: "Activated" },
    { no: "23-0150", name: "Marco Tan", section: "BSCS 2-B", email: "marco.tan@qcu.edu.ph", status: "Not signed in" },
    { no: "23-0056", name: "Ana Reyes", section: "BSIT 3-A", email: "ana.reyes@qcu.edu.ph", status: "Not signed in" },
    { no: "23-0029", name: "Paolo Cruz", section: "BSIT 3-A", email: "paolo.cruz@qcu.edu.ph", status: "Deactivated" }
  ];
  const FACULTY = [
    { no: "FAC-2025-014", name: "Prof. Paolo Reyes", dept: "IT Program", email: "paolo.reyes@qcu.edu.ph", status: "Activated" },
    { no: "FAC-2025-015", name: "Prof. Maria Santos", dept: "IT Program", email: "maria.santos@qcu.edu.ph", status: "Activated" },
    { no: "FAC-2025-016", name: "Engr. Carlo Mendoza", dept: "IT Program", email: "carlo.mendoza@qcu.edu.ph", status: "Not signed in" },
    { no: "FAC-2025-017", name: "Prof. Ana Villanueva", dept: "CS Program", email: "ana.villanueva@qcu.edu.ph", status: "Activated" },
    { no: "FAC-2025-018", name: "Prof. Lorna Dizon", dept: "CS Program", email: "lorna.dizon@qcu.edu.ph", status: "Activated" },
    { no: "FAC-2025-019", name: "Engr. Ramon Aquino", dept: "IS Program", email: "ramon.aquino@qcu.edu.ph", status: "Not signed in" },
    { no: "FAC-2025-020", name: "Prof. Grace Tolentino", dept: "IS Program", email: "grace.tolentino@qcu.edu.ph", status: "Activated" }
  ];
  const REVIEW = [
    { row: 2, id: "23-0012", name: "Juan Dela Cruz", email: "juan.delacruz@qcu.edu.ph", prog: "BSIT 3-A", check: "Ready" },
    { row: 3, id: "23-0098", name: "Maria Lopez", email: "maria.lopez@qcu.edu.ph", prog: "BSCS 2-B", check: "Ready" },
    { row: 18, id: "23-0211", name: "Rico Navarro", email: "rico.navarro@gmail", prog: "BSIT 3-A", check: "Invalid email" },
    { row: 44, id: "23-0098", name: "Maria L. Lopez", email: "maria.lopez@qcu.edu.ph", prog: "BSIT 3-A", check: "Duplicate ID" },
    { row: 71, id: "23-0179", name: "Carla Reyes", email: "carla.reyes@qcu.edu.ph", prog: "BSIT 3-A", check: "Missing section" },
    { row: 72, id: "23-0150", name: "Marco Tan", email: "marco.tan@qcu.edu.ph", prog: "BSCS 2-B", check: "Ready" }
  ];
  const STATUS_CLASS = { "Activated": "ok", "Ready": "ok", "Not signed in": "warn", "Reset requested": "warn", "Deactivated": "idle", "Invalid email": "bad", "Duplicate ID": "bad", "Missing section": "bad" };
  const badge = (s) => `<span class="badge ${STATUS_CLASS[s] || "idle"}">${s}</span>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Global search ---------- */
  const gs = $("#globalSearch");
  const onPeoplePage = page === "students" || page === "faculty";
  if (gs) {
    const q0 = new URLSearchParams(location.search).get("q");
    if (q0) gs.value = q0;
    gs.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !onPeoplePage) {
        location.href = "students.html?q=" + encodeURIComponent(gs.value.trim());
      }
    });
  }

  /* ---------- Page: dashboard ---------- */
  if (page === "dashboard") {
    requestAnimationFrame(() => setTimeout(() => $$(".bar > i").forEach((b) => (b.style.width = b.dataset.w + "%")), 50));
  }

  /* ---------- Page: import ---------- */
  function downloadTemplate() {
    const csv = "id_number,full_name,email,program,year,section,role\n23-0001,\"Dela Cruz, Juan\",juan.delacruz@qcu.edu.ph,BSIT,3,A,Student\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "ccs-accounts-template.csv" });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  $$("[data-action='download-template']").forEach((b) => b.addEventListener("click", downloadTemplate));

  if (page === "import") {
    const zone = $("#dropzone"), input = $("#fileInput");
    const MAX = 5 * 1024 * 1024;
    function take(file) {
      if (!file) return;
      if (!/\.csv$/i.test(file.name)) return toast("Please choose a .csv file.");
      if (file.size > MAX) return toast("File is larger than 5 MB.");
      try { sessionStorage.setItem("importFile", file.name); } catch (e) {}
      $("#dzTitle").textContent = "Reading file…";
      $("#dzSub").innerHTML = `<span class="file-name">${esc(file.name)}</span>`;
      setTimeout(() => (location.href = "review.html"), 600);
    }
    $("#chooseFile").addEventListener("click", () => input.click());
    input.addEventListener("change", () => take(input.files[0]));
    ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove("drag"); }));
    zone.addEventListener("drop", (e) => take(e.dataTransfer.files[0]));
  }

  /* ---------- Page: review ---------- */
  if (page === "review") {
    let name = "students-2025-2026.csv";
    try { name = sessionStorage.getItem("importFile") || name; } catch (e) {}
    $("#fileName").textContent = name;
    $("#reviewBody").innerHTML = REVIEW.map((r) => `
      <tr><td>${r.row}</td><td>${r.id}</td><td>${esc(r.name)}</td><td>${esc(r.email)}</td><td>${r.prog}</td><td>${badge(r.check)}</td></tr>`).join("");
    $("#createBtn").addEventListener("click", () => {
      toast("886 accounts created");
      setTimeout(() => (location.href = "students.html"), 1100);
    });
    $$("[data-pager]").forEach((b) => b.addEventListener("click", () => toast("Only the first page is available in this preview.")));
  }

  /* ---------- Pages: students / faculty ---------- */
  if (onPeoplePage) {
    const isStudents = page === "students";
    const data = (isStudents ? STUDENTS : FACULTY).map((d) => ({ ...d }));
    const body_ = $("#peopleBody");
    const state = { q: gs.value.toLowerCase(), f1: "", f2: "", f3: "" };

    function render() {
      const rows = data.filter((d) => {
        const hay = (d.no + " " + d.name + " " + d.email).toLowerCase();
        if (state.q && !hay.includes(state.q)) return false;
        if (isStudents) {
          const [prog, yr] = [d.section.split(" ")[0], d.section.split(" ")[1]];
          if (state.f1 && prog !== state.f1) return false;
          if (state.f2 && yr[0] !== state.f2) return false;
          if (state.f3 && d.section !== state.f3 && !d.section.endsWith("-" + state.f3)) return false;
        } else {
          if (state.f1 && d.dept !== state.f1) return false;
          if (state.f2 && d.status !== state.f2) return false;
        }
        return true;
      });
      body_.innerHTML = rows.length ? rows.map((d, i) => `
        <tr>
          <td>${d.no}</td>
          <td><span class="person"><span class="avatar lg">${initials(d.name)}</span>${esc(d.name)}</span></td>
          <td>${esc(isStudents ? d.section : d.dept)}</td>
          <td>${esc(d.email)}</td>
          <td>${badge(d.status)}</td>
          <td><button class="link" data-reset="${d.no}">Reset password</button></td>
        </tr>`).join("") : `<tr><td colspan="6" style="height:80px;text-align:center;color:var(--muted)">No matching accounts</td></tr>`;
      $("#showing").textContent = `Showing ${rows.length ? 1 : 0}-${rows.length} of ${isStudents ? 886 : 34} entries`;
    }

    $("#f1").addEventListener("change", (e) => { state.f1 = e.target.value; render(); });
    $("#f2").addEventListener("change", (e) => { state.f2 = e.target.value; render(); });
    if ($("#f3")) $("#f3").addEventListener("change", (e) => { state.f3 = e.target.value; render(); });
    gs.addEventListener("input", () => { state.q = gs.value.trim().toLowerCase(); render(); });

    body_.addEventListener("click", (e) => {
      const b = e.target.closest("[data-reset]");
      if (!b) return;
      const p = data.find((d) => d.no === b.dataset.reset);
      p.status = "Reset requested";
      toast(`Password reset for ${p.name}`);
      render();
    });
    $$("[data-pager]").forEach((b) => b.addEventListener("click", () => toast("Only the first page is available in this preview.")));
    render();
  }

  /* ---------- Page: add person ---------- */
  if (page === "add") {
    const pills = $$(".pill");
    const label = $("#idLabel"), idIn = $("#idNumber");
    const studentFields = $("#studentFields"), deptField = $("#deptField");
    const CFG = {
      Student: { label: "Student number", ph: "e.g. 24-0123" },
      Faculty: { label: "Faculty ID", ph: "e.g. FAC-2026-001" },
      Dean: { label: "Employee ID", ph: "e.g. DEAN-001" }
    };
    let role = "Student";
    function setRole(r) {
      role = r;
      pills.forEach((p) => { const on = p.dataset.role === r; p.classList.toggle("active", on); p.setAttribute("aria-pressed", on); });
      label.textContent = CFG[r].label; idIn.placeholder = CFG[r].ph;
      studentFields.hidden = r !== "Student";
      deptField.hidden = r === "Student";
    }
    pills.forEach((p) => p.addEventListener("click", () => setRole(p.dataset.role)));
    setRole("Student");

    $("#addForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const req = [idIn, $("#fullName"), $("#email")];
      let ok = true;
      req.forEach((i) => { const bad = !i.value.trim(); i.classList.toggle("invalid", bad); if (bad) ok = false; });
      const em = $("#email");
      if (em.value.trim() && !/^[^\s@]+@qcu\.edu\.ph$/i.test(em.value.trim())) { em.classList.add("invalid"); ok = false; toast("Use a university email (@qcu.edu.ph)."); }
      else if (!ok) toast("Please fill in the required fields.");
      if (!ok) return;
      toast(`${role} account created for ${$("#fullName").value.trim()}`);
      e.target.reset(); setRole(role);
    });
    $$("#addForm .input").forEach((i) => i.addEventListener("input", () => i.classList.remove("invalid")));
    $("#cancelBtn").addEventListener("click", () => history.length > 1 ? history.back() : (location.href = "index.html"));
  }

  /* ---------- Page: profile ---------- */
  if (page === "profile") {
    $$("[data-toast]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.toast)));
  }

  /* generic nav-by-attribute (tabs, buttons) */
  $$("[data-href]").forEach((el) => el.addEventListener("click", () => (location.href = el.dataset.href)));

  window.CCS = { toast, icon };
})();
