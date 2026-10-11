import { TavilySearch } from "@langchain/tavily";

export const searchTool = new TavilySearch({
  maxResults: 10,
  topic: "general",
  includeImages:true
});