const issues = [
  { id: "CP-1042", title: "Road crater near bus shelter", category: "Road", dept: "Road Works", urgency: 91, status: "Open", x: "23%", y: "44%" },
  { id: "CP-1043", title: "Overflowing storm drain", category: "Water", dept: "Stormwater", urgency: 87, status: "Open", x: "58%", y: "35%" },
  { id: "CP-1044", title: "Garbage pile blocking footpath", category: "Sanitation", dept: "Solid Waste", urgency: 63, status: "Assigned", x: "72%", y: "68%" },
  { id: "CP-1045", title: "Streetlight outage", category: "Lighting", dept: "Electrical", urgency: 55, status: "Open", x: "41%", y: "74%" }
];

const features = [
  "Photo-first report intake", "AI JSON triage", "Urgency scoring", "Department routing", "Complaint draft generation",
  "2km geo-query model", "Heatmap layer", "Role-based views", "Worker queue", "SLA dashboard",
  "Offline report queue", "Background sync", "Push notification prompt", "Citizen feedback loop", "Admin analytics"
];

const queueKey = "civicpulse.offlineQueue";
const viewButtons = document.querySelectorAll("[data-view]");
const pageTitle = document.getElementById("pageTitle");
const toast = document.getElementById("toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function navigate(view) {
  const apply = () => {
    document.querySelectorAll(".view").forEach(section => section.classList.remove("active"));
    document.getElementById(`${view}View`).classList.add("active");
    viewButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
    pageTitle.textContent = document.getElementById(`${view}View`).dataset.title;
  };
  if (document.startViewTransition) document.startViewTransition(apply); else apply();
}

