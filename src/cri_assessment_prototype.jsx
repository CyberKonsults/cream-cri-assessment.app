import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

//const supabase = createClient("https://iiqtmkqdfphslwbettxx.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpcXRta3FkZnBoc2x3YmV0dHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MzQ0NDMsImV4cCI6MjA2NTUxMDQ0M30.Glc6eUxfQqEPw4yPtRXYIc1L7TqUyPYydbUP4cCbz74");

function mockAIScore(response) {
  if (!response) return { score: 0, confidence: "Low" };
  if (response.includes("least privilege") || response.includes("inventory")) return { score: 3, confidence: "High" };
  if (response.length > 40) return { score: 2, confidence: "Medium" };
  return { score: 1, confidence: "Low" };
}

function downloadCSV(data) {
  const csvContent = "data:text/csv;charset=utf-8," +
    ["Diagnostic ID,Title,Response,Confidence,Score,Evidence"]
      .concat(data.map(item => `${item.id},${item.title},${item.response},${item.confidence},${item.score},${item.evidence}`))
      .join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "assessment_report.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadPDF(data) {
  const doc = new jsPDF();
  doc.text("CREAM Assessment Report", 14, 16);
  autoTable(doc, {
    head: [["ID", "Title", "Response", "Confidence", "Score", "Evidence"]],
    body: data.map(item => [item.id, item.title, item.response, item.confidence, item.score, item.evidence])
  });
  doc.save("assessment_report.pdf");
}

