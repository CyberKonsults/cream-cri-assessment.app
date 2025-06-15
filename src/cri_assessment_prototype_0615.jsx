import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CRIAssessmentPlatform() {
  const [diagnostics, setDiagnostics] = useState([]);
  const [responseKeys, setResponseKeys] = useState([]);
  const [responses, setResponses] = useState({});
  const [evidenceFiles, setEvidenceFiles] = useState({});
  const [aiScores, setAiScores] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [tiers, setTiers] = useState([1, 2, 3, 4]);
  const [selectedTiers, setSelectedTiers] = useState([1, 2, 3, 4]);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchInitialData = async () => {
      const [{ data: diags }, { data: rkeys }, { data: tagData }] = await Promise.all([
        supabase.from("diagnosticstatements").select("*"),
        supabase.from("response_keys").select("*").order("id", { ascending: true }),
        supabase.from("tags").select("name")
      ]);
      setDiagnostics(diags || []);
      setResponseKeys(rkeys || []);
      setTags(tagData?.map(t => t.name) || []);
    };
    fetchInitialData();
  }, []);

  const handleResponseChange = async (id, value) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
    const ai = mockAIScore(value);
    setAiScores((prev) => ({ ...prev, [id]: ai }));

    await supabase.from("assessment_responses").upsert({
      diagnostic_id: id,
      response_text: value,
      ai_score: ai.score,
      ai_confidence: ai.confidence,
      evidence_url: evidenceFiles[id] || null
    });
  };

  const handleEvidenceUpload = async (id, file) => {
    if (!file) return;
    const filePath = `${id}/${file.name}`;
    const { error } = await supabase.storage.from("evidence").upload(filePath, file);
    if (!error) {
      setEvidenceFiles((prev) => ({ ...prev, [id]: filePath }));
      await supabase.from("assessment_responses").update({ evidence_url: filePath }).eq("diagnostic_id", id);
    }
  };

  const mockAIScore = (text) => {
    if (!text) return { score: 0, confidence: 'Low' };
    if (text.includes("least privilege") || text.includes("inventory")) return { score: 3, confidence: "High" };
    if (text.length > 40) return { score: 2, confidence: "Medium" };
    return { score: 1, confidence: "Low" };
  };

  const handleGenerateSummary = () => {
    alert("Assessment summary and AI scoring applied.");
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const summary = diagnostics.map((d) => ([
      d.profileid,
      d.name,
      responses[d.id] || "N/A",
      aiScores[d.id]?.score ?? '-',
      aiScores[d.id]?.confidence ?? '-',
      evidenceFiles[d.id] || "None"
    ]));
    doc.text("CREAM Assessment Summary", 14, 16);
    autoTable(doc, {
      head: [["Profile ID", "Title", "Response", "Score", "Confidence", "Evidence"]],
      body: summary
    });
    doc.save("assessment_summary.pdf");
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const filtered = diagnostics.filter(d => {
    const matchTier = selectedTiers.some(t => d[`tier${t}`]);
    const matchTag = selectedTag ? d.tags?.includes(selectedTag) : true;
    return matchTier && matchTag;
  });
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(currentPage - 2, 0),
    Math.min(currentPage + 2, totalPages)
  );

  return (
    <div style={{ fontFamily: 'Segoe UI', padding: '2rem' }}>
      <h1 style={{ textAlign: 'center', fontSize: '2rem', color: '#003366' }}>CREAM CRI Assessment Platform</h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)}>
          <option value=''>All Tags</option>
          {tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
        </select>
        <div>
          {tiers.map(t => (
            <label key={t} style={{ marginRight: '1rem' }}>
              <input
                type="checkbox"
                checked={selectedTiers.includes(t)}
                onChange={() => setSelectedTiers(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
              /> Tier {t}
            </label>
          ))}
        </div>
      </div>

      {currentItems.map((item) => (
        <div key={item.id} style={{ padding: '1rem', border: '1px solid #ccc', marginBottom: '1rem', borderRadius: '6px' }}>
          <h3>{item.name} ({item.profileid})</h3>
          <p><strong>Statement:</strong> {item.statementtext}</p>
          <p><strong>Tier:</strong> {item.tier1 ? "1 " : ""}{item.tier2 ? "2 " : ""}{item.tier3 ? "3 " : ""}{item.tier4 ? "4" : ""}</p>
          <p><strong>Response Guidance:</strong> {item.responseguidance}</p>
          <p><strong>EEE Package:</strong> {item.eeepackages}</p>
          <p><strong>Tags:</strong> {item.tags}</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {responseKeys.map(({ id, label, description }) => (
              <button
                key={id}
                onClick={() => handleResponseChange(item.id, label)}
                style={{
                  backgroundColor: responses[item.id] === label ? '#005288' : '#eee',
                  color: responses[item.id] === label ? 'white' : '#333',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px'
                }}
                title={description || label}
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            placeholder="Enter assessment rationale..."
            onChange={(e) => handleResponseChange(item.id, e.target.value)}
            style={{ width: '100%', height: '3rem', marginTop: '0.5rem' }}
          />

          <input
            type="file"
            onChange={(e) => handleEvidenceUpload(item.id, e.target.files[0])}
            style={{ marginTop: '0.5rem' }}
            title="Upload supporting evidence for this diagnostic"
          />
          {evidenceFiles[item.id] && <p><em>Uploaded: {evidenceFiles[item.id]}</em></p>}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '2rem 0', gap: '0.5rem' }}>
        {visiblePages.map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            style={{
              backgroundColor: currentPage === page ? '#005288' : '#d0d7de',
              color: currentPage === page ? '#fff' : '#003366',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title={`Go to page ${page}`}
          >
            {page}
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <button onClick={handleGenerateSummary} style={{ backgroundColor: '#003366', color: 'white', padding: '0.75rem 1.5rem', marginRight: '1rem', borderRadius: '4px' }}>
          Generate Report Summary
        </button>
        <button onClick={handleGeneratePDF} style={{ backgroundColor: '#005288', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '4px' }}>
          Download Report
        </button>
      </div>
    </div>
  );
}
