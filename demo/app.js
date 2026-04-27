'use strict';

// ============================================================
// CONSTANTS
// ============================================================

const SOURCE_URL = 'https://www.seirei.or.jp/mikatahara/doc_kanwa/';
const DATA_VERSION = '2026-04-22';
const REDUCTION_FACTOR = 0.75;   // クロストレランス補正（聖隷ガイド準拠）
const RESCUE_RATIO = 0.10;        // レスキュー量：1日量の10%

// ============================================================
// OPIOID TABLE
// oralMorphineFactor: 1単位 × 係数 = 経口モルヒネ mg/日 換算量
// ============================================================

const OPIOIDS = [
  {
    id: 'morphine_oral',
    name: 'モルヒネ 経口',
    group: 'モルヒネ',
    routeType: 'oral',
    unit: 'mg/日',
    unitKey: 'mg_day',
    oralMorphineFactor: 1.0,
    halfLifeHours: 4,
    brands: ['MSコンチン（SR）', 'カディアン（SR）', 'オプソ（速放）'],
    sr_freq: '1日2回',
    contraindications: ['renal_severe'],
  },
  {
    id: 'morphine_inj',
    name: 'モルヒネ 注射',
    group: 'モルヒネ',
    routeType: 'injection',
    unit: 'mg/日',
    unitKey: 'mg_day',
    oralMorphineFactor: 3.0,
    halfLifeHours: 4,
    brands: ['モルヒネ塩酸塩注'],
    contraindications: ['renal_severe'],
  },
  {
    id: 'oxycodone_oral',
    name: 'オキシコドン 経口',
    group: 'オキシコドン',
    routeType: 'oral',
    unit: 'mg/日',
    unitKey: 'mg_day',
    oralMorphineFactor: 1.5,
    halfLifeHours: 5,
    brands: ['オキシコンチンTR（SR）', 'オキノーム（速放）'],
    sr_freq: '1日2回',
    contraindications: [],
  },
  {
    id: 'oxycodone_inj',
    name: 'オキシコドン 注射',
    group: 'オキシコドン',
    routeType: 'injection',
    unit: 'mg/日',
    unitKey: 'mg_day',
    oralMorphineFactor: 3.0,
    halfLifeHours: 4,
    brands: ['オキファスト注'],
    contraindications: [],
  },
  {
    id: 'fentanyl_patch',
    name: 'フェンタニル 貼付',
    group: 'フェンタニル',
    routeType: 'transdermal',
    unit: 'μg/時',
    unitKey: 'mcg_hr',
    oralMorphineFactor: 2.5,
    halfLifeHours: 17,
    brands: ['フェントス', 'デュロテップMT', 'ワンデュロ'],
    contraindications: [],
    availableSizes: [12.5, 25, 50, 75, 100],
  },
  {
    id: 'fentanyl_inj',
    name: 'フェンタニル 注射',
    group: 'フェンタニル',
    routeType: 'injection',
    unit: 'μg/時',
    unitKey: 'mcg_hr',
    oralMorphineFactor: 3.0,
    halfLifeHours: 4,
    brands: ['フェンタニル注射液'],
    contraindications: [],
  },
  {
    id: 'hydromorphone_oral',
    name: 'ヒドロモルフォン 経口',
    group: 'ヒドロモルフォン',
    routeType: 'oral',
    unit: 'mg/日',
    unitKey: 'mg_day',
    oralMorphineFactor: 5.0,
    halfLifeHours: 3,
    brands: ['ナルサス（SR）', 'ナルラピド（速放）'],
    sr_freq: '1日1回',
    contraindications: [],
  },
  {
    id: 'hydromorphone_inj',
    name: 'ヒドロモルフォン 注射',
    group: 'ヒドロモルフォン',
    routeType: 'injection',
    unit: 'mg/日',
    unitKey: 'mg_day',
    oralMorphineFactor: 15.0,
    halfLifeHours: 3,
    brands: ['ナルベイン注'],
    contraindications: [],
  },
];

// ============================================================
// COMMERCIAL FORMULATION SIZES（市販規格）
// ============================================================

const FORMULATIONS = {
  morphine_oral: {
    sr:  [10, 30, 60],
    ir:  [5, 10, 20],
    hintLabel: 'SR錠: 10/30/60mg　速放: 5/10/20mg',
  },
  morphine_inj: {
    free: true, // 任意濃度で調製
    hintLabel: '任意濃度で調製（標準: 1mg/mL）',
  },
  oxycodone_oral: {
    sr:  [5, 10, 20, 40],
    ir:  [2.5, 5, 10, 20],
    hintLabel: 'SR錠: 5/10/20/40mg　速放: 2.5/5/10/20mg',
  },
  oxycodone_inj: {
    free: true,
    hintLabel: '任意濃度で調製',
  },
  fentanyl_patch: {
    fixed: [12.5, 25, 50, 75, 100],
    hintLabel: '規格: 12.5/25/50/75/100 μg/時',
  },
  fentanyl_inj: {
    free: true,
    hintLabel: '任意速度で投与（標準: 25μg/mLなど）',
  },
  hydromorphone_oral: {
    sr:  [2, 4, 6, 8, 12, 16, 24, 32],
    ir:  [1, 2, 4, 8],
    hintLabel: 'SR錠: 2/4/6/8/12/16/24/32mg　速放: 1/2/4/8mg',
  },
  hydromorphone_inj: {
    free: true,
    hintLabel: '2mg/mL製剤（任意量調製可）',
  },
};

// ============================================================
// DRUG PROFILES for comparison cards
// 聖隷三方原病院 症状緩和ガイド・添付文書に基づく主要特性
// ============================================================

const DRUG_PROFILE = {
  morphine_oral:       { pros: ['規格・剤形が豊富', '低コスト'], cons: ['腎障害でM6G蓄積↑'] },
  morphine_inj:        { pros: ['用量調整が迅速'], cons: ['腎障害でM6G蓄積↑'] },
  oxycodone_oral:      { pros: ['軽〜中等度腎障害でも使用可'], cons: ['経口服薬が前提'] },
  oxycodone_inj:       { pros: ['腎障害でも使用可', '経口不要'], cons: ['入手しにくい施設あり'] },
  fentanyl_patch:      { pros: ['経口不要', '72時間毎（貼替）'], cons: ['定常状態まで12〜24h', '剥離後も残存12〜24h'] },
  fentanyl_inj:        { pros: ['腎障害でも使用可', '経口不要'], cons: ['持続ポンプが必要'] },
  hydromorphone_oral:  { pros: ['1日1回（SR）', '腎障害でも使用可'], cons: ['高力価（5倍）—用量注意'] },
  hydromorphone_inj:   { pros: ['少量で効果', '腎障害でも使用可'], cons: ['高力価（15倍）—用量注意'] },
};

// ============================================================
// ROUTE CHANGE TIMING RULES
// ============================================================

const TIMING_RULES = {
  oral_to_oral: {
    title: '経口 → 経口',
    steps: ['前薬の次回投与タイミングで新薬を開始', '中断期間不要'],
    bridging: false, residualRisk: false, waitH: 0,
  },
  oral_to_injection: {
    title: '経口 → 持続注射',
    steps: ['最終経口投与から2〜4時間後に持続注射を開始', '速放剤は4h・SR剤は6h後を目安'],
    bridging: false, residualRisk: false, waitH: 3,
  },
  oral_to_transdermal: {
    title: '経口 → 貼付',
    steps: ['貼付と同時に経口を最後の1回投与', '貼付後12〜24時間は経口を継続（ブリッジング）', '定常状態確認後に経口を中止'],
    bridging: true, bridgingH: 12, residualRisk: false, waitH: 0,
  },
  injection_to_oral: {
    title: '持続注射 → 経口',
    steps: ['注射中断の4時間前に経口薬を投与開始', '効果発現確認後に注射を中止', '重複期間（最大4h）の過鎮静に注意'],
    bridging: true, bridgingH: 4, residualRisk: false, waitH: 0,
  },
  injection_to_transdermal: {
    title: '持続注射 → 貼付',
    steps: ['貼付と同時に注射を継続', '貼付後12〜24時間で注射を中止（定常状態到達後）'],
    bridging: true, bridgingH: 12, residualRisk: false, waitH: 0,
  },
  injection_to_injection: {
    title: '持続注射 → 持続注射',
    steps: ['旧注射を中止と同時に新注射を開始', '切替後30〜60分はバイタル確認'],
    bridging: false, residualRisk: false, waitH: 0,
  },
  transdermal_to_oral: {
    title: '貼付 → 経口',
    steps: ['貼付剤除去と同時に経口薬を開始', '除去後12〜24時間は残存効果あり（T½≈17h）', '初期24時間は計算量の50〜75%に減量し過鎮静を回避', '12〜24時間後に再評価・増量検討'],
    bridging: false, residualRisk: true, waitH: 0, initialRatio: 0.5,
  },
  transdermal_to_injection: {
    title: '貼付 → 持続注射',
    steps: ['貼付剤除去と同時に持続注射を開始', '除去後12〜24時間は残存フェンタニルに注意', '初期24時間は計算速度の50%で開始し、再評価後に増量'],
    bridging: false, residualRisk: true, waitH: 0, initialRatio: 0.5,
  },
  transdermal_to_transdermal: {
    title: '貼付 → 貼付',
    steps: ['旧パッチ除去と同時に新パッチを貼付', '異種オピオイド貼付剤間はクロストレランス補正を適用'],
    bridging: false, residualRisk: true, waitH: 0,
  },
};

