"""
CRDT Collaborative Todo App - FastAPI Backend
CRDT Type: LWW-Element-Set (Last-Write-Wins)
Each operation carries a timestamp; highest timestamp wins on conflict.
"""

import json
import uuid
import time
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="CRDT Todo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
                   "https://collab-to-do-crdt-functionality.vercel.app/"
                   ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# CRDT State: LWW-Element-Set
# Structure: { todo_id: { id, text, done, timestamp, deleted } }
# ---------------------------------------------------------------------------
crdt_state: dict[str, dict] = {}

# Connected WebSocket clients
clients: list[WebSocket] = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def current_ts() -> float:
    return time.time()


def apply_operation(op: dict) -> bool:
    """
    Apply a CRDT operation to the local state.
    Returns True if state changed (so we broadcast).
    op shape: { type: "upsert"|"delete", todo: { id, text, done, timestamp } }
    """
    todo_id = op["todo"]["id"]
    incoming_ts = op["todo"]["timestamp"]

    existing = crdt_state.get(todo_id)

    # LWW rule: only apply if incoming timestamp is newer
    if existing and existing["timestamp"] >= incoming_ts:
        return False  # stale operation, discard

    if op["type"] == "delete":
        crdt_state[todo_id] = {**op["todo"], "deleted": True}
    else:  # upsert (add or update)
        crdt_state[todo_id] = {**op["todo"], "deleted": False}

    return True


def visible_todos() -> list[dict]:
    """Return non-deleted todos sorted by creation timestamp."""
    return sorted(
        [t for t in crdt_state.values() if not t.get("deleted")],
        key=lambda t: t["timestamp"],
    )


async def broadcast(message: dict, exclude: Optional[WebSocket] = None):
    """Send a message to all connected clients except the sender."""
    dead = []
    for ws in clients:
        if ws is exclude:
            continue
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            dead.append(ws)
    for ws in dead:
        clients.remove(ws)


# ---------------------------------------------------------------------------
# REST endpoints (optional convenience)
# ---------------------------------------------------------------------------

@app.get("/todos")
def get_todos():
    return visible_todos()


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)

    # Send full state to the newly connected client
    await websocket.send_text(json.dumps({
        "type": "init",
        "todos": visible_todos(),
    }))

    try:
        while True:
            raw = await websocket.receive_text()
            op = json.loads(raw)

            changed = apply_operation(op)

            if changed:
                # Echo back to sender (so their UI confirms) + broadcast to others
                await broadcast({"type": "op", "op": op}, exclude=None)

    except WebSocketDisconnect:
        clients.remove(websocket)
