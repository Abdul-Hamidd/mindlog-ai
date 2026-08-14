import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def create_conversation(user_id: str, title: str = "New Conversation"):
    """Create a new conversation and return its id."""
    result = supabase.table("conversations").insert({
        "user_id": user_id,
        "title": title
    }).execute()
    return result.data[0]


def get_user_conversations(user_id: str):
    """Get all conversations belonging to a user, most recent first."""
    result = supabase.table("conversations") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .execute()
    return result.data


def get_conversation_messages(conversation_id: str):
    """Get all messages for a specific conversation, in order."""
    result = supabase.table("messages") \
        .select("*") \
        .eq("conversation_id", conversation_id) \
        .order("created_at") \
        .execute()
    return result.data


def save_message(conversation_id: str, role: str, content: str, sources: list = None):
    """Save a single message (user or assistant) to a conversation."""
    result = supabase.table("messages").insert({
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "sources": sources or []
    }).execute()
    return result.data[0]


def delete_conversation(conversation_id: str):
    """Delete a conversation and all its messages (cascade)."""
    supabase.table("conversations").delete().eq("id", conversation_id).execute()