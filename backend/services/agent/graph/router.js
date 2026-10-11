import { getModel } from "../config/llmModels.js"
import { agent } from "../controllers/agent.controller.js"

export const router = async (state) => {

  const lowerPrompt = (state.prompt || "").toLowerCase();
  
  if (state.agent && state.agent !== "auto" && state.agent !== "chat") {
    return {
      ...state,
      agent: state.agent
    }
  }

  if (lowerPrompt.includes("pdf") && (lowerPrompt.includes("generate") || lowerPrompt.includes("create") || lowerPrompt.includes("make"))) {
    return { ...state, agent: "pdf" };
  }

  if ((lowerPrompt.includes("ppt") || lowerPrompt.includes("powerpoint") || lowerPrompt.includes("presentation")) && (lowerPrompt.includes("generate") || lowerPrompt.includes("create") || lowerPrompt.includes("make"))) {
    return { ...state, agent: "ppt" };
  }

  if(state.file){
if(state.file.mimetype==="application/pdf"){
    return {
      ...state,
      agent:"pdfRag"
    }
  }

    if(state.file.mimetype.startsWith("image/")){
    return {
      ...state,
      agent:"imageAnalyzer"
    }
  }
  }

  


  const llm = await getModel("router")
  const prompt = `You are an agent router.

Available agents:

- chat
- search
- coding
- pdf
- ppt
- vision 

Rules:

chat:
ONLY for simple conversational greetings (e.g. hi, hello, hey, how are you, who are you), small talk, or personal assistant greetings.

search:
ANY query about real-world topics, places, cities, towns, temples, landmarks, history, culture, tourist spots, famous people, news, facts, products, or information lookups (e.g. bhimavaram, rajahmundry, palnadu, vadapalli temple, etc.).

coding:
Generate code,
debug code,
build projects,
architecture,
API design.

pdf:
Questions about generate PDFs
or document context.

ppt:
Questions about generate ppts
or ppt context.

vision:
  Generate image,
  create image

Return ONLY one word:

chat
search
coding
pdf
ppt
vision

User Query:
 ${state.prompt}
`

  const response = await llm.invoke(prompt)

  return {
    ...state,
    agent: response.content
      .trim()
      .toLowerCase()
  }



}