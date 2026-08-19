import os
import tempfile
import asyncio
import json as _json
from datetime import datetime
from typing import List, Optional, Dict

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from rag.db import (
    create_conversation,
    get_user_conversations,
    get_conversation_messages,
    save_message,
    delete_conversation
)

app = FastAPI(
    title="MindLog API",
    description="Backend API for the MindLog journaling companion",
    version="1.0.0"
)

# 1. CORS Sab se pehle (Crucial for Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. Health Check Endpoints (SnapDeploy Shutdown Fix)
@app.get("/")
@app.get("/health")
@app.get("/healthz")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "MindLog API", "healthy": True}


class QueryRequest(BaseModel):
    query: str
    n_results: int = 5
    file_filter: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None


class QueryResponse(BaseModel):
    answer: str
    sources: List[str]
    chunks_used: int


class UploadResponse(BaseModel):
    filename: str
    chunks_stored: int
    total_chunks_in_db: int


class JournalEntry(BaseModel):
    content: str
    mood: Optional[str] = None


class StatsResponse(BaseModel):
    total_chunks: int


class ConversationCreate(BaseModel):
    user_id: str
    title: Optional[str] = "New Conversation"


class MessageSave(BaseModel):
    conversation_id: str
    role: str
    content: str
    sources: Optional[List[str]] = None


@app.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    from rag.ingestion import load_document
    from rag.chunking import chunk_text
    from rag.embeddings import embed_and_store, get_collection_count
    from rag.retriever import clear_cache

    allowed_extensions = {".pdf", ".docx", ".txt", ".csv"}
    ext = os.path.splitext(file.filename)[1].lower()

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {allowed_extensions}"
        )

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        text = load_document(tmp_path)
        chunks = chunk_text(text)
        count = embed_and_store(chunks, file.filename)

        os.unlink(tmp_path)
        clear_cache()

        return UploadResponse(
            filename=file.filename,
            chunks_stored=count,
            total_chunks_in_db=get_collection_count()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.post("/entries", response_model=UploadResponse)
def create_journal_entry(entry: JournalEntry):
    from rag.chunking import chunk_text
    from rag.embeddings import embed_and_store, get_collection_count
    from rag.retriever import clear_cache

    if not entry.content.strip():
        raise HTTPException(status_code=400, detail="Entry cannot be empty.")

    label = f"Entry — {datetime.now().strftime('%b %d, %Y %I:%M %p')}"
    if entry.mood:
        label += f" ({entry.mood})"

    chunks = chunk_text(entry.content)
    count = embed_and_store(chunks, label)
    clear_cache()

    return UploadResponse(
        filename=label,
        chunks_stored=count,
        total_chunks_in_db=get_collection_count()
    )


@app.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    from rag.embeddings import get_collection_count
    from rag.retriever import retrieve_relevant_chunks
    from rag.llm import generate_answer

    if get_collection_count() == 0:
        raise HTTPException(
            status_code=400,
            detail="No journal entries yet. Please write an entry first."
        )

    chunks = retrieve_relevant_chunks(
        query=request.query,
        n_results=request.n_results,
        file_filter=request.file_filter
    )

    result = generate_answer(request.query, chunks, history=request.history)

    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        chunks_used=result.get("chunks_used", len(chunks))
    )


@app.post("/query/stream")
def query_documents_stream(request: QueryRequest):
    from rag.embeddings import get_collection_count
    from rag.retriever import retrieve_relevant_chunks
    from rag.llm import generate_answer_stream

    if get_collection_count() == 0:
        raise HTTPException(
            status_code=400,
            detail="No journal entries yet. Please write an entry first."
        )

    chunks = retrieve_relevant_chunks(
        query=request.query,
        n_results=request.n_results,
        file_filter=request.file_filter
    )

    def event_generator():
        for token in generate_answer_stream(request.query, chunks, history=request.history):
            yield token

    return StreamingResponse(event_generator(), media_type="text/plain")


@app.post("/conversations")
def create_new_conversation(request: ConversationCreate):
    conv = create_conversation(request.user_id, request.title)
    return conv


@app.get("/conversations/{user_id}")
def list_conversations(user_id: str):
    return get_user_conversations(user_id)


@app.get("/conversations/{conversation_id}/messages")
def list_messages(conversation_id: str):
    return get_conversation_messages(conversation_id)


@app.post("/messages")
def save_new_message(request: MessageSave):
    msg = save_message(request.conversation_id, request.role, request.content, request.sources)
    return msg


@app.delete("/conversations/{conversation_id}")
def remove_conversation(conversation_id: str):
    delete_conversation(conversation_id)
    return {"status": "deleted"}


@app.get("/stats", response_model=StatsResponse)
def get_stats():
    from rag.embeddings import get_collection_count
    return StatsResponse(total_chunks=get_collection_count())


@app.delete("/cache")
def clear_query_cache():
    from rag.retriever import clear_cache
    clear_cache()
    return {"status": "cache cleared"}


if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)