// ============================================================
// STATE
// ============================================================

const state = {
  step: 1,
  patient: { ageGroup: '', renalFunction: 'normal' },
  current: {
    drugId: 'morphine_oral',
    dosePerAdmin: 10,
    freqPerDay: 2,
    includeRescue: false,
    rescueDose: 5,
    rescueCount: 0,
    lastDoseTime: '',
  },
  candidates: [],
  selectedId: null,
  auditLog: [],
  confirmedHard: false,
};

// ============================================================
// CLINICAL HELPERS
// ============================================================

function getDrug(id) { return OPIOIDS.find(o => o.id === id); }

function calcTotalDailyDose(cur) {
  const drug = getDrug(cur.drugId);
  const isOral = drug?.routeType === 'oral';
  const regular = cur.dosePerAdmin * (isOral ? cur.freqPerDay : 1);
  const rescue = cur.includeRescue ? cur.rescueDose * cur.rescueCount : 0;
  return regular + rescue;
}

function clinicalRound(value, drug) {
  if (drug.routeType === 'transdermal' && drug.availableSizes) {
    return drug.availableSizes.reduce((prev, cur) =>
      Math.abs(cur - value) < Math.abs(prev - value) ? cur : prev
    );
  }
  return Math.round(value * 2) / 2; // 0.5mg刻み
}

function checkContraindications(drug, patient) {
  const warnings = [];
  if (drug.contraindications.includes('renal_severe') && patient.renalFunction === 'severe') {
    warnings.push({ severity: 'hard', text: `腎機能高度障害（eGFR＜30）：M6G蓄積→呼吸抑制リスク。原則禁忌。` });
  }
  if (drug.contraindications.includes('renal_severe') && patient.renalFunction === 'mild') {
    warnings.push({ severity: 'soft', text: `腎機能低下あり：M6G蓄積に注意。少量から開始し呼吸・意識を観察。` });
  }
  if (patient.ageGroup === '>=75') {
    warnings.push({ severity: 'soft', text: `高齢者（75歳以上）：薬物蓄積リスク↑。通常量の50〜75%から開始。` });
  }
  return warnings;
}

// ============================================================
// INPUT VALIDATION（市販規格チェック）
// ============================================================

function validateDoseInput(drugId, dosePerAdmin, freqPerDay) {
  const form = FORMULATIONS[drugId];
  if (!form || form.free) return null;

  // 固定規格（フェンタニル貼付）
  if (form.fixed) {
    if (!form.fixed.includes(dosePerAdmin)) {
      const nearest = form.fixed.reduce((p, c) =>
        Math.abs(c - dosePerAdmin) < Math.abs(p - dosePerAdmin) ? c : p
      );
      return {
        level: 'error',
        msg: `⚠ ${dosePerAdmin}μg/時は市販規格外です（${form.hintLabel}）。最近傍: ${nearest}μg/時 — 入力値をご確認ください。`,
      };
    }
    return null;
  }

  // 経口SR（錠剤規格チェック）
  if (form.sr) {
    const allSizes = [...form.sr, ...(form.ir || [])];
    if (!allSizes.includes(dosePerAdmin)) {
      const nearestSR = form.sr.reduce((p, c) =>
        Math.abs(c - dosePerAdmin) < Math.abs(p - dosePerAdmin) ? c : p
      );
      return {
        level: 'warn',
        msg: `⚠ ${dosePerAdmin}mgの錠剤は市販されていません（${form.hintLabel}）。最近傍SR規格: ${nearestSR}mg — 入力値をご確認ください。`,
      };
    }
  }
  return null;
}

// ============================================================
// CANDIDATE GENERATION（全候補を自動生成）
// ============================================================

function generateCandidates() {
  const from = getDrug(state.current.drugId);
  if (!from) return [];

  const totalDailyDose = calcTotalDailyDose(state.current);
  const ome = totalDailyDose * from.oralMorphineFactor;

  const candidates = OPIOIDS
    .filter(to => to.id !== from.id)
    .map(to => {
      const rawDose    = ome / to.oralMorphineFactor;
      const adjDose    = rawDose * REDUCTION_FACTOR;
      const rescueDose = to.unitKey === 'mcg_hr' ? adjDose : adjDose * RESCUE_RATIO;
      const rounded    = clinicalRound(adjDose, to);
      const roundedRescue = clinicalRound(rescueDose, to);
      const ciWarnings = checkContraindications(to, state.patient);
      const hasHard    = ciWarnings.some(w => w.severity === 'hard');
      const hasSoft    = ciWarnings.some(w => w.severity === 'soft');
      const timingKey  = `${from.routeType}_to_${to.routeType}`;
      const timing     = TIMING_RULES[timingKey] || null;
      const profile    = DRUG_PROFILE[to.id] || { pros: [], cons: [] };
      const sortScore  = hasHard ? 0 : hasSoft ? 1 : 2;

      return {
        drug: to, from, ome, totalDailyDose,
        rawDose, adjDose, rounded, rescueDose, roundedRescue,
        ciWarnings, hasHard, hasSoft, timing, profile, sortScore,
        formula: {
          s1: `${totalDailyDose.toFixed(1)} ${from.unit} × ${from.oralMorphineFactor} = ${ome.toFixed(1)} mg/日（経口モルヒネ換算）`,
          s2: `${ome.toFixed(1)} ÷ ${to.oralMorphineFactor} = ${rawDose.toFixed(1)} ${to.unit}（等価量）`,
          s3: `${rawDose.toFixed(1)} × ${REDUCTION_FACTOR} = ${adjDose.toFixed(1)} ${to.unit}（クロストレランス補正）`,
          s4: to.unitKey === 'mcg_hr'
            ? `レスキュー = ${adjDose.toFixed(1)} μg（1時間分ボーラス）`
            : `レスキュー = ${adjDose.toFixed(1)} × ${RESCUE_RATIO} = ${rescueDose.toFixed(1)} ${to.unit}/回`,
        },
      };
    })
    .sort((a, b) => {
      if (b.sortScore !== a.sortScore) return b.sortScore - a.sortScore;
      const routeOrder = { oral: 0, transdermal: 1, injection: 2 };
      return (routeOrder[a.drug.routeType] ?? 3) - (routeOrder[b.drug.routeType] ?? 3);
    });

  state.candidates = candidates;
  state.auditLog.push({
    ts: new Date().toISOString(),
    action: 'generate_candidates',
    fromDrug: from.id,
    ome: ome.toFixed(1),
    count: candidates.length,
  });

  return candidates;
}

// ============================================================
// STEP 3: COMPARISON TABLE
// ============================================================

// 投与量セル（コンパクト表示）
function fmtDoseCell(c) {
  const d = c.drug;
  if (d.routeType === 'oral') {
    const n = d.id === 'hydromorphone_oral' ? 1 : 2;
    return `<div class="ct-dose">${c.rounded.toFixed(1)} mg/日</div>
            <div class="ct-sub">${(c.rounded / n).toFixed(1)}mg × ${d.sr_freq || '1日2回'}</div>`;
  }
  if (d.routeType === 'transdermal') {
    return `<div class="ct-dose">${c.rounded} μg/時</div>
            <div class="ct-sub">パッチ（計算値 ${c.adjDose.toFixed(1)}）</div>`;
  }
  if (d.unitKey === 'mcg_hr') {
    return `<div class="ct-dose">${c.adjDose.toFixed(1)} μg/時</div>
            <div class="ct-sub">持続注射</div>`;
  }
  return `<div class="ct-dose">${c.adjDose.toFixed(1)} mg/日</div>
          <div class="ct-sub">${(c.adjDose / 24).toFixed(2)} mg/時</div>`;
}

