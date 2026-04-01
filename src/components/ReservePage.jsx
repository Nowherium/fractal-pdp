import React from "react";

function ReservePage({ resources, stocks, handleStockChange }) {
  return (
    <div className='panel'>
      <h2>1. Réserve Centrale</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
        }}
      >
        {resources.map((resource) => (
          <label key={resource.code}>
            Stock {resource.code.toUpperCase()} :
            <input
              type='number'
              value={stocks[resource.code] ?? 0}
              step='1'
              onChange={(event) =>
                handleStockChange(resource.code, event.target.value)
              }
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export default ReservePage;
