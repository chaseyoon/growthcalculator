// 키·몸무게·BMI 백분위 계산기 공통 스크립트. calc.js, growth.js 다음에 불러온다.
// form#form 의 data-indicator 가 height | weight | bmi | head
(function () {
  const form = $("form"), indicator = form.dataset.indicator;
  const t = today(), y = t.getUTCFullYear();
  fillYmd("b", yearsRange(y, y - 18));
  fillYmd("m", yearsRange(y, y - 18));
  $("my").value = y; $("mm").value = t.getUTCMonth() + 1; $("md").value = t.getUTCDate();
  let lmsPromise = fetch("/lms.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });

  function verdict(p, month) {
    if (indicator === "height") return p < 3 ? "저신장 기준(3백분위 미만)" : p > 97 ? "큰 편(97백분위 초과)" : "정상 범위";
    if (indicator === "bmi") return p >= 95 ? "비만 기준" : p >= 85 ? "과체중 기준" : p < 5 ? "저체중 기준" : "정상 범위";
    if (indicator === "head") return p < 3 ? (month < 24 ? "작은 편(3백분위 미만, 소두증 선별 기준)" : "작은 편(3백분위 미만)") : p < 5 ? "작은 편(3~5백분위)" :
      p < 95 ? "보통(5~95백분위)" : p <= 97 ? "큰 편(95~97백분위)" : "큰 편(97백분위 초과)";
    return p < 3 ? "적은 편(3백분위 미만)" : p > 97 ? "많은 편(97백분위 초과)" : "정상 범위";
  }

  // 3백분위 Z = -1.8808 (표준정규분포)
  function headRange(lms, sex, month) {
    const r = lmsRow(lms, "head", sex, month), z3 = 1.880793608;
    return row("3백분위 (작은 쪽 기준)", `${valueAt(-z3, r).toFixed(1)}cm`) + row("97백분위 (큰 쪽 기준)", `${valueAt(z3, r).toFixed(1)}cm`);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const out = $("out");
    const birth = readYmd("b"), measured = readYmd("m"), sex = $("sex").value;
    const height = parseFloat(($("height") || {}).value), weight = parseFloat(($("weight") || {}).value);
    const value = indicator === "head" ? parseFloat($("head").value) :
      indicator === "height" ? height : indicator === "weight" ? weight : weight / Math.pow(height / 100, 2);
    if (!birth || !measured || !(value > 0)) { out.innerHTML = `<p class="err">생년월일, 측정일, ${indicator === "head" ? "머리둘레" : "키·몸무게"}를 정확히 입력해 주세요.</p>`; return; }
    const month = monthsBetween(birth, measured);
    let lms;
    try { lms = await lmsPromise; } catch { out.innerHTML = '<p class="err">성장도표 데이터를 불러오지 못했습니다. 새로고침 해 주세요.</p>'; lmsPromise = fetch("/lms.json").then((r) => r.json()); return; }
    const r = month >= 0 ? assess(lms, indicator, sex, month, value) : null;
    if (!r) {
      out.innerHTML = indicator === "bmi" && month >= 0 && month < 24
        ? '<p class="err">BMI 백분위는 만 2세(24개월)부터 계산합니다.</p>'
        : indicator === "head"
        ? '<p class="err">머리둘레 백분위는 출생부터 만 6세(72개월)까지 계산합니다. 날짜를 확인해 주세요.</p>'
        : '<p class="err">만 0~18세 아이만 계산할 수 있습니다. 날짜를 확인해 주세요.</p>';
      return;
    }
    const unit = indicator === "height" || indicator === "head" ? "cm" : indicator === "weight" ? "kg" : "";
    let html = row("월령", `${Math.floor(month / 12)}세 ${month % 12}개월`);
    if (indicator === "bmi") html += row("BMI", value.toFixed(1));
    html += row("백분위", `${r.percentile.toFixed(1)}%`) + row("판정", verdict(r.percentile, month)) +
      row("같은 월령 중앙값", `${r.median.toFixed(1)}${unit}`) +
      (indicator === "head" ? headRange(lms, sex, month) : "") +
      `<p class="note">같은 성별·월령 아이 100명 중 작은 쪽부터 약 ${Math.max(1, Math.round(r.percentile))}번째입니다. 통계적 추정이며 진단이 아닙니다.</p>`;
    out.innerHTML = html;
  });
})();