// 経路ラベル
function routeTag(rt) {
  return { oral: '経口', injection: '注射', transdermal: '貼付' }[rt] ?? rt;
}

// ステータスバッジ
function statusCell(c) {
  if (c.hasHard) {
    const reason = c.ciWarnings[0] ? `<div class="ct-ci-reason">${escHtml(c.ciWarnings[0].text)}</div>` : '';
    return `<span class="ct-badge ci">禁忌相当</span>${reason}`;
  }
  if (c.hasSoft) {
    const reason = c.ciWarnings[0] ? `<div class="ct-ci-reason warn">${escHtml(c.ciWarnings[0].text)}</div>` : '';
    return `<span class="ct-badge warn">要注意</span>${reason}`;
  }
  return `<span class="ct-badge ok">適合</span>`;
}

function renderStep3() {
  const el = document.getElementById('step3Content');
  if (!el) return;
  const cs = state.candidates;
  if (!cs.length) {
    el.innerHTML = '<p class="muted">候補が見つかりません。入力内容を確認してください。</p>';
    return;
  }

  const ome     = cs[0]?.ome?.toFixed(1) ?? '--';
  const from    = cs[0]?.from;

  // 列ヘッダー（薬剤名）
  const thCols = cs.map(c => {
    const topColor = c.hasHard ? '#ef4444' : c.hasSoft ? '#f59e0b' : '#22c55e';
    const ciCls   = c.hasHard ? ' ct-col-ci' : '';
    return `<th class="ct-col${ciCls}" style="border-top:3px solid ${topColor}">
      <div class="ct-drug-name">${escHtml(c.drug.group)}</div>
      <span class="ct-route-tag">${routeTag(c.drug.routeType)}</span>
    </th>`;
  }).join('');

  // 行データ生成
  function row(labelHtml, cellsFn) {
    const cells = cs.map(c => {
      const ciCls = c.hasHard ? ' ct-col-ci' : '';
      return `<td class="ct-col${ciCls}">${cellsFn(c)}</td>`;
    }).join('');
    return `<tr><th class="ct-rlabel" scope="row">${labelHtml}</th>${cells}</tr>`;
  }

  const tableHtml = `
    <tr><th class="ct-rlabel-head"></th>${thCols}</tr>
    ${row('推奨量',  c => fmtDoseCell(c))}
    ${row('特長',    c => c.profile.pros.slice(0,2).map(p => `<div class="ct-pro">${escHtml(p)}</div>`).join(''))}
    ${row('注意点',  c => c.profile.cons.slice(0,2).map(p => `<div class="ct-con">${escHtml(p)}</div>`).join(''))}
    ${row('適合性',  c => statusCell(c))}
    ${row('',        c => c.hasHard
        ? `<button class="ct-sel-btn" disabled>選択不可</button>`
        : `<button class="ct-sel-btn active" onclick="selectCandidate('${c.drug.id}')">選択 →</button>`
    )}
  `;

  el.innerHTML = `
    <div class="ome-banner">
      経口モルヒネ換算量: <strong>${ome} mg/日</strong>
      <span class="ome-sub">現行: ${escHtml(from?.name ?? '')}</span>
    </div>
    <p class="ct-scroll-hint">← スクロールで全候補を比較 →</p>
    <div class="ct-wrap">
      <table class="ct-table">
        ${tableHtml}
      </table>
    </div>
    <p class="manual-ref">換算根拠: <a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer">聖隷三方原病院 症状緩和ガイド</a> (${DATA_VERSION})</p>
  `;
}

// ============================================================
// CANDIDATE SELECTION → STEP 4
// ============================================================

function selectCandidate(drugId) {
  state.selectedId = drugId;
  state.confirmedHard = false;
  const c = state.candidates.find(x => x.drug.id === drugId);
  if (!c) return;

  state.auditLog.push({
    ts: new Date().toISOString(),
    action: 'select',
    drug: drugId,
    adjDose: c.adjDose.toFixed(1),
    ome: c.ome.toFixed(1),
    hardWarning: c.hasHard,
  });

  showStep(4);
  renderStep4(c);
}

// ============================================================
// STEP 4: DETAILED RESULT
// ============================================================

function renderStep4(c) {
  const el = document.getElementById('step4Content');
  if (!el) return;

  const d = c.drug;

  // --- Warnings ---
  const allWarnings = [...c.ciWarnings];
  if (c.timing?.residualRisk) {
    allWarnings.push({
      severity: 'hard',
      text: `フェンタニル貼付剤除去後12〜24時間は残存効果あり（T½≈17h）。初期${Math.round((c.timing.initialRatio ?? 0.5) * 100)}%量から開始し、呼吸・意識を頻回に観察してください。`,
    });
  }
  if (c.ome > 300) {
    allWarnings.push({ severity: 'hard', text: `経口モルヒネ換算量が${c.ome.toFixed(0)}mg/日と高値です。入力値を再確認してください。` });
  }
  if (c.ome > 120 && state.patient.renalFunction !== 'normal') {
    allWarnings.push({ severity: 'soft', text: `高用量かつ腎機能低下の組み合わせ。段階的増量と頻回再評価を行ってください。` });
  }
  const hasHard = allWarnings.some(w => w.severity === 'hard');

  const warningHtml = allWarnings.length
    ? allWarnings.map(w => {
        const cls  = w.severity === 'hard' ? 'alert-hard' : 'alert-soft';
        const icon = w.severity === 'hard' ? '🚨' : '⚠️';
        return `<div class="alert-item ${cls}">${icon} ${escHtml(w.text)}</div>`;
      }).join('')
    : `<div class="alert-item alert-ok">✅ 重大警告なし</div>`;

  // --- Dose lines ---
  let mainDose = '', rescueLine = '', hourlyLine = '';
  if (d.routeType === 'oral') {
    const freqN = d.id === 'hydromorphone_oral' ? 1 : 2;
    const per   = (c.rounded / freqN).toFixed(1);
    mainDose  = `${c.rounded.toFixed(1)} mg/日　→　${per}mg × ${freqN}回/日（${d.sr_freq || 'SR製剤'}）`;
    rescueLine = `${c.roundedRescue.toFixed(1)} mg/回（1日量の10%）`;
  } else if (d.routeType === 'transdermal') {
    mainDose  = `${c.rounded} μg/時パッチ　（計算値 ${c.adjDose.toFixed(1)} μg/時）`;
    rescueLine = `${c.roundedRescue.toFixed(1)} μg/回（速放製剤 or 1h分ボーラス）`;
    if (c.timing?.residualRisk) {
      mainDose += `<br><span class="dose-sub">⚠ 初期24h: ${(c.adjDose * (c.timing.initialRatio ?? 0.5)).toFixed(1)} μg/時相当から開始</span>`;
    }
  } else {
    // injection
    if (d.unitKey === 'mcg_hr') {
      mainDose   = `${c.adjDose.toFixed(1)} μg/時 持続`;
      hourlyLine = '';
      rescueLine = `${c.adjDose.toFixed(1)} μg/回（1時間分ボーラス）`;
    } else {
      mainDose   = `${c.adjDose.toFixed(1)} mg/日 持続`;
      hourlyLine = `（${(c.adjDose / 24).toFixed(2)} mg/時）`;
      rescueLine = `${c.roundedRescue.toFixed(1)} mg/回（1日量の10%）`;
    }
    if (c.timing?.residualRisk) {
      const initDose = (c.adjDose * (c.timing.initialRatio ?? 0.5)).toFixed(1);
      const unit     = d.unitKey === 'mcg_hr' ? 'μg/時' : 'mg/日';
      mainDose += `<br><span class="dose-sub">⚠ 初期24h: ${initDose} ${unit}から開始</span>`;
    }
  }

  // --- Timing ---
  const timing = c.timing;
  let timingHtml = '';
  if (timing) {
    const lastDose = state.current.lastDoseTime;
    let startTimeHtml = '';
    if (lastDose && timing.waitH > 0) {
      const [hh, mm] = lastDose.split(':').map(Number);
      const base = new Date(); base.setHours(hh, mm, 0, 0);
      const start = new Date(base.getTime() + timing.waitH * 3600000);
      const sh = String(start.getHours()).padStart(2, '0');
      const sm = String(start.getMinutes()).padStart(2, '0');
      startTimeHtml = `<div class="start-time">▶ 推奨開始時刻の目安: <strong>${sh}:${sm}</strong>（最終投与 ${lastDose} + ${timing.waitH}h）</div>`;
    }
    const stepsHtml = timing.steps.map(s => `<li>${escHtml(s)}</li>`).join('');
    const badges = [
      timing.bridging ? `<span class="tbadge bridge">ブリッジング ${timing.bridgingH}時間</span>` : '',
      timing.residualRisk ? `<span class="tbadge residual">残存効果あり</span>` : '',
    ].filter(Boolean).join('');
    timingHtml = `
      <div class="result-section">
        <h3>切替タイミング</h3>
        <div class="timing-title">${escHtml(timing.title)}</div>
        <ul class="timing-steps">${stepsHtml}</ul>
        ${badges}
        ${startTimeHtml}
      </div>`;
  }

  // --- Formula ---
  const formulaHtml = `
    <details class="formula-details">
      <summary>計算根拠を確認</summary>
      <div class="formula-inner">
        <div class="fline"><span class="fstep">①</span><code>${escHtml(c.formula.s1)}</code></div>
        <div class="fline"><span class="fstep">②</span><code>${escHtml(c.formula.s2)}</code></div>
        <div class="fline"><span class="fstep">③</span><code>${escHtml(c.formula.s3)}</code></div>
        <div class="fline"><span class="fstep">④</span><code>${escHtml(c.formula.s4)}</code></div>
      </div>
      <p class="fref">出典: <a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer">聖隷三方原病院 症状緩和ガイド</a> / ${DATA_VERSION}</p>
    </details>`;

  // --- Confirm section (hard warning only) ---
  const confirmHtml = hasHard ? `
    <div class="confirm-box">
      <p class="confirm-title">🚨 重要警告を確認してください</p>
      <label class="confirm-label">
        <input type="checkbox" id="hardConfirm">
        警告内容を確認し、適切に対処することを確認しました
      </label>
    </div>` : '';

  el.innerHTML = `
    <div class="result-drug-name">${escHtml(d.name)}</div>

    <div class="warnings-wrap">${warningHtml}</div>

    <div class="result-section">
      <h3>推奨投与量</h3>
      <div class="dose-line main">${mainDose}${hourlyLine ? `<span class="dose-sub">${hourlyLine}</span>` : ''}</div>
      <div class="dose-line rescue">レスキュー: ${rescueLine}</div>
      <div class="brands-line">商品例: ${escHtml((d.brands || []).join('、'))}</div>
    </div>

    ${timingHtml}
    ${formulaHtml}
    ${confirmHtml}
  `;

  if (hasHard) {
    document.getElementById('hardConfirm')?.addEventListener('change', e => {
      state.confirmedHard = e.target.checked;
      state.auditLog.push({ ts: new Date().toISOString(), action: 'confirm', checked: e.target.checked });
    });
  }
}

