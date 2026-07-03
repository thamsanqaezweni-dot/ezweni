import { useState, useEffect } from "react";

// ─── CONFIG — swap these in once you have your credentials ───────────────────
const CONFIG = {
  WHATSAPP_NUMBER: "27632925669",          // your number with country code
  CALLMEBOT_API_KEY: "5865136",            // your CallMeBot key
  CLOUDINARY_CLOUD_NAME: "sxxpc7ii",
  CLOUDINARY_UPLOAD_PRESET: "Ezweni",
  ADMIN_PASSWORD: "Ezweni2024",            // change this to something strong
};
// ────────────────────────────────────────────────────────────────────────────

const SERVICES = [
  "Affidavit",
  "Contract Drafting",
  "Power of Attorney",
  "Will & Testament",
  "Business Registration",
  "Lease Agreement",
  "Demand Letter",
  "Other",
];

const STATUS_OPTIONS = ["Received", "In Progress", "Review", "Complete", "Collected"];
const STATUS_COLORS = {
  Received: "#6B7280",
  "In Progress": "#D97706",
  Review: "#2563EB",
  Complete: "#059669",
  Collected: "#7C3AED",
};

// ─── Utility ─────────────────────────────────────────────────────────────────

function generateRef() {
  return "EZ-" + Date.now().toString(36).toUpperCase();
}

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CONFIG.CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.secure_url;
}

