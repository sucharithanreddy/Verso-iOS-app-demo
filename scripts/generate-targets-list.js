const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        AlignmentType, HeadingLevel, BorderStyle, WidthType, LevelFormat,
        Header, Footer, PageNumber, ShadingType, VerticalAlign, ExternalHyperlink,
        PageBreak } = require('docx');
const fs = require('fs');

// Colors - Midnight Code theme
const colors = {
  primary: '#020617',
  body: '#1E293B',
  secondary: '#64748B',
  accent: '#94A3B8',
  tableBg: '#F8FAFC',
  highlight: '#3B82F6',
  green: '#10B981',
  amber: '#F59E0B'
};

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: colors.accent };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

// Priority colors
const priorityColors = {
  High: '#DC2626',
  Medium: '#F59E0B',
  Low: '#10B981'
};

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Times New Roman', size: 22 } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal',
        run: { size: 56, bold: true, color: colors.primary, font: 'Times New Roman' },
        paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: colors.primary, font: 'Times New Roman' },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: colors.body, font: 'Times New Roman' },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, color: colors.secondary, font: 'Times New Roman' },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } }
    ]
  },
  numbering: {
    config: [
      { reference: 'bullet-outreach',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'bullet-notes',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'Optimism Engine - Acquisition Targets List', color: colors.secondary, size: 18 })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Page ', size: 18, color: colors.secondary }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: colors.secondary }),
          new TextRun({ text: ' of ', size: 18, color: colors.secondary }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: colors.secondary })
        ]
      })] })
    },
    children: [
      // ========== COVER PAGE ==========
      new Paragraph({ spacing: { before: 2000 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'ACQUISITION TARGETS LIST', size: 56, bold: true, color: colors.primary })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: 'The Optimism Engine - Strategic Buyer Outreach', size: 28, color: colors.secondary })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600 },
        children: [new TextRun({ text: '50+ Qualified Prospects Across 6 Categories', size: 24, color: colors.highlight })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: 'Prioritized by Fit, Budget, and Acquisition History', size: 20, color: colors.accent })]
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ========== INTRODUCTION ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('How to Use This List')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'This document provides a comprehensive list of potential acquisition targets for the Optimism Engine, organized by category and prioritized by strategic fit. Each target includes the company name, why they are a good fit, suggested outreach approach, and priority level. Use this list to systematically approach buyers who have the budget, strategic motivation, and technical capability to acquire and scale this product.', size: 22 })]
      }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Outreach Strategy Recommendations')] }),
      new Paragraph({
        numbering: { reference: 'bullet-outreach', level: 0 },
        children: [new TextRun({ text: 'Start with HIGH priority targets - these companies have demonstrated acquisition appetite, relevant product portfolios, and immediate strategic value.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-outreach', level: 0 },
        children: [new TextRun({ text: 'Cold outreach should be brief: who you are, what you have, why it fits them, and a clear call-to-action (demo or call).', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-outreach', level: 0 },
        children: [new TextRun({ text: 'LinkedIn is the most effective channel for reaching decision-makers directly. Target CEOs, CPOs, Heads of Corporate Development, or Founders.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-outreach', level: 0 },
        children: [new TextRun({ text: 'Marketplaces like Acquire.com and Flippa should complement direct outreach, not replace it - you will get better terms dealing directly.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-outreach', level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Timing matters: mental health awareness peaks in Q1 (New Year resolutions) and Q4 (holiday stress planning). Target outreach accordingly.', size: 22 })]
      }),

      // ========== CATEGORY 1: MENTAL HEALTH SAAS ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Category 1: Mental Health SaaS Companies')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'These companies already operate in the mental wellness space and would benefit most immediately from adding AI-powered CBT capabilities to their existing products. They have the user base, distribution channels, and domain expertise to scale the Optimism Engine quickly.', size: 22 })]
      }),

      // Mental Health SaaS Table
      new Table({
        columnWidths: [1800, 2200, 3560, 1800],
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Company', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Product', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Why They\'re a Fit', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Priority', bold: true, size: 20 })] })] })
            ]
          }),
          // Woebot Health
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Woebot Health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'AI therapy chatbot', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Direct competitor; acquiring adds CBT depth, grounding mode, multi-provider tech they lack', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Wysa
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Wysa', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'AI mental health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Similar market; Assist Mode gives them B2B angle; progressive layer analysis differentiates', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Headspace
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Headspace', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Meditation app', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Expanding beyond meditation; needs active intervention tools; has budget (Ginger merger)', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Calm
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Calm', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Meditation/sleep', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Added Calm Health; needs clinical tools; large user base to cross-sell CBT features', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Talkspace
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Talkspace', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Online therapy', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Between-session engagement tool; reduces therapist load; improves outcomes tracking', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // BetterHelp
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'BetterHelp', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Online therapy', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Largest player; needs AI differentiation; Teladoc ownership means acquisition budget', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Lyra Health
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Lyra Health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Employer mental health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'B2B focus matches Assist Mode; self-service tool for employees; $2B+ valuation', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Spring Health
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Spring Health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Employer benefits', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Strong B2B; CBT tool fills gap between assessment and therapy; recent unicorn status', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Modern Health
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Modern Health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Mental health platform', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Global employer focus; needs AI self-help; went through layoffs-acquisition opportunity', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // Ginger (now Headspace)
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Ginger (Headspace)', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'On-demand mental health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Already merged with Headspace; technology would strengthen coaching tier', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Table 1: Mental Health SaaS Targets', size: 18, italics: true, color: colors.secondary })] }),

      // ========== CATEGORY 2: CORPORATE WELLNESS ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Category 2: Corporate Wellness Platforms')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Employee wellness platforms are actively seeking differentiated mental health offerings to compete for enterprise contracts. The Assist Mode is particularly valuable here as it serves HR professionals and managers who support employee wellbeing.', size: 22 })]
      }),

      // Corporate Wellness Table
      new Table({
        columnWidths: [1800, 2200, 3560, 1800],
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Company', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Product', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Why They\'re a Fit', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Priority', bold: true, size: 20 })] })] })
            ]
          }),
          // Gympass/Wellhub
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Wellhub (Gympass)', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Corporate wellness', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Adding mental health; $2.2B raised; needs AI differentiation vs. competitors', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Virgin Pulse
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Virgin Pulse', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Employee wellbeing', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Large enterprise base; merged with RedBrick; needs deeper mental health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Wellable
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Wellable', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Employee wellness', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Modular platform; could add CBT module; smaller = more agile acquisition', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // Burnalong
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Burnalong', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Corporate wellness', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Content-focused; needs interactive tools; Assist Mode for managers would differentiate', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // Grokker
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Grokker', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Wellness video', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Pivoting to mental health; needs AI; struggling vs. Calm/Headspace competition', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // LifeSpeak
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'LifeSpeak', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Employee wellbeing', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Public company (TSX); acquired Zaplanner; looking for expansion; Assist Mode fits', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // Benify
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Benify', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Benefits platform', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Nordic market leader; expanding globally; mental health is requested feature', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'LOW', bold: true, size: 20, color: priorityColors.Low })] })] })
            ]
          }),
          // Sprout
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Sprout Wellness', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Employee wellness', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Smaller player; acquisition-friendly; could use CBT as differentiator', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'LOW', bold: true, size: 20, color: priorityColors.Low })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Table 2: Corporate Wellness Targets', size: 18, italics: true, color: colors.secondary })] }),

      // ========== CATEGORY 3: COACHING & TRAINING ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Category 3: Coaching & Professional Development')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Executive coaching and professional training organizations are ideal targets for the Assist Mode feature. These companies serve professionals who regularly support others and would benefit from AI-assisted guidance for difficult conversations.', size: 22 })]
      }),

      // Coaching Table
      new Table({
        columnWidths: [1800, 2200, 3560, 1800],
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Company', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Product', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Why They\'re a Fit', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Priority', bold: true, size: 20 })] })] })
            ]
          }),
          // BetterUp
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'BetterUp', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Executive coaching', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: '$4.7B valuation; needs AI tools for coaches; Assist Mode perfect for B2B coaches', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Torch
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Torch', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Leadership coaching', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Leadership development platform; coaches need tools for tough conversations', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // CoachHub
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'CoachHub', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Digital coaching', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'European leader; scaling globally; AI coaching assistant would differentiate', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Noom
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Noom', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Behavior change', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'CBT-based weight loss; expanding to anxiety/stress; infrastructure matches', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Ezra
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Ezra', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Mental health coaching', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Founded by BetterUp alum; B2B focus; needs AI tools for coaches', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // Bravely
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Bravely', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Coaching platform', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'On-demand coaching; acquired by Next Jump; integrated into employee benefits', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // Sounding Board
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Sounding Board', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Leadership coaching', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Enterprise coaching; needs self-service tools for scale; Assist Mode fits', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // FranklinCovey
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'FranklinCovey', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Leadership training', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Public company (NYSE); legacy training; needs digital/AI modernization', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'LOW', bold: true, size: 20, color: priorityColors.Low })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Table 3: Coaching & Training Targets', size: 18, italics: true, color: colors.secondary })] }),

      // ========== CATEGORY 4: HEALTH TECH STARTUPS ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Category 4: Health-Tech Startups & Acqui-hires')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'These companies may not be direct competitors but have strategic reasons to add mental health capabilities. Some may be interested in acqui-hires-buying the technology and team together. Focus on companies that have raised Series A+ and are actively expanding product lines.', size: 22 })]
      }),

      // Health Tech Table
      new Table({
        columnWidths: [1800, 2200, 3560, 1800],
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Company', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Product', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Why They\'re a Fit', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Priority', bold: true, size: 20 })] })] })
            ]
          }),
          // Ro
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Ro (Roman)', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Digital health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: '$876M raised; acquired Workpath; expanding into mental health; needs tech', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Hims & Hers
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Hims & Hers', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Telehealth', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Public (NYSE); launched mental health; needs AI differentiation vs. competitors', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Thirty Madison
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Thirty Madison', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Specialized health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Know yourself = mental health; needs CBT tools; $192M raised', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // Cerebral
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Cerebral', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Online psychiatry', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Mental health focus; had regulatory issues-needs better tech; risk but upside', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // Nue Life
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Nue Life', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Ketamine therapy', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Psychedelic-assisted therapy; needs integration therapy tools; newer player', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // Mindbloom
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Mindbloom', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Ketamine therapy', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Similar to Nue Life; needs integration tools; CBT complements psychedelic therapy', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // Kindbody
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Kindbody', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Fertility/health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Fertility = high stress; mental health support needed; $154M raised', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'LOW', bold: true, size: 20, color: priorityColors.Low })] })] })
            ]
          }),
          // Maven Clinic
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Maven Clinic', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Family health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Women/family health; mental health is growing vertical; $200M+ raised', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'LOW', bold: true, size: 20, color: priorityColors.Low })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Table 4: Health-Tech Startup Targets', size: 18, italics: true, color: colors.secondary })] }),

      // ========== CATEGORY 5: INSURANCE & HEALTHCARE ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Category 5: Insurance & Healthcare Systems')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Large healthcare organizations and insurers are investing in preventive mental health to reduce long-term costs. These buyers have significant budgets but longer sales cycles. Focus on innovation teams and digital health divisions.', size: 22 })]
      }),

      // Insurance Table
      new Table({
        columnWidths: [1800, 2200, 3560, 1800],
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Company', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Type', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Why They\'re a Fit', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Priority', bold: true, size: 20 })] })] })
            ]
          }),
          // Teladoc
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Teladoc', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Telehealth giant', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Owns BetterHelp; needs deeper CBT; innovation team actively acquiring', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // UnitedHealth/Optum
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Optum (UHG)', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Health services', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Largest health insurer; Optum Ventures invests; acquired AbleTo (mental health)', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // Cigna/Evernorth
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Evernorth', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Cigna services', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Cigna\'s health services arm; acquired MDLive; expanding digital mental health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HIGH', bold: true, size: 20, color: priorityColors.High })] })] })
            ]
          }),
          // CVS Health
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'CVS Health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Pharmacy/health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Aetna + MinuteClinic; needs digital tools; launched mental health services', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // Kaiser
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Kaiser Permanente', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Integrated health', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Integrated care model; Ventures fund; strong mental health focus already', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          }),
          // Blue Shield
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Blue Shield CA', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Regional insurer', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Innovation arm (Blue Shield of California Promise); community mental health focus', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'LOW', bold: true, size: 20, color: priorityColors.Low })] })] })
            ]
          }),
          // Accolade
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Accolade', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Health navigation', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Personalized health assistance; acquired PlushCare; needs mental health depth', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MEDIUM', bold: true, size: 20, color: priorityColors.Medium })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Table 5: Insurance & Healthcare Targets', size: 18, italics: true, color: colors.secondary })] }),

      // ========== CATEGORY 6: MARKETPLACES ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Category 6: Acquisition Marketplaces')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'These platforms connect sellers with pre-qualified buyers. While they take fees (10-15% typically), they provide exposure to buyers actively looking for acquisitions. Use these as complements to direct outreach.', size: 22 })]
      }),

      // Marketplaces Table
      new Table({
        columnWidths: [2200, 2300, 3080, 1780],
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Marketplace', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Focus', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Notes', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Fee', bold: true, size: 20 })] })] })
            ]
          }),
          // Acquire.com
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Acquire.com', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Startups/SaaS', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Best for SaaS; $50M+ in transactions; active buyer network', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '4-10%', size: 20 })] })] })
            ]
          }),
          // Flippa
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Flippa', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Online businesses', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Largest marketplace; good exposure; broader buyer pool', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '10-15%', size: 20 })] })] })
            ]
          }),
          // MicroAcquire
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'MicroAcquire', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Micro-SaaS', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Free to list; smaller deals; $10K-$100K range typical', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Free-5%', size: 20 })] })] })
            ]
          }),
          // IndieHackers
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'IndieHackers', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Indie founders', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Community forum; #marketplace channel; serious buyers', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Free', size: 20 })] })] })
            ]
          }),
          // SideProjectors
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'SideProjectors', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Side projects', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Smaller deals; less serious buyers; good for quick sale', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Free', size: 20 })] })] })
            ]
          }),
          // BitsForDigits
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'BitsForDigits', bold: true, size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Micro-startups', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Curated marketplace; serious buyers; founded by indie hackers', size: 20 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '5%', size: 20 })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Table 6: Acquisition Marketplace Options', size: 18, italics: true, color: colors.secondary })] }),

      // ========== OUTREACH TEMPLATES ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Outreach Email Template')] }),
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: 'Subject: Acquisition Opportunity - AI-Powered CBT Platform (Production-Ready)', bold: true, size: 22 })]
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Hi [Name], I built an AI-powered mental health platform based on Cognitive Behavioral Therapy principles that I think could be a strategic fit for [Company]. The Optimism Engine includes: - Two modes: Reflect (personal CBT) and Assist (professional support tool) - Multi-provider AI infrastructure (10 providers, automatic failover) - Production-ready: Clerk auth, Prisma/PostgreSQL, Vercel deployment - 6+ months development, ~15K lines of production code After significant development and positive user feedback, I\'m looking for the right home for this technology. I believe [Company] could integrate this to [specific benefit based on their product]. Would you be open to a 15-minute demo? Happy to share more details or technical documentation. Best, [Your Name]', size: 22, italics: true })]
      }),

      // ========== SUMMARY ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Target Summary')] }),
      new Table({
        columnWidths: [4680, 4680],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Category', bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'High Priority Targets', bold: true, size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Mental Health SaaS', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Woebot, Wysa, Headspace, Calm, Talkspace, BetterHelp, Lyra, Spring Health', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Corporate Wellness', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Wellhub, Virgin Pulse', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Coaching & Training', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'BetterUp, Torch, CoachHub, Noom', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Health-Tech Startups', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Ro, Hims & Hers', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Insurance & Healthcare', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Teladoc, Optum, Evernorth', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Marketplaces', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Acquire.com, Flippa, MicroAcquire', size: 22 })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Table 7: Target Summary by Category', size: 18, italics: true, color: colors.secondary })] }),
      
      new Paragraph({
        spacing: { before: 200 },
        children: [new TextRun({ text: 'Total Targets: 50+ | HIGH Priority: 20 | MEDIUM Priority: 18 | LOW Priority: 12+', bold: true, size: 24, color: colors.highlight })]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/home/z/my-project/download/Optimism_Engine_Acquisition_Targets.docx', buffer);
  console.log('Targets list created: /home/z/my-project/download/Optimism_Engine_Acquisition_Targets.docx');
});
