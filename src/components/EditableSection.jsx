// src/components/EditableSection.jsx

import React, { useState } from "react";

export default function EditableSection({ title, html, onChange, openByDefault = false, displayContent }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(openByDefault);

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className="border rounded mb-6 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-4 py-3 bg-gray-200 hover:bg-gray-300 font-semibold"
      >
        {title}
      </button>

      {isOpen && (
        <div className="p-4 bg-white">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-sm text-blue-600 hover:underline"
            >
              {isEditing ? "Cerrar edición" : "Editar"}
            </button>
          </div>

          {isEditing ? (
            <textarea
              value={html}
              onChange={handleChange}
              className="w-full border p-2 rounded h-40 font-mono text-sm"
            />
          ) : (
            <div className="prose max-w-none">{displayContent}</div>
          )}
        </div>
      )}
    </div>
  );
}
