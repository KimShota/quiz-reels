import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Body = { file_id: string; job_id?: string };

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

console.log("🚀 Deployed generate-mcqs function is running with Gemini 2.5 Flash-Lite");

const headers = {
  "Content-Type": "application/json",
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
};

/**
 * Utility: guess MIME type if missing
 */
function guessMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    default: return "application/octet-stream";
  }
}

/**
 * Call Gemini with retry logic for temporary failures.
 */
async function callGeminiWithFile(fileUrl: string, mimeType: string, prompt: string, maxRetries = 3) {
  // Fetch file data
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileUrl}`);
  const fileData = new Uint8Array(await fileRes.arrayBuffer());
  
  // Check file size (Gemini has a 20MB limit)
  const fileSizeMB = fileData.length / (1024 * 1024);
  if (fileSizeMB > 20) {
    throw new Error(`File too large: ${fileSizeMB.toFixed(1)}MB. Maximum size is 20MB. Please compress the image.`);
  }

  // Convert Uint8Array to base64 safely for large files
  let binaryStr = '';
  for (let i = 0; i < fileData.length; i += 8192) {
    const chunk = fileData.slice(i, i + 8192);
    binaryStr += String.fromCharCode(...chunk);
  }
  const base64Data = btoa(binaryStr); 

  // Build request
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
  };

  // Retry logic for temporary failures
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=" +
          GEMINI_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        const errorData = JSON.parse(errorText);
        
        // Check if it's a temporary error (5xx) and we have retries left
        if (res.status >= 500 && attempt < maxRetries) {
          console.log(`Attempt ${attempt} failed with ${res.status}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
          continue;
        }
        
        throw new Error(`Gemini API failed: ${errorText}`);
      }

      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
    }
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "This method is not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    const { file_id, job_id }: Body = await req.json();
    if (!file_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "file_id is missing" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure job exists
    let jobId = job_id;
    if (!jobId) {
      const jobRes = await fetch(`${supabaseUrl}/rest/v1/jobs`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ file_id, status: "queued" }),
      });

      if (!jobRes.ok) {
        const text = await jobRes.text();
        return new Response(
          JSON.stringify({ ok: false, error: text || "Failed to create the job" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = await jobRes.json().catch(() => []);
      if (!data || !data.length) {
        return new Response(
          JSON.stringify({ ok: false, error: "No job created" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      jobId = data[0].id;
    }

    // Mark job as processing
    await fetch(`${supabaseUrl}/rest/v1/jobs?id=eq.${jobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "processing" }),
    });

    // Get file metadata
    const fileRes = await fetch(`${supabaseUrl}/rest/v1/files?id=eq.${file_id}`, { headers });
    const files = await fileRes.json();
    if (!files.length) throw new Error("File not found");
    const fileRow = files[0];
    const fileUrl = fileRow.public_url;
    const mimeType = fileRow.mime_type || guessMimeType(fileRow.storage_path); // 👈 fallback added

    // Prompt for MCQ generation
    const prompt = `
You are an expert MCQ generator. Create 30 high-quality multiple-choice questions based EXCLUSIVELY on the content provided in the study material.

CRITICAL REQUIREMENTS:
1. Questions MUST test understanding of the actual content, concepts, facts, and processes described in the material
2. AVOID questions about document structure, navigation, or "where to find information"
3. FOCUS on testing knowledge of the subject matter itself
4. Each question must have exactly 4 options
5. Include "answer_index" (0-based index) for the correct answer
6. Respond ONLY with a valid JSON array - no markdown, no code blocks, no additional text

QUESTION TYPES TO INCLUDE:
- Factual knowledge questions (definitions, key facts, numbers, measurements)
- Conceptual understanding questions (processes, relationships, cause and effect)
- Application questions (using information to solve problems or make predictions)
- Analysis questions (comparing, contrasting, identifying patterns)

QUESTION TYPES TO AVOID:
- Questions about document layout or structure
- Questions asking "where to find information"
- Questions about study tips or learning strategies
- Questions not directly covered in the provided material

GOOD EXAMPLE:
{ "question": "What is the resolving power of a light microscope?", "options": ["0.2 nm", "200 nm", "2 μm", "0.2 μm"], "answer_index": 1 }

BAD EXAMPLE:
{ "question": "Where can you find information about cell division?", "options": ["Chapter B2", "Study tips", "Maths skills", "Synoptic links"], "answer_index": 0 }

Generate questions that directly test the user's comprehension of the subject matter presented in the material.
`;

    // Call Gemini
    const geminiRaw = await callGeminiWithFile(fileUrl, mimeType, prompt);

    // Parse MCQs - handle both JSON and markdown formats
    let mcqs: any[] = [];
    try {
      // First try to parse as direct JSON
      mcqs = JSON.parse(geminiRaw);
    } catch {
      try {
        // If that fails, try to extract JSON from markdown format
        const jsonMatch = geminiRaw.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          mcqs = JSON.parse(jsonMatch[1].trim());
        } else {
          // Try to find JSON array pattern without markdown
          const arrayMatch = geminiRaw.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (arrayMatch && arrayMatch[0]) {
            mcqs = JSON.parse(arrayMatch[0]);
          } else {
            throw new Error("Could not extract JSON from response");
          }
        }
      } catch (parseError) {
        throw new Error("Gemini did not return valid JSON. Raw response: " + geminiRaw);
      }
    }

    if (!Array.isArray(mcqs)) {
      throw new Error("Gemini response is not an array: " + geminiRaw);
    }

    // Insert MCQs into DB
    for (const q of mcqs) {
      await fetch(`${supabaseUrl}/rest/v1/mcqs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          file_id,
          question: q.question,
          options: q.options,
          answer_index: q.answer_index,
        }),
      });
    }

    // Mark job as done
    await fetch(`${supabaseUrl}/rest/v1/jobs?id=eq.${jobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "done" }),
    });

    return new Response(
      JSON.stringify({ ok: true, job_id: jobId }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
