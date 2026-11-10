// LMS 기반 성장 계산 (2017 소아청소년 성장도표). 브라우저와 node 양쪽에서 쓴다.
// lms: { height: { M: [[L,M,S], ...월령순], F: [...] }, weight: {...}, bmi: {...} }, 인덱스 = 월령 - start

function zScore(y, [L, M, S]) {
  return L === 0 ? Math.log(y / M) / S : (Math.pow(y / M, L) - 1) / (L * S);
}

function valueAt(z, [L, M, S]) {
  return L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
}

// 표준정규 누적분포. Abramowitz-Stegun 7.1.26 (오차 < 1.5e-7)
function normCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

function ageInMonths(birth, measured) {
  let months = (measured.getFullYear() - birth.getFullYear()) * 12 + (measured.getMonth() - birth.getMonth());
  if (measured.getDate() < birth.getDate()) months -= 1;
  return months;
}

function lmsRow(lms, indicator, sex, month) {
  const table = lms[indicator] && lms[indicator][sex];
  if (!table) return null;
  return table.rows[month - table.start] || null;
}

function assess(lms, indicator, sex, month, value) {
  const row = lmsRow(lms, indicator, sex, month);
  if (!row || !(value > 0)) return null;
  const z = zScore(value, row);
  return { z, percentile: normCdf(z) * 100, median: row[1] };
}

// 신장별 체중. 24개월 미만은 누운 키 표, 24~35개월·36개월 이상은 선 키 표.
// lms.json 의 wfh_* 는 start/인덱스가 '키 ÷ 간격' 단위(data/build_lms.py 참고)
const WFH = [[24, "wfh_lt2", 0.5], [36, "wfh_2to3", 0.5], [228, "wfh_ge3", 1]];

function wfhAssess(lms, sex, month, height, weight) {
  const pick = month >= 0 ? WFH.find(([end]) => month < end) : null;
  if (!pick || !(weight > 0) || !(height > 0)) return null;
  const [, table, step] = pick;
  const t = lms[table] && lms[table][sex];
  if (!t) return null;
  // ponytail: 표 간격(0.5·1cm) 사이 키는 L·M·S 선형보간. 원본에 보간 규칙이 없어 일반적인 방식을 씀
  const pos = Math.round((height / step - t.start) * 1e6) / 1e6, i = Math.floor(pos);
  const a = t.rows[i], b = pos === i ? a : t.rows[i + 1];
  if (pos < 0 || !a || !b) return { table, outOfRange: true, min: t.start * step, max: (t.start + t.rows.length - 1) * step };
  const row = a.map((v, k) => v + (b[k] - v) * (pos - i));
  const z = zScore(weight, row);
  return { table, z, percentile: normCdf(z) * 100, median: row[1], row };
}

// 현재 키 백분위가 성인(마지막 월령)까지 유지된다고 가정한 예상 성인키
function projectedAdultHeight(lms, sex, month, height) {
  const table = lms.height[sex];
  const r = assess(lms, "height", sex, month, height);
  if (!r) return null;
  return valueAt(r.z, table.rows[table.rows.length - 1]);
}

// 부모 키 중간값(MPH) 공식
function midParentalHeight(sex, father, mother) {
  return (father + mother + (sex === "M" ? 13 : -13)) / 2;
}

if (typeof module !== "undefined") {
  module.exports = { zScore, valueAt, normCdf, ageInMonths, lmsRow, assess, wfhAssess, projectedAdultHeight, midParentalHeight };
}
