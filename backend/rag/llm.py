import os
import json
from groq import Groq
from typing import List, Dict, Generator, Optional
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Model to use
MODEL = "qwen/qwen3.6-27b"


def _build_prompts(query: str, retrieved_chunks: List[Dict], history: Optional[List[Dict]] = None):
    """Shared prompt-building logic used by both streaming and non-streaming paths."""
    context = ""
    sources = []

    for i, chunk in enumerate(retrieved_chunks):
        context += f"\n\n[Entry from: {chunk['source']}]\n{chunk['text']}"
        if chunk["source"] not in sources:
            sources.append(chunk["source"])

    system_prompt = """You are MindLog, a warm and caring journaling companion — think of yourself as a close friend who has read the user's journal and is chatting with them about it, not an analyst producing a report.

Rules:
- Answer ONLY based on the user's own journal entries provided as context
- Keep every reply SHORT — 2 to 4 sentences maximum. Never write long, multi-paragraph responses. Say the most important, relevant thing and stop — don't try to cover every entry or every detail
- Speak in short, natural, conversational sentences — the way a caring friend would talk in a quick chat message, not like you're summarizing a document
- Avoid repeating the same word or phrase multiple times in one reply (e.g. don't say "shayad"/"perhaps" or any other word more than once) — vary your phrasing naturally, the way a real person would
- Never diagnose, give medical/therapy advice, or make clinical judgments about the user's mental state
- If the entries suggest something concerning (e.g. persistent distress), gently encourage the user to reach out to a trusted person or professional, without being alarmist — keep this brief too
- If the answer is not in the provided entries, say "I couldn't find anything about that in your journal yet"
- You may refer to *when* something happened in plain, natural language (e.g. "the other night", "earlier that day", "a couple days ago") — but double check the actual date in the context before mentioning it, so you never get the day wrong
- NEVER write raw citations, timestamps, or labels like "(Entry — Aug 10, 2026 09:52 PM)" inside your reply. The exact sources are already shown to the user separately — your job is just to talk to them naturally, not to cite anything
- NEVER add a "Based on entries: ..." list, or any similar summary of which entries you used, at the end of your reply. Just end naturally when you're done talking
- Do not fabricate any entries or details not present in the context
- If there are many relevant entries, pick the one or two most important ones and talk about those — don't try to mention all of them"""

    user_prompt = f"""Journal entries:
{context}

Question: {query}

Respond warmly and naturally, grounded only in the entries above. Keep it SHORT — 2 to 4 sentences, like a quick friendly chat message, not a long analysis. Vary your word choice naturally, don't repeat the same word multiple times. Do not include any entry citations, timestamps, or a "Based on entries" list in your reply — just talk to the user like a caring friend would."""

    messages = [{"role": "system", "content": system_prompt}]

    if history:
        for turn in history[-6:]:
            if turn.get("role") in ("user", "assistant") and turn.get("content"):
                messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({"role": "user", "content": user_prompt})

    return messages, sources


def generate_answer(query: str, retrieved_chunks: List[Dict], history: Optional[List[Dict]] = None) -> Dict:
    """
    Generate answer using Groq LLaMA based on retrieved context (non-streaming).
    """

    if not retrieved_chunks:
        return {
            "answer": "I couldn't find anything about that in your journal yet.",
            "sources": []
        }

    messages, sources = _build_prompts(query, retrieved_chunks, history)

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=250
    )

    answer = response.choices[0].message.content

    return {
        "answer": answer,
        "sources": sources,
        "chunks_used": len(retrieved_chunks)
    }


def generate_answer_stream(query: str, retrieved_chunks: List[Dict], history: Optional[List[Dict]] = None):
    """
    Generate answer using Groq LLaMA, streaming tokens as they arrive.
    Supports conversation history so follow-up questions make sense.

    Yields plain text chunks as the answer, and finally yields a special
    marker line containing the sources as JSON so the client can separate
    the answer text from the metadata:

        __SOURCES__{"sources": ["entry label"], "chunks_used": 3}
    """

    if not retrieved_chunks:
        yield "I couldn't find anything about that in your journal yet."
        yield f"\n__SOURCES__{json.dumps({'sources': [], 'chunks_used': 0})}"
        return

    messages, sources = _build_prompts(query, retrieved_chunks, history)

    stream = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=250,
        stream=True
    )

    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta

    # After the full answer has streamed, send sources as a trailing marker
    yield f"\n__SOURCES__{json.dumps({'sources': sources, 'chunks_used': len(retrieved_chunks)})}"