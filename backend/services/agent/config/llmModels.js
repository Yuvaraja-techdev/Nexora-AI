import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatOpenRouter } from "@langchain/openrouter";
const groq=new ChatGroq({
    model:"openai/gpt-oss-20b"
})

const gemini=new ChatGoogleGenerativeAI({
    model:"gemini-3.6-flash"
})

const openrouter=new ChatOpenRouter({
    model:"deepseek/deepseek-chat",
    temperature:0,
    maxTokens:8000
})


export const getModel=async (agent)=>{
    switch (agent) {
        case "chat":
            return openrouter;
        case "search" :    
           return openrouter;
        case "coding": 
           return openrouter; 
        case "imageAnalyzer": 
           return gemini;   
    
        default:
            return openrouter;
    }
}

