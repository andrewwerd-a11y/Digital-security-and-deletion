import { Link, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => { fetch(url).then((r) => r.json()).then(setData).catch(() => setData(null)); }, [url]);
  return data;
}

function Overview() {
  const data = useFetch<Record<string, unknown>>("/api/overview");
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

function Tree() {
  const data = useFetch<Record<string, unknown>>("/api/tree/branch?branch=FILES");
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

function Detail() {
  const data = useFetch<Record<string, unknown>>("/api/views/unknown");
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

export function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: 16 }}>
      <h1>Digital Reset Workspace</h1>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link to="/">Overview</Link>
        <Link to="/tree">Living Data Tree</Link>
        <Link to="/detail">Detail Panel</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/tree" element={<Tree />} />
        <Route path="/detail" element={<Detail />} />
      </Routes>
    </div>
  );
}
