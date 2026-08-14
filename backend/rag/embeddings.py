import chromadb
from sentence_transformers import SentenceTransformer
from typing import List
import os

# Initialize embedding model
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
CHROMA_PATH = "chroma_db"

# Load model once
model = SentenceTransformer(EMBEDDING_MODEL)


def get_chroma_client():
    """Initialize and return ChromaDB client."""
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client


def get_or_create_collection(client, collection_name: str = "documents"):
    """Get existing collection or create new one."""
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )
    return collection


def embed_and_store(chunks: List[str], file_name: str):
    """
    Generate embeddings for chunks and store in ChromaDB.
    
    Args:
        chunks: List of text chunks
        file_name: Source file name for metadata
    """
    client = get_chroma_client()
    collection = get_or_create_collection(client)

    # Generate embeddings
    embeddings = model.encode(chunks, show_progress_bar=True).tolist()

    # Create unique IDs for each chunk
    ids = [f"{file_name}_chunk_{i}" for i in range(len(chunks))]

    # Store in ChromaDB with metadata
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=[{"source": file_name, "chunk_index": i} for i in range(len(chunks))]
    )

    return len(chunks)


def get_collection_count():
    """Return total number of chunks stored in ChromaDB."""
    try:
        client = get_chroma_client()
        collection = get_or_create_collection(client)
        return collection.count()
    except Exception:
        return 0