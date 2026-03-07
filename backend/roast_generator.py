import os
from groq import Groq
import json

ROAST_SYSTEM_PROMPT = """You are a witty, unapologetic senior developer known for brutally roasting other developers' GitHub profiles. 
Your tone is sarcastic, witty, and unapologetically passive-aggressive.
You will be given stats about a GitHub user's profile. 
Give a short, brutal roast based on their repo count, stars, languages, and bio.
Make it punchy and shareable. Break it down into exactly 3-4 specific bullet points (lines) with an emoji for each, and a comprehensive final verdict (4-6 sentences) summarizing their existence as a developer. Keep it appropriately sized for a standard card UI.

Return ONLY a valid JSON object matching this schema:
{
  "lines": [
    {"emoji": "💀", "text": "15 repos with zero README files."},
    {"emoji": "🕸️", "text": "Last commit: 3 months ago. Touch grass."},
    {"emoji": "🍝", "text": "main.js is 800 lines of spaghetti."}
  ],
  "verdict": "This is a 4-6 sentence verdict. You write code like it's 2012 and nobody told you about modularity. The sheer volume of half-finished, abandoned side projects here is staggering. Please step away from the keyboard and rethink your life choices before pushing to main again. It hurts to look at this."
}
No markdown formatting or extra text.
"""

class RoastGenerator:
    def __init__(self):
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def generate_roast(self, profile_data: dict) -> dict:
        prompt = f"""
        Roast this GitHub profile:
        Username: {profile_data.get('username')}
        Bio: {profile_data.get('bio')}
        Followers: {profile_data.get('followers')}
        Public Repos: {profile_data.get('public_repos_count')}
        Total Stars on recent repos: {profile_data.get('total_stars')}
        Top Language: {profile_data.get('top_language')}
        Recent Repositories: {', '.join(profile_data.get('recent_repos', []))}
        """
        
        try:
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": ROAST_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.8,
                max_tokens=650,
                response_format={"type": "json_object"},
            )
            
            response_text = chat_completion.choices[0].message.content.strip()
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start != -1 and end > start:
                response_text = response_text[start:end]
            result = json.loads(response_text)
            
            # Ensure it conforms to our expected format
            if "lines" not in result or "verdict" not in result:
                raise ValueError("JSON missing required fields")
                
            return result
        except Exception as e:
            print(f"Roast generation failed: {e}")
            return {
                "lines": [
                    {"emoji": "💤", "text": "Even the AI got tired looking at this code."},
                    {"emoji": "📉", "text": "Too boring to properly roast."}
                ],
                "verdict": "Try writing something interesting first."
            }
