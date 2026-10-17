'use client';

export default function MenuFilterBar({
  q,
  setQ,
  cat,
  setCat,
  cats,
  status,
  setStatus,
}) {
  return (
    <div className="card row wrap filters">
      <input
        className="grow"
        placeholder="Search name, SKU, description…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search menu"
      />
      <select
        value={cat}
        onChange={(e) => setCat(e.target.value)}
        aria-label="Category"
      >
        <option value="">All categories</option>
        {cats.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        aria-label="Availability"
      >
        <option value="">All</option>
        <option value="available">Available</option>
        <option value="unavailable">Out of stock</option>
      </select>
    </div>
  );
}