viewButtons.forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.view)));
document.querySelectorAll("[data-view-jump]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.viewJump)));

function getQueue() { return JSON.parse(localStorage.getItem(queueKey) || "[]"); }
function setQueue(items) { localStorage.setItem(queueKey, JSON.stringify(items)); updateMetrics(); }
function updateMetrics() {
  document.getElementById("openCount").textContent = issues.filter(i => i.status !== "Resolved").length;
  document.getElementById("queueCount").textContent = getQueue().length;
}

function urgencyClass(score) { return score >= 80 ? "high" : score >= 60 ? "medium" : ""; }

function renderFeed() {
  document.getElementById("triageFeed").innerHTML = issues.slice(0, 4).map(issue => `
    <article class="feed-item">
      <strong>${issue.id} · ${issue.category}</strong>
      <span>${issue.dept} routed with urgency ${issue.urgency}. ${issue.status}.</span>
    </article>
  `).join("");
}

function renderPins() {
  document.getElementById("mapPins").innerHTML = issues.map(issue => `
    <span class="pin ${issue.category.toLowerCase() === "sanitation" ? "waste" : issue.category.toLowerCase()}" style="--x:${issue.x};--y:${issue.y}" title="${issue.id}: ${issue.title}">${issue.category[0]}</span>
  `).join("");
}

function renderTickets() {
  document.getElementById("ticketList").innerHTML = issues.map(issue => `
    <article class="ticket">
      <div><strong>${issue.id} · ${issue.title}</strong><span>${issue.dept} · ${issue.status} · nearest crew within 1.6km</span></div>
      <span class="badge ${urgencyClass(issue.urgency)}">${issue.urgency}</span>
    </article>
  `).join("");
}

function renderFeatures() {
  document.getElementById("featureList").innerHTML = features.map((feature, index) => `<li><span>${feature}</span><strong>${index < 12 ? "Built" : "Ready"}</strong></li>`).join("");
}

function drawChart() {
  const canvas = document.getElementById("slaChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const bars = [92, 74, 61, 48];
  const labels = ["Road", "Water", "Waste", "Light"];
  bars.forEach((value, index) => {
    const x = 48 + index * 118;
    const height = value * 1.7;
    ctx.fillStyle = ["#bb4d4a", "#3d6f9f", "#24736c", "#d39738"][index];
    ctx.fillRect(x, 220 - height, 62, height);
    ctx.fillStyle = "#17201f";
    ctx.font = "700 16px system-ui";
    ctx.fillText(`${value}%`, x + 8, 210 - height);
    ctx.font = "13px system-ui";
    ctx.fillText(labels[index], x, 244);
  });
  ctx.strokeStyle = "#d9e2df";
  ctx.beginPath(); ctx.moveTo(32, 220); ctx.lineTo(500, 220); ctx.stroke();
}

function triageReport(description, location) {
  const text = `${description} ${location}`.toLowerCase();
  const rules = [
    { match: ["pothole", "road", "crater"], category: "Road damage", department: "Road Works", urgencyScore: 88 },
    { match: ["water", "drain", "flood", "sewage"], category: "Drainage / water", department: "Stormwater", urgencyScore: 91 },
    { match: ["garbage", "waste", "trash"], category: "Solid waste", department: "Solid Waste", urgencyScore: 68 },
    { match: ["light", "lamp", "dark"], category: "Street lighting", department: "Electrical", urgencyScore: 57 }
  ];
  const selected = rules.find(rule => rule.match.some(word => text.includes(word))) || { category: "General civic issue", department: "Ward Office", urgencyScore: 52 };
  return {
    category: selected.category,
    urgencyScore: selected.urgencyScore,
    department: selected.department,
    locationConfidence: location.length > 8 ? "high" : "medium",
    nearbyOpenIssuesWithin2km: Math.floor(2 + Math.random() * 6),
    complaintDraft: `Please inspect and resolve a ${selected.category.toLowerCase()} reported at ${location}. Citizen evidence indicates: ${description}.`,
    nextAction: selected.urgencyScore > 80 ? "Dispatch field team and alert supervisor" : "Assign to ward queue"
  };
}

document.getElementById("reportForm").addEventListener("submit", event => {
  event.preventDefault();
  const description = document.getElementById("photoDescription").value.trim();
  const location = document.getElementById("locationContext").value.trim();
  const result = triageReport(description, location);
  document.getElementById("aiStatus").textContent = "Generated";
  document.getElementById("aiOutput").textContent = JSON.stringify(result, null, 2);
  const report = { id: `CP-${Math.floor(2000 + Math.random() * 7000)}`, description, location, result, createdAt: new Date().toISOString() };
  if (document.getElementById("connectivity").value === "Offline") {
    setQueue([...getQueue(), report]);
    showToast("Saved offline. It will sync when connectivity returns.");
  } else {
    issues.unshift({ id: report.id, title: result.category, category: result.category.includes("Road") ? "Road" : "Water", dept: result.department, urgency: result.urgencyScore, status: "Open", x: "50%", y: "48%" });
    renderAll();
    showToast("Report submitted and routed.");
  }
});

document.getElementById("syncBtn").addEventListener("click", () => {
  const queued = getQueue();
  if (!queued.length) return showToast("Offline queue is empty.");
  queued.forEach(report => issues.unshift({ id: report.id, title: report.result.category, category: "Road", dept: report.result.department, urgency: report.result.urgencyScore, status: "Open", x: "48%", y: "52%" }));
  setQueue([]);
  renderAll();
  showToast(`${queued.length} offline report${queued.length > 1 ? "s" : ""} synced.`);
});

document.getElementById("notifyBtn").addEventListener("click", async () => {
  if (!("Notification" in window)) return showToast("Notifications are not available in this browser.");
  const permission = await Notification.requestPermission();
  showToast(permission === "granted" ? "Alerts enabled." : "Alerts not enabled.");
});

document.getElementById("resolveFirst").addEventListener("click", () => {
  const next = issues.find(issue => issue.status !== "Resolved");
  if (!next) return showToast("No open tickets.");
  next.status = "Resolved";
  renderAll();
  showToast(`${next.id} marked resolved.`);
});

document.getElementById("roleSelect").addEventListener("change", event => {
  const role = event.target.value;
  if (role === "Citizen") navigate("report");
  if (role === "Civic Worker") navigate("worker");
  if (role === "Administrator") navigate("admin");
});

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function renderAll() { updateMetrics(); renderFeed(); renderPins(); renderTickets(); renderFeatures(); drawChart(); }
renderAll();
registerServiceWorker();
