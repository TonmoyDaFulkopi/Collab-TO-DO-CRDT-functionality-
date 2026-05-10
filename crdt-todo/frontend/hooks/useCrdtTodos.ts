/**
 * useCrdtTodos.ts
 * 
 * CRDT logic lives entirely here.
 * LWW-Register: every operation carries a timestamp.
 * We merge incoming ops: highest timestamp wins per todo id.
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  timestamp: number;
  deleted?: boolean;
}

type Op =
  | { type: "upsert"; todo: Todo }
  | { type: "delete"; todo: Todo };

const WS_URL = "ws://localhost:8000/ws";

function merge(state: Map<string, Todo>, todo: Todo): Map<string, Todo> {
  const existing = state.get(todo.id);
  // LWW: keep whichever has the higher timestamp
  if (existing && existing.timestamp >= todo.timestamp) return state;
  return new Map(state).set(todo.id, todo);
}

export function useCrdtTodos() {
  const [state, setState] = useState<Map<string, Todo>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  // Apply an op locally and return the new state
  const applyOp = useCallback((op: Op, prev: Map<string, Todo>) => {
    if (op.type === "delete") {
      return merge(prev, { ...op.todo, deleted: true });
    }
    return merge(prev, { ...op.todo, deleted: false });
  }, []);

  // Send op over WebSocket
  const send = useCallback((op: Op) => {
    wsRef.current?.send(JSON.stringify(op));
    // Optimistic local update
    setState((prev) => applyOp(op, prev));
  }, [applyOp]);

  useEffect(() => {
    let ws: WebSocket;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);

        if (msg.type === "init") {
          setState(() => {
            const m = new Map<string, Todo>();
            for (const todo of msg.todos as Todo[]) m.set(todo.id, todo);
            return m;
          });
        } else if (msg.type === "op") {
          setState((prev) => applyOp(msg.op as Op, prev));
        }
      };

      ws.onclose = () => {
        setConnected(false);
        retryTimer = setTimeout(connect, 2000); // auto-reconnect
      };

      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      clearTimeout(retryTimer);
      ws.close();
    };
  }, [applyOp]);

  // ---------- Public API ----------

  const addTodo = useCallback((text: string) => {
    const todo: Todo = {
      id: crypto.randomUUID(),
      text,
      done: false,
      timestamp: Date.now(),
    };
    send({ type: "upsert", todo });
  }, [send]);

  const toggleTodo = useCallback((todo: Todo) => {
    send({
      type: "upsert",
      todo: { ...todo, done: !todo.done, timestamp: Date.now() },
    });
  }, [send]);

  const deleteTodo = useCallback((todo: Todo) => {
    send({
      type: "delete",
      todo: { ...todo, timestamp: Date.now() },
    });
  }, [send]);

  const todos = Array.from(state.values())
    .filter((t) => !t.deleted)
    .sort((a, b) => a.timestamp - b.timestamp);

  return { todos, addTodo, toggleTodo, deleteTodo, connected };
}
