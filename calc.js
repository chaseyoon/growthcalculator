// 계산기 페이지 공통 도우미. 날짜는 모두 UTC 자정 기준 Date로 다룬다(시간대·서머타임 영향 제거).
const $ = (id) => document.getElementById(id);
const DAY = 86400000;
const WEEKDAYS = "일월화수목금토";

function utc(y, m, d) { return new Date(Date.UTC(y, m - 1, d)); }

function today() {
  const n = new Date();
  return utc(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

function addDays(date, days) { return new Date(date.getTime() + days * DAY); }

function daysBetween(a, b) { return Math.round((b - a) / DAY); }

// prefix+"y" / "m" / "d" 셀렉트 3개를 채운다. years는 표시 순서대로.
function fillYmd(prefix, years) {
  const add = (el, label, values, suffix) => {
    el.add(new Option(label, ""));
    for (const v of values) el.add(new Option(v + suffix, v));
  };
  add($(prefix + "y"), "년", years, "년");
  add($(prefix + "m"), "월", Array.from({ length: 12 }, (_, i) => i + 1), "월");
  add($(prefix + "d"), "일", Array.from({ length: 31 }, (_, i) => i + 1), "일");
}

// 없는 날짜(2월 30일 등)나 빈 칸이면 null
function readYmd(prefix) {
  const y = +$(prefix + "y").value, m = +$(prefix + "m").value, d = +$(prefix + "d").value;
  if (!y || !m || !d) return null;
  const date = utc(y, m, d);
  return date.getUTCDate() === d ? date : null;
}

function yearsRange(from, to) {
  const step = from <= to ? 1 : -1;
  return Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from + i * step);
}

function fmtDate(date) {
  return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일 (${WEEKDAYS[date.getUTCDay()]})`;
}

// 만 나이 계산과 같은 규칙의 개월 차이
function monthsBetween(from, to) {
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return months;
}

// n개월 뒤 같은 날짜. 그 달에 같은 날이 없으면(1/31 → 2월) 다음 달 1일
function plusMonths(date, n) {
  const d = utc(date.getUTCFullYear(), date.getUTCMonth() + 1 + n, date.getUTCDate());
  return d.getUTCDate() === date.getUTCDate() ? d : utc(date.getUTCFullYear(), date.getUTCMonth() + 2 + n, 1);
}

function row(label, value) {
  return `<div class="row"><span>${label}</span><span><b>${value}</b></span></div>`;
}

if (typeof module !== "undefined") {
  module.exports = { utc, addDays, daysBetween, monthsBetween, plusMonths, fmtDate, yearsRange };
}