// ============================================================
// STEP NAVIGATION
// ============================================================

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId + 'Page')?.classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.page === pageId));
}

function showStep(n) {
  state.step = n;
  state.confirmedHard = false;
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('step' + n)?.classList.add('active');
  document.querySelectorAll('.stepper-item').forEach(item => {
    const s = Number(item.dataset.step);
    item.classList.toggle('done',    s < n);
    item.classList.toggle('current', s === n);
    item.classList.toggle('pending', s > n);
  });
  updateWizardNav();
  // Scroll to top of converter on step change (mobile)
  document.getElementById('converterPage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateWizardNav() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (!prevBtn) return;
  prevBtn.style.display = state.step > 1 ? '' : 'none';
  // Steps 1,2 have Next; step 3 is candidate selection (no next btn); step 4 has no next
  nextBtn.style.display = (state.step === 1 || state.step === 2) ? '' : 'none';
}

// ============================================================
// FORM ↔ STATE SYNC
// ============================================================

function syncPatient() {
  state.patient.ageGroup      = document.getElementById('ageGroup')?.value ?? '';
  state.patient.renalFunction = document.getElementById('renalFunction')?.value ?? 'normal';
}

function syncCurrent() {
  const drugId = document.getElementById('fromDrug')?.value;
  if (drugId) state.current.drugId = drugId;
  state.current.dosePerAdmin  = parseFloat(document.getElementById('dosePerAdmin')?.value) || 0;
  state.current.freqPerDay    = parseInt(document.getElementById('freqPerDay')?.value, 10) || 1;
  state.current.includeRescue = document.getElementById('includeRescue')?.checked ?? false;
  state.current.rescueDose    = parseFloat(document.getElementById('rescueDose')?.value) || 0;
  state.current.rescueCount   = parseInt(document.getElementById('rescueCount')?.value, 10) || 0;
  state.current.lastDoseTime  = document.getElementById('lastDoseTime')?.value ?? '';
}

function updateDrugUI() {
  const drug = getDrug(state.current.drugId);
  if (!drug) return;
  const isOral        = drug.routeType === 'oral';
  const isPatch       = drug.routeType === 'transdermal';
  const unitLabel     = document.getElementById('fromUnit');
  const freqRow       = document.getElementById('freqRow');
  const doseLabel     = document.getElementById('doseLabel');
  const sizeHint      = document.getElementById('sizeHint');
  const formHint      = FORMULATIONS[drug.id];

  if (unitLabel) unitLabel.textContent = drug.unit;
  if (freqRow)   freqRow.style.display = isOral ? '' : 'none';
  if (!isOral) { state.current.freqPerDay = 1; const f = document.getElementById('freqPerDay'); if (f) f.value = '1'; }

  if (doseLabel) {
    doseLabel.textContent = isPatch ? 'パッチ放出速度' : isOral ? '1回投与量' : '1日総量 / 持続速度';
  }
  if (sizeHint) {
    sizeHint.textContent = formHint?.hintLabel ?? '';
    sizeHint.style.display = formHint?.hintLabel ? '' : 'none';
  }
}

function liveValidate() {
  const el = document.getElementById('doseValidation');
  if (!el) return;
  syncCurrent();
  const result = validateDoseInput(state.current.drugId, state.current.dosePerAdmin, state.current.freqPerDay);
  if (result) {
    el.className = 'validation-msg ' + (result.level === 'error' ? 'v-error' : 'v-warn');
    el.textContent = result.msg;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

// ============================================================
// VALIDATION
// ============================================================

function validateStep(n) {
  if (n === 1) {
    if (!state.patient.ageGroup) { toast('年齢層を選択してください'); return false; }
  }
  if (n === 2) {
    if (!state.current.dosePerAdmin || state.current.dosePerAdmin <= 0) {
      toast('投与量を正しく入力してください'); return false;
    }
    const drug = getDrug(state.current.drugId);
    if (drug?.routeType === 'oral' && (!state.current.freqPerDay || state.current.freqPerDay < 1)) {
      toast('投与回数を入力してください'); return false;
    }
    // Hard-block on formulation mismatch
    const v = validateDoseInput(state.current.drugId, state.current.dosePerAdmin, state.current.freqPerDay);
    if (v?.level === 'error') {
      toast(v.msg); return false;
    }
  }
  return true;
}

function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) { alert(msg); return; }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

// ============================================================
// AUDIT LOG
// ============================================================

function renderAuditLog() {
  const el = document.getElementById('auditLogList');
  if (!el) return;
  if (!state.auditLog.length) { el.innerHTML = '<li class="muted">操作なし</li>'; return; }
  el.innerHTML = state.auditLog.slice().reverse().map(e => {
    const ts = new Date(e.ts).toLocaleTimeString('ja-JP');
    if (e.action === 'generate_candidates') return `<li>[${ts}] 候補生成: ${e.fromDrug} / OME=${e.ome}mg/日 / ${e.count}件</li>`;
    if (e.action === 'select')             return `<li>[${ts}] 選択: ${e.drug} / 調整後${e.adjDose}${getDrug(e.drug)?.unit ?? ''}</li>`;
    if (e.action === 'confirm')            return `<li>[${ts}] 警告確認: ${e.checked ? '済 ✅' : '解除'}</li>`;
    return `<li>[${ts}] ${JSON.stringify(e)}</li>`;
  }).join('');
}

// ============================================================
// OPIOID SELECT BUILDER
// ============================================================

function buildOpioidSelect(id, selectedId) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  let og = null, currentGroup = '';
  OPIOIDS.forEach(o => {
    if (o.group !== currentGroup) {
      og = document.createElement('optgroup');
      og.label = o.group;
      el.appendChild(og);
      currentGroup = o.group;
    }
    const opt = document.createElement('option');
    opt.value       = o.id;
    opt.textContent = `${o.name}（${o.unit}）`;
    if (o.id === selectedId) opt.selected = true;
    og.appendChild(opt);
  });
}

// ============================================================
// UTIL
// ============================================================

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// INIT
// ============================================================

function init() {
  buildOpioidSelect('fromDrug', state.current.drugId);

  // Populate update list
  const ul = document.getElementById('updatesList');
  if (ul) {
    [
      '2024-11-05: 「不眠」を更新',
      '2024-11-05: 「オピオイド使用中の下剤について」を更新',
      '2024-10-23: せん妄の処方例を更新',
      '2024-09-10: ヒドロモルフォン換算表を追加',
    ].forEach(u => { const li = document.createElement('li'); li.textContent = u; ul.appendChild(li); });
  }

  // Set default last dose to now
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ltEl = document.getElementById('lastDoseTime');
  if (ltEl) { ltEl.value = `${hh}:${mm}`; state.current.lastDoseTime = `${hh}:${mm}`; }

  updateDrugUI();

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  // Symptom buttons
  document.querySelectorAll('.symptom-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('disabled')) return;
      const t = btn.dataset.target;
      if (t === 'converter') { showPage('converter'); showStep(1); }
      if (t === 'dyspnea')   { showPage('dyspnea');   showDStep(1); }
    });
  });

  // Wizard nav
  document.getElementById('prevBtn')?.addEventListener('click', () => {
    if (state.step > 1) showStep(state.step - 1);
  });
  document.getElementById('nextBtn')?.addEventListener('click', () => {
    syncPatient(); syncCurrent();
    if (!validateStep(state.step)) return;
    showStep(state.step + 1);
    if (state.step === 3) {
      generateCandidates();
      renderStep3();
    }
  });

  // Drug change
  document.getElementById('fromDrug')?.addEventListener('change', () => { syncCurrent(); updateDrugUI(); liveValidate(); });

  // Live validation
  ['dosePerAdmin', 'freqPerDay'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', liveValidate);
  });

  // Rescue toggle
  document.getElementById('includeRescue')?.addEventListener('change', e => {
    document.getElementById('rescueFields').style.display = e.target.checked ? '' : 'none';
    syncCurrent();
  });

  // Quick start
  document.getElementById('quickConverterBtn')?.addEventListener('click', () => {
    showPage('converter'); showStep(1);
  });

  // Restart button
  document.getElementById('restartBtn')?.addEventListener('click', () => { showStep(1); });

  initDyspneaWizard();

  showPage('home');
  showStep(1);
}

