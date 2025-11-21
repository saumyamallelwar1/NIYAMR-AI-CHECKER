import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function PDFRuleChecker() {
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [rules, setRules] = useState(['', '', '']);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load PDF.js library on component mount
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
      script.onerror = () => {
        setError('Failed to load PDF library. Please refresh the page.');
      };
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

  const extractTextFromPDF = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target.result);
          
          if (!window.pdfjsLib) {
            await new Promise((res) => {
              const checkPdfJs = setInterval(() => {
                if (window.pdfjsLib) {
                  clearInterval(checkPdfJs);
                  res();
                }
              }, 100);
              
              setTimeout(() => {
                clearInterval(checkPdfJs);
                reject(new Error('PDF.js library failed to load'));
              }, 5000);
            });
          }
          
          const pdfjsLib = window.pdfjsLib;
          
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
          
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let fullText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += `\n--- Page ${i} ---\n${pageText}\n`;
          }
          
          resolve(fullText);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const checkRuleWithLLM = async (rule, pdfText) => {
    try {
      const prompt = `You are a document analyzer. Analyze the following document and check if it satisfies this rule: "${rule}"

Document content:
${pdfText.substring(0, 8000)}

Your task:
1. Determine if the document PASSES or FAILS this rule
2. Provide ONE specific sentence from the document as evidence (if pass) or explain what's missing (if fail)
3. Provide brief reasoning
4. Provide a confidence score (0-100)

Respond ONLY with valid JSON in this exact format:
{
  "status": "pass" or "fail",
  "evidence": "specific sentence from document or explanation of what's missing",
  "reasoning": "brief explanation of why it passes or fails",
  "confidence": number between 0-100
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();
      const responseText = data.content[0].text.trim();
      
      let jsonStr = responseText;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }
      
      const result = JSON.parse(jsonStr);
      
      return {
        rule: rule,
        status: result.status.toLowerCase(),
        evidence: result.evidence,
        reasoning: result.reasoning,
        confidence: result.confidence
      };
    } catch (err) {
      console.error('LLM check error:', err);
      return {
        rule: rule,
        status: 'fail',
        evidence: 'Error processing rule',
        reasoning: 'Technical error occurred during analysis',
        confidence: 0
      };
    }
  };

  const handleCheckDocument = async () => {
    if (!pdfFile) {
      setError('Please upload a PDF file');
      return;
    }

    if (!pdfLibLoaded) {
      setError('PDF library is still loading. Please wait a moment and try again.');
      return;
    }

    const validRules = rules.filter(r => r.trim() !== '');
    if (validRules.length === 0) {
      setError('Please enter at least one rule');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const pdfText = await extractTextFromPDF(pdfFile);
      
      if (!pdfText || pdfText.trim().length < 50) {
        throw new Error('Could not extract enough text from PDF. Please try a different file.');
      }
      
      const checkResults = [];
      for (const rule of validRules) {
        const result = await checkRuleWithLLM(rule, pdfText);
        checkResults.push(result);
      }
      
      setResults(checkResults);
    } catch (err) {
      console.error('Error:', err);
      setError('Error processing document: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // ... (UI code - see artifact for complete implementation)
  );
}