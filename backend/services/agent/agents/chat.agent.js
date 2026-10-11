import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../config/llmModels.js"
import { getMemory } from "../config/memory.js"
import { deductCredits } from "../utils/deductCredits.js"
import { checkAgentLimit } from "../config/agentLimit.js"

export const chatAgent = async (state) => {

   

    try {

        await checkAgentLimit(state.userId,"chat")

         const llm = await getModel("chat")

    const history = await getMemory(state.conversationId)

    let formattedSearch = ""
    if (state.searchResults) {
        if (Array.isArray(state.searchResults?.results)) {
            formattedSearch = state.searchResults.results.map(r => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`).slice(0, 3).join("\n\n")
        } else if (typeof state.searchResults === "string") {
            formattedSearch = state.searchResults
        } else {
            formattedSearch = JSON.stringify(state.searchResults)
        }
    }

    const searchContext = formattedSearch ? `
   Web Search Results:

${formattedSearch}

Answer the user using only the above search results.
` : ""


    const systemPrompt = `
    You are Nexora AI, an intelligent AI assistant.

 
    ${searchContext}

    If searchContext exists:

- Use search results to answer.
- Do not mention internal tools.
- At the very end of your response, ALWAYS add a section providing clickable markdown links to the sources/Wikipedia pages from the search results, formatted exactly like this:

---
### 🌐 Want to know more?
If you want to know more about this, please visit:
- [Source Title](URL)


    Rules:

- For simple questions, greetings, and short queries, respond naturally in plain text.
- For technical, educational, coding, or detailed topics, use clean Markdown.


 Formatting:

- Use # for titles and ## for sections.
- Leave a blank line after headings.
- Use bullet points for lists.
- Use numbered lists for steps.
- Use fenced code blocks with language tags for code.
- Keep paragraphs short and readable.
- Never write headings and content on the same line.
- Never generate large walls of text.
`
    const messages = [
        new SystemMessage(systemPrompt)
    ]

    const recentHistory = history.slice(-10)
    recentHistory.forEach(msg => {
        if (msg.role == "user") {
            messages.push(new HumanMessage(msg.content))
        }
        if (msg.role == "assistant") {
            messages.push(new AIMessage(msg.content))
        }
    });

    messages.push(new HumanMessage(state.prompt))





    const response = await llm.invoke(messages)
      await deductCredits(state.userId,"chat")
   
    return {
        ...state,
        aiResponse: response.content,
        
    }
    } catch (error) {
        console.log(error)
         return {
            ...state,
            aiResponse:error?.message || error?.data?.message || "failed to generate chat"
        }
        
    
    }
   
}