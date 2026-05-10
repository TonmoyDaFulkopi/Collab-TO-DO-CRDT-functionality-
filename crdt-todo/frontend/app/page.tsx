"use client";

import { useState, useRef } from "react";
import { useCrdtTodos } from "@/hooks/useCrdtTodos";

export default function Home() {
  const { todos, addTodo, toggleTodo, deleteTodo, connected } = useCrdtTodos();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const text = input.trim();
    if (!text) return;
    addTodo(text);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white font-mono px-4 py-12 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-lg mb-10">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            crdt<span className="text-[#a3e635]">·todo</span>
          </h1>
          <span
            className={`text-xs px-2 py-1 rounded-full border ${
              connected
                ? "border-[#a3e635] text-[#a3e635]"
                : "border-red-500 text-red-400"
            }`}
          >
            {connected ? "● live" : "○ offline"}
          </span>
        </div>
        <p className="text-xs text-neutral-500">
          Collaborative · Last-Write-Wins CRDT · Open in multiple tabs
        </p>
      </div>

      {/* Input */}
      <div className="w-full max-w-lg flex gap-2 mb-8">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a task..."
          className="flex-1 bg-[#1a1a1a] border border-neutral-700 rounded-lg px-4 py-2 text-sm text-white placeholder-neutral-600 outline-none focus:border-[#a3e635] transition-colors"
        />
        <button
          onClick={handleAdd}
          className="bg-[#a3e635] text-black text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#c2f465] transition-colors"
        >
          Add
        </button>
      </div>

      {/* Todo list */}
      <ul className="w-full max-w-lg space-y-2">
        {todos.length === 0 && (
          <li className="text-center text-neutral-600 text-sm py-12">
            No tasks yet. Add one above.
          </li>
        )}
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center gap-3 bg-[#1a1a1a] border border-neutral-800 rounded-lg px-4 py-3 group hover:border-neutral-600 transition-colors"
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleTodo(todo)}
              className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                todo.done
                  ? "bg-[#a3e635] border-[#a3e635]"
                  : "border-neutral-600 hover:border-[#a3e635]"
              }`}
            >
              {todo.done && (
                <svg className="w-3 h-3 text-black" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            {/* Text */}
            <span
              className={`flex-1 text-sm ${
                todo.done ? "line-through text-neutral-500" : "text-neutral-100"
              }`}
            >
              {todo.text}
            </span>

            {/* Timestamp */}
            <span className="text-[10px] text-neutral-700 hidden group-hover:block">
              ts:{todo.timestamp}
            </span>

            {/* Delete */}
            <button
              onClick={() => deleteTodo(todo)}
              className="text-neutral-700 hover:text-red-400 transition-colors text-xs ml-1"
              title="Delete"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {/* Footer */}
      {todos.length > 0 && (
        <p className="mt-6 text-xs text-neutral-700">
          {todos.filter((t) => t.done).length}/{todos.length} done
        </p>
      )}
    </main>
  );
}
