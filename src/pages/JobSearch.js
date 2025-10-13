// src/pages/Jobs.js
import React, { useEffect, useMemo, useState, useRef } from "react";
import { jobsAPI, normalizeWebsite } from "../utils/api"; // ✅ import normalizeWebsite
import {
  Search,
  Briefcase,
  MapPin,
  Building2,
  ChevronDown,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

/* --- API base for resolving relative image URLs --- */
const API_BASE =
  import.meta?.env?.VITE_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  "http://localhost:5000";

/* --- time ago helper --- */
const timeAgo = (isoOrDate) => {
  if (!isoOrDate) return "";
  const d = new Date(isoOrDate);
  const diff = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
};

const JOB_TYPES = [
  { value: "", label: "All types" },
  { value: "internship", label: "Internship" },
  { value: "ojt", label: "OJT" },
  { value: "part-time", label: "Part-time" },
  { value: "full-time", label: "Full-time" },
  { value: "contract", label: "Contract" },
];

/* --- fallback logo --- */
const PlaceholderLogo =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><rect width='100%' height='100%' fill='#f3f4f6'/><text x='50%' y='54%' font-size='16' text-anchor='middle' fill='#9ca3af'>🏢</text></svg>`
  );

function resolveUrl(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

function CompanyLogo({ url, alt }) {
  const [src, setSrc] = useState(url ? resolveUrl(url) : "");
  return (
    <img
      src={src || PlaceholderLogo}
      alt={alt || "Company logo"}
      className="w-10 h-10 rounded-md object-cover bg-gray-100 border"
      onError={() => setSrc(PlaceholderLogo)}
      loading="lazy"
    />
  );
}

/* ---------- analytics helper --------- */
async function logSearchTerm(term) {
  try {
    const base = API_BASE.replace(/\/$/, "");
    await fetch(`${base}/api/analytics/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term }),
      credentials: "include",
    });
  } catch (_) {}
}

export default function Jobs() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);

  // filters
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");

  const lastLoggedRef = useRef("");

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const fetchJobs = async (params = {}) => {
    try {
      setLoading(true);
      const data = await jobsAPI.list({
        approvedOnly: true,
        status: "active",
        ...params,
      });
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  // first load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [jobsRes, catsRes] = await Promise.all([
          jobsAPI.list({ approvedOnly: true, status: "active" }),
          jobsAPI.listCategories().catch(() => []),
        ]);
        setJobs(Array.isArray(jobsRes) ? jobsRes : []);
        setCategories(Array.isArray(catsRes) ? catsRes : []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load jobs");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // refetch when filters change
  useEffect(() => {
    (async () => {
      const params = { approvedOnly: true, status: "active" };
      if (q) params.q = q;
      if (type) params.jobType = type;
      if (category) params.category = category;
      if (location) params.location = location;

      await fetchJobs(params);

      if (q && q.length >= 2 && lastLoggedRef.current !== q) {
        lastLoggedRef.current = q;
        logSearchTerm(q.toLowerCase());
      }
    })();
  }, [q, type, category, location]);

  const hasFilters = useMemo(
    () => !!(q || type || category || location),
    [q, type, category, location]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Hero heading */}
      <div className="mb-6">
        <h1 className="text-[28px] sm:text-3xl font-bold tracking-tight">
          Internships and Jobs Available:
        </h1>
        <p className="text-gray-600 mt-1">
          Browse active and approved opportunities for PhilSCA Students & Alumni.
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-white/70 backdrop-blur border rounded-2xl shadow-sm p-3 sm:p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
          <div className="sm:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search job titles, skills…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <div className="relative">
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full appearance-none pr-8 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {JOB_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="relative">
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full appearance-none pr-8 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option
                    key={typeof c === "string" ? c : c?._id || c?.name}
                    value={typeof c === "string" ? c : c?.name || c?.slug}
                  >
                    {typeof c === "string" ? c : c?.name || c?.slug}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-full py-2.5 rounded-xl border px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3">
            <button
              onClick={() => {
                setQInput("");
                setType("");
                setCategory("");
                setLocation("");
                lastLoggedRef.current = "";
              }}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-20">
          <LoadingSpinner />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Components --- */
function JobCard({ job }) {
  const logoUrl = job?.company?.logoUrl ? resolveUrl(job.company.logoUrl) : "";

  return (
    <article className="group bg-white border rounded-2xl shadow-sm p-5 hover:shadow-md transition">
      <header className="mb-3 flex items-start gap-3">
        <CompanyLogo url={logoUrl} alt={job.company?.name} />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug group-hover:text-indigo-700 truncate">
            {job.title}
          </h2>
          <p className="text-xs text-gray-500">{timeAgo(job.createdAt)}</p>
        </div>
      </header>

      <p className="text-sm text-gray-700 mb-4">
        {job.shortDescription
          ? job.shortDescription
          : job.description
          ? job.description.slice(0, 120) +
            (job.description.length > 120 ? "…" : "")
          : ""}
      </p>

      <ul className="text-sm text-gray-600 space-y-1 mb-5">
        <li className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>{job.company?.name || "Company not specified"}</span>
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{job.location || "Location not specified"}</span>
        </li>
        <li className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <span className="capitalize">{job.jobType || "—"}</span>
        </li>
      </ul>

      <div className="flex items-center gap-3">
        {/* ✅ FIXED Apply Now button */}
        <button
          onClick={() => {
            const site = normalizeWebsite(job?.company?.website);
            if (site) {
              window.open(site, "_blank", "noopener,noreferrer");
            } else {
              alert("No company website available for this job.");
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Apply Now
        </button>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="rounded-2xl border p-6">
        <Briefcase className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold">No matching active jobs.</h3>
      <p className="text-gray-600 text-sm">
        Try clearing filters or adjusting your search.
      </p>
    </div>
  );
}
