import { checkAgentLimit } from "../config/agentLimit.js"
import { searchTool } from "../config/tavily.js"
import { deductCredits } from "../utils/deductCredits.js"
async function getFallbackImages(query) {
    try {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json&origin=*`;
        const res = await fetch(wikiUrl);
        const data = await res.json();
        const pages = data.query?.pages || {};
        const urls = Object.values(pages)
            .map(p => p.thumbnail?.source)
            .filter(Boolean)
            .map(u => u.split("?")[0]);
        return urls;
    } catch (e) {
        return [];
    }
}

export const searchAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "search")
        const results = await searchTool.invoke({
            query: state.prompt
        })
        await deductCredits(state.userId, "search")

        const rawImages = results?.images || []
        let cleanImages = rawImages
            .filter(img => typeof img === "string" && !img.includes("fbsbx.com") && !img.includes("fbcdn.net") && !img.includes("instagram.com"))
            .map(img => img.split("?")[0])

        if (cleanImages.length < 6) {
            const fallback = await getFallbackImages(state.prompt)
            cleanImages = Array.from(new Set([...cleanImages, ...fallback]))
        }

        return {
            ...state,
            searchResults: results,
            images: cleanImages.slice(0, 6)
        }
    } catch (error) {
        console.log(error)
        return {
            ...state,
            searchResults: [],
            images: [],
            aiResponse: error?.message || error?.data?.message || "failed to search"
        }
    }
}