async function sendWhatsApp(message) {
  const encoded = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${CONFIG.WHATSAPP_NUMBER}&text=${encoded}&apikey=${CONFIG.CALLMEBOT_API_KEY}`;
  try {
    await fetch(url, { mode: "no-cors" });
  } catch (_) {
    // no-cors won't throw on success, silently ignore errors
  }
}

// ─── Storage helpers (localStorage as simple DB) ─────────────────────────────

function getJobs() {
  try {
    return JSON.parse(localStorage.getItem("ezweni_jobs") || "[]");
  } catch {
    return [];
  }
}

function saveJobs(jobs) {
  localStorage.setItem("ezweni_jobs", JSON.stringify(jobs));
}

// ─── Components ──────────────────────────────────────────────────────────────

function Badge({ status }) {
  return (
    <span
      style={{
        background: STATUS_COLORS[status] + "22",
        color: STATUS_COLORS[status],
        border: `1px solid ${STATUS_COLORS[status]}44`,
        borderRadius: 20,
        padding: "2px 12px",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.3,
      }}
    >
      {status}
    </span>
  );
}

function ProgressBar({ status }) {
  const steps = STATUS_OPTIONS;
  const idx = steps.indexOf(status);
  return (
    <div style={{ margin: "16px 0" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {steps.map((s, i) => (
          <div
            key={s}
            title={s}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: i <= idx ? STATUS_COLORS[status] : "#E5E7EB",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {steps.map((s, i) => (
          <span
            key={s}
            style={{
              fontSize: 9,
              color: i <= idx ? STATUS_COLORS[status] : "#9CA3AF",
              fontWeight: i === idx ? 700 : 400,
              flex: 1,
              textAlign: "center",
            }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── View: Submit Form ────────────────────────────────────────────────────────

function SubmitView({ onSuccess }) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", service: "", notes: ""
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (!form.name || !form.phone || !form.service) {
      setError("Please fill in Name, Phone, and Service.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Upload files
      const urls = [];
      for (const file of files) {
        const url = await uploadToCloudinary(file);
        urls.push({ name: file.name, url });
      }

      const ref = generateRef();
      const job = {
        ref,
        ...form,
        files: urls,
        status: "Received",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: form.notes,
        adminNotes: "",
      };

      // Save to localStorage
      const jobs = getJobs();
      jobs.unshift(job);
      saveJobs(jobs);

      // WhatsApp ping
      const msg =
        `📋 NEW SUBMISSION — ${ref}\n` +
        `👤 ${form.name} | 📞 ${form.phone}\n` +
        `📄 Service: ${form.service}\n` +
        (form.notes ? `💬 ${form.notes}\n` : "") +
        (urls.length ? `📎 ${urls.length} file(s) attached` : "No files");
      await sendWhatsApp(msg);

      onSuccess(ref);
    } catch (e) {
      setError("Something went wrong: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Submit a Document Request</h2>
      <p style={{ color: "#6B7280", marginBottom: 24, fontSize: 14 }}>
        Fill in your details and upload your documents. We'll contact you within 24 hours.
      </p>

      {error && <div style={styles.error}>{error}</div>}

      <label style={styles.label}>Full Name *</label>
      <input style={styles.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" />

      <label style={styles.label}>Phone Number *</label>
      <input style={styles.input} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="e.g. 0721234567" />

      <label style={styles.label}>Email (optional)</label>
      <input style={styles.input} value={form.email} onChange={e => set("email", e.target.value)} placeholder="your@email.com" />

      <label style={styles.label}>Service Required *</label>
      <select style={styles.input} value={form.service} onChange={e => set("service", e.target.value)}>
        <option value="">— Select a service —</option>
        {SERVICES.map(s => <option key={s}>{s}</option>)}
      </select>

      <label style={styles.label}>Additional Notes</label>
      <textarea
        style={{ ...styles.input, height: 80, resize: "vertical" }}
        value={form.notes}
        onChange={e => set("notes", e.target.value)}
        placeholder="Any specific requirements or context…"
      />

      <label style={styles.label}>Upload Documents (PDF, images)</label>
      <input
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={e => setFiles(Array.from(e.target.files))}
        style={{ ...styles.input, padding: "8px 12px", cursor: "pointer" }}
      />
      {files.length > 0 && (
        <p style={{ fontSize: 12, color: "#6B7280", margin: "4px 0 12px" }}>
          {files.length} file(s) selected
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
      >
        {loading ? "Submitting…" : "Submit Request"}
      </button>
    </div>
  );
}

// ─── View: Success ────────────────────────────────────────────────────────────

function SuccessView({ ref: jobRef, onTrack }) {
  return (
    <div style={{ ...styles.card, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
      <h2 style={styles.cardTitle}>Request Submitted!</h2>
      <p style={{ color: "#6B7280", marginBottom: 20 }}>
        Your reference number is:
      </p>
      <div style={styles.refBox}>{jobRef}</div>
      <p style={{ color: "#6B7280", fontSize: 14, margin: "16px 0 24px" }}>
        Save this reference to track your job status. We'll be in touch shortly.
      </p>
      <button onClick={() => onTrack(jobRef)} style={styles.btnOutline}>
        Track My Job
      </button>
    </div>
  );
}

// ─── View: Track ─────────────────────────────────────────────────────────────

function TrackView() {
  const [query, setQuery] = useState("");
  const [job, setJob] = useState(null);
  const [notFound, setNotFound] = useState(false);

  function search() {
    const jobs = getJobs();
    const found = jobs.find(
      j => j.ref === query.trim().toUpperCase() || j.phone === query.trim()
    );
    if (found) { setJob(found); setNotFound(false); }
    else { setJob(null); setNotFound(true); }
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Track Your Job</h2>
      <p style={{ color: "#6B7280", marginBottom: 20, fontSize: 14 }}>
        Enter your reference number (e.g. EZ-ABC123) or your phone number.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ ...styles.input, flex: 1, marginBottom: 0 }}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="EZ-XXXXXX or phone number"
        />
        <button onClick={search} style={{ ...styles.btn, margin: 0, padding: "10px 20px" }}>
          Search
        </button>
      </div>

      {notFound && (
        <div style={{ ...styles.error, marginTop: 16 }}>
          No job found. Check your reference number or phone number.
        </div>
      )}

      {job && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>{job.ref}</span>
            <Badge status={job.status} />
          </div>
          <ProgressBar status={job.status} />
          <div style={styles.infoGrid}>
            <InfoRow label="Name" value={job.name} />
            <InfoRow label="Service" value={job.service} />
            <InfoRow label="Submitted" value={new Date(job.createdAt).toLocaleDateString("en-ZA", { dateStyle: "medium" })} />
            <InfoRow label="Last Updated" value={new Date(job.updatedAt).toLocaleDateString("en-ZA", { dateStyle: "medium" })} />
          </div>
          {job.adminNotes && (
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 12, marginTop: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
                <strong>Message from Ezweni:</strong> {job.adminNotes}
              </p>
            </div>
          )}
          {job.files?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 6px" }}>Uploaded files:</p>
              {job.files.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noreferrer"
                  style={{ display: "block", fontSize: 13, color: "#1D4ED8", marginBottom: 2 }}>
                  📎 {f.name}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
      <span style={{ fontSize: 13, color: "#6B7280" }}>{label}</span>
      <span style={{ fontSize: 13, color: "#111", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── View: Admin ──────────────────────────────────────────────────────────────

function AdminView() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  function login() {
    if (pw === CONFIG.ADMIN_PASSWORD) { setAuthed(true); loadJobs(); }
    else alert("Incorrect password");
  }

  function loadJobs() {
    setJobs(getJobs());
  }

  function updateStatus(ref, status) {
    const updated = getJobs().map(j =>
      j.ref === ref ? { ...j, status, updatedAt: new Date().toISOString() } : j
    );
    saveJobs(updated);
    setJobs(updated);
    if (selected?.ref === ref) setSelected({ ...selected, status });

    // WhatsApp notification to client would need Twilio; for now just log
    console.log(`Status updated: ${ref} → ${status}`);
  }

  function saveNotes(ref) {
    const updated = getJobs().map(j =>
      j.ref === ref ? { ...j, adminNotes, updatedAt: new Date().toISOString() } : j
    );
    saveJobs(updated);
    setJobs(updated);
    alert("Notes saved.");
  }

  if (!authed) {
    return (
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Admin Login</h2>
        <input
          type="password"
          style={styles.input}
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          placeholder="Admin password"
        />
        <button onClick={login} style={styles.btn}>Login</button>
      </div>
    );
  }

  const filtered = filterStatus === "All" ? jobs : jobs.filter(j => j.status === filterStatus);

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ ...styles.cardTitle, margin: 0 }}>Admin Dashboard</h2>
        <span style={{ fontSize: 13, color: "#6B7280" }}>{jobs.length} total jobs</span>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {["All", ...STATUS_OPTIONS].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "4px 12px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: filterStatus === s ? "#1D4ED8" : "#E5E7EB",
              background: filterStatus === s ? "#EFF6FF" : "#FFF",
              color: filterStatus === s ? "#1D4ED8" : "#374151",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: filterStatus === s ? 600 : 400,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Job list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && (
          <p style={{ color: "#9CA3AF", textAlign: "center", padding: 24 }}>No jobs found.</p>
        )}
        {filtered.map(job => (
          <div
            key={job.ref}
            onClick={() => { setSelected(job); setAdminNotes(job.adminNotes || ""); }}
            style={{
              border: `1px solid ${selected?.ref === job.ref ? "#1D4ED8" : "#E5E7EB"}`,
              borderRadius: 10,
              padding: "12px 16px",
              cursor: "pointer",
              background: selected?.ref === job.ref ? "#EFF6FF" : "#FAFAFA",
              transition: "all 0.15s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{job.name}</span>
                <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>{job.ref}</span>
              </div>
              <Badge status={job.status} />
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
              {job.service} · {job.phone} · {new Date(job.createdAt).toLocaleDateString("en-ZA")}
            </div>
          </div>
        ))}
      </div>

      {/* Selected job detail */}
      {selected && (
        <div style={{ marginTop: 24, borderTop: "1px solid #E5E7EB", paddingTop: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#111" }}>
            {selected.name} — {selected.ref}
          </h3>

          <label style={styles.label}>Update Status</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => updateStatus(selected.ref, s)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1px solid ${STATUS_COLORS[s]}`,
                  background: selected.status === s ? STATUS_COLORS[s] : "#FFF",
                  color: selected.status === s ? "#FFF" : STATUS_COLORS[s],
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <label style={styles.label}>Message to Client (shown on tracking page)</label>
          <textarea
            style={{ ...styles.input, height: 80, resize: "vertical" }}
            value={adminNotes}
            onChange={e => setAdminNotes(e.target.value)}
            placeholder="e.g. Documents ready for collection. Please bring ID."
          />
          <button onClick={() => saveNotes(selected.ref)} style={{ ...styles.btn, marginBottom: 0 }}>
            Save Notes
          </button>

          {selected.files?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 6px" }}>Client files:</p>
              {selected.files.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noreferrer"
                  style={{ display: "block", fontSize: 13, color: "#1D4ED8", marginBottom: 4 }}>
                  📎 {f.name}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const TABS = ["Submit", "Track Job", "Admin"];

export default function App() {
  const [tab, setTab] = useState("Submit");
  const [successRef, setSuccessRef] = useState(null);

  function handleSuccess(ref) {
    setSuccessRef(ref);
  }

  function handleTrack(ref) {
    setTab("Track Job");
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoMark}>E</span>
          <div>
            <div style={styles.logoName}>Ezweni</div>
            <div style={styles.logoSub}>Legal & Document Services</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === "Submit") setSuccessRef(null); }}
              style={{
                ...styles.navBtn,
                ...(tab === t ? styles.navBtnActive : {}),
              }}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <main style={styles.main}>
        {tab === "Submit" && !successRef && <SubmitView onSuccess={handleSuccess} />}
        {tab === "Submit" && successRef && (
          <SuccessView ref={successRef} onTrack={handleTrack} />
        )}
        {tab === "Track Job" && <TrackView />}
        {tab === "Admin" && <AdminView />}
      </main>

      <footer style={styles.footer}>
        © {new Date().getFullYear()} Ezweni Legal & Document Services
      </footer>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    minHeight: "100vh",
    background: "#F8F9FA",
    fontFamily: "'Inter', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "#0F172A",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    minHeight: 64,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
    color: "#FFF",
    fontWeight: 800,
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoName: {
    color: "#F1F5F9",
    fontWeight: 700,
    fontSize: 16,
    lineHeight: 1.2,
  },
  logoSub: {
    color: "#64748B",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  nav: {
    display: "flex",
    gap: 4,
  },
  navBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  navBtnActive: {
    background: "#1E293B",
    color: "#F1F5F9",
  },
  main: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: "32px 16px",
  },
  card: {
    background: "#FFF",
    borderRadius: 16,
    padding: 28,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
    width: "100%",
    maxWidth: 560,
    height: "fit-content",
  },
  cardTitle: {
    margin: "0 0 4px",
    fontSize: 20,
    fontWeight: 700,
    color: "#0F172A",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 4,
    marginTop: 14,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #E5E7EB",
    fontSize: 14,
    color: "#111",
    background: "#FAFAFA",
    outline: "none",
    marginBottom: 2,
    fontFamily: "inherit",
  },
  btn: {
    display: "block",
    width: "100%",
    padding: "12px",
    marginTop: 20,
    background: "#1D4ED8",
    color: "#FFF",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: 0.2,
  },
  btnOutline: {
    display: "block",
    width: "100%",
    padding: "12px",
    marginTop: 8,
    background: "transparent",
    color: "#1D4ED8",
    border: "1px solid #1D4ED8",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#DC2626",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 8,
  },
  refBox: {
    background: "#EFF6FF",
    border: "2px dashed #BFDBFE",
    borderRadius: 10,
    padding: "14px 20px",
    fontSize: 22,
    fontWeight: 800,
    color: "#1D4ED8",
    letterSpacing: 2,
    display: "inline-block",
  },
  infoGrid: {
    background: "#F9FAFB",
    borderRadius: 8,
    padding: "8px 12px",
    marginTop: 8,
  },
  footer: {
    textAlign: "center",
    padding: "16px",
    fontSize: 12,
    color: "#9CA3AF",
    borderTop: "1px solid #E5E7EB",
  },
};