// ============================================================
// DYSPNEA — SAFETY CHECKS DATA（聖隷三方原病院ガイド準拠）
// ============================================================

const DYSPNEA_SAFETY_CHECKS = [
  {
    id: 'altered_consciousness',
    label: '意識レベル低下',
    desc: '声かけへの反応が鈍い・開眼しない・GCS合計 ≤ 10 / 傾眠以上',
    severity: 'hard',
    impact: '経口薬の誤嚥リスク↑。オピオイドへの感受性が高まり過鎮静・呼吸抑制が生じやすい。ベンゾジアゼピン系は意識をさらに悪化させる危険あり。',
    action: '経口投与は避け注射（皮下注/静注）へ切替。初回量を通常の50%以下に設定。ベンゾジアゼピン系は原則使用しない。',
  },
  {
    id: 'airway_obstruction',
    label: '上気道閉塞の疑い',
    desc: '吸気性喘鳴（ストライダー）・頸部腫瘍圧迫・声門浮腫・気道内異物',
    severity: 'stop',
    impact: 'オピオイドの筋弛緩作用で上気道の緊張が低下し、閉塞が急速に悪化する危険があります。',
    action: '薬物療法より先に気道確保・耳鼻咽喉科/外科コンサルトを優先。腫瘍圧迫・浮腫にはデキサメタゾン 4〜8 mg 静注が有効なことあり。',
  },
  {
    id: 'hypotension',
    label: '低血圧（SBP < 90 mmHg）',
    desc: '収縮期血圧 90 mmHg 未満、または普段より 20 mmHg 以上低下',
    severity: 'hard',
    impact: 'オピオイドもベンゾジアゼピン系も血管拡張・心機能抑制により血圧をさらに低下させる。循環不全が急速に進行するリスク。',
    action: '初回量を通常の50%以下に設定。投与後15〜30分ごとに血圧・意識を確認。必要に応じ輸液・昇圧薬を並行検討。',
  },
  {
    id: 'co2_retention',
    label: 'CO2貯留リスク（COPD・慢性呼吸不全）',
    desc: 'COPD・慢性呼吸不全・PaCO2 > 45 mmHg の既往、または高炭酸ガス血症',
    severity: 'hard',
    impact: 'オピオイドが低酸素換気応答を抑制し、CO2ナルコーシス（高CO2血症→意識障害）を誘発する危険。ベンゾジアゼピン系も同様に危険。',
    action: '通常量の25〜50%から開始。SpO2目標 88〜92%（過剰酸素は禁忌）。意識・呼吸数・SpO2を投与後30分毎に確認。ベンゾジアゼピン系は避ける。',
  },
  {
    id: 'renal_severe',
    label: '腎機能高度障害（eGFR < 30 / 透析）',
    desc: 'eGFR < 30 mL/min/1.73m²、または維持透析中',
    severity: 'hard',
    impact: 'モルヒネの活性代謝物M6G（モルヒネ-6-グルクロニド）が蓄積し、遅発性の呼吸抑制・意識障害が生じる。半減期が著しく延長するため予測が困難。',
    action: 'モルヒネは原則禁忌。フェンタニル注射またはヒドロモルフォン（経口/注射）を選択。オキシコドンも腎障害では蓄積リスクあり—要注意。',
  },
  {
    id: 'renal_mild',
    label: '腎機能低下（eGFR 30〜59）',
    desc: 'eGFR 30〜59 mL/min/1.73m²（軽〜中等度低下）',
    severity: 'soft',
    impact: 'モルヒネのM6G蓄積リスクが通常より高い。過鎮静・呼吸抑制が遅れて出現する可能性あり。',
    action: 'モルヒネ使用時は通常量の50〜75%から慎重開始。4〜6時間毎に意識・呼吸数を評価。ヒドロモルフォン・フェンタニルへの代替も検討。',
  },
  {
    id: 'hepatic_severe',
    label: '重篤な肝機能障害',
    desc: 'Child-Pugh C / 重篤な肝不全（高度黄疸・肝性脳症・著明な凝固障害）',
    severity: 'soft',
    impact: 'ベンゾジアゼピン系薬剤（特に長時間作用型）の代謝が著しく遅延し、蓄積→過鎮静が生じやすい。オピオイドも代謝遅延あり。',
    action: 'ジアゼパム・クロナゼパムなど長時間作用型BZDは避ける。ミダゾラム使用時は最少量から。オピオイドも少量・頻回評価で慎重に使用。',
  },
  {
    id: 'on_opioid',
    label: '現在オピオイド定期投与中',
    desc: 'モルヒネ・オキシコドン・フェンタニル・ヒドロモルフォン等を定期使用中',
    severity: 'info',
    impact: 'オピオイド未使用者と同じ用量では過量になる可能性（耐性により逆に不十分なこともある）。新規開始ではなく「増量」が原則。',
    action: '現行1日量の25〜30%を増量する。レスキュー頻度・量も見直す。換算が必要なら「換算」タブを参照。',
  },
  {
    id: 'elderly',
    label: '高齢者（75歳以上）',
    desc: '75歳以上',
    severity: 'soft',
    impact: '腎・肝機能低下による薬物クリアランス低下、分布容積変化で蓄積しやすい。過鎮静・転倒・誤嚥リスクが高い。',
    action: '初回は通常量の50〜75%から開始。投与間隔を延ばす（q6hなど）。効果・副作用を2〜4時間毎に評価し段階的に増量。',
  },
  {
    id: 'hypoxia',
    label: 'SpO2 < 90%（低酸素血症）',
    desc: 'ルームエアでSpO2 90%未満が確認されている',
    severity: 'info',
    impact: '酸素療法の適応あり。ただし非低酸素性の呼吸困難（SpO2正常でも苦しい）では酸素は無効なことも多い。',
    action: 'CO2貯留リスクなし: 2〜4 L/分（SpO2目標 90〜94%）。COPD合併: 1〜2 L/分（SpO2目標 88〜92%、過剰酸素でCO2ナルコーシス誘発に注意）。',
  },
];

