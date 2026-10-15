import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint 1: Parse natural-language or voice billing prompt into invoice payload
app.post('/api/ai/parse-invoice', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const systemInstruction = `You are an expert Indian billing and GST assistant for BillPulse AI.
Given a natural language command or transcribed voice instruction describing an invoice or sale/purchase transaction, extract and calculate the invoice details into strict JSON.
Rules:
- Infer partyName, partyPhone (if mentioned), partyGstin (if mentioned).
- Infer transaction type: "sale" or "purchase". Default is "sale".
- Infer if inter-state (IGST) or intra-state (CGST + SGST). Default is intra-state (isInterState: false).
- Extract list of items with: name, quantity (number, default 1), unitPrice (number, before tax or basic sale price), taxRate (0, 5, 12, 18, 28), hsn (if detectable, or guess standard HSN), unit (e.g., "Pcs", "Kg", "Box", "Ltr", "Mtr").
- If discount is mentioned (percent or amount), extract discount amount.
- Extract paidAmount. If user says "fully paid" or "paid in cash/upi", set paidAmount to grand total. If "credit" or "unpaid", set paidAmount to 0.
- Extract paymentMode: "Cash", "UPI", "Bank Transfer", "Cheque", or "Credit".
- Extract brief notes if mentioned.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Parse this billing instruction: "${prompt}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            partyName: { type: Type.STRING },
            partyPhone: { type: Type.STRING },
            partyGstin: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['sale', 'purchase'] },
            isInterState: { type: Type.BOOLEAN },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                  taxRate: { type: Type.NUMBER },
                  hsn: { type: Type.STRING },
                  unit: { type: Type.STRING }
                },
                required: ['name', 'quantity', 'unitPrice', 'taxRate']
              }
            },
            discount: { type: Type.NUMBER },
            paidAmount: { type: Type.NUMBER },
            paymentMode: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ['partyName', 'items']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error parsing invoice with Gemini:', error);
    return res.status(500).json({ error: error?.message || 'Failed to parse invoice' });
  }
});

// Endpoint 2: AI Product Description & HSN Generator
app.post('/api/ai/product-generator', async (req, res) => {
  try {
    const { productName, category } = req.body;
    if (!productName) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate product details, HSN code, suggested GST tax rate, unit, and marketing description for: "${productName}" in category "${category || 'General'}".`,
      config: {
        systemInstruction: `You are an Indian GST and inventory catalog expert. Provide accurate HSN codes (4-8 digits), appropriate standard GST rates (0, 5, 12, 18, or 28), standard measurement unit, and a compelling 2-sentence product description.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            suggestedHsn: { type: Type.STRING },
            suggestedTaxRate: { type: Type.NUMBER },
            category: { type: Type.STRING },
            unit: { type: Type.STRING },
            features: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['description', 'suggestedHsn', 'suggestedTaxRate', 'unit']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error generating product description:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate product details' });
  }
});

// Endpoint 3: AI Business Health & Strategic Insights
app.post('/api/ai/business-insights', async (req, res) => {
  try {
    const { metrics } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analyze these business metrics: ${JSON.stringify(metrics || {})}`,
      config: {
        systemInstruction: `You are a Chief Financial Officer (CFO) and business growth advisor for retail, wholesale, and service businesses.
Analyze the sales, purchases, gross profit, expenses, receivables/payables outstanding, and low-stock inventory data.
Provide:
1. An executive summary of the business's current financial velocity.
2. A Health Score out of 100 based on profitability margin, liquidity, and inventory turn.
3. 3-4 concrete actionable recommendations (e.g., collect receivables, restock top runners, negotiate supplier terms).
4. 2-3 immediate financial/inventory risks.
5. 2-3 growth opportunities.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            healthScore: { type: Type.NUMBER },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            risks: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            growthOpportunities: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['summary', 'healthScore', 'recommendations', 'risks']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error generating business insights:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate business insights' });
  }
});

// Endpoint 4: AI Report & GST Summarizer
app.post('/api/ai/summarize-report', async (req, res) => {
  try {
    const { reportType, reportData } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Summarize the following ${reportType} report: ${JSON.stringify(reportData || {})}`,
      config: {
        systemInstruction: `You are an Indian Chartered Accountant and business auditor.
Provide an insightful summary of the provided GST / Profit & Loss / Expense report:
- Key highlights and anomalies.
- GST breakdown (Output tax liability vs Input tax credit estimation).
- Tax saving tips or expense reduction opportunities.
- 3 clear audit checkpoints.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            keyHighlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            taxBreakdownSummary: { type: Type.STRING },
            actionPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['title', 'keyHighlights', 'taxBreakdownSummary', 'actionPlan']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error summarizing report:', error);
    return res.status(500).json({ error: error?.message || 'Failed to summarize report' });
  }
});

// Endpoint 5: AI Expense Categorizer (Single & Batch)
app.post('/api/ai/categorize-expense', async (req, res) => {
  try {
    const { description, amount, items } = req.body;

    const standardCategories = [
      'Rent & Office',
      'Logistics & Courier',
      'Utilities & Internet',
      'Salaries & Wages',
      'Marketing & Advertising',
      'Cloud & Software (SaaS)',
      'Repair & Maintenance',
      'Legal & Professional Fees',
      'Travel & Fuel',
      'Food & Team Welfare',
      'Packaging & Supplies',
      'Taxes & Government Fees',
      'Miscellaneous',
    ];

    // If batch mode
    if (Array.isArray(items) && items.length > 0) {
      const prompt = `Analyze each of these business expense transaction descriptions and categorize them appropriately into one of these standard categories: ${standardCategories.join(', ')}.
Transactions: ${JSON.stringify(items)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: `You are an expert corporate accountant and tax advisor.
For each transaction description:
1. Select the most accurate category from: ${standardCategories.join(', ')}.
2. Determine if it is likely tax-deductible under business expense rules (e.g. Indian Income Tax Act Section 37).
3. Provide a brief 1-sentence tax justification.
4. Clean and normalize the title / vendor name.
5. Provide a confidence score between 0.0 and 1.0.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              categorized: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    originalDescription: { type: Type.STRING },
                    normalizedTitle: { type: Type.STRING },
                    category: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                    taxDeductible: { type: Type.BOOLEAN },
                    taxReason: { type: Type.STRING },
                    suggestedPaymentMode: { type: Type.STRING },
                  },
                  required: ['originalDescription', 'normalizedTitle', 'category', 'taxDeductible', 'confidence']
                }
              }
            },
            required: ['categorized']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ success: true, data: parsed.categorized || [] });
    }

    // Single item mode
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Expense description is required' });
    }

    const prompt = `Categorize this expense transaction description: "${description}" with amount ₹${amount || 0}.
Standard Categories: ${standardCategories.join(', ')}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert business accountant and tax advisor.
Analyze the description (and amount if provided).
Choose the best category from: ${standardCategories.join(', ')}.
Determine if it is tax-deductible for a commercial business entity.
Provide a clean normalized title, brief tax reasoning, and confidence score.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            taxDeductible: { type: Type.BOOLEAN },
            taxReason: { type: Type.STRING },
            normalizedTitle: { type: Type.STRING },
            suggestedPaymentMode: { type: Type.STRING }
          },
          required: ['category', 'confidence', 'taxDeductible', 'normalizedTitle']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error categorizing expense with Gemini:', error);
    return res.status(500).json({ error: error?.message || 'Failed to categorize expense' });
  }
});

// Endpoint 6: AI Monthly Spend Breakdown & Budget Optimization
app.post('/api/ai/monthly-spend-analysis', async (req, res) => {
  try {
    const { monthlyBreakdown, totalSpend, categoriesSummary } = req.body;

    const prompt = `Analyze these monthly expense trends and category breakdowns for our business:
Monthly Data: ${JSON.stringify(monthlyBreakdown || [])}
Total Spend: ₹${totalSpend || 0}
Category Distribution: ${JSON.stringify(categoriesSummary || {})}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are a Chief Financial Officer (CFO) and cost-reduction auditor for small and medium businesses.
Analyze the monthly spend trend and category concentrations.
Provide:
1. Executive summary of monthly cash outflow trends.
2. Spend velocity analysis (comparing current month vs prior months, identifying expanding vs declining cost centers).
3. 3-4 High-impact cost reduction opportunities with specific actionable steps.
4. Any anomalies, unusual spikes, or leakages detected.
5. Tax saving recommendations for deductible overheads.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            spendVelocityTrend: { type: Type.STRING },
            topSpendDrivers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  analysis: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ['high', 'moderate', 'low'] }
                },
                required: ['category', 'analysis']
              }
            },
            costSavingOpportunities: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            anomaliesDetected: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            taxOptimizationTip: { type: Type.STRING }
          },
          required: ['executiveSummary', 'spendVelocityTrend', 'costSavingOpportunities', 'topSpendDrivers']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error analyzing monthly spend:', error);
    return res.status(500).json({ error: error?.message || 'Failed to analyze monthly spend' });
  }
});

// Serve Vite dev server or static build
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
