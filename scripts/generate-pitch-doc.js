const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        AlignmentType, HeadingLevel, BorderStyle, WidthType, LevelFormat,
        Header, Footer, PageNumber, ShadingType, VerticalAlign,
        PageBreak } = require('docx');
const fs = require('fs');

// Colors - Midnight Code theme (tech/AI product)
const colors = {
  primary: '#020617',
  body: '#1E293B',
  secondary: '#64748B',
  accent: '#94A3B8',
  tableBg: '#F8FAFC',
  highlight: '#3B82F6'
};

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: colors.accent };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

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
      { reference: 'bullet-features',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'bullet-benefits',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'bullet-tech',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbered-steps',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'bullet-buyers',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'bullet-revenue',
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
        children: [new TextRun({ text: 'Optimism Engine - Pitch Deck & Listing', color: colors.secondary, size: 18 })]
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
        children: [new TextRun({ text: 'THE OPTIMISM ENGINE', size: 72, bold: true, color: colors.primary })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: 'AI-Powered Cognitive Behavioral Therapy Platform', size: 32, color: colors.secondary })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600 },
        children: [new TextRun({ text: 'Pitch Deck & Marketplace Listing', size: 24, color: colors.accent })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200 },
        children: [new TextRun({ text: 'Ready for Acquisition - $40,000 USD', size: 28, bold: true, color: colors.highlight })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: 'Production-Grade SaaS | Multi-Provider AI | Full Source Code Included', size: 20, color: colors.secondary })]
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ========== EXECUTIVE SUMMARY ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Executive Summary')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'The Optimism Engine is a production-ready, AI-powered mental health companion built on proven Cognitive Behavioral Therapy (CBT) principles. The platform combines sophisticated natural language processing with therapeutic frameworks to deliver personalized emotional support and cognitive restructuring tools. Designed for the growing mental wellness market, this application addresses a critical gap between traditional therapy accessibility and the immediate support needs of millions struggling with anxiety, negative thought patterns, and emotional regulation challenges.', size: 22 })]
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'What sets this platform apart is its dual-mode architecture: Reflect Mode offers deep, conversation-based cognitive restructuring with progressive emotional layer analysis, while Assist Mode provides immediate, practical guidance for professionals supporting others through difficult conversations. Both modes leverage a multi-provider AI infrastructure that ensures reliability and cost optimization across ten different AI providers including Anthropic Claude, OpenAI GPT, Mistral, DeepSeek, and Google Gemini.', size: 22 })]
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'The codebase represents over six months of intensive development, incorporating user feedback, iterative improvements, and enterprise-grade features like authentication, session persistence, grounding mode for crisis situations, and intelligent provider failover systems. This is not a prototype or MVP-it is a polished, market-ready product with professional UI/UX design, comprehensive error handling, and scalable architecture ready for immediate deployment.', size: 22 })]
      }),

      // ========== UNIQUE SELLING PROPOSITION ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Unique Selling Proposition')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'The mental health app market is saturated with meditation timers, mood trackers, and journaling applications. The Optimism Engine differentiates itself through active cognitive intervention rather than passive wellness tracking. While competitors offer tools to monitor emotional states, this platform actively engages users in the therapeutic process of identifying, challenging, and restructuring negative thought patterns-the core mechanism of CBT that has decades of clinical validation.', size: 22 })]
      }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Key Differentiators')] }),
      new Paragraph({
        numbering: { reference: 'bullet-features', level: 0 },
        children: [new TextRun({ text: 'Progressive Layer Analysis: The AI doesn\'t just respond-it progressively guides users through surface thoughts to deeper emotional wounds using a sophisticated SURFACE → TRANSITION → EMOTION → CORE_WOUND progression model that mirrors professional therapeutic techniques.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-features', level: 0 },
        children: [new TextRun({ text: 'Grounding Mode Detection: Built-in crisis awareness automatically detects when users are in acute distress and shifts to grounding techniques, breathing exercises, and stabilization support without triggering deeper cognitive work that could be overwhelming.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-features', level: 0 },
        children: [new TextRun({ text: 'Multi-Provider AI Architecture: Unlike single-provider apps, this platform maintains fallback chains across 10 AI providers, ensuring uptime reliability and cost optimization. Buyers can configure their preferred provider priority based on cost, quality, and regional availability.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-features', level: 0 },
        children: [new TextRun({ text: 'Dual-Mode Platform: Reflect Mode serves individual users seeking personal growth, while Assist Mode targets professionals (therapists, coaches, managers, mediators) who need real-time guidance for supporting others through difficult conversations.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-features', level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Enterprise-Ready Infrastructure: Complete with Clerk authentication, Prisma database integration, session persistence, and Vercel deployment optimization-this is production infrastructure, not a development prototype.', size: 22 })]
      }),

      // ========== PRODUCT FEATURES ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Product Features Deep Dive')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Reflect Mode - Personal Cognitive Restructuring')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Reflect Mode is the flagship feature-a conversational AI companion that guides users through the CBT process of identifying and restructuring negative thought patterns. Unlike chatbots that provide generic advice, Reflect Mode conducts a sophisticated therapeutic dialogue that adapts to the user\'s emotional depth and readiness for change.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-benefits', level: 0 },
        children: [new TextRun({ text: 'Five-Layer Response Architecture: Every AI response is structured across five therapeutic layers-acknowledgment (validating the user\'s experience), thought pattern identification (labeling cognitive distortions), pattern note (connecting to broader themes), reframe (offering alternative perspectives), and forward-moving question (guiding continued exploration).', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-benefits', level: 0 },
        children: [new TextRun({ text: 'Cognitive Distortion Detection: The AI identifies common thinking errors including all-or-nothing thinking, catastrophizing, mind reading, emotional reasoning, should statements, personalization, mental filtering, overgeneralization, and discounting positives.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-benefits', level: 0 },
        children: [new TextRun({ text: 'Conversation Memory: Sessions maintain context across messages, allowing the AI to build on previous insights and avoid repetitive questioning-creating a coherent therapeutic narrative.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-benefits', level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Message Editing: Users can edit their messages and regenerate responses, supporting the iterative nature of therapeutic journaling and self-reflection.', size: 22 })]
      }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Assist Mode - Professional Support Tool')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Assist Mode transforms the platform into a real-time advisor for professionals who support others-therapists, coaches, HR professionals, managers, mediators, and crisis counselors. Users paste messages they\'ve received and receive instant analysis with actionable guidance.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-benefits', level: 0 },
        children: [new TextRun({ text: 'Behavioral Guidance: Clear "Do/Don\'t" recommendations that translate emotional intelligence principles into concrete actions.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-benefits', level: 0 },
        children: [new TextRun({ text: 'Reply Drafts: Pre-written response options that professionals can adapt, saving time while maintaining empathetic, appropriate tone.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-benefits', level: 0 },
        children: [new TextRun({ text: 'Risk Assessment: Automatic evaluation of emotional intensity and potential crisis indicators, with appropriate guidance for escalation.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-benefits', level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Pattern Analysis: Identification of communication patterns, emotional undertones, and situational context to inform professional judgment.', size: 22 })]
      }),

      // ========== TARGET MARKET ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Target Market & Buyer Personas')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'The mental wellness technology market is experiencing explosive growth, valued at $6.1 billion in 2023 and projected to reach $17.2 billion by 2030 (CAGR 15.9%). The Optimism Engine addresses multiple market segments, creating diverse acquisition opportunities for the right buyer.', size: 22 })]
      }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Primary Buyer Personas')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('1. Mental Health SaaS Companies')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Established mental health platforms (BetterHelp competitors, employee wellness programs, therapy practice management tools) looking to expand their feature set with AI-powered cognitive tools. The Optimism Engine provides immediate product expansion without the 6+ months of development required to build comparable functionality. Integration-ready architecture means these buyers can white-label or incorporate the platform within weeks.', size: 22 })]
      }),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('2. Health-Tech Entrepreneurs & Startups')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Founders entering the digital health space who need a market-ready product to accelerate their go-to-market strategy. Rather than building from scratch, they acquire a polished foundation with proven architecture, allowing them to focus on distribution, partnerships, and market positioning rather than product development.', size: 22 })]
      }),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('3. Coaching & Training Organizations')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Executive coaching firms, leadership development programs, and professional training organizations seeking to offer AI-enhanced tools to their clients. The Assist Mode specifically addresses the needs of professionals who support others, making it a natural fit for B2B coaching and consulting markets.', size: 22 })]
      }),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('4. Healthcare Systems & Insurance Providers')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Organizations looking to offer preventive mental health tools to their populations. The platform\'s CBT foundation aligns with evidence-based treatment protocols, making it suitable for integration into employee assistance programs (EAPs) and digital therapeutic offerings.', size: 22 })]
      }),

      // ========== TECHNOLOGY ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Technology Stack & Architecture')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'The Optimism Engine is built on modern, production-grade technologies selected for reliability, scalability, and developer experience. Every component was chosen with enterprise deployment in mind.', size: 22 })]
      }),
      
      // Tech Stack Table
      new Table({
        columnWidths: [2800, 6560],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: colors.tableBg, type: ShadingType.CLEAR },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Component', bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: colors.tableBg, type: ShadingType.CLEAR },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Technology & Purpose', bold: true, size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Framework', bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Next.js 15 with App Router - Server-side rendering, API routes, optimal SEO', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Language', bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'TypeScript - Type safety, improved maintainability, better IDE support', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Authentication', bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Clerk - Enterprise auth with social logins, session management, user profiles', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Database', bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Prisma ORM with PostgreSQL - Type-safe queries, migrations, scalable data layer', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'UI Components', bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'shadcn/ui + Tailwind CSS - Accessible, customizable, modern design system', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Animations', bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Framer Motion - Smooth, professional micro-interactions and transitions', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'AI Providers', bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Multi-provider support: Anthropic, OpenAI, Mistral, DeepSeek, Google Gemini, Groq, Together AI, OpenRouter, Z.AI SDK', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Deployment', bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Vercel-optimized with edge functions, automatic scaling, global CDN', size: 22 })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Table 1: Technology Stack Overview', size: 18, italics: true, color: colors.secondary })] }),

      // ========== AI INFRASTRUCTURE ==========
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Multi-Provider AI Infrastructure')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'The AI infrastructure is designed for reliability, cost optimization, and flexibility. Rather than depending on a single AI provider, the platform implements a sophisticated fallback chain that automatically routes requests based on availability, cost, and configured preferences.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-tech', level: 0 },
        children: [new TextRun({ text: 'Automatic Failover: If the primary provider is unavailable or rate-limited, the system automatically falls back to the next provider in the priority chain-ensuring uninterrupted service.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-tech', level: 0 },
        children: [new TextRun({ text: 'Cost Optimization: Configure provider priority based on your cost targets. Use less expensive providers for routine queries and premium models for complex therapeutic interventions.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-tech', level: 0 },
        children: [new TextRun({ text: 'No Vendor Lock-in: The architecture abstracts AI provider differences, making it easy to add new providers or switch priorities as the market evolves.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-tech', level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Transparent Provider Logging: Debug tools show which AI provider handled each request, enabling performance monitoring and cost tracking.', size: 22 })]
      }),

      // ========== REVENUE MODEL ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Revenue Model & Monetization')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'The Optimism Engine is designed with multiple monetization pathways. The acquiring company can choose the model that best fits their existing business or market strategy.', size: 22 })]
      }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Recommended Pricing Strategies')] }),
      new Paragraph({
        numbering: { reference: 'bullet-revenue', level: 0 },
        children: [new TextRun({ text: 'Freemium B2C Model: Free tier with limited daily sessions, premium subscription ($9.99/month) for unlimited access, conversation history, and advanced features. This model targets the direct consumer market and works well with app store distribution.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-revenue', level: 0 },
        children: [new TextRun({ text: 'B2B Licensing: Enterprise licensing to therapy practices, coaching organizations, and corporate wellness programs. Pricing typically ranges from $299-$999/month per organization based on user count and feature access. Includes white-label options and custom branding.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-revenue', level: 0 },
        children: [new TextRun({ text: 'API-as-a-Service: Offer the cognitive analysis engine as an API for other mental health applications. Developers pay per API call for access to the CBT analysis and response generation. Creates a developer ecosystem around the platform.', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-revenue', level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Hybrid Model: Combine B2C freemium with B2B licensing. Use consumer traction to demonstrate market validation, then upsell enterprise features to organizations whose employees are already using the platform.', size: 22 })]
      }),

      // ========== MARKETPLACE LISTING ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Marketplace Listing Copy')] }),
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: 'The following content is optimized for startup acquisition marketplaces like Acquire.com, Flippa, and IndieHackers.', size: 22, italics: true })]
      }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Listing Title')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'AI-Powered CBT Mental Health Platform - Production-Ready SaaS with Multi-Provider AI Infrastructure', bold: true, size: 24 })]
      }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Listing Description')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'The Optimism Engine is a fully developed, production-ready AI mental health platform built on Cognitive Behavioral Therapy (CBT) principles. After 6+ months of intensive development and iteration, this polished SaaS product is ready for immediate market deployment.', size: 22 })]
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'The platform features two complementary modes: Reflect Mode guides users through cognitive restructuring conversations with progressive emotional analysis, while Assist Mode provides real-time guidance for professionals supporting others through difficult conversations. Built-in crisis detection (Grounding Mode) automatically adjusts responses for users in acute distress.', size: 22 })]
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Technical highlights include multi-provider AI support (10 providers including Anthropic, OpenAI, Mistral, DeepSeek, Gemini), automatic failover chains, Clerk authentication, Prisma/PostgreSQL data layer, and Vercel-optimized deployment. The codebase is well-documented, type-safe (TypeScript), and follows modern Next.js 15 App Router conventions.', size: 22 })]
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'This is NOT a prototype or MVP. It\'s a complete product with professional UI/UX, comprehensive error handling, session persistence, and enterprise-grade infrastructure. Perfect for mental health SaaS companies looking to expand their feature set, health-tech entrepreneurs entering the $17B mental wellness market, or coaching organizations seeking AI-enhanced tools.', size: 22 })]
      }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Key Metrics')] }),
      
      // Metrics Table
      new Table({
        columnWidths: [4680, 4680],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: colors.tableBg, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Metric', bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: colors.tableBg, type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Value', bold: true, size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Development Time', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: '6+ months full-time development', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Codebase Size', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: '~15,000+ lines of production code', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'AI Providers Supported', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: '10 (Anthropic, OpenAI, Mistral, DeepSeek, Gemini, etc.)', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Deployment Status', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Production-ready, Vercel optimized', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Documentation', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Well-documented codebase with clear architecture', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Asking Price', bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: '$40,000 USD', bold: true, size: 22 })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Table 2: Key Product Metrics', size: 18, italics: true, color: colors.secondary })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('What\'s Included in the Sale')] }),
      new Paragraph({
        numbering: { reference: 'bullet-buyers', level: 0 },
        children: [new TextRun({ text: 'Complete source code repository with full git history', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-buyers', level: 0 },
        children: [new TextRun({ text: 'All AI provider integrations and configuration templates', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-buyers', level: 0 },
        children: [new TextRun({ text: 'Production database schema and migration files', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-buyers', level: 0 },
        children: [new TextRun({ text: 'Vercel deployment configuration and environment setup', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-buyers', level: 0 },
        children: [new TextRun({ text: 'Domain transfer (if applicable)', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-buyers', level: 0 },
        children: [new TextRun({ text: 'Technical documentation and architecture overview', size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: 'bullet-buyers', level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: '2 weeks of post-sale technical support for smooth handoff', size: 22 })]
      }),

      // ========== COMPETITIVE ANALYSIS ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Competitive Landscape')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Understanding the competitive landscape is essential for positioning. The mental health app market includes several categories of competitors, each with distinct limitations that the Optimism Engine addresses.', size: 22 })]
      }),
      
      // Competition Table
      new Table({
        columnWidths: [2340, 3510, 3510],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Competitor Type', bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Examples', bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, shading: { fill: colors.tableBg, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Optimism Engine Advantage', bold: true, size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Meditation Apps', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Calm, Headspace, Insight Timer', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Active intervention vs. passive relaxation; CBT has stronger clinical evidence for anxiety/depression', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Mood Trackers', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Daylio, Moodpath, How We Feel', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Guided change vs. passive monitoring; users get actionable cognitive tools, not just data', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'AI Chatbots', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Woebot, Wysa, Replika', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Deeper CBT focus; progressive layer analysis; grounding mode for crisis; dual-mode platform', size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Therapy Platforms', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'BetterHelp, Talkspace', size: 22 })] })] }),
              new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Lower cost; immediate availability; no scheduling; complements (not replaces) human therapy', size: 22 })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Table 3: Competitive Positioning Analysis', size: 18, italics: true, color: colors.secondary })] }),

      // ========== CONTACT ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Next Steps')] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Interested buyers are invited to schedule a demo session to experience the platform firsthand. Technical due diligence materials, including architecture documentation and code samples, are available upon request after signing a standard NDA.', size: 22 })]
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'The seller is committed to a smooth transition and will provide comprehensive handoff support including deployment guidance, AI provider configuration assistance, and feature walkthrough sessions.', size: 22 })]
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: 'Serious inquiries only. Ready for immediate transfer upon agreement.', bold: true, size: 24 })]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/home/z/my-project/download/Optimism_Engine_Pitch_and_Listing.docx', buffer);
  console.log('Document created: /home/z/my-project/download/Optimism_Engine_Pitch_and_Listing.docx');
});