// ============================================================
// DYSPNEA — STATE
// ============================================================

const dyspneaState = {
  dstep: 1,
  nrs: null,
  canOral: null,
  hasAnxiety: false,
  onOpioid: false,
};

// ============================================================
// DYSPNEA — DRUG RECOMMENDATION ENGINE
// ============================================================

function buildDyspneaRecommendation(flags, nrs, canOral, hasAnxiety, onOpioid) {
  if (flags.has('airway_obstruction')) {
    return { blocked: true, recs: [], hardWarnings: [], softWarnings: [] };
  }

  const recs = [];
  const hardWarnings = [];
  const softWarnings = [];

  const elderly       = flags.has('elderly');
  const co2           = flags.has('co2_retention');
  const hypotension   = flags.has('hypotension');
  const consciousness = flags.has('altered_consciousness');
  const renalSevere   = flags.has('renal_severe');
  const renalMild     = flags.has('renal_mild');
  const hepatic       = flags.has('hepatic_severe');
  const hypoxia       = flags.has('hypoxia');

  const useOral = canOral && !consciousness;
  const isModified = elderly || co2 || hypotension || renalMild;

  // ---- Primary: Opioid ----
  if (onOpioid) {
    recs.push({
      level: 'primary', label: 'オピオイド増量（現行薬継続）',
      drug: '現行オピオイドを 25〜30% 増量',
      dose: '現行1日量 × 1.25〜1.30',
      doseNote: 'レスキュー（定期量の1/6）の上限回数・間隔も見直してください。投与経路変更が必要な場合は「換算」タブをご利用ください。',
      brands: '—（現行薬を継続）',
      note: 'オピオイド使用中の呼吸困難には新規追加ではなく現行量の増量が原則（聖隷ガイド準拠）。',
    });

  } else if (renalSevere) {
    // Morphine contraindicated
    hardWarnings.push({ text: '腎機能高度障害（eGFR < 30）のため、モルヒネはM6G蓄積による遅発性呼吸抑制のリスクがあり使用しないでください。' });
    if (useOral) {
      recs.push({
        level: 'primary', label: '第一選択（腎障害代替薬）',
        drug: 'ヒドロモルフォン速放製剤 経口',
        dose: elderly ? '0.5〜1 mg/回 q4〜6h（高齢—少量開始）'
            : co2    ? '0.5〜1 mg/回 q6h（CO2貯留—極少量）'
            : '1〜2 mg/回 q4h',
        doseNote: '翌日以降の効果を評価し定期量を設定。レスキューは定期量の1/6を目安に。',
        brands: 'ナルラピド® 1 mg/錠・2 mg/錠',
        note: '腎機能高度障害でも活性代謝物の蓄積が少なく安全。緩和領域での呼吸困難に有効。',
      });
    } else {
      recs.push({
        level: 'primary', label: '第一選択（腎障害・経口不能）',
        drug: 'フェンタニル 持続皮下注',
        dose: elderly || hypotension ? '6.25〜12.5 μg/時 持続'
            : co2                   ? '6.25〜12.5 μg/時 持続（CO2貯留—極少量）'
            : '12.5〜25 μg/時 持続',
        doseNote: 'レスキューは1時間分相当（μg/時 × 1）をボーラスで。',
        brands: 'フェンタニル注射液®（各社）',
        note: '腎排泄への依存が少なく、腎機能高度障害でも安全に使用できます。',
      });
    }

  } else {
    // Morphine available
    if (useOral) {
      let dose, doseNote;
      if (co2 && elderly) {
        dose = '1 mg/回 q6h（CO2貯留＋高齢—極少量）';
        doseNote = 'SpO2・意識・呼吸数を投与30分後に必ず確認。効果判定後に慎重増量。目標NRS低下と過鎮静のバランスを頻回評価。';
      } else if (co2) {
        dose = '1〜2.5 mg/回 q4〜6h（CO2貯留あり）';
        doseNote = 'CO2ナルコーシスに注意。投与後30分でSpO2・呼吸数・意識を確認。SpO2目標88〜92%。';
      } else if (hypotension && elderly) {
        dose = '1〜2.5 mg/回 q4〜6h（低血圧＋高齢—減量）';
        doseNote = '投与後15〜30分で血圧・意識を確認。必要時のみ追加投与。';
      } else if (hypotension) {
        dose = '1〜2.5 mg/回 q4〜6h（低血圧あり—減量）';
        doseNote = '投与後15〜30分で血圧を確認。';
      } else if (elderly) {
        dose = '2.5 mg/回 q4〜6h（高齢者—少量開始）';
        doseNote = '効果不十分なら2〜4時間後に2.5 mgを追加（レスキュー）。翌日以降に定期量を設定。';
      } else {
        dose = '2.5〜5 mg/回 q4h（初回は2.5 mg推奨）';
        doseNote = '効果不十分なら2〜4時間後に同量をレスキュー投与。翌日以降に定期量・SR製剤を検討。';
      }
      recs.push({
        level: isModified ? 'caution' : 'primary',
        label: isModified ? '第一選択（要注意）' : '第一選択',
        drug: 'モルヒネ速放製剤 経口',
        dose, doseNote,
        brands: 'オプソ® 2.5 mg/包・5 mg/包',
        note: '緩和ケアにおける呼吸困難の標準治療。エビデンス最多（聖隷三方原病院ガイド準拠）。',
      });
    } else {
      let dose, doseNote;
      if (co2 && elderly) {
        dose = '1 mg/日 持続皮下注';
        doseNote = 'CO2貯留＋高齢のため極少量から。SpO2・意識・呼吸数を30分毎に確認。';
      } else if (co2) {
        dose = '1〜2 mg/日 持続皮下注';
        doseNote = 'CO2ナルコーシスに注意。SpO2目標88〜92%。呼吸数・意識を頻回確認。';
      } else if (hypotension && elderly) {
        dose = '1〜2.5 mg/日 持続皮下注（低血圧＋高齢）';
        doseNote = '投与後15〜30分で血圧・SpO2を確認。';
      } else if (hypotension) {
        dose = '1〜2.5 mg/日 持続皮下注（低血圧あり）';
        doseNote = '投与後15〜30分で血圧を確認。';
      } else if (elderly) {
        dose = '2.5 mg/日 持続皮下注';
        doseNote = 'レスキューは1時間分相当（0.1 mg/時相当）をボーラスで。';
      } else {
        dose = '2.5〜5 mg/日 持続皮下注';
        doseNote: '1時間分をレスキューに使用可（例：5 mg/日 → 0.2 mg/時 → 0.2 mgボーラス）。';
        doseNote = 'レスキューは1時間分相当をボーラスで。例: 5 mg/日 = 0.2 mg/時 → レスキュー 0.2 mg。';
      }
      recs.push({
        level: isModified ? 'caution' : 'primary',
        label: isModified ? '第一選択（要注意）' : '第一選択',
        drug: 'モルヒネ注射 持続皮下注',
        dose, doseNote,
        brands: 'モルヒネ塩酸塩注® 10 mg/1 mL（各社）',
        note: '経口摂取不能例・急速なコントロールが必要な場合。',
      });
    }

    if (renalMild) {
      softWarnings.push({ text: '腎機能低下（eGFR 30〜59）：モルヒネのM6G代謝物が蓄積しやすいため、通常量の50〜75%から開始し、4〜6時間毎に過鎮静・呼吸変化を評価してください。' });
    }
  }

  // ---- Adjuvant: Benzodiazepine for anxiety ----
  if (hasAnxiety) {
    const bzContra = consciousness || co2;
    if (bzContra) {
      hardWarnings.push({ text: 'ベンゾジアゼピン系は意識レベル低下またはCO2貯留リスクがある場合は原則禁忌です。不安には非薬物療法（声かけ・顔への送風・体位調整）を優先してください。' });
    } else if (useOral) {
      recs.push({
        level: hepatic || hypotension ? 'caution' : 'adjuvant',
        label: '不安への補助薬',
        drug: 'ロラゼパム 舌下/経口',
        dose: elderly || hepatic ? '0.5 mg 舌下 q4〜6h（必要時）—最小量'
            : hypotension        ? '0.5 mg 舌下（低血圧に注意）'
            : '0.5〜1 mg 舌下 q4〜6h（必要時）',
        doseNote: '舌下投与で15〜30分で吸収。経口服薬可能な場合は内服でも可。',
        brands: 'ワイパックス® 0.5 mg/錠・1 mg/錠',
        note: '不安・恐怖感が強い呼吸困難への補助。オピオイドとの相乗効果で症状緩和。',
      });
    } else {
      recs.push({
        level: hepatic || hypotension ? 'caution' : 'adjuvant',
        label: '不安への補助薬（注射）',
        drug: 'ミダゾラム 皮下注/静注',
        dose: elderly || hepatic ? '0.5〜1 mg/回 皮下注 q4〜6h（必要時）—最小量'
            : hypotension        ? '0.5〜1 mg/回 皮下注（低血圧に注意）'
            : '1〜2 mg/回 皮下注 q4h（必要時）\nまたは5〜10 mg/日 持続皮下注',
        doseNote: '効果発現10〜15分。必要時投与を基本とし、反復が多い場合は持続注射へ移行を検討。',
        brands: 'ドルミカム® 10 mg/2 mL',
        note: '経口不能例・強い不安への補助療法。少量から開始し過鎮静に注意。',
      });
    }
  }

  // ---- Support: Oxygen for hypoxia ----
  if (hypoxia) {
    recs.push({
      level: 'support', label: '酸素療法（低酸素血症）',
      drug: '経鼻カニューラ / 簡易酸素マスク',
      dose: co2 ? '1〜2 L/分（SpO2目標 88〜92%）'
               : '2〜4 L/分（SpO2目標 90〜94%）',
      doseNote: co2
        ? 'COPD/CO2貯留リスクあり：過剰酸素で呼吸ドライブが抑制されCO2ナルコーシスを誘発します。低流量・低目標を厳守。'
        : '注意：SpO2が正常でも呼吸困難が強い場合（非低酸素性）には酸素は無効なことが多いです。症状改善を必ず確認。',
      brands: '—',
      note: 'SpO2 < 90%の低酸素血症あり。原因疾患（肺炎・胸水・肺塞栓など）の評価・治療も並行検討。',
    });
  }

  // ---- NRS-based severity comment ----
  if (!onOpioid && nrs !== null) {
    if (nrs >= 7) {
      hardWarnings.push({ text: `NRS ${nrs}/10 と高値です。初回投与後30〜60分で再評価し、効果不十分なら即時レスキューを検討してください。` });
    } else if (nrs >= 4) {
      softWarnings.push({ text: `NRS ${nrs}/10 の中等度以上です。投与後1〜2時間で症状を再評価し、目標 NRS ≤ 3 を目指してください。` });
    }
  }

  return { blocked: false, recs, hardWarnings, softWarnings };
}

