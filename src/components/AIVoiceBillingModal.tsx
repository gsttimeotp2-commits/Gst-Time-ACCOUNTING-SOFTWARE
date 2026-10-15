import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  Loader2,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';

interface ParsedInvoiceData {
  partyName?: string;
  partyPhone?: string;
  partyGstin?: string;
  type?: 'sale' | 'purchase';
  isInterState?: boolean;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    hsn?: string;
    unit?: string;
  }>;
  discount?: number;
  paidAmount?: number;
  paymentMode?: string;
  notes?: string;
}

interface AIVoiceBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyInvoice: (data: ParsedInvoiceData) => void;
}

export const AIVoiceBillingModal: React.FC<AIVoiceBillingModalProps> = ({
  isOpen,
  onClose,
  onApplyInvoice,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ParsedInvoiceData | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Setup Web Speech API if supported
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English / Hinglish billing accents

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setPrompt(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError('Microphone access was denied. You can still type your prompt below.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  if (!isOpen) return null;

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Voice recognition is not supported in this browser. Please type your command.');
      return;
    }
    setError(null);
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
      }
    }
  };

  const handleGenerateInvoice = async () => {
    if (!prompt.trim()) {
      setError('Please provide a command or speak your billing instructions.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/parse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to parse billing command');
      }

      setPreviewData(json.data);
    } catch (err: any) {
      setError(err?.message || 'Error communicating with AI service');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (previewData) {
      onApplyInvoice(previewData);
      onClose();
    }
  };

  const examplePrompts = [
    'Bill 5 packs of Basmati Rice 5kg at 480 each with 5% GST to Sharma Electronics, fully paid in cash',
    'Invoice 2 Samsung 27-inch 4K Monitors at 24500 each to Apex Infotech with 18% IGST interstate, 20000 paid via UPI',
    'Purchase 10 Logitech MX Master 3S at 6800 from Syscom Hardware LLP, 18% GST, balance unpaid',
    'Sell 3 Anker PowerConf Speakerphones at 11499 each and 1 APC UPS at 7200 with 18% GST to Ramesh General Store',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/20 via-purple-950/20 to-slate-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                AI Voice & Natural Language Billing
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                  Gemini 3.8 Flash
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Speak or type naturally. Gemini will extract items, quantities, prices, taxes & customer.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Voice Input Section with Visualizer */}
          <div className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-indigo-50/50 to-slate-50 dark:from-slate-800/40 dark:to-slate-900/60 border border-indigo-100 dark:border-indigo-950/80 text-center">
            <button
              onClick={toggleListening}
              className={`relative group w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isListening
                  ? 'bg-rose-600 text-white shadow-rose-500/40 scale-105 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
              }`}
            >
              {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              {isListening && (
                <span className="absolute -inset-2 rounded-full border-2 border-rose-400 animate-ping opacity-75" />
              )}
            </button>
            <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isListening ? 'Listening to your billing instruction...' : 'Click to Speak Voice Command'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Supports English, Hindi, and Indian English business terms (e.g. &quot;5 boriyan&quot;, &quot;petiyan&quot;, &quot;nag&quot;)
            </p>
          </div>

          {/* Textarea Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Billing Command / Voice Transcript
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g., "Invoice 5 packs of Basmati rice at 480 with 5% GST to Sharma Electronics, 1000 cash paid balance pending"'
              className="w-full p-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-slate-900 dark:text-white focus:outline-hidden transition-all resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Prompt Templates */}
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Quick Example Commands:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {examplePrompts.map((eg, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(eg)}
                  className="p-2 text-left text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg border border-slate-200 dark:border-slate-700/60 transition-colors line-clamp-2"
                >
                  &quot;{eg}&quot;
                </button>
              ))}
            </div>
          </div>

          {/* AI Extracted Preview */}
          {previewData && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  AI Parsed Invoice Preview
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                  {previewData.type || 'sale'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] text-slate-400 block">Party / Customer</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {previewData.partyName || 'Walk-in Customer'}
                  </span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] text-slate-400 block">Payment Mode</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {previewData.paymentMode || 'Cash'}
                  </span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] text-slate-400 block">Paid Amount</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ₹{previewData.paidAmount ?? 0}
                  </span>
                </div>
              </div>

              {previewData.items && previewData.items.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-emerald-900/40 p-2.5">
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                    Extracted Line Items ({previewData.items.length}):
                  </p>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                    {previewData.items.map((it, idx) => (
                      <li key={idx} className="py-1.5 flex justify-between items-center">
                        <div>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {it.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            HSN: {it.hsn || 'N/A'} • GST: {it.taxRate}%
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            ₹{(it.quantity * it.unitPrice).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {it.quantity} {it.unit || 'Pcs'} @ ₹{it.unitPrice}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {!previewData ? (
              <button
                onClick={handleGenerateInvoice}
                disabled={isProcessing || !prompt.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-600/20"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Invoice
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleApply}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
              >
                Open in Invoice Editor
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
