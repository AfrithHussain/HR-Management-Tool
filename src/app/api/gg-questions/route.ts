import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import PDFParser from "pdf2json";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- Helpers ---
async function withRetry(fn: () => Promise<any>, retries = 3, delay = 1000): Promise<any> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0 && (err?.status === 503 || err?.message?.includes("503"))) {
      await new Promise((r) => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const originalWarn = console.warn;
    console.warn = () => {}; 
    const pdfParser = new PDFParser(null, 1 as any);
    pdfParser.on("pdfParser_dataError", (errData: any) => {
      console.warn = originalWarn;
      reject(new Error(errData.parserError));
    });
    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      console.warn = originalWarn;
      const textContent = pdfParser.getRawTextContent();
      resolve(textContent);
    });
    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const role = formData.get("role") as string;
    const moduleName = formData.get("moduleName") as string;
    const customInstructions = formData.get("customInstructions") as string | null;
    const files = formData.getAll("documents") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Process each file separately to maintain context
    const fileContents: { name: string; content: string }[] = [];

    for (const file of files) {
      let fileContent = "";
      try {
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          fileContent = await parsePdfBuffer(buffer);
        } else {
          fileContent = await file.text();
        }
        fileContent = fileContent.replace(/\n\s*\n/g, '\n');
        
        // Truncate individual file if too large
        if (fileContent.length > 50000) {
          fileContent = fileContent.slice(0, 50000) + "\n...(truncated)...";
        }
        
        fileContents.push({ name: file.name, content: fileContent });
      } catch (err) {
        console.error(`Error parsing file ${file.name}:`, err);
        fileContents.push({ name: file.name, content: "(Error reading content)" });
      }
    }

    // Parse custom instructions to determine questions per file
    let questionsPerFileMap: { [key: string]: number } = {};
    let totalQuestionsRequested = 10; // default
    let hasCustomDistribution = false;
    
    if (customInstructions && customInstructions.trim()) {
      console.log("=== PARSING CUSTOM INSTRUCTIONS ===");
      console.log("Instructions:", customInstructions);
      console.log("Available files:", fileContents.map(f => f.name));
      
      const instructionLower = customInstructions.toLowerCase();
      
      // Try multiple parsing strategies
      fileContents.forEach((file) => {
        const fileName = file.name;
        const fileNameLower = fileName.toLowerCase();
        const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
        const fileNameWithoutExtLower = fileNameWithoutExt.toLowerCase();
        
        // Strategy 1: Look for "X questions from filename" or "X from filename"
        const pattern1 = new RegExp(`(\\d+)\\s*(?:questions?|qu)?\\s*(?:from|for)?\\s*(?:the)?\\s*${fileNameWithoutExtLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        const match1 = instructionLower.match(pattern1);
        
        // Strategy 2: Look for "filename: X" or "filename X"
        const pattern2 = new RegExp(`${fileNameWithoutExtLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*(\\d+)`, 'i');
        const match2 = instructionLower.match(pattern2);
        
        if (match1) {
          questionsPerFileMap[fileName] = parseInt(match1[1]);
          console.log(`✓ Matched "${fileName}" with ${match1[1]} questions (pattern 1)`);
          hasCustomDistribution = true;
        } else if (match2) {
          questionsPerFileMap[fileName] = parseInt(match2[1]);
          console.log(`✓ Matched "${fileName}" with ${match2[1]} questions (pattern 2)`);
          hasCustomDistribution = true;
        }
      });
      
      // If we still haven't found matches, try a simpler approach
      // Look for patterns like "2 from this and 2 from this"
      if (!hasCustomDistribution) {
        const numberMatches = instructionLower.match(/(\d+)/g);
        if (numberMatches && numberMatches.length >= fileContents.length) {
          console.log("Using sequential number matching");
          fileContents.forEach((file, idx) => {
            if (idx < numberMatches.length) {
              questionsPerFileMap[file.name] = parseInt(numberMatches[idx]);
              console.log(`✓ Assigned ${numberMatches[idx]} questions to "${file.name}" (position ${idx + 1})`);
              hasCustomDistribution = true;
            }
          });
        }
      }
      
      // Calculate total if custom distribution found
      if (hasCustomDistribution) {
        const customTotal = Object.values(questionsPerFileMap).reduce((sum, count) => sum + count, 0);
        if (customTotal > 0) {
          totalQuestionsRequested = customTotal;
          console.log(`✅ Custom distribution detected! Total questions: ${customTotal}`);
        }
      } else {
        console.log("⚠ No custom distribution detected, falling back to proportional");
      }
      
      console.log("Final distribution:", questionsPerFileMap);
      console.log("=================================");
    }
    
    // If no custom distribution, use proportional distribution
    if (!hasCustomDistribution) {
      console.log("Using default proportional distribution");
      const questionsPerFile = Math.floor(totalQuestionsRequested / fileContents.length);
      const remainderQuestions = totalQuestionsRequested % fileContents.length;
      
      fileContents.forEach((file, idx) => {
        questionsPerFileMap[file.name] = questionsPerFile + (idx < remainderQuestions ? 1 : 0);
      });
      console.log("Proportional distribution:", questionsPerFileMap);
    }

    const allQuestions: any[] = [];

    // Generate questions for each file separately
    for (let i = 0; i < fileContents.length; i++) {
      const fileData = fileContents[i];
      const questionsForThisFile = questionsPerFileMap[fileData.name] || 0;
      
      if (questionsForThisFile === 0) continue; // Skip if no questions requested for this file

      // Build custom instructions section if provided
      const customInstructionsSection = customInstructions 
        ? `\n\n**SPECIAL INSTRUCTIONS FROM ADMIN:**\n${customInstructions}\n\nIMPORTANT: Follow these instructions carefully. They override the default settings.\nYou MUST generate EXACTLY ${questionsForThisFile} questions from this specific document.`
        : '';

      const PROMPT = `
        You are an expert technical interviewer for the role: "${role}".
        
        The current learning module is: **"${moduleName}"**.
        
        This is document ${i + 1} of ${fileContents.length}: **"${fileData.name}"**
        ${customInstructionsSection}
        
        Generate EXACTLY **${questionsForThisFile} high-quality multiple-choice questions** based STRICTLY on THIS document's content.
        
        CRITERIA:
        1. **Relevance:** Questions must relate to the module topic: "${moduleName}".
        2. **Source:** Questions must come ONLY from the content in "${fileData.name}".
        3. **Difficulty Mix:** ${customInstructions ? 'Follow the admin instructions for difficulty distribution if specified.' : 'Mix of Easy, Medium, and Hard questions.'}
        4. **Types:** Mix single-select and multi-select questions.
        5. **CRITICAL:** You MUST return EXACTLY ${questionsForThisFile} questions. No more, no less.
        
        OUTPUT FORMAT:
        Return ONLY a raw JSON array with EXACTLY ${questionsForThisFile} questions.
        
        Schema per object:
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswers": [number],
          "isMultiSelect": boolean,
          "difficulty": "Easy" | "Medium" | "Hard",
          "role": "${role}"
        }

        DOCUMENT CONTENT (${fileData.name}):
        ${fileData.content}
      `;

      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await withRetry(() => model.generateContent(PROMPT));
        const response = await result.response;
        const text = response.text();
        const cleanJson = text.replace(/```json|```/g, '').trim();
        
        let questions = JSON.parse(cleanJson);
        
        // CRITICAL: Enforce the exact number of questions
        if (Array.isArray(questions)) {
          if (questions.length > questionsForThisFile) {
            console.log(`⚠ AI generated ${questions.length} questions, trimming to ${questionsForThisFile}`);
            questions = questions.slice(0, questionsForThisFile);
          } else if (questions.length < questionsForThisFile) {
            console.log(`⚠ AI generated only ${questions.length} questions, expected ${questionsForThisFile}`);
          } else {
            console.log(`✓ AI generated exactly ${questionsForThisFile} questions for ${fileData.name}`);
          }
        }
        
        // Add source file info to each question
        const questionsWithSource = questions.map((q: any) => ({
          ...q,
          sourceFile: fileData.name
        }));
        
        allQuestions.push(...questionsWithSource);
        console.log(`Added ${questionsWithSource.length} questions from ${fileData.name}. Total so far: ${allQuestions.length}`);
      } catch (err) {
        console.error(`Failed to generate questions for ${fileData.name}:`, err);
      }
    }

    console.log(`\n=== FINAL RESULT ===`);
    console.log(`Total questions generated: ${allQuestions.length}`);
    console.log(`Expected total: ${totalQuestionsRequested}`);
    console.log(`===================\n`);

    if (allQuestions.length === 0) {
      return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
    }

    return NextResponse.json({ questions: allQuestions });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}