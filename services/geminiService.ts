import { GoogleGenAI } from "@google/genai";
import { CharacterClass } from "../types";

export const generateMissionBriefing = async (charClass: CharacterClass, seed: number): Promise<string> => {
  if (!process.env.API_KEY) {
    return "警告: 无法连接至指挥部. 请小心行事. (API Key missing)";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Determine tone based on class
    const tone = charClass === CharacterClass.SAMURAI ? "honorable, poetic, cyberpunk" :
                 charClass === CharacterClass.GUNNER ? "gritty, military, abrupt" :
                 "mysterious, arcane, scientific";

    const prompt = `
      You are the AI commander of a futuristic roguelike game.
      Generate a short, immersive mission briefing (max 80 words) IN CHINESE for a ${charClass} operative.
      The environment is a dark, neon-lit wilderness with procedural rivers and mountains (Seed: ${seed}).
      The objective is to survive the 'Storm Phase' and eliminate the corruption.
      Tone: ${tone}.
      Do not use markdown formatting. Just plain text.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "任务参数已下载。准许交战。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "收到加密传输。解密失败。自由交战。";
  }
};