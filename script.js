/* Utils */
const $ = (sel) => document.querySelector(sel);
const setText = (id, text) => { $(id).textContent = text; };
const setBadge = (id, label, cls) => {
  const el = $(id);
  el.className = `badge ${cls||""}`.trim();
  el.textContent = label;
};

/* Ranges & classification helpers */

// HB (generic adult reference: 12–16 g/dL for this simple tool)
function classifyHB(hb) {
  if (hb === null || isNaN(hb)) return {label: "—", badge: "Awaiting input", cls: "", note: ""};
  if (hb < 12) return {label: `${hb.toFixed(1)} g/dL`, badge: "Low", cls: "low", note: "Below general adult reference (12–16)."};
  if (hb > 16) return {label: `${hb.toFixed(1)} g/dL`, badge: "High", cls: "high", note: "Above general adult reference (12–16)."};
  return {label: `${hb.toFixed(1)} g/dL`, badge: "Normal", cls: "ok", note: "Within general adult reference (12–16)."};
}

// BP categories (using common adult categories)
function classifyBP(sys, dia) {
  if ([sys, dia].some(v => v === null || isNaN(v))) return {label: "—", badge: "Awaiting input", cls: "", note: ""};

  const s = sys, d = dia;

  // Hypertensive crisis (simple flag)
  if (s >= 180 || d >= 120) {
    return {label: `${s}/${d} mmHg`, badge: "Urgent (Seek care)", cls: "high", note: "≥180 systolic or ≥120 diastolic."};
  }
  if (s >= 140 || d >= 90) {
    return {label: `${s}/${d} mmHg`, badge: "High (Stage 2)", cls: "high", note: "≥140 systolic or ≥90 diastolic."};
  }
  if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) {
    return {label: `${s}/${d} mmHg`, badge: "High (Stage 1)", cls: "warn", note: "130–139 systolic or 80–89 diastolic."};
  }
  if (s >= 120 && s <= 129 && d < 80) {
    return {label: `${s}/${d} mmHg`, badge: "Elevated", cls: "warn", note: "120–129 systolic and <80 diastolic."};
  }
  return {label: `${s}/${d} mmHg`, badge: "Normal", cls: "ok", note: "<120 and <80."};
}

// Sugar (mg/dL) fasting or random
function classifySugar(val, mode) {
  if (val === null || isNaN(val)) return {label: "—", badge: "Awaiting input", cls: "", note: ""};
  const v = Math.round(val);

  if (mode === "fasting") {
    if (v < 70) return {label: `${v} mg/dL (Fasting)`, badge: "Low", cls: "low", note: "Fasting <70 may indicate hypoglycemia."};
    if (v <= 99) return {label: `${v} mg/dL (Fasting)`, badge: "Normal", cls: "ok", note: "70–99."};
    if (v <= 125) return {label: `${v} mg/dL (Fasting)`, badge: "Borderline", cls: "warn", note: "Prediabetes range (100–125)."};
    return {label: `${v} mg/dL (Fasting)`, badge: "High", cls: "high", note: "Diabetes range (≥126)."};
  } else { // random/post-meal
    if (v < 70) return {label: `${v} mg/dL (Random)`, badge: "Low", cls: "low", note: "Random <70 may indicate hypoglycemia."};
    if (v < 140) return {label: `${v} mg/dL (Random)`, badge: "Normal", cls: "ok", note: "<140."};
    if (v <= 199) return {label: `${v} mg/dL (Random)`, badge: "Borderline", cls: "warn", note: "Prediabetes range (140–199)."};
    return {label: `${v} mg/dL (Random)`, badge: "High", cls: "high", note: "Diabetes range (≥200)."};
  }
}

/* Form behavior */
const form = $("#health-form");
const errorBox = $("#formError");

function readInputs() {
  const hb = parseFloat($("#hb").value);
  const sys = parseInt($("#bpSys").value, 10);
  const dia = parseInt($("#bpDia").value, 10);
  const sugar = parseFloat($("#sugar").value);
  const sugarMode = $("#sugarMode").value;
  return { hb, sys, dia, sugar, sugarMode };
}

function validate({hb, sys, dia, sugar}) {
  const errs = [];
  if (isNaN(hb) || hb < 1 || hb > 25) errs.push("HB must be 1–25 g/dL.");
  if (isNaN(sys) || sys < 60 || sys > 260) errs.push("Systolic BP must be 60–260 mmHg.");
  if (isNaN(dia) || dia < 40 || dia > 160) errs.push("Diastolic BP must be 40–160 mmHg.");
  if (isNaN(sugar) || sugar < 30 || sugar > 500) errs.push("Sugar must be 30–500 mg/dL.");
  return errs;
}

function render({hb, sys, dia, sugar, sugarMode}) {
  const hbRes = classifyHB(hb);
  const bpRes = classifyBP(sys, dia);
  const suRes = classifySugar(sugar, sugarMode);

  setText("#hbValue", hbRes.label);
  setBadge("#hbBadge", hbRes.badge, hbRes.cls);
  setText("#hbNote", hbRes.note);

  setText("#bpValue", bpRes.label);
  setBadge("#bpBadge", bpRes.badge, bpRes.cls);
  setText("#bpNote", bpRes.note);

  setText("#sugarValue", suRes.label);
  setBadge("#sugarBadge", suRes.badge, suRes.cls);
  setText("#sugarNote", suRes.note);
}

function saveToLocalStorage(data){
  localStorage.setItem("healthInputs", JSON.stringify(data));
}
function loadFromLocalStorage(){
  try{
    const raw = localStorage.getItem("healthInputs");
    if(!raw) return;
    const saved = JSON.parse(raw);
    if(saved.hb) $("#hb").value = saved.hb;
    if(saved.sys) $("#bpSys").value = saved.sys;
    if(saved.dia) $("#bpDia").value = saved.dia;
    if(saved.sugar) $("#sugar").value = saved.sugar;
    if(saved.sugarMode) $("#sugarMode").value = saved.sugarMode;
    render(readInputs());
  }catch(e){}
}

/* Events */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  errorBox.textContent = "";
  const data = readInputs();
  const errs = validate(data);
  if (errs.length){
    errorBox.textContent = errs.join(" ");
    return;
  }
  render(data);
  saveToLocalStorage(data);
});

$("#clearBtn").addEventListener("click", () => {
  setText("#hbValue", "—"); setBadge("#hbBadge", "Awaiting input", ""); setText("#hbNote", "");
  setText("#bpValue", "—"); setBadge("#bpBadge", "Awaiting input", ""); setText("#bpNote", "");
  setText("#sugarValue", "—"); setBadge("#sugarBadge", "Awaiting input", ""); setText("#sugarNote", "");
  errorBox.textContent = "";
  localStorage.removeItem("healthInputs");
});

// Live update on change (nice UX)
["hb","bpSys","bpDia","sugar","sugarMode"].forEach(id=>{
  const el = document.getElementById(id);
  el.addEventListener("input", () => {
    const data = readInputs();
    render(data);
  });
});

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Initialize
loadFromLocalStorage();
render(readInputs());
