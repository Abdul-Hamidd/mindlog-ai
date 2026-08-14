import sys
import types

# Workaround: ragas tries to import langchain_community's VertexAI integration
# even though we don't use Google Cloud. Stub it out to avoid installing
# the huge google-cloud-* dependency chain (saves several GB of disk space).
if "langchain_community.chat_models.vertexai" not in sys.modules:
    _stub = types.ModuleType("langchain_community.chat_models.vertexai")
    class ChatVertexAI:
        pass
    _stub.ChatVertexAI = ChatVertexAI
    sys.modules["langchain_community.chat_models.vertexai"] = _stub

import os
from typing import List, Dict
from dotenv import load_dotenv

from ragas import SingleTurnSample
from ragas.metrics import Faithfulness, ResponseRelevancy
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper

load_dotenv()

# ─── Setup RAGAS-compatible LLM + Embeddings (reusing Groq, free) ──────
_ragas_llm = LangchainLLMWrapper(
    ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0
    )
)

_ragas_embeddings = LangchainEmbeddingsWrapper(
    HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
)

_faithfulness_metric = Faithfulness(llm=_ragas_llm)
_relevancy_metric = ResponseRelevancy(llm=_ragas_llm, embeddings=_ragas_embeddings, strictness=1)


async def evaluate_answer(query: str, answer: str, retrieved_chunks: List[Dict]) -> Dict:
    """
    Evaluate a generated answer using RAGAS metrics:
    - Faithfulness: is the answer grounded in the retrieved context (no hallucination)?
    - Answer Relevancy: does the answer actually address the question?

    Returns scores between 0 and 1 (higher is better).
    """
    if not retrieved_chunks:
        return {"faithfulness": None, "answer_relevancy": None}

    contexts = [chunk["text"] for chunk in retrieved_chunks]

    sample = SingleTurnSample(
        user_input=query,
        response=answer,
        retrieved_contexts=contexts
    )

    try:
        faithfulness_score = await _faithfulness_metric.single_turn_ascore(sample)
    except Exception as e:
        print(f"FAITHFULNESS ERROR: {type(e).__name__}: {e}")
        faithfulness_score = None

    try:
        relevancy_score = await _relevancy_metric.single_turn_ascore(sample)
    except Exception as e:
        print(f"RELEVANCY ERROR: {type(e).__name__}: {e}")
        relevancy_score = None

    return {
        "faithfulness": round(faithfulness_score, 3) if faithfulness_score is not None else None,
        "answer_relevancy": round(relevancy_score, 3) if relevancy_score is not None else None
    }