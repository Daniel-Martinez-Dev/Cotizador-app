import React, { useState } from "react";

export default function EditableSection({ title, html, openByDefault = false, onChange }) {
  const [isOpen, setIsOpen] = useState(openByDefault);
  const [content, setContent] = useState(html);

  const toggle = () => setIsOpen(!isOpen);

  const handleChange = (e) => {
    setContent(e.target.value);
    if (onChange) onChange(e.target.value);
  };

  return (
    <div className="mb-6 border rounded shadow">
      <button
        onClick={toggle}
        className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 font-semibold"
      >
        {title}
      </button>
      {isOpen && (
        <div className="p-4 bg-white">
          <textarea
            className="w-full min-h-[200px] border rounded p-2 font-mono text-sm"
            value={content}
            onChange={handleChange}
          />
        </div>
      )}
    </div>
  );
}
