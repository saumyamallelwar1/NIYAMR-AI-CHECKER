import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function PDFRuleChecker() {
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [rules, setRules] = useState(['', '', '']);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load PDF.js library
  useEffect(() => {
    const loadPdfJs = () => {
      if (window.pdfjsLib) {
        setPdfLibLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          setPdfLibLoaded(true);
        }
      };
      script.onerror = () => setError('Failed to load PDF library. Please refresh the page.');
      document.body.appendChild(script);
    };
    loadPdfJs();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError('');
    } else {
      setError('Please upload a valid PDF file');
      setPdfFile(null);
    }
  };

  const handleRuleChange = (index, value) => {
    const newRules = [...rules];
    newRules[index] = value;
    setRules(newRules);
  };

  // ... keep your extractTextFromPDF, checkRuleWithLLM, handleCheckDocument functions

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 flex items-center">
        <FileText className="mr-2" /> PDF Rule Checker
      </h1>

      {/* File Upload */}
      <input type="file" accept="application/pdf" onChange={handleFileChange} className="mb-4" />

      {/* Rule Inputs */}
      {rules.map((rule, i) => (
        <input
          key={i}
          type="text"
          value={rule}
          onChange={(e) => handleRuleChange(i, e.target.value)}
          placeholder={`Rule ${i + 1}`}
          className="border p-2 w-full mb-2"
        />
      ))}

      {/* Check Button */}
      <button
        onClick={handleCheckDocument}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded flex items-center"
      >
        {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
        {loading ? 'Checking...' : 'Check Document'}
      </button>

      {/* Error */}
      {error && <p className="text-red-600 mt-2 flex items-center"><XCircle className="mr-1" /> {error}</p>}

      {/* Results */}
      <div className="mt-4">
        {results.map((res, i) => (
          <div key={i} className="border p-3 mb-2 rounded">
            <p><strong>Rule:</strong> {res.rule}</p>
            <p><strong>Status:</strong> {res.status}</p>
            <p><strong>Evidence:</strong> {res.evidence}</p>
            <p><strong>Reasoning:</strong> {res.reasoning}</p>
            <p><strong>Confidence:</strong> {res.confidence}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
