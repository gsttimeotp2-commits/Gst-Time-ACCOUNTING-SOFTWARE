import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  Printer,
  Copy,
  Check,
  Building2,
  QrCode,
  FileText,
  Sparkles,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Info,
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Transaction } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, numberToWords } from '../utils/formatters';

interface InvoiceViewerModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceViewerModal: React.FC<InvoiceViewerModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const { profile } = useAuth();
  const [template, setTemplate] = useState<'modern' | 'classic' | 'compact'>(
    transaction?.template || profile?.defaultTemplate || 'modern'
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Dynamic QR Code Generator State
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [paymentAmountType, setPaymentAmountType] = useState<'total' | 'balance' | 'custom'>('total');
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [upiId, setUpiId] = useState<string>('');
  const [payeeName, setPayeeName] = useState<string>('');
  const [transactionNote, setTransactionNote] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrLinkCopied, setQrLinkCopied] = useState<boolean>(false);
  const [showQrOnInvoice, setShowQrOnInvoice] = useState<boolean>(true);

  // Business Logo State
  const [showLogoOnInvoice, setShowLogoOnInvoice] = useState<boolean>(true);
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  const BUSINESS_LOGO_PATH = '/src/assets/images/business_logo_emblem_1792070539707.jpg';

  // Preload Business Logo as Base64 for instant Canvas & PDF generation
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 400;
        canvas.height = img.naturalHeight || img.height || 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setLogoDataUrl(canvas.toDataURL('image/jpeg', 0.95));
        }
      } catch (e) {
        console.warn('Could not convert logo to base64', e);
      }
    };
    img.src = BUSINESS_LOGO_PATH;
  }, []);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Initialize payment parameters when transaction opens
  useEffect(() => {
    if (transaction) {
      const defaultUpi = profile?.upiId || 'vortexinfo@hdfcbank';
      const defaultName = profile?.businessName || 'BillPulse Business';
      const initialAmount =
        transaction.balanceAmount > 0 ? transaction.balanceAmount : transaction.grandTotal;

      setUpiId(defaultUpi);
      setPayeeName(defaultName);
      setTransactionNote(`Invoice ${transaction.invoiceNumber}`);
      setCustomAmount(initialAmount);
      setPaymentAmountType(transaction.balanceAmount > 0 ? 'balance' : 'total');
    }
  }, [transaction, profile]);

  // Compute active payment amount
  const activePaymentAmount =
    paymentAmountType === 'total'
      ? transaction?.grandTotal || 0
      : paymentAmountType === 'balance'
      ? transaction?.balanceAmount || transaction?.grandTotal || 0
      : customAmount || 0;

  // Construct valid Indian UPI Payment Deep-Link URI
  // Standards: upi://pay?pa=address@bank&pn=MerchantName&am=123.45&cu=INR&tn=Note
  const upiPaymentUri = `upi://pay?pa=${encodeURIComponent(
    upiId.trim() || 'vortexinfo@hdfcbank'
  )}&pn=${encodeURIComponent(payeeName.trim() || 'Business')}&am=${activePaymentAmount.toFixed(
    2
  )}&cu=INR&tn=${encodeURIComponent(transactionNote.trim() || `Invoice ${transaction?.invoiceNumber}`)}`;

  // Generate high-resolution offline QR code via qrcode library
  useEffect(() => {
    if (!transaction) return;

    QRCode.toDataURL(upiPaymentUri, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate offline QR code:', err);
      });
  }, [upiPaymentUri, transaction]);

  if (!isOpen || !transaction) return null;

  // Generate WhatsApp Share Message & Link with UPI details
  const handleShareWhatsApp = (customMsg?: string) => {
    const text = encodeURIComponent(
      customMsg ||
        `*INVOICE: ${transaction.invoiceNumber}*\n` +
          `From: ${profile?.businessName || 'Business'}\n` +
          `To: ${transaction.partyName}\n` +
          `Date: ${formatDate(transaction.date)}\n` +
          `Total Amount: ${formatCurrency(transaction.grandTotal)}\n` +
          `Paid: ${formatCurrency(transaction.paidAmount)}\n` +
          `Balance Due: ${formatCurrency(transaction.balanceAmount)}\n\n` +
          `⚡ *Pay ₹${activePaymentAmount.toFixed(2)} via UPI:*\n` +
          `UPI ID: ${upiId || profile?.upiId || 'vortexinfo@hdfcbank'}\n` +
          `Payment Link: ${upiPaymentUri}\n\n` +
          `Thank you for doing business with us!`
    );

    const phone = transaction.partyPhone ? transaction.partyPhone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  // Copy invoice text summary
  const handleCopySummary = () => {
    const text =
      `Invoice: ${transaction.invoiceNumber}\n` +
      `Business: ${profile?.businessName}\n` +
      `Party: ${transaction.partyName}\n` +
      `Total: ${formatCurrency(transaction.grandTotal)}\n` +
      `Balance: ${formatCurrency(transaction.balanceAmount)}\n` +
      `UPI ID: ${upiId}\n` +
      `UPI Link: ${upiPaymentUri}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy UPI Deep Link
  const handleCopyUpiLink = () => {
    navigator.clipboard.writeText(upiPaymentUri);
    setQrLinkCopied(true);
    setTimeout(() => setQrLinkCopied(false), 2000);
  };

  // Download QR Code as PNG Image
  const handleDownloadQrImage = () => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `UPI_QR_${transaction.invoiceNumber}_Amount_${activePaymentAmount}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Direct PDF Download via jsPDF with embedded QR Code
  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      // Embed Business Logo in Header (Top Right)
      if (logoDataUrl && showLogoOnInvoice) {
        try {
          doc.addImage(logoDataUrl, 'JPEG', 495, 28, 58, 58);
        } catch (imgErr) {
          console.warn('Could not add logo to PDF:', imgErr);
        }
      }

      // Header Business Info
      let y = 42;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(profile?.businessName || 'TAX INVOICE', 40, y);

      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      if (profile?.gstin) doc.text(`GSTIN: ${profile.gstin}`, 40, y);
      if (profile?.phone) doc.text(`Phone: ${profile.phone}`, 300, y);

      y += 15;
      if (profile?.address) doc.text(`Address: ${profile.address}`, 40, y);

      y += 25;
      doc.setDrawColor(200, 200, 200);
      doc.line(40, y, 555, y);

      y += 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(transaction.isGSTInvoice ? 'TAX INVOICE' : 'RETAIL BILL', 40, y);

      doc.setFontSize(10);
      doc.text(`Invoice No: ${transaction.invoiceNumber}`, 360, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${formatDate(transaction.date)}`, 360, y);
      if (transaction.dueDate) {
        y += 14;
        doc.text(`Due Date: ${formatDate(transaction.dueDate)}`, 360, y);
      }

      y -= 14;
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To:', 40, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.text(transaction.partyName, 40, y);
      if (transaction.partyGstin) {
        y += 14;
        doc.text(`GSTIN: ${transaction.partyGstin}`, 40, y);
      }
      if (transaction.partyAddress) {
        y += 14;
        doc.text(`Address: ${transaction.partyAddress}`, 40, y);
      }

      y += 30;
      // Table Header
      doc.setFillColor(240, 240, 245);
      doc.rect(40, y, 515, 20, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('#', 45, y + 14);
      doc.text('Item Description', 65, y + 14);
      doc.text('HSN', 260, y + 14);
      doc.text('Qty', 320, y + 14);
      doc.text('Price', 370, y + 14);
      doc.text('GST', 440, y + 14);
      doc.text('Total', 500, y + 14);

      y += 25;
      doc.setFont('helvetica', 'normal');
      transaction.items.forEach((item, index) => {
        doc.text(String(index + 1), 45, y);
        doc.text(item.name.slice(0, 32), 65, y);
        doc.text(item.hsn || '-', 260, y);
        doc.text(`${item.quantity} ${item.unit || ''}`, 320, y);
        doc.text(`₹${item.unitPrice}`, 370, y);
        doc.text(`${item.taxRate}%`, 440, y);
        doc.text(`₹${Math.round(item.total)}`, 500, y);
        y += 18;
      });

      y += 15;
      doc.line(40, y, 555, y);
      y += 20;

      // Totals
      doc.text(`Subtotal: ₹${transaction.subtotal.toFixed(2)}`, 380, y);
      y += 16;
      if (transaction.taxTotal > 0) {
        doc.text(`Total GST: ₹${transaction.taxTotal.toFixed(2)}`, 380, y);
        y += 16;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Grand Total: ₹${transaction.grandTotal.toFixed(2)}`, 380, y);
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Paid: ₹${transaction.paidAmount.toFixed(2)}`, 380, y);
      y += 16;
      doc.text(`Balance Due: ₹${transaction.balanceAmount.toFixed(2)}`, 380, y);

      // Embed QR Code into PDF
      if (qrCodeDataUrl && showQrOnInvoice) {
        try {
          doc.addImage(qrCodeDataUrl, 'PNG', 40, y - 20, 80, 80);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Scan with any UPI App to Pay', 40, y + 70);
          doc.setFont('helvetica', 'normal');
          doc.text(`UPI ID: ${upiId}`, 40, y + 80);
        } catch (imgErr) {
          console.warn('Could not embed QR image to PDF', imgErr);
        }
      }

      y += 90;
      doc.setFontSize(9);
      doc.text(`Amount in Words: ${numberToWords(transaction.grandTotal)}`, 40, y);

      y += 20;
      if (profile?.bankName && profile?.accountNumber) {
        doc.text(`Bank: ${profile.bankName} | A/C: ${profile.accountNumber} | IFSC: ${profile.ifsc}`, 40, y);
      }

      doc.save(`${transaction.invoiceNumber}.pdf`);
    } catch (err) {
      console.error('Error creating PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Template:</span>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-medium">
              {(['modern', 'classic', 'compact'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTemplate(t)}
                  className={`px-3 py-1 rounded-md capitalize transition-all ${
                    template === t
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Business Logo Toggle */}
            <button
              onClick={() => setShowLogoOnInvoice(!showLogoOnInvoice)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                showLogoOnInvoice
                  ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Toggle business logo on invoice templates and PDF headers"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{showLogoOnInvoice ? 'Logo Included' : 'Hide Logo'}</span>
            </button>

            {/* Generate Dynamic QR Code CTA */}
            <button
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Generate dynamic UPI Payment QR Code for this invoice"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Generate QR Code</span>
            </button>

            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Copy Summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => handleShareWhatsApp()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            ref={printAreaRef}
            id="printable-invoice"
            className={`w-full max-w-3xl bg-white text-slate-900 p-6 sm:p-10 shadow-lg border border-slate-200 transition-all ${
              template === 'compact' ? 'font-mono text-xs max-w-xl' : 'text-xs sm:text-sm font-sans'
            }`}
          >
            {/* TEMPLATE 1: MODERN MINIMALIST */}
            {template === 'modern' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-indigo-100 pb-6">
                  <div className="flex items-start gap-3.5">
                    {showLogoOnInvoice && (
                      <img
                        src={BUSINESS_LOGO_PATH}
                        alt="Business Logo"
                        referrerPolicy="no-referrer"
                        className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl object-contain border border-slate-200/80 p-1 bg-white shadow-xs shrink-0"
                      />
                    )}
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                        {transaction.isGSTInvoice ? 'TAX INVOICE' : 'RETAIL BILL'}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">
                        {profile?.businessName || 'Business Company'}
                      </h2>
                      <p className="text-xs text-slate-500 max-w-xs mt-0.5">{profile?.address}</p>
                      {profile?.gstin && (
                        <p className="text-xs font-mono font-semibold text-slate-700 mt-1">
                          GSTIN: {profile.gstin}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        Phone: {profile?.phone} • Email: {profile?.email}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-400">INVOICE NUMBER</p>
                    <p className="text-base sm:text-lg font-black font-mono text-slate-900">
                      {transaction.invoiceNumber}
                    </p>
                    <div className="mt-2 text-xs space-y-0.5 text-slate-600">
                      <p>
                        Date: <span className="font-semibold">{formatDate(transaction.date)}</span>
                      </p>
                      {transaction.dueDate && (
                        <p>
                          Due Date:{' '}
                          <span className="font-semibold">{formatDate(transaction.dueDate)}</span>
                        </p>
                      )}
                      <p>
                        State of Supply:{' '}
                        <span className="font-semibold">
                          {transaction.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Billed To / Party Info */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      BILLED TO
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {transaction.partyName}
                    </h3>
                    {transaction.partyAddress && (
                      <p className="text-xs text-slate-500 mt-0.5">{transaction.partyAddress}</p>
                    )}
                    {transaction.partyGstin && (
                      <p className="text-xs font-mono font-semibold text-slate-700 mt-1">
                        GSTIN: {transaction.partyGstin}
                      </p>
                    )}
                    {transaction.partyPhone && (
                      <p className="text-xs text-slate-500">Phone: {transaction.partyPhone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      PAYMENT STATUS
                    </span>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        transaction.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : transaction.paymentStatus === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {transaction.paymentStatus}
                    </span>
                    <p className="text-xs text-slate-500 mt-2">
                      Mode: <span className="font-semibold">{transaction.paymentMode}</span>
                    </p>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b-2 border-indigo-600 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 w-8">#</th>
                        <th className="py-2.5">Item Description</th>
                        {transaction.isGSTInvoice && <th className="py-2.5 w-20">HSN</th>}
                        <th className="py-2.5 w-16 text-center">Qty</th>
                        <th className="py-2.5 w-20 text-right">Price</th>
                        {transaction.isGSTInvoice && <th className="py-2.5 w-16 text-center">GST</th>}
                        <th className="py-2.5 w-24 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transaction.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 font-medium text-slate-800">
                            {item.name}
                            {item.discount > 0 && (
                              <span className="block text-[10px] text-emerald-600">
                                Disc: ₹{item.discount}
                              </span>
                            )}
                          </td>
                          {transaction.isGSTInvoice && (
                            <td className="py-2.5 font-mono text-slate-600">{item.hsn || '-'}</td>
                          )}
                          <td className="py-2.5 text-center font-medium">
                            {item.quantity} {item.unit || ''}
                          </td>
                          <td className="py-2.5 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                          {transaction.isGSTInvoice && (
                            <td className="py-2.5 text-center font-semibold text-slate-600">
                              {item.taxRate}%
                            </td>
                          )}
                          <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Bank Details Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                  {/* Left: Bank Details & Dynamic UPI QR Code */}
                  <div className="space-y-3">
                    {showQrOnInvoice && qrCodeDataUrl && (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <img
                          src={qrCodeDataUrl}
                          alt="Dynamic UPI Payment QR Code"
                          className="w-22 h-22 rounded-lg border border-slate-300 bg-white p-1 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setShowQRModal(true)}
                          title="Click to customize dynamic payment QR code"
                        />
                        <div className="text-xs space-y-0.5">
                          <p className="font-bold text-slate-900 flex items-center gap-1">
                            <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                            Scan &amp; Pay ₹{activePaymentAmount.toFixed(2)}
                          </p>
                          <p className="text-[11px] text-slate-600 font-mono font-medium">
                            UPI: {upiId || 'vortexinfo@hdfcbank'}
                          </p>
                          <div className="flex items-center gap-1 pt-0.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">
                              GPay
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                              PhonePe
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-700">
                              Paytm
                            </span>
                          </div>
                          {profile?.bankName && (
                            <div className="text-[10px] text-slate-500 pt-1">
                              <p>Bank: {profile.bankName} | A/C: {profile.accountNumber}</p>
                              <p>IFSC: {profile.ifsc}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-600 italic">
                      <span className="font-semibold text-slate-700">Amount in Words:</span>{' '}
                      {numberToWords(transaction.grandTotal)}
                    </p>
                  </div>

                  {/* Right: Tax Breakdown & Grand Total */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal (Taxable Value):</span>
                      <span className="font-mono">{formatCurrency(transaction.subtotal)}</span>
                    </div>

                    {transaction.discount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount:</span>
                        <span className="font-mono">-{formatCurrency(transaction.discount)}</span>
                      </div>
                    )}

                    {transaction.isGSTInvoice && (
                      <>
                        {transaction.isInterState ? (
                          <div className="flex justify-between text-slate-600">
                            <span>IGST (Integrated Tax):</span>
                            <span className="font-mono">{formatCurrency(transaction.igst)}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-slate-600">
                              <span>CGST (Central Tax):</span>
                              <span className="font-mono">{formatCurrency(transaction.cgst)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>SGST (State Tax):</span>
                              <span className="font-mono">{formatCurrency(transaction.sgst)}</span>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-300">
                      <span>Total Invoice Amount:</span>
                      <span className="font-mono text-indigo-600">
                        {formatCurrency(transaction.grandTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs pt-1 text-slate-600">
                      <span>Paid Amount:</span>
                      <span className="font-mono font-semibold">{formatCurrency(transaction.paidAmount)}</span>
                    </div>

                    <div className="flex justify-between text-xs font-bold text-rose-600">
                      <span>Balance Due:</span>
                      <span className="font-mono">{formatCurrency(transaction.balanceAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Notes & Authorized Signatory */}
                <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs">
                  <div className="max-w-xs text-[11px] text-slate-500 whitespace-pre-line">
                    <span className="font-bold text-slate-700 block mb-0.5">Terms &amp; Conditions:</span>
                    {transaction.notes || profile?.invoiceTerms || 'Standard trade terms apply.'}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-slate-700">
                      For {profile?.businessName || 'Business'}
                    </p>
                    <div className="h-12 flex items-center justify-end">
                      <span className="font-mono text-[10px] text-slate-400 italic">
                        [Authorized Signatory]
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TEMPLATE 2: CLASSIC ENTERPRISE */}
            {template === 'classic' && (
              <div className="space-y-4 border-2 border-slate-800 p-4">
                <div className="text-center border-b-2 border-slate-800 pb-3">
                  <h1 className="text-2xl font-bold uppercase tracking-wider">{profile?.businessName}</h1>
                  <p className="text-xs">{profile?.address}</p>
                  <p className="text-xs font-bold font-mono">
                    GSTIN: {profile?.gstin} • State: {profile?.state} • Phone: {profile?.phone}
                  </p>
                  <div className="inline-block mt-2 px-4 py-0.5 border border-slate-800 font-bold uppercase text-xs">
                    {transaction.isGSTInvoice ? 'TAX INVOICE' : 'BILL OF SUPPLY'}
                  </div>
                </div>

                {/* Grid Box */}
                <div className="grid grid-cols-2 border border-slate-800 divide-x divide-slate-800 text-xs">
                  <div className="p-2 space-y-1">
                    <p className="font-bold uppercase text-[10px] text-slate-500">Details of Receiver / Billed to:</p>
                    <p className="font-bold text-sm">{transaction.partyName}</p>
                    <p>{transaction.partyAddress}</p>
                    <p className="font-mono font-semibold">GSTIN: {transaction.partyGstin || 'URP (Unregistered)'}</p>
                    <p>Contact: {transaction.partyPhone}</p>
                  </div>
                  <div className="p-2 space-y-1">
                    <p>
                      <span className="font-bold">Invoice No:</span> {transaction.invoiceNumber}
                    </p>
                    <p>
                      <span className="font-bold">Dated:</span> {formatDate(transaction.date)}
                    </p>
                    <p>
                      <span className="font-bold">Place of Supply:</span>{' '}
                      {transaction.isInterState ? 'Inter-State' : profile?.state}
                    </p>
                    <p>
                      <span className="font-bold">Payment Mode:</span> {transaction.paymentMode}
                    </p>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full border-collapse border border-slate-800 text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-800 font-bold">
                      <th className="border-r border-slate-800 p-2 w-8">#</th>
                      <th className="border-r border-slate-800 p-2">Description of Goods</th>
                      <th className="border-r border-slate-800 p-2 w-16">HSN</th>
                      <th className="border-r border-slate-800 p-2 w-16 text-center">Qty</th>
                      <th className="border-r border-slate-800 p-2 w-20 text-right">Rate</th>
                      <th className="border-r border-slate-800 p-2 w-16 text-center">GST %</th>
                      <th className="p-2 w-24 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transaction.items.map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-300">
                        <td className="border-r border-slate-800 p-2 text-center">{idx + 1}</td>
                        <td className="border-r border-slate-800 p-2 font-medium">{it.name}</td>
                        <td className="border-r border-slate-800 p-2 text-center font-mono">{it.hsn || '-'}</td>
                        <td className="border-r border-slate-800 p-2 text-center">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="border-r border-slate-800 p-2 text-right font-mono">
                          {it.unitPrice.toFixed(2)}
                        </td>
                        <td className="border-r border-slate-800 p-2 text-center">{it.taxRate}%</td>
                        <td className="p-2 text-right font-mono font-bold">{it.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals & Classic QR Code */}
                <div className="grid grid-cols-2 border border-slate-800 divide-x divide-slate-800 text-xs">
                  <div className="p-3 space-y-2 flex items-start gap-3">
                    {showQrOnInvoice && qrCodeDataUrl && (
                      <img
                        src={qrCodeDataUrl}
                        alt="UPI QR Code"
                        className="w-18 h-18 border border-slate-800 p-0.5 bg-white shrink-0 cursor-pointer"
                        onClick={() => setShowQRModal(true)}
                        title="Click to generate customized UPI QR Code"
                      />
                    )}
                    <div className="space-y-1">
                      <p className="font-semibold text-[11px]">
                        Scan to Pay: ₹{activePaymentAmount.toFixed(2)}
                      </p>
                      <p className="font-mono text-[10px]">UPI: {upiId}</p>
                      <p className="text-[10px] text-slate-600">
                        Bank: {profile?.bankName} | A/C: {profile?.accountNumber} | IFSC: {profile?.ifsc}
                      </p>
                      <p className="italic text-[10px]">{numberToWords(transaction.grandTotal)}</p>
                    </div>
                  </div>

                  <div className="p-3 space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-mono">₹{transaction.subtotal.toFixed(2)}</span>
                    </div>
                    {transaction.taxTotal > 0 && (
                      <div className="flex justify-between">
                        <span>Total GST:</span>
                        <span className="font-mono">₹{transaction.taxTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm border-t border-slate-800 pt-1">
                      <span>Total Amount:</span>
                      <span className="font-mono">₹{transaction.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-4 text-xs">
                  <p className="max-w-xs text-[10px] text-slate-500 whitespace-pre-line">{transaction.notes}</p>
                  <p className="text-right font-bold">For {profile?.businessName}</p>
                </div>
              </div>
            )}

            {/* TEMPLATE 3: COMPACT THERMAL (POS STYLE) */}
            {template === 'compact' && (
              <div className="p-4 bg-slate-50 font-mono text-xs space-y-3 border border-slate-300">
                <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-3">
                  <h2 className="font-bold text-base">{profile?.businessName}</h2>
                  <p className="text-[10px]">{profile?.address}</p>
                  <p className="text-[10px]">GSTIN: {profile?.gstin}</p>
                  <p className="text-[10px]">Phone: {profile?.phone}</p>
                  <p className="font-bold uppercase tracking-wider text-[11px] pt-1">
                    *** {transaction.isGSTInvoice ? 'TAX INVOICE' : 'CASH MEMO'} ***
                  </p>
                </div>

                <div className="flex justify-between text-[11px] border-b border-dashed border-slate-400 pb-2">
                  <div>
                    <p>Bill No: {transaction.invoiceNumber}</p>
                    <p>Date: {formatDate(transaction.date)}</p>
                  </div>
                  <div className="text-right">
                    <p>Customer: {transaction.partyName}</p>
                    <p>Mode: {transaction.paymentMode}</p>
                  </div>
                </div>

                <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-3">
                  {transaction.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <div>
                        <p className="font-bold">{it.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {it.quantity} {it.unit} x ₹{it.unitPrice} (GST {it.taxRate}%)
                        </p>
                      </div>
                      <p className="font-bold">₹{it.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{transaction.subtotal.toFixed(2)}</span>
                  </div>
                  {transaction.taxTotal > 0 && (
                    <div className="flex justify-between">
                      <span>Total GST:</span>
                      <span>₹{transaction.taxTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-dashed border-slate-400 pt-1">
                    <span>NET PAYABLE:</span>
                    <span>₹{transaction.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>Paid:</span>
                    <span>₹{transaction.paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-rose-600 text-[10px]">
                    <span>Balance Due:</span>
                    <span>₹{transaction.balanceAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Compact POS QR Code */}
                {showQrOnInvoice && qrCodeDataUrl && (
                  <div className="flex flex-col items-center justify-center p-2 border border-dashed border-slate-400 rounded bg-white">
                    <img
                      src={qrCodeDataUrl}
                      alt="UPI QR Code"
                      className="w-24 h-24 cursor-pointer"
                      onClick={() => setShowQRModal(true)}
                    />
                    <p className="text-[9px] font-bold text-center mt-1">
                      SCAN TO PAY ₹{activePaymentAmount.toFixed(2)}
                    </p>
                    <p className="text-[8px] text-slate-500 font-mono">UPI: {upiId}</p>
                  </div>
                )}

                <div className="text-center pt-2 border-t border-dashed border-slate-400 text-[10px] space-y-1">
                  <p>Thank you for shopping with us!</p>
                  <p>Goods once sold cannot be returned.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DEDICATED DYNAMIC UPI QR CODE GENERATOR MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-950/20 via-indigo-950/20 to-slate-900/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Dynamic Payment QR Code
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    UPI Instant Payment for {transaction.partyName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* Payment Amount Type Toggle */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Select Bill Amount to Collect *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmountType('total')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentAmountType === 'total'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-600 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Total Invoice</span>
                    <span className="font-mono font-bold text-xs sm:text-sm">
                      {formatCurrency(transaction.grandTotal)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentAmountType('balance')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentAmountType === 'balance'
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-600 text-rose-700 dark:text-rose-300 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Balance Due</span>
                    <span className="font-mono font-bold text-xs sm:text-sm">
                      {formatCurrency(transaction.balanceAmount || transaction.grandTotal)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentAmountType('custom')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentAmountType === 'custom'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Custom Amt</span>
                    <span className="font-mono font-bold text-xs sm:text-sm">
                      {formatCurrency(customAmount || 0)}
                    </span>
                  </button>
                </div>
              </div>

              {/* Custom Amount Input if selected */}
              {paymentAmountType === 'custom' && (
                <div className="animate-in fade-in">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Enter Custom Collection Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-base"
                    placeholder="e.g. 5000"
                  />
                </div>
              )}

              {/* QR Code Presentation Box */}
              <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-3">
                <div className="relative group">
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="UPI Payment QR"
                        className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                      />
                    ) : (
                      <div className="w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center text-slate-400">
                        Generating QR...
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 inline-block">
                    Scan to Pay ₹{activePaymentAmount.toFixed(2)}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono font-medium">
                    UPI ID: {upiId}
                  </p>
                </div>

                {/* Supported UPI Apps Badges */}
                <div className="flex items-center justify-center gap-2 pt-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    Google Pay
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    PhonePe
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    Paytm
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    BHIM
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    Cred
                  </span>
                </div>
              </div>

              {/* Editable Merchant Config & Note Accordion/Inputs */}
              <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Merchant UPI ID (VPA)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. company@okhdfcbank"
                      className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Payee Business Name
                    </label>
                    <input
                      type="text"
                      value={payeeName}
                      onChange={(e) => setPayeeName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Payment Note / Description
                  </label>
                  <input
                    type="text"
                    value={transactionNote}
                    onChange={(e) => setTransactionNote(e.target.value)}
                    placeholder="e.g. Invoice INV-2026-001"
                    className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="showQrOnInvoice"
                    checked={showQrOnInvoice}
                    onChange={(e) => setShowQrOnInvoice(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="showQrOnInvoice" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Include this dynamic QR code on the invoice print &amp; PDF download
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadQrImage}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-semibold text-xs shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Download Image (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyUpiLink}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-semibold text-xs shadow-xs transition-colors"
                >
                  {qrLinkCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{qrLinkCopied ? 'UPI Link Copied!' : 'Copy UPI Link'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleShareWhatsApp(
                      `*PAYMENT REQUEST: ${transaction.invoiceNumber}*\n` +
                        `Payee: ${payeeName}\n` +
                        `Amount: ₹${activePaymentAmount.toFixed(2)}\n` +
                        `UPI ID: ${upiId}\n` +
                        `Link: ${upiPaymentUri}\n\n` +
                        `Please scan or click the link above to complete payment.`
                    )
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share via WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQRModal(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
