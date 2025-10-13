import React from "react";
export default function Pagination({ page, pages, onPrev, onNext }) {
  return (
    <div className="mtl-pagination">
      <button disabled={page<=1} onClick={onPrev}>‹ Previous</button>
      <span>{page}</span>
      <button disabled={page>=pages} onClick={onNext}>Next ›</button>
    </div>
  );
}
