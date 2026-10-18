"""
Child-Friendly Sinhala Dialogue Engine.
Supports:
1. SinLLaMA via Ollama (http://localhost:11434) or Hugging Face Inference API.
2. Google Gemini with few-shot child-pedagogy prompts.
3. Culturally grounded, warm fallback templates for Gaja the Elephant companion.
"""
import os
import re
import json
from typing import Any, Dict, Optional, Tuple
import httpx

from app.schemas.syllabus import GajaDialogue, StoryNarrative


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
SINLLAMA_MODEL = os.getenv("SINLLAMA_MODEL", "sinllama")
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HUGGINGFACE_SINLLAMA_URL = os.getenv(
    "HUGGINGFACE_SINLLAMA_URL",
    "https://api-inference.huggingface.co/models/Sinhala-NLP/sinllama"
)
DIALOGUE_PROVIDER = os.getenv("DIALOGUE_PROVIDER", "gemini").lower()


CHILD_FRIENDLY_SYSTEM_PROMPT = """
ඔබ ශ්‍රී ලංකාවේ ප්‍රාථමික පාසල් (ශ්‍රේණි 1-4) දරුවන් සඳහා සහ ADHD සහිත දරුවන් වෙනුවෙන් කටයුතු කරන ආදරණීය "ගජා" (Gaja) අලි පැටියාගේ හඬයි.
ඔබේ කතාබහ:
1. ඉතා ආදරණීය, සරල සහ මිත්‍රශීලී විය යුතුය ("ළමා බස / කතා බහ").
2. දැඩි විභාග ප්‍රශ්න ස්වරූපයෙන් බැහැර වන්න ("ගණනය කර නිවැරදි පිළිතුර තෝරන්න" වෙනුවට "යාළුවේ, අපි එකට එකතු කරමුද?").
3. කෙටි වාක්‍ය (වචන 4-8), දිරිගන්වන වදන් ("නියමයි!", "කමක් නෑ, නැවත බලමු!") භාවිතා කරන්න.
4. දරුවාට ක්ලමථයක් ඇති නොවන සේ සෙමින් සහ ප්‍රීතියෙන් ඉදිරිපත් කරන්න.
"""


class SinLLaMAProvider:
    """Connects to local Ollama or remote Hugging Face endpoint running SinLLaMA."""

    @classmethod
    async def is_ollama_available(cls) -> bool:
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    @classmethod
    async def generate_child_dialogue_ollama(cls, context_text: str) -> Optional[str]:
        try:
            prompt = f"{CHILD_FRIENDLY_SYSTEM_PROMPT}\n\nප්‍රශ්නය හෝ ක්‍රියාකාරකම: {context_text}\nගජාගේ මිත්‍රශීලී ළමා ආමන්ත්‍රණය:"
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": SINLLAMA_MODEL,
                        "prompt": prompt,
                        "stream": False,
                        "options": {"temperature": 0.7, "max_tokens": 120},
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "").strip()
        except Exception as e:
            print(f"[SinLLaMAProvider:Ollama] Note ({e}).")
        return None

    @classmethod
    async def generate_child_dialogue_hf(cls, context_text: str) -> Optional[str]:
        if not HUGGINGFACE_API_KEY:
            return None
        try:
            prompt = f"{CHILD_FRIENDLY_SYSTEM_PROMPT}\n\nප්‍රශ්නය: {context_text}\nගජා:"
            headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    HUGGINGFACE_SINLLAMA_URL,
                    headers=headers,
                    json={"inputs": prompt, "parameters": {"max_new_tokens": 100, "temperature": 0.7}},
                )
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, list) and len(data) > 0:
                        return data[0].get("generated_text", "").replace(prompt, "").strip()
        except Exception as e:
            print(f"[SinLLaMAProvider:HuggingFace] Note ({e}).")
        return None


