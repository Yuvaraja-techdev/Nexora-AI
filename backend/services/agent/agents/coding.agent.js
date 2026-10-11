import { checkAgentLimit } from "../config/agentLimit.js"
import { getModel } from "../config/llmModels.js"
import { deductCredits } from "../utils/deductCredits.js"

export const codingAgent=async (state) => {
try {
   await checkAgentLimit(state.userId,"coding")
   const intentLlm=await getModel("intent")
   const llm=await getModel("coding")
   const intentRes=await intentLlm.invoke(`
    You are an intent classifier.

Return ONLY one of these values.

CODE_GENERATION
CODE_REVIEW
CODE_EXPLANATION
DEBUGGING
OPTIMIZATION
CONVERSION
DOCUMENTATION

User Request:
${state.prompt}
    `)
    const intent=intentRes.content
    if(intent=="CODE_GENERATION"){
        const prompt=`
        You are Nexora AI Coding Agent.

Generate the requested project.

Default stack:
- HTML
- CSS
- JavaScript

Use React / Next.js / Vue ONLY if explicitly requested.

Rules:

- Responsive
- Modern UI
- CSS Variables
- Flexbox/Grid
- Smooth Scroll
- Hover Effects
- Beautiful spacing
- Single page unless user asks otherwise.

GAME & MULTI-PLAYER LOGIC RULES
=========================
- Ensure all game state, turn cycling, event handlers, and UI updates are 100% functional and bug-free.
- TURN ADVANCEMENT ORDER (CRITICAL):
  When a player completes their move:
  1. Record the move for current player (e.g. board[i] = currentPlayer).
  2. Check for win or draw conditions.
  3. ADVANCE TURN IMMEDIATELY: currentPlayer = (currentPlayer % totalPlayers) + 1 (Cycles 1 -> 2 -> 3 -> 1 -> 2...)
  4. UPDATE UI STATUS AFTER TURNING: Set turn text to "Player X's Turn" so it immediately shows the NEXT player's turn (e.g. after Player 3 moves, UI MUST display "Player 1's Turn").
- Ensure winning conditions, draw states, and reset buttons work smoothly.

IMAGES
=========================

Always use real Unsplash images.

Never use placeholders.

Return ONLY valid JSON.

Schema:

{
  "files":[
    {
      "name":"index.html",
      "content":"..."
    },
    {
      "name":"style.css",
      "content":"..."
    },
    {
      "name":"script.js",
      "content":"..."
    }
  ]
}

Rules:

- Output must start with {
- Output must end with }
- No markdown
- No explanation
- No extra text
- No markdown code blocks
- Never mention intent

User Request:
${state.prompt}
        ` 
        const res=await llm.invoke(prompt)
        console.log(res)
        
        let contentStr = typeof res.content === "string" ? res.content.trim() : String(res.content).trim();
        if (contentStr.startsWith("```")) {
            contentStr = contentStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        }
        const firstBrace = contentStr.indexOf("{");
        const lastBrace = contentStr.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
            contentStr = contentStr.slice(firstBrace, lastBrace + 1);
        }
        
        const data=JSON.parse(contentStr)
        await deductCredits(state.userId,"coding")
        
        return {
            ...state,
            aiResponse:"Code Generated Successfully.",
            artifacts:[
                {
                    id:Date.now(),
                    type:"Project",
                    files:data.files || [],
                    title:state.prompt
                }
            ]
        }
    }

    const res=await llm.invoke(`
        The user's request is:

${intent}

Return Markdown only.

Never generate project files.

Use headings like:

# Overview

## Explanation

## Problems

## Improvements

## Best Practices

## Optimized Code (if needed)

User Request:

${state.prompt}
        `)

   const data=res.content   
   await deductCredits(state.userId,"coding")
   
   return {
    ...state,
    aiResponse:data,
    artifacts:[]
   }  
} catch (error) {
   console.log(error)
         return {
            ...state,
            aiResponse:error?.message || error?.data?.message || "failed to generate code",
            artifacts:[]
        }
}
  
}