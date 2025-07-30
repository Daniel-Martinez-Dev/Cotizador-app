// src/components/RichTextEditor.jsx
import React from "react";
import ReactQuill from "react-quill";

export default function RichTextEditor({ value, onChange }) {
  return (
    <div className="my-4">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={{
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link"],
            ["clean"],
          ],
        }}
        formats={[
          "header",
          "bold",
          "italic",
          "underline",
          "list",
          "bullet",
          "link",
        ]}
      />
    </div>
  );
}
