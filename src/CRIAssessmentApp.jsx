import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

  useEffect(() => {
    const fetchDiagnostics = async () => {
      const { data, error } = await supabase.from("diagnosticstatements").select("*");
      if (data) setDiagnostics(data);
    };
    fetchDiagnostics();
  }, []);

  const handleResponseChange = (id, value) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileUpload = async (id, file) => {
    const { data, error } = await supabase.storage
      .from("evidence")
      .upload(`${id}/${file.name}`, file);
    if (!error) {
      setEvidence((prev) => ({ ...prev, [id]: data.path }));
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
    setSummaryData(data);
    setShowSummary(true);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">CREAM AI Assessment Tool (CRI Profile v2.1)</h1>
      <Tabs defaultValue="tier1" className="mb-4">
        <TabsList>
          <TabsTrigger value="tier1">Tier 1</TabsTrigger>
          <TabsTrigger value="tier2">Tier 2</TabsTrigger>
          <TabsTrigger value="tier3">Tier 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tier1">
          {diagnostics.filter(d => d.tier === 1).map((diag) => (
            <Card key={diag.id} className="mb-4">
              <CardContent className="p-4">
                <h2 className="font-semibold text-xl mb-2">{diag.title}</h2>
                <p className="text-sm text-gray-600 mb-2">{diag.guidance}</p>
                <Textarea
                  placeholder="Describe your control implementation or upload evidence link..."
                  className="mb-2"
                  onChange={(e) => handleResponseChange(diag.id, e.target.value)}
                />
                <Input
                  type="file"
                  onChange={(e) => handleFileUpload(diag.id, e.target.files[0])}
                  className="mb-2"
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleResponseChange(diag.id, "Yes")}>Yes</Button>
                  <Button variant="outline" onClick={() => handleResponseChange(diag.id, "Partial")}>Partial</Button>
                  <Button variant="outline" onClick={() => handleResponseChange(diag.id, "No")}>No</Button>
                  <Button variant="secondary" onClick={() => handleResponseChange(diag.id, "Compensating")}>Compensating</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="tier2">
          <p className="text-gray-500">Tier 2 diagnostics coming soon.</p>
        </TabsContent>
        <TabsContent value="tier3">
          <p className="text-gray-500">Tier 3 diagnostics coming soon.</p>
        </TabsContent>
      </Tabs>
      <Button className="mt-4" onClick={handleGenerateReport}>Generate Assessment Report</Button>

      {showSummary && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-bold mb-4">AI-Powered Summary Report</h2>
          <ul className="space-y-2">
            {summaryData.map((item) => (
              <li key={item.id}>
                <strong>{item.id}</strong> — <em>{item.title}</em><br />
                Response: {item.response}, Confidence: {item.confidence}, Score: {item.score}, Evidence: {item.evidence}
              </li>
            ))}
          </ul>
          <div className="flex gap-4 mt-4">
            <Button onClick={() => downloadCSV(summaryData)}>Download CSV</Button>
            <Button onClick={() => downloadPDF(summaryData)}>Download PDF</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Place your previously generated component code here...
// For this demonstration, you can copy the content from your working file.