export default function CRIAssessmentApp() {
  const [diagnostics, setDiagnostics] = useState([]);
  const [responses, setResponses] = useState({});
  const [evidence, setEvidence] = useState({});
  const [summaryData, setSummaryData] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        const { data, error } = await supabase.from("diagnostics").select("*");
        if (error || !data || data.length === 0) {
          console.warn("Using mock diagnostics for preview.");
          setDiagnostics([
            { id: "CRI-01", title: "Asset Inventory Maintained", guidance: "Ensure you maintain an up-to-date asset inventory.", tier: 1 },
            { id: "CRI-02", title: "Access Controls Enforced", guidance: "Implement least privilege and segregation of duties.", tier: 1 }
          ]);
        } else {
          setDiagnostics(data);
        }
      } catch (err) {
        console.error("Supabase error:", err.message);
        setDiagnostics([
          { id: "CRI-01", title: "Asset Inventory Maintained", guidance: "Ensure you maintain an up-to-date asset inventory.", tier: 1 },
          { id: "CRI-02", title: "Access Controls Enforced", guidance: "Implement least privilege and segregation of duties.", tier: 1 }
        ]);
      }
    };
    fetchDiagnostics();
  }, []);

  const handleResponseChange = (id, value) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileUpload = async (id, file) => {
    if (!file) return;
    try {
      const { data, error } = await supabase.storage
        .from("evidence")
        .upload(`${id}/${file.name}`, file);
      if (error) throw error;
      setEvidence((prev) => ({ ...prev, [id]: data.path }));
    } catch (err) {
      console.error("Upload failed:", err.message);
    }
  };

  const handleGenerateReport = async () => {
    const data = diagnostics.map((diag) => {
      const response = responses[diag.id] || "Not answered";
      const evd = evidence[diag.id] || "None";
      const aiEval = mockAIScore(response);
      return {
        id: diag.id,
        title: diag.title,
        response,
        confidence: aiEval.confidence,
        score: aiEval.score,
        evidence: evd
      };
    });

    try {
      const { error } = await supabase.from("reports").insert([
        { payload: data, created_at: new Date().toISOString() }
      ]);
      if (error) console.error("Failed to store report:", error);
    } catch (e) {
      console.error("Unexpected storage error:", e);
    }

    setSummaryData(data);
    setShowSummary(true);

    if (userEmail) {
      try {
        console.log(`Simulating email to ${userEmail}...`);
        // TODO: Replace this with a call to a Supabase Edge Function or third-party email API
      } catch (err) {
        console.error("Email notification failed:", err);
      }
    }
  };

  return (
    <div style={{ backgroundColor: '#f7f8fc', fontFamily: 'sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ backgroundColor: '#003366', color: 'white', padding: '1rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>CREAM Digital Assessment Platform</h1>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>Notify me by email:</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            style={{ padding: '0.5rem', borderColor: '#cccccc', width: '100%', maxWidth: '300px' }}
          />
        </div>

      </header>
      <main style={{ flex: 1, padding: '1.5rem', maxWidth: '800px', margin: '0 auto', color: '#1a1a1a' }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem", color: "#003366" }}>CREAM AI Assessment Tool (CRI Profile v2.1)</h1>
        {[1, 2, 3].map(tier => (
          <div key={`tier-${tier}`} style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: '#003366', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Tier {tier}</h2>
            {diagnostics.filter(d => d.tier === tier).map((diag) => (
              <div key={diag.id} style={{ border: "1px solid #003366", borderRadius: "6px", padding: "1rem", marginBottom: "1rem", backgroundColor: "#ffffff" }}>
                <h2 style={{ fontWeight: "600", fontSize: "1.25rem", marginBottom: "0.5rem", color: "#003366" }}>{diag.title}</h2>
                <p style={{ fontSize: "0.875rem", color: "#4b5563", marginBottom: "0.5rem" }}>{diag.guidance}</p>
                <textarea
                  placeholder="Describe your control implementation or upload evidence link..."
                  style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem", borderColor: "#cccccc" }}
                  onChange={(e) => handleResponseChange(diag.id, e.target.value)}
                />
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(diag.id, e.target.files[0])}
                  style={{ marginBottom: "0.5rem" }}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button style={{ backgroundColor: "#006699", color: "white", padding: "0.5rem 1rem" }} onClick={() => handleResponseChange(diag.id, "Yes")}>Yes</button>
                  <button style={{ backgroundColor: "#ffcc00", color: "#000", padding: "0.5rem 1rem" }} onClick={() => handleResponseChange(diag.id, "Partial")}>Partial</button>
                  <button style={{ backgroundColor: "#cc0000", color: "white", padding: "0.5rem 1rem" }} onClick={() => handleResponseChange(diag.id, "No")}>No</button>
                  <button style={{ backgroundColor: "#999999", color: "white", padding: "0.5rem 1rem" }} onClick={() => handleResponseChange(diag.id, "Compensating")}>Compensating</button>
                </div>
              </div>
            ))}
          </div>
        ))}
        <button style={{ marginTop: "1rem", backgroundColor: "#003366", color: "white", padding: "0.75rem 1.5rem", borderRadius: "4px" }} onClick={handleGenerateReport}>Generate Assessment Report</button>

        {showSummary && (
          <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "#e6f0ff", borderRadius: "6px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem", color: "#003366" }}>AI-Powered Summary Report</h2>
            <ul>
              {summaryData.map((item) => (
                <li key={item.id} style={{ marginBottom: "0.75rem" }}>
                  <strong>{item.id}</strong> — <em>{item.title}</em><br />
                  Response: {item.response}, Confidence: {item.confidence}, Score: {item.score}, Evidence: {item.evidence}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button onClick={() => downloadCSV(summaryData)} style={{ backgroundColor: "#006699", color: "white", padding: "0.5rem 1rem" }}>Download CSV</button>
              <button onClick={() => downloadPDF(summaryData)} style={{ backgroundColor: "#006699", color: "white", padding: "0.5rem 1rem" }}>Download PDF</button>
            </div>
          </div>
        )}
      </main>
      <footer style={{ backgroundColor: '#003366', color: 'white', padding: '1rem', textAlign: 'center' }}>
        <small>&copy; {new Date().getFullYear()} CREAM Governance | All rights reserved.</small>
      </footer>
    </div>
  );
}