// ============================================================
// DYSPNEA — WIZARD STEP CONTROL
// ============================================================

function showDStep(n) {
  dyspneaState.dstep = n;
  document.querySelectorAll('.dstep-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('dstep' + n)?.classList.add('active');
  document.querySelectorAll('.dstepper-item').forEach(item => {
    const s = Number(item.dataset.dstep);
    item.classList.toggle('done',    s < n);
    item.classList.toggle('current', s === n);
    item.classList.toggle('pending', s > n);
  });
  updateDWizardNav();
  document.getElementById('dyspneaPage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateDWizardNav() {
  const prev = document.getElementById('dprevBtn');
  const next = document.getElementById('dnextBtn');
  if (!prev || !next) return;
  prev.style.display = dyspneaState.dstep > 1 ? '' : 'none';
  next.style.display = dyspneaState.dstep < 4 ? '' : 'none';
  if (dyspneaState.dstep === 2) next.textContent = '推奨薬剤を確認 →';
  else if (dyspneaState.dstep === 3) next.textContent = 'モニタリングへ →';
  else next.textContent = '次へ →';
}

function syncDStep2() {
  const oralRadio    = document.querySelector('input[name="dysp_oral"]:checked');
  const anxietyRadio = document.querySelector('input[name="dysp_anxiety"]:checked');
  const opioidRadio  = document.querySelector('input[name="dysp_onopioid"]:checked');
  dyspneaState.canOral    = oralRadio    ? oralRadio.value === 'yes'    : null;
  dyspneaState.hasAnxiety = anxietyRadio ? anxietyRadio.value === 'yes' : false;
  dyspneaState.onOpioid   = opioidRadio  ? opioidRadio.value === 'yes'  : false;
}

function validateDStep(n) {
  if (n === 2) {
    if (dyspneaState.nrs === null)   { toast('呼吸困難の強さ（NRS）を選択してください'); return false; }
    if (dyspneaState.canOral === null){ toast('経口投与の可否を選択してください'); return false; }
  }
  return true;
}

// ============================================================
// DYSPNEA — SAFETY CHECKLIST RENDER
// ============================================================

function getDyspneaFlags() {
  const flags = new Set();
  DYSPNEA_SAFETY_CHECKS.forEach(c => {
    if (document.getElementById('sc_' + c.id)?.checked) flags.add(c.id);
  });
  return flags;
}

function updateSafetyFlagSummary() {
  const flags      = getDyspneaFlags();
  const summaryEl  = document.getElementById('safetyFlagSummary');
  const stopBanner = document.getElementById('stopBanner');

  if (stopBanner) stopBanner.classList.toggle('visible', flags.has('airway_obstruction'));

  if (!summaryEl) return;
  if (flags.size === 0) { summaryEl.style.display = 'none'; return; }

  const activeChecks = DYSPNEA_SAFETY_CHECKS.filter(c => flags.has(c.id));
  const chips = activeChecks.map(c =>
    `<span class="aflag aflag-${c.severity === 'stop' ? 'stop' : c.severity}">${escHtml(c.label)}</span>`
  ).join('');
  summaryEl.innerHTML = `<span style="font-size:0.78rem;color:#6b7280;margin-right:6px;">選択中:</span>${chips}`;
  summaryEl.style.display = 'block';
}

function renderDSafetyChecklist() {
  const el = document.getElementById('safetyChecklist');
  if (!el) return;
  el.innerHTML = '';

  DYSPNEA_SAFETY_CHECKS.forEach(check => {
    const div = document.createElement('div');
    div.className = `safety-item sev-${check.severity}`;
    div.dataset.checkId = check.id;

    div.innerHTML = `
      <div class="safety-item-header">
        <input type="checkbox" id="sc_${check.id}" data-check-id="${escHtml(check.id)}">
        <div class="safety-item-text">
          <div class="safety-item-label">${escHtml(check.label)}</div>
          <div class="safety-item-desc">${escHtml(check.desc)}</div>
        </div>
      </div>
      <div class="safety-impact">
        <div class="impact-text"><strong>影響:</strong> ${escHtml(check.impact)}</div>
        <div class="action-text"><strong>対処:</strong> ${escHtml(check.action)}</div>
      </div>
    `;

    const cb = div.querySelector('input[type="checkbox"]');
    function toggle() {
      div.classList.toggle('active', cb.checked);
      updateSafetyFlagSummary();
    }
    cb.addEventListener('change', toggle);
    div.addEventListener('click', e => {
      if (e.target !== cb) { cb.checked = !cb.checked; toggle(); }
    });

    el.appendChild(div);
  });
}

// ============================================================
// DYSPNEA — STEP 3 RENDER（推奨薬剤）
// ============================================================

function renderDStep3() {
  const flags    = getDyspneaFlags();
  const result   = buildDyspneaRecommendation(flags, dyspneaState.nrs, dyspneaState.canOral, dyspneaState.hasAnxiety, dyspneaState.onOpioid);
  const el       = document.getElementById('dstep3Content');
  if (!el) return;

  state.auditLog.push({
    ts: new Date().toISOString(), action: 'dyspnea_recommendation',
    flags: Array.from(flags), nrs: dyspneaState.nrs,
    canOral: dyspneaState.canOral, hasAnxiety: dyspneaState.hasAnxiety,
    onOpioid: dyspneaState.onOpioid, recCount: result.recs.length,
  });

  if (result.blocked) {
    el.innerHTML = `
      <div style="padding:12px 14px 0">
        <div class="stop-block">
          <div class="stop-block-title">⛔ 上気道閉塞が疑われます</div>
          <p>薬物療法より先に気道の安全確保・専門科（耳鼻咽喉科/外科）へのコンサルトを優先してください。</p>
          <p style="margin-top:8px">腫瘍浮腫が原因の場合はデキサメタゾン 4〜8 mg 静注が有効なことがあります。</p>
        </div>
      </div>`;
    return;
  }

  // Active flags banner
  const activeChecks = DYSPNEA_SAFETY_CHECKS.filter(c => flags.has(c.id));
  const flagsBanner = activeChecks.length ? `
    <div class="active-flags-wrap">
      <span class="active-flags-label">確認済みリスク:</span>
      ${activeChecks.map(c => `<span class="aflag aflag-${c.severity === 'stop' ? 'stop' : c.severity}">${escHtml(c.label)}</span>`).join('')}
    </div>` : '';

  const warningsHtml = [
    ...result.hardWarnings.map(w => `<div class="alert-item alert-hard">🚨 ${escHtml(w.text)}</div>`),
    ...result.softWarnings.map(w => `<div class="alert-item alert-soft">⚠️ ${escHtml(w.text)}</div>`),
  ].join('');

  const cardHtml = result.recs.map(rec => `
    <div class="drec-card ${escHtml(rec.level)}">
      <div class="drec-label">${escHtml(rec.label)}</div>
      <div class="drec-drug">${escHtml(rec.drug)}</div>
      <div class="drec-dose">📋 ${escHtml(rec.dose)}</div>
      ${rec.doseNote ? `<div class="drec-dose-note">${escHtml(rec.doseNote)}</div>` : ''}
      ${rec.brands && rec.brands !== '—' ? `<div class="drec-brands">商品例: ${escHtml(rec.brands)}</div>` : ''}
      <div class="drec-note">${escHtml(rec.note)}</div>
    </div>`).join('');

  el.innerHTML = `
    <div style="padding:12px 14px 0">
      ${flagsBanner}
      ${warningsHtml ? `<div class="warnings-wrap" style="margin-bottom:10px">${warningsHtml}</div>` : ''}
      <div class="drec-list">${cardHtml}</div>
      <p class="manual-ref" style="margin-top:12px">
        根拠: <a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer">聖隷三方原病院 症状緩和ガイド</a> / ${DATA_VERSION}
      </p>
    </div>`;
}

// ============================================================
// DYSPNEA — STEP 4 RENDER（モニタリング）
// ============================================================

function renderDStep4() {
  const flags = getDyspneaFlags();
  const el    = document.getElementById('dstep4Content');
  if (!el) return;

  const monitorItems = [
    { id: 'rr',       text: 'SpO2・呼吸数を投与後30〜60分で確認', priority: true },
    { id: 'cs',       text: '意識レベル（声かけへの反応）を確認', priority: true },
    { id: 'bp',       text: '血圧を投与後15〜30分で確認', priority: flags.has('hypotension') || flags.has('elderly') },
    { id: 'nrs',      text: 'NRS（呼吸困難の強さ）を1〜2時間後に再評価', priority: false },
    { id: 'sed',      text: '過鎮静（強い眠気・傾眠・呼びかけに反応鈍い）がないか確認', priority: true },
    { id: 'rr8',      text: '呼吸回数 ≤ 8回/分 → 直ちに主治医に報告', priority: true },
    { id: 'rescue',   text: 'レスキュー3回後もNRS改善なし → 主治医に相談', priority: false },
    { id: 'co2check', text: 'CO2貯留悪化（眠気・頭痛・顔面紅潮）→ 主治医に即報告', priority: flags.has('co2_retention') },
  ].filter(item => item.priority || true); // show all; priority adds styling

  const monitorHtml = monitorItems.map(item => `
    <div class="monitor-item${item.priority ? ' priority' : ''}">
      <input type="checkbox" id="mon_${item.id}" type="checkbox">
      <div class="monitor-text">
        ${escHtml(item.text)}
        ${item.priority ? '<span class="monitor-priority-tag">必須</span>' : ''}
      </div>
    </div>`).join('');

  const escalationItems = [
    '呼吸回数 ≤ 8回/分',
    'SpO2の急激な低下（ベースラインから5%以上低下）',
    '強い眠気・呼びかけに対する反応不良',
    'NRS > 7 がレスキュー3回後も改善しない',
    flags.has('hypotension') ? '収縮期血圧 < 80 mmHg' : null,
    flags.has('co2_retention') ? 'CO2貯留悪化の徴候（眠気・頭痛・発汗・顔面紅潮）' : null,
  ].filter(Boolean);

  const nonPharmItems = [
    '声かけ・傍にいること（孤独感・不安の軽減）',
    '扇風機やうちわで顔に風を当てる（三叉神経刺激で呼吸困難感が軽減）',
    '上体挙上（45度以上、または患者が最も楽な体位）',
    '室内換気・温度管理（適度な気流をつくる）',
    '呼吸法の指導（鼻から吸って口からゆっくり吐く）',
    '恐怖感が強い場合はそばにいて現状を丁寧に説明する',
  ];

  el.innerHTML = `
    <div style="padding:12px 14px 0">
      <div class="result-section">
        <h3>投与後モニタリング（チェックリスト）</h3>
        <div class="monitor-list">${monitorHtml}</div>
      </div>

      <div class="result-section">
        <h3>🚨 エスカレーション基準（主治医へ即時報告）</h3>
        <ul class="escalation-list">
          ${escalationItems.map(e => `<li>${escHtml(e)}</li>`).join('')}
        </ul>
      </div>

      <div class="result-section">
        <h3>💨 非薬物療法（並行して実施）</h3>
        <ul class="nonpharm-list">
          ${nonPharmItems.map(e => `<li>${escHtml(e)}</li>`).join('')}
        </ul>
      </div>

      <p class="manual-ref">
        根拠: <a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer">聖隷三方原病院 症状緩和ガイド</a> / ${DATA_VERSION}
      </p>
    </div>`;
}

// ============================================================
// DYSPNEA — INIT
// ============================================================

function initDyspneaWizard() {
  renderDSafetyChecklist();

  // NRS buttons
  const nrsEl = document.getElementById('nrsButtons');
  if (nrsEl) {
    const nrsLabels = [
      '0 — 症状なし', '1 — ごく軽度', '2 — 軽度', '3 — 軽度',
      '4 — 中等度', '5 — 中等度', '6 — 中等度',
      '7 — 高度', '8 — 高度', '9 — 非常に高度', '10 — 最大の苦しさ',
    ];
    for (let i = 0; i <= 10; i++) {
      const btn = document.createElement('button');
      const colorCls = i <= 3 ? 'nrs-ok' : i <= 6 ? 'nrs-warn' : 'nrs-danger';
      btn.className = `nrs-btn ${colorCls}`;
      btn.dataset.nrs = i;
      btn.textContent = i;
      btn.type = 'button';
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nrs-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        dyspneaState.nrs = i;
        const labelEl = document.getElementById('nrsLabel');
        if (labelEl) labelEl.textContent = nrsLabels[i] ?? '';
      });
      nrsEl.appendChild(btn);
    }
  }

  // Wizard nav
  document.getElementById('dprevBtn')?.addEventListener('click', () => {
    if (dyspneaState.dstep > 1) showDStep(dyspneaState.dstep - 1);
  });
  document.getElementById('dnextBtn')?.addEventListener('click', () => {
    if (dyspneaState.dstep === 2) syncDStep2();
    if (!validateDStep(dyspneaState.dstep)) return;
    const next = dyspneaState.dstep + 1;
    showDStep(next);
    if (next === 3) renderDStep3();
    if (next === 4) renderDStep4();
  });

  // Restart
  document.getElementById('dyspneaRestartBtn')?.addEventListener('click', () => {
    dyspneaState.nrs = null;
    dyspneaState.canOral = null;
    dyspneaState.hasAnxiety = false;
    dyspneaState.onOpioid = false;
    DYSPNEA_SAFETY_CHECKS.forEach(c => {
      const cb = document.getElementById('sc_' + c.id);
      if (cb) cb.checked = false;
      document.querySelector(`[data-check-id="${c.id}"]`)?.classList.remove('active');
    });
    document.querySelectorAll('.nrs-btn').forEach(b => b.classList.remove('selected'));
    const lbl = document.getElementById('nrsLabel');
    if (lbl) lbl.textContent = '';
    document.querySelectorAll('input[name="dysp_anxiety"]').forEach(r => { r.checked = r.value === 'no'; });
    document.querySelectorAll('input[name="dysp_onopioid"]').forEach(r => { r.checked = r.value === 'no'; });
    document.querySelectorAll('input[name="dysp_oral"]').forEach(r => { r.checked = false; });
    updateSafetyFlagSummary();
    showDStep(1);
  });

  showDStep(1);
}

document.addEventListener('DOMContentLoaded', init);