def format_child_friendly_question(
    grade: int,
    topic: str,
    raw_text: str,
    operation: Optional[str] = None,
    visual_props: Optional[Dict[str, Any]] = None,
) -> Tuple[str, str]:
    """
    Transforms formal adult syllabus questions into warm, spoken Sinhala and English
    specifically designed for early childhood and ADHD cognitive engagement.
    """
    op = (operation or "").upper()
    topic_lower = topic.lower()

    if grade == 1 or op in ("SHAPE", "PATTERN", "COLOR", "COMPARE"):
        if op == "SHAPE" or "shape" in topic_lower or "හැඩ" in raw_text:
            shape_name = (visual_props or {}).get("shape_si", "රවුම")
            shape_en = (visual_props or {}).get("shape_en", "circle")
            return (
                f"යාළුවේ! ගජාට ලස්සන {shape_name} හැඩය හොයලා දෙන්න පුළුවන්ද? 🟡",
                f"Friend! Can you help Gaja find the lovely {shape_en} shape? 🟡",
            )
        if op == "PATTERN" or "pattern" in topic_lower or "රටා" in raw_text:
            return (
                "බලන්නකෝ ලස්සන රටාව! හිස් තැනට එන නිවැරදි හැඩය හෝ පාට තෝරමු 🚂",
                "Look at the fun pattern! Let's choose what comes next 🚂",
            )
        if op == "COMPARE" or "compare" in topic_lower or "ප්‍රමාණ" in raw_text or "ලොකු" in raw_text:
            return (
                "ගජා යාළුවා සමඟ බලන්න, මෙතනින් වඩා විශාල හෝ වැඩි ප්‍රමාණය කුමක්ද? 🐘",
                "Look with Gaja! Which one is bigger or has more? 🐘",
            )
        if op == "COUNT" or "count" in topic_lower or "ගණන්" in raw_text:
            return (
                "කූඩයේ ඇති පලතුරු ගජා සමඟ සෙමින් ගණන් කරමුද? 🍎",
                "Shall we gently count the fruits in the basket together with Gaja? 🍎",
            )
        if "කාසි" in raw_text or "money" in topic_lower:
            return (
                "ගජා ළඟ තියෙන කාසිය හඳුනාගෙන නිවැරදි අගය කියමු! 🪙",
                "Look at the coin Gaja has and pick its value! 🪙",
            )

    if grade == 2:
        if "ඉතිරි" in raw_text or op == "SUB":
            return (
                "මිතුරාට බෙදා දුන් පසු දැන් ඉතිරි වී ඇති ගණන කීයදැයි සොයමු! 🎒",
                "Let's see how many are left after sharing with a friend! 🎒",
            )
        if op == "ADD" or "එකතු" in raw_text:
            return (
                "ඔක්කොම එකතු කළ විට මුළු ගණන කීයද කියා ගජාට පෙන්වමු! 🌟",
                "Let's count them all together to show Gaja the total! 🌟",
            )
        if "money" in topic_lower or "රුපියල්" in raw_text:
            return (
                "කඩෙන් රස කැවිලි ගන්න අවශ්‍ය මුළු මුදල ගණනය කරමුද? 🍬",
                "Let's find out how many rupees we need for the treats! 🍬",
            )

    if grade == 3:
        if op == "MUL" or "ගුණ" in raw_text or "පෙට්ටි" in raw_text:
            return (
                "පෙට්ටිවල ඇති ද්‍රව්‍ය ගජාගේ ගුණ කිරීමේ උපක්‍රමයෙන් ඉක්මනින් ගණන් කරමු! 📦",
                "Let's multiply with Gaja to find the total items in the boxes! 📦",
            )
        if op == "DIV" or "බෙද" in raw_text:
            return (
                "යහළුවන් අතරේ කිසිම කෙනෙක් අතපසු නොවී සමානව බෙදා දෙමු! 🤝",
                "Let's share everything equally among our good friends! 🤝",
            )
        if "ශේෂ" in raw_text or "ඉතිරිය" in raw_text or "money" in topic_lower:
            return (
                "පොළෙන් බඩු ගෙන මුදල් ගෙවූ විට ලැබෙන ඉතිරි මුදල ගණනය කරමු! 🛒",
                "Let's calculate the balance money after our market purchase! 🛒",
            )

    if grade == 4:
        return (
            f"ගජාගේ වික්‍රමාන්විත ගවේෂණය: {raw_text}",
            f"Gaja's Quest: {raw_text}",
        )

    # General fallback
    return (
        f"ගජා සමඟ ප්‍රශ්නය විසඳමු: {raw_text}",
        f"Let's solve with Gaja: {raw_text}",
    )
