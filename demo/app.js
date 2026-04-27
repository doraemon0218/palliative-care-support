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
      '2026-04-27: 消化器症状（悪心・便秘）ウィザードを追加',
      '2026-04-27: せん妄・不眠ウィザードを追加',
      '2026-04-27: 死亡直前期ケアウィザードを追加',
      '2026-04-27: 全ウィザードに複数選択肢カード（比較・選択機能）を追加',
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
      if (t === 'gi')        { showPage('gi');         showGiStep(1); }
      if (t === 'delirium')  { showPage('delirium');   showDlStep(1); }
      if (t === 'eol')       { showPage('eol');        showElStep(1); }
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
  initGiWizard();
  initDlWizard();
  initElWizard();

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

// ============================================================
// SHARED: SELECTABLE RECOMMENDATION CARD RENDERER
// ============================================================

function renderSelectableRecs(contentId, result, selectedIdx, selectFnName) {
  const el = document.getElementById(contentId);
  if (!el) return;
  const { recs, warnings } = result;

  const warnHtml = (warnings || []).map(w =>
    `<div class="alert-item ${w.severity === 'hard' ? 'alert-hard' : 'alert-soft'}">
      ${w.severity === 'hard' ? '🚨' : '⚠️'} ${escHtml(w.text)}
    </div>`
  ).join('');

  const cardsHtml = recs.map((rec, i) => {
    const sel = selectedIdx === i;
    const pros = (rec.pros || []).map(p => `<span class="srec-pro">✓ ${escHtml(p)}</span>`).join('');
    const cons = (rec.cons || []).map(c => `<span class="srec-con">△ ${escHtml(c)}</span>`).join('');
    return `
      <div class="srec-card ${escHtml(rec.level)}${sel ? ' selected' : ''}">
        <div class="srec-label">${escHtml(rec.label)}</div>
        <div class="srec-drug">${escHtml(rec.drug)}</div>
        <div class="srec-dose">📋 ${escHtml(rec.dose)}</div>
        ${rec.doseNote ? `<div class="srec-dose-note">${escHtml(rec.doseNote)}</div>` : ''}
        ${(pros || cons) ? `<div class="srec-traits">${pros}${cons}</div>` : ''}
        ${rec.brands ? `<div class="srec-brands">商品例: ${escHtml(rec.brands)}</div>` : ''}
        <div class="srec-note">${escHtml(rec.note)}</div>
        <button class="srec-sel-btn${sel ? ' chosen' : ''}" onclick="${escHtml(selectFnName)}(${i})">
          ${sel ? '✓ 選択中' : 'この治療を選択'}
        </button>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="padding:12px 14px 0">
      ${warnHtml ? `<div class="warnings-wrap" style="margin-bottom:10px">${warnHtml}</div>` : ''}
      <p class="field-hint" style="margin-bottom:8px">患者の状況に最も適切な治療を選択してください（複数を比較し「この治療を選択」を押してください）。</p>
      <div class="srec-list">${cardsHtml}</div>
      <p class="manual-ref" style="margin-top:12px">根拠: <a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer">聖隷三方原病院 症状緩和ガイド</a> / ${DATA_VERSION}</p>
    </div>`;
}

function renderDetailWithMonitor(contentId, rec, monitorItems, escalationItems, nonPharmItems) {
  const el = document.getElementById(contentId);
  if (!el) return;

  const monitorHtml = (monitorItems || []).map(item => `
    <div class="monitor-item${item.priority ? ' priority' : ''}">
      <input type="checkbox" id="mon_${escHtml(item.id)}">
      <div class="monitor-text">${escHtml(item.text)}
        ${item.priority ? '<span class="monitor-priority-tag">必須</span>' : ''}
      </div>
    </div>`).join('');

  const escalHtml = (escalationItems || []).length
    ? `<div class="result-section">
         <h3>🚨 エスカレーション基準（主治医へ即時報告）</h3>
         <ul class="escalation-list">
           ${escalationItems.map(e => `<li>${escHtml(e)}</li>`).join('')}
         </ul>
       </div>` : '';

  const nonPharmHtml = (nonPharmItems || []).length
    ? `<div class="result-section">
         <h3>💡 非薬物療法（並行して実施）</h3>
         <ul class="nonpharm-list">
           ${nonPharmItems.map(e => `<li>${escHtml(e)}</li>`).join('')}
         </ul>
       </div>` : '';

  el.innerHTML = `
    <div class="sel-drug-banner">${escHtml(rec.drug)}</div>
    <div class="result-section">
      <h3>採用した治療方針</h3>
      <div class="dose-line main">${escHtml(rec.dose)}</div>
      ${rec.doseNote ? `<div class="dose-line">${escHtml(rec.doseNote)}</div>` : ''}
      ${rec.brands ? `<div class="brands-line">商品例: ${escHtml(rec.brands)}</div>` : ''}
    </div>
    <div class="result-section">
      <h3>投与後モニタリング（チェックリスト）</h3>
      <div class="monitor-list">${monitorHtml}</div>
    </div>
    ${escalHtml}
    ${nonPharmHtml}
    <p class="manual-ref">根拠: <a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer">聖隷三方原病院 症状緩和ガイド</a> / ${DATA_VERSION}</p>`;
}

function makeGiStepperUpdate(n) {
  document.querySelectorAll('.gi-stepper-item').forEach(item => {
    const s = Number(item.dataset.gistep);
    item.classList.toggle('done', s < n);
    item.classList.toggle('current', s === n);
    item.classList.toggle('pending', s > n);
  });
}
function makeDlStepperUpdate(n) {
  document.querySelectorAll('.dl-stepper-item').forEach(item => {
    const s = Number(item.dataset.dlstep);
    item.classList.toggle('done', s < n);
    item.classList.toggle('current', s === n);
    item.classList.toggle('pending', s > n);
  });
}
function makeElStepperUpdate(n) {
  document.querySelectorAll('.el-stepper-item').forEach(item => {
    const s = Number(item.dataset.elstep);
    item.classList.toggle('done', s < n);
    item.classList.toggle('current', s === n);
    item.classList.toggle('pending', s > n);
  });
}

// ============================================================
// GI SYMPTOMS — SAFETY CHECKS DATA（聖隷三方原病院ガイド準拠）
// ============================================================

const GI_SAFETY_CHECKS = [
  {
    id: 'gi_ileus',
    label: 'イレウス（腸閉塞）疑い',
    desc: '腹痛・腹部膨満・排便/排ガス停止・腸蠕動音消失、または持続する嘔吐',
    severity: 'stop',
    impact: 'メトクロプラミド等の消化管蠕動促進薬が腸管内圧を上昇させ穿孔・破裂の危険があります。',
    action: '消化管蠕動促進薬（メトクロプラミド）は絶対禁忌。消化器科・外科へ緊急コンサルト。胃管等による腸管減圧を検討。',
  },
  {
    id: 'gi_bleeding',
    label: '消化管出血疑い',
    desc: '吐血・下血・コーヒー残渣様嘔吐・黒色便・Hb急激低下',
    severity: 'hard',
    impact: 'NSAIDs・ステロイド継続で出血悪化リスク。消化管蠕動促進薬も出血部位への負荷増加の可能性。',
    action: '消化器科緊急コンサルト。プロトンポンプ阻害薬（PPI）開始を検討。輸液・止血処置を優先。',
  },
  {
    id: 'gi_icp',
    label: '頭蓋内圧亢進',
    desc: '体位変換で悪化する頭痛・噴射性嘔吐・うっ血乳頭・脳腫瘍・硬膜外転移',
    severity: 'hard',
    impact: '通常の制吐薬より原因治療（デキサメタゾンによる浮腫軽減）が優先されます。',
    action: 'デキサメタゾン 4〜8 mg 静注を最優先。神経外科/放射線科コンサルト。制吐薬は補助的に使用。',
  },
  {
    id: 'gi_parkinson',
    label: 'パーキンソン病・レビー小体型認知症',
    desc: 'パーキンソン病またはレビー小体型認知症の診断あり',
    severity: 'hard',
    impact: 'ハロペリドール・メトクロプラミド等のドパミン拮抗薬でPD症状が急激悪化（固縮・無動・嚥下障害増悪）。レビー小体型認知症では神経遮断薬悪性症候群のリスク。',
    action: 'ドパミン拮抗薬は禁忌。代替: オンダンセトロン（5-HT3拮抗薬、EPS少ない）またはドンペリドン（BBB通過少）を選択。',
  },
  {
    id: 'gi_qt',
    label: '心疾患・QT延長リスク',
    desc: 'QTc > 470 ms（女性）/ 450 ms（男性）、心不全、低K・低Mg',
    severity: 'soft',
    impact: 'ハロペリドール・オンダンセトロン・メトクロプラミドはいずれもQT延長・Torsades de pointesのリスクあり。',
    action: '投与前にQTcを確認。ハロペリドール > 3 mg/日は避ける。電解質補正（K・Mg）を先行。',
  },
  {
    id: 'gi_renal',
    label: '腎機能高度障害（eGFR < 30）',
    desc: 'eGFR < 30 mL/min/1.73m²、または維持透析中',
    severity: 'soft',
    impact: '酸化マグネシウムで高マグネシウム血症（意識障害・徐脈・呼吸抑制）のリスク。',
    action: '酸化マグネシウムは禁忌または極少量。センノシド・ナルデメジンは比較的安全に使用可。',
  },
  {
    id: 'gi_hepatic',
    label: '重篤な肝機能障害（Child-Pugh C）',
    desc: '高度黄疸・肝性脳症・著明な凝固障害',
    severity: 'soft',
    impact: '多くの制吐薬が肝代謝依存のため蓄積しやすく、過鎮静・錐体外路症状が出やすい。',
    action: '常用量の50%以下から開始。投与間隔を延長し効果・副作用を頻回に評価。',
  },
  {
    id: 'gi_elderly',
    label: '高齢者（75歳以上）',
    desc: '75歳以上',
    severity: 'soft',
    impact: '薬物代謝低下により錐体外路症状・過鎮静・転倒リスクが高い。',
    action: '初回は常用量の50%以下から開始。ハロペリドールは0.5 mg/回以下から。座位/起立時のふらつきに注意。',
  },
];

// ============================================================
// GI SYMPTOMS — STATE
// ============================================================

const giState = {
  step: 1,
  ageGroup: '',
  symptomType: null,
  nrs: null,
  lastBmDays: 4,
  canOral: null,
  isOpioidCause: false,
  selectedRecIdx: null,
  result: { recs: [], warnings: [] },
};

// ============================================================
// GI SYMPTOMS — RECOMMENDATION ENGINE
// ============================================================

function buildGiRecommendations(flags) {
  const hasPark    = flags.has('gi_parkinson');
  const hasIleus   = flags.has('gi_ileus');
  const hasQT      = flags.has('gi_qt');
  const hasRenal   = flags.has('gi_renal');
  const hasHepatic = flags.has('gi_hepatic');
  const hasElderly = flags.has('gi_elderly') || giState.ageGroup === '>=75';

  const canOral = giState.canOral;
  const recs = [];
  const warnings = [];

  if (giState.symptomType === 'nausea') {
    if (flags.has('gi_icp')) {
      warnings.push({ severity: 'hard', text: '頭蓋内圧亢進：デキサメタゾン 4〜8 mg 静注が最優先。制吐薬は補助的に使用し、神経外科/放射線科コンサルトを行ってください。' });
    }

    if (!hasPark) {
      recs.push({
        id: 'haloperidol', level: 'primary',
        label: '第一選択（オピオイド誘発性悪心に有効）',
        drug: 'ハロペリドール（セレネース®）',
        dose: canOral
          ? (hasElderly ? '0.5 mg 経口 就寝前（高齢者—少量から）' : '0.5〜1 mg 経口 就寝前〜1日2回')
          : (hasElderly ? '0.5 mg 皮下注/静注 q8〜12h（必要時）' : '0.5〜1 mg 皮下注/静注 q4〜8h（必要時）'),
        doseNote: 'オピオイド開始後7〜10日で耐性が形成されることが多く、その時点で中止を検討してください。',
        brands: '経口: セレネース® 0.75/1 mg/錠　注射: セレネース® 5 mg/mL',
        pros: ['オピオイド誘発性悪心のエビデンス最多', '少量で有効', '注射製剤あり'],
        cons: hasQT
          ? ['パーキンソン病禁忌', 'QT延長リスクあり（QTc要確認）', '錐体外路症状（EPS）']
          : ['パーキンソン病禁忌', 'QT延長（高用量で注意）', '錐体外路症状（EPS）'],
        monitoring: ['投与30〜60分後に悪心の改善を評価', 'EPS（固縮・振戦・歩行障害）を観察', 'QTc（心疾患/電解質異常例では定期的に）'],
        note: '聖隷三方原病院ガイドでオピオイド誘発性悪心の第一選択。少量から開始し効果を確認してから増量する。',
      });
    } else {
      warnings.push({ severity: 'hard', text: 'パーキンソン病のためハロペリドール・メトクロプラミドは禁忌。オンダンセトロンを第一選択としてください。' });
    }

    if (!hasIleus && !hasPark) {
      recs.push({
        id: 'metoclopramide', level: 'primary',
        label: '第一選択（消化管蠕動促進・胃排出遅延に有効）',
        drug: 'メトクロプラミド（プリンペラン®）',
        dose: canOral
          ? (hasElderly ? '5 mg 経口 1日3回 食前（高齢者—半量から）' : '10 mg 経口 1日3回 食前30分')
          : (hasElderly ? '5 mg 皮下注/静注 q8h（高齢者）' : '10 mg 皮下注/静注 q6〜8h'),
        doseNote: '食後の悪心・膨満感・早期飽満感を伴う場合に特に有効。イレウスが否定されてから使用すること。',
        brands: '経口: プリンペラン® 5 mg/錠　注射: プリンペラン® 10 mg/2 mL',
        pros: ['消化管蠕動促進効果', 'オピオイド誘発性にも有効', '注射製剤あり'],
        cons: ['イレウス（腸閉塞）禁忌', 'パーキンソン病禁忌', '錐体外路症状（EPS）'],
        monitoring: ['悪心・嘔吐の改善（食事摂取量を確認）', '腹部症状（腸蠕動音の改善）', 'EPS（振戦・固縮）'],
        note: '胃排出遅延・消化管蠕動低下が原因の悪心（食後増悪・膨満感合併）に特に有効。',
      });
    }

    recs.push({
      id: 'ondansetron', level: hasPark ? 'primary' : 'alternative',
      label: hasPark ? '第一選択（パーキンソン病でも安全）' : '代替選択（EPS回避・パーキンソン病でも安全）',
      drug: 'オンダンセトロン（ゾフラン®）',
      dose: canOral
        ? (hasElderly ? '4 mg 経口 1日2回（高齢者）' : '4〜8 mg 経口 1日2〜3回')
        : (hasElderly ? '4 mg 静注 q6〜8h（緩徐投与）' : '4 mg 静注 q4〜6h（緩徐投与）'),
      doseNote: '5-HT3拮抗薬。嘔吐中枢・腸管の5-HT3受容体を遮断。パーキンソン病でも安全に使用可能。',
      brands: '経口: ゾフラン® 4/8 mg/錠　注射: ゾフラン® 4 mg/2 mL',
      pros: ['錐体外路症状（EPS）なし', 'パーキンソン病でも安全', '嘔吐中枢への作用'],
      cons: hasQT
        ? ['便秘を増悪させる可能性', 'QT延長リスクあり（要確認）', '制吐薬の中では高額']
        : ['便秘を増悪させる可能性', 'QT延長（軽度・高用量注意）', '比較的高額'],
      monitoring: ['悪心の改善を評価', '便秘の増悪（排便回数・性状）', '便秘がある場合は下剤の調整を検討'],
      note: 'EPSリスクが高い患者・パーキンソン病の代替第一選択。既存の便秘がある場合は慎重に。',
    });

    recs.push({
      id: 'dexamethasone', level: 'adjuvant',
      label: '補助薬（他の制吐薬への上乗せ・難治性悪心）',
      drug: 'デキサメタゾン',
      dose: canOral
        ? (hasElderly ? '4 mg 経口 朝1回（高齢者—少量）' : '4〜8 mg 経口 朝1回')
        : (hasElderly ? '4 mg 静注 朝1回' : '4〜8 mg 静注/皮下注 1日1回（午前中）'),
      doseNote: '複数の悪心機序に有効な補助薬。食欲不振・全身倦怠感にも効果あり。就寝前投与は不眠を誘発するため午前中に投与。',
      brands: '経口: デカドロン® 0.5 mg/錠（他社）　注射: デキサメタゾン各社',
      pros: ['複数の悪心機序に有効', '食欲改善・倦怠感軽減の副効用', '他の制吐薬への上乗せ効果（add-on）'],
      cons: ['高血糖（糖尿病患者は要注意）', '不眠（午後〜就寝前の投与を避ける）', '長期使用で副腎抑制'],
      monitoring: ['血糖値（糖尿病患者・高用量時）', '睡眠の質（不眠の有無）', '胃部症状（必要時PPI併用）'],
      note: '単独より他の制吐薬への上乗せ（add-on）として使用。難治性悪心・頭蓋内圧亢進に特に有効。',
    });

  } else {
    // Constipation
    const isOIC = giState.isOpioidCause;

    if (hasRenal) {
      warnings.push({ severity: 'hard', text: '腎機能高度障害（eGFR < 30）：酸化マグネシウムは高マグネシウム血症（意識障害・呼吸抑制）のリスクがあり原則禁忌です。' });
    }

    if (isOIC) {
      recs.push({
        id: 'naldemedine', level: 'primary',
        label: '第一選択（オピオイド誘発性便秘に特化・PAMORA）',
        drug: 'ナルデメジン（スインプロイク®）',
        dose: '0.2 mg 経口 1日1回（食後不問）',
        doseNote: '腸管内のμオピオイド受容体を選択的に遮断し、中枢性鎮痛効果を維持したまま便秘を改善。透析患者を含む腎機能障害患者にも使用可。',
        brands: 'スインプロイク® 0.2 mg/錠',
        pros: ['OICへの高い特異性', '中枢性鎮痛効果を維持', '1日1回で服用が簡便'],
        cons: ['経口のみ（注射製剤なし）', 'イレウス禁忌', '高額（後発品未発売）'],
        monitoring: ['24〜48時間以内の排便確認', '腹痛・下痢の有無', 'オピオイドの鎮痛効果の変化（過度の鎮痛減弱に注意）'],
        note: 'オピオイド誘発性便秘（OIC）の第一選択（聖隷ガイド準拠）。センノシドと組み合わせることも可能。',
      });
    }

    recs.push({
      id: 'sennoside', level: isOIC && recs.length > 0 ? 'alternative' : 'primary',
      label: isOIC ? 'ナルデメジン代替・組み合わせ（刺激性下剤）' : '第一選択（刺激性下剤）',
      drug: 'センノシド（プルゼニド®）',
      dose: hasElderly ? '12 mg 経口 就寝前（高齢者—少量から開始）' : '12〜24 mg 経口 就寝前',
      doseNote: '大腸刺激性下剤。就寝前に投与すると翌朝排便を促す。効果不十分なら24 mg（2錠）に増量可。ナルデメジンとの併用も可能。',
      brands: 'プルゼニド® 12 mg/錠（センノシドA+B含有）',
      pros: ['安価で広く使いやすい', '速効性（6〜12時間）', 'OIC・通常の便秘両方に有効'],
      cons: ['腹痛・腹部けいれんの可能性', 'イレウス禁忌', '長期使用で耐性形成の可能性'],
      monitoring: ['24時間以内の排便確認', '腹痛・腹部膨満の評価', '排便の性状と量（ブリストルスケール）'],
      note: '国内で最も使用頻度が高い刺激性下剤。オピオイド開始時に予防的投与を開始することを推奨。',
    });

    if (!hasRenal) {
      recs.push({
        id: 'magox', level: 'adjuvant',
        label: '補助薬（浸透圧性下剤・センノシドとの組み合わせ）',
        drug: '酸化マグネシウム',
        dose: hasElderly ? '500 mg 経口 1日2回（高齢者—少量から）' : '500〜1000 mg 経口 1日3回 食後',
        doseNote: '浸透圧性下剤。腸管内に水分を引き込み便を軟化する。センノシドと機序が異なるため組み合わせが有効。効果発現まで2〜3日かかることあり。',
        brands: '酸化マグネシウム 250/330 mg/錠（各社）',
        pros: ['安価・安全', '長期使用が可能', 'センノシドとの相乗効果'],
        cons: hasRenal ? ['腎障害で高Mg血症リスク—使用禁忌'] : ['腎機能低下例はMg値を定期確認', '効果発現が遅い（2〜3日）', '過剰で下痢'],
        monitoring: ['排便の硬さ・量', 'Mg値（高齢者・腎機能低下例）', 'eGFR（使用継続の判断）'],
        note: '刺激性下剤（センノシド等）と組み合わせて作用機序の相補が可能。腎機能を確認してから使用する。',
      });
    }

    recs.push({
      id: 'picosulfate', level: 'alternative',
      label: '代替刺激性下剤（液剤で量調整しやすい）',
      drug: 'ピコスルファートナトリウム（ラキソベロン®）',
      dose: hasElderly ? '5〜10滴 就寝前（高齢者—5滴から調整）' : '5〜15滴 就寝前（2.5〜7.5 mg）',
      doseNote: '1滴ずつ量を調整できる液剤。錠剤嚥下が困難な患者に有用。センノシドと同じ刺激性なので重複使用は避ける。',
      brands: 'ラキソベロン® 内用液 0.75%（7.5 mg/mL）',
      pros: ['液剤で量の微調整が容易', '錠剤嚥下困難な患者に有用', '速効性（6〜10時間）'],
      cons: ['センノシドと機序が重なり重複は非推奨', '腹痛・腹部けいれんの可能性', 'イレウス禁忌'],
      monitoring: ['翌朝の排便確認', '腹痛・腹部けいれんの有無'],
      note: '錠剤嚥下が困難な患者や量の細かい調整が必要な場合に選択。センノシドとの同時使用は避ける。',
    });
  }

  return { recs, warnings };
}

// ============================================================
// GI SYMPTOMS — WIZARD STEP CONTROL
// ============================================================

function showGiStep(n) {
  giState.step = n;
  document.querySelectorAll('.gi-step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('gistep' + n)?.classList.add('active');
  makeGiStepperUpdate(n);
  const prev = document.getElementById('giprevBtn');
  const next = document.getElementById('ginextBtn');
  if (prev) prev.style.display = n > 1 ? '' : 'none';
  if (next) {
    next.style.display = n < 4 ? '' : 'none';
    next.textContent = n === 2 ? '治療選択肢を確認 →' : n === 3 ? '選択した治療の詳細へ →' : '次へ →';
  }
  document.getElementById('giPage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getGiFlags() {
  const flags = new Set();
  GI_SAFETY_CHECKS.forEach(c => {
    if (document.getElementById('gisc_' + c.id)?.checked) flags.add(c.id);
  });
  return flags;
}

function updateGiSafetyFlagSummary() {
  const flags = getGiFlags();
  const stopBanner = document.getElementById('giStopBanner');
  if (stopBanner) stopBanner.classList.toggle('visible', flags.has('gi_ileus'));
  const summaryEl = document.getElementById('giSafetyFlagSummary');
  if (!summaryEl) return;
  if (flags.size === 0) { summaryEl.style.display = 'none'; return; }
  const active = GI_SAFETY_CHECKS.filter(c => flags.has(c.id));
  summaryEl.innerHTML = `<span style="font-size:0.78rem;color:#6b7280;margin-right:6px;">選択中:</span>` +
    active.map(c => `<span class="aflag aflag-${c.severity === 'stop' ? 'stop' : c.severity}">${escHtml(c.label)}</span>`).join('');
  summaryEl.style.display = 'block';
}

function syncGiStep2() {
  giState.ageGroup      = document.getElementById('giAgeGroup')?.value ?? '';
  const symRadio        = document.querySelector('input[name="gi_symptom"]:checked');
  const oralRadio       = document.querySelector('input[name="gi_oral"]:checked');
  const opioidRadio     = document.querySelector('input[name="gi_opioid_cause"]:checked');
  giState.symptomType   = symRadio ? symRadio.value : null;
  giState.canOral       = oralRadio ? oralRadio.value === 'yes' : null;
  giState.isOpioidCause = opioidRadio ? opioidRadio.value === 'yes' : false;
  giState.nrs           = giState.symptomType === 'nausea' ? giState.nrs : null;
  giState.lastBmDays    = parseInt(document.getElementById('giLastBM')?.value ?? '4', 10);
}

function selectGiRec(idx) {
  giState.selectedRecIdx = idx;
  renderSelectableRecs('gistep3Content', giState.result, idx, 'selectGiRec');
}

function validateGiStep(n) {
  if (n === 2) {
    if (!giState.ageGroup) { toast('年齢層を選択してください'); return false; }
    if (!giState.symptomType) { toast('主な症状を選択してください'); return false; }
    if (giState.symptomType === 'nausea' && giState.nrs === null) { toast('悪心の強さ（NRS）を選択してください'); return false; }
    if (giState.canOral === null) { toast('経口投与の可否を選択してください'); return false; }
  }
  if (n === 3) {
    if (giState.selectedRecIdx === null) { toast('治療を1つ選択してください'); return false; }
  }
  return true;
}

function renderGiStep3() {
  const flags = getGiFlags();
  giState.result = buildGiRecommendations(flags);
  giState.selectedRecIdx = null;
  renderSelectableRecs('gistep3Content', giState.result, null, 'selectGiRec');
  state.auditLog.push({ ts: new Date().toISOString(), action: 'gi_recommendation', symptom: giState.symptomType, flags: [...flags], recCount: giState.result.recs.length });
}

function renderGiStep4() {
  const rec = giState.result.recs[giState.selectedRecIdx];
  if (!rec) return;

  const monitorBase = [
    { id: 'gi_effect', text: '悪心/排便状況を投与2〜4時間後に再評価', priority: true },
    { id: 'gi_eps',    text: '錐体外路症状（振戦・固縮・歩行障害）の有無を確認', priority: giState.symptomType === 'nausea' },
    { id: 'gi_oral',   text: '食事摂取量・水分摂取量の変化を確認', priority: false },
    { id: 'gi_sedation', text: '過鎮静（強い眠気・意識変容）の有無を確認', priority: giState.symptomType === 'nausea' },
  ];
  if (giState.symptomType === 'constipation') {
    monitorBase.push(
      { id: 'gi_bm', text: '排便の確認（性状・量・腹痛の有無）', priority: true },
      { id: 'gi_abdo', text: '腹部症状（腹痛・腹部膨満）の変化', priority: true }
    );
    if (rec.id === 'magox') {
      monitorBase.push({ id: 'gi_mg', text: 'Mg値（特に高齢者・腎機能低下例）', priority: false });
    }
  }

  const escal = giState.symptomType === 'nausea'
    ? ['嘔吐が1時間に3回以上・脱水が疑われる', '高度な過鎮静・意識レベル低下', 'EPS（著明な固縮・嚥下障害増悪）', 'NRS改善なく48時間経過']
    : ['腹部症状の急激な悪化（腸閉塞の可能性）', '7日以上の排便なし', 'Mg値異常（脱力・意識障害・徐脈）'];

  const nonPharm = giState.symptomType === 'nausea'
    ? ['食事は少量ずつ・冷たい食品（温かい食品の臭いが悪心を誘発しやすい）', '食後30分は横にならない（上体を挙上）', '換気を確保し室内の臭いを最小限に', '冷たいタオルを額に当てるなど冷却刺激']
    : ['水分を十分に摂取（1日1.5〜2 L目安）', '腸蠕動を促す軽い体動（可能なら短い歩行）', '腹部温罨法（腹部を温める）', 'プライバシーの確保（トイレでリラックスできる環境）'];

  renderDetailWithMonitor('gistep4Content', rec, monitorBase, escal, nonPharm);
}

// ============================================================
// GI SYMPTOMS — SAFETY CHECKLIST RENDER
// ============================================================

function renderGiSafetyChecklist() {
  const el = document.getElementById('giSafetyChecklist');
  if (!el) return;
  el.innerHTML = '';
  GI_SAFETY_CHECKS.forEach(check => {
    const div = document.createElement('div');
    div.className = `safety-item sev-${check.severity}`;
    div.innerHTML = `
      <div class="safety-item-header">
        <input type="checkbox" id="gisc_${escHtml(check.id)}" data-check-id="${escHtml(check.id)}">
        <div class="safety-item-text">
          <div class="safety-item-label">${escHtml(check.label)}</div>
          <div class="safety-item-desc">${escHtml(check.desc)}</div>
        </div>
      </div>
      <div class="safety-impact">
        <div class="impact-text"><strong>影響:</strong> ${escHtml(check.impact)}</div>
        <div class="action-text"><strong>対処:</strong> ${escHtml(check.action)}</div>
      </div>`;
    const cb = div.querySelector('input[type="checkbox"]');
    function toggle() { div.classList.toggle('active', cb.checked); updateGiSafetyFlagSummary(); }
    cb.addEventListener('change', toggle);
    div.addEventListener('click', e => { if (e.target !== cb) { cb.checked = !cb.checked; toggle(); } });
    el.appendChild(div);
  });
}

// ============================================================
// GI SYMPTOMS — INIT
// ============================================================

function initGiWizard() {
  renderGiSafetyChecklist();

  // NRS buttons
  const nrsEl = document.getElementById('giNrsButtons');
  if (nrsEl) {
    const nrsLabels = ['0 — 症状なし','1 — ごく軽度','2 — 軽度','3 — 軽度','4 — 中等度','5 — 中等度','6 — 中等度','7 — 高度','8 — 高度','9 — 非常に高度','10 — 最大の苦しさ'];
    for (let i = 0; i <= 10; i++) {
      const btn = document.createElement('button');
      btn.className = `nrs-btn ${i <= 3 ? 'nrs-ok' : i <= 6 ? 'nrs-warn' : 'nrs-danger'}`;
      btn.dataset.nrs = i; btn.textContent = i; btn.type = 'button';
      btn.addEventListener('click', () => {
        document.querySelectorAll('#giNrsButtons .nrs-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        giState.nrs = i;
        const lbl = document.getElementById('giNrsLabel');
        if (lbl) lbl.textContent = nrsLabels[i] ?? '';
      });
      nrsEl.appendChild(btn);
    }
  }

  // Symptom type toggle
  document.querySelectorAll('input[name="gi_symptom"]').forEach(r => {
    r.addEventListener('change', () => {
      const isNausea = r.value === 'nausea';
      document.getElementById('giNrsSection').style.display  = isNausea ? '' : 'none';
      document.getElementById('giLastBMSection').style.display = isNausea ? 'none' : '';
    });
  });

  // Wizard nav
  document.getElementById('giprevBtn')?.addEventListener('click', () => {
    if (giState.step > 1) showGiStep(giState.step - 1);
  });
  document.getElementById('ginextBtn')?.addEventListener('click', () => {
    if (giState.step === 2) syncGiStep2();
    if (!validateGiStep(giState.step)) return;
    const next = giState.step + 1;
    showGiStep(next);
    if (next === 3) renderGiStep3();
    if (next === 4) renderGiStep4();
  });

  // Restart
  document.getElementById('giRestartBtn')?.addEventListener('click', () => {
    giState.step = 1; giState.ageGroup = ''; giState.symptomType = null;
    giState.nrs = null; giState.canOral = null; giState.isOpioidCause = false;
    giState.selectedRecIdx = null;
    GI_SAFETY_CHECKS.forEach(c => {
      const cb = document.getElementById('gisc_' + c.id);
      if (cb) { cb.checked = false; cb.closest('.safety-item')?.classList.remove('active'); }
    });
    document.getElementById('giNrsButtons')?.querySelectorAll('.nrs-btn').forEach(b => b.classList.remove('selected'));
    const lbl = document.getElementById('giNrsLabel'); if (lbl) lbl.textContent = '';
    document.querySelectorAll('input[name="gi_symptom"]').forEach(r => { r.checked = false; });
    document.querySelectorAll('input[name="gi_oral"]').forEach(r => { r.checked = false; });
    document.querySelectorAll('input[name="gi_opioid_cause"]').forEach(r => { r.checked = r.value === 'no'; });
    document.getElementById('giNrsSection').style.display = 'none';
    document.getElementById('giLastBMSection').style.display = 'none';
    updateGiSafetyFlagSummary();
    showGiStep(1);
  });

  showGiStep(1);
}

// ============================================================
// DELIRIUM/INSOMNIA — SAFETY CHECKS DATA（聖隷三方原病院ガイド準拠）
// ============================================================

const DL_SAFETY_CHECKS = [
  {
    id: 'dl_agitation',
    label: '過活動型せん妄（興奮・危険行動）',
    desc: '叫ぶ・暴力行為・ベッド転落企図・点滴自己抜去・強い幻覚/焦燥',
    severity: 'hard',
    impact: '転倒・転落・自己抜去のリスクが高い。経口投与が困難なことが多い。迅速な薬物介入が必要。',
    action: '身体拘束より薬物療法を優先（ガイドライン推奨）。ハロペリドール皮下注/静注で速やかに対応。安全確保のため看護師の付き添いを確保。',
  },
  {
    id: 'dl_fall',
    label: '転倒リスク高',
    desc: '骨転移・筋力低下・浮腫・意識変動・既往の転倒',
    severity: 'soft',
    impact: '鎮静薬・睡眠薬投与後のふらつき・過鎮静が転倒骨折リスクをさらに高めます。',
    action: 'ベッド低床化・サイドレール設置。入眠確認後のトイレ誘導を計画。翌朝の覚醒状態を必ず確認。',
  },
  {
    id: 'dl_qt',
    label: '心疾患・QT延長リスク',
    desc: 'QTc > 470 ms（女性）/ 450 ms（男性）、心不全、低K・低Mg',
    severity: 'soft',
    impact: 'ハロペリドールはQT延長・Torsades de pointesのリスクがあります。',
    action: '投与前にQTcを確認。ハロペリドール > 3 mg/日は避ける。クエチアピン/トラゾドンへの代替を検討。',
  },
  {
    id: 'dl_parkinson',
    label: 'パーキンソン病・レビー小体型認知症',
    desc: 'パーキンソン病またはレビー小体型認知症の診断あり',
    severity: 'hard',
    impact: 'ハロペリドール・リスペリドン等でPD症状が急激悪化。レビー小体型認知症では致死的な神経遮断薬悪性症候群リスク。',
    action: 'ハロペリドール・リスペリドンは禁忌。クエチアピン（最も安全）を第一選択。',
  },
  {
    id: 'dl_copd',
    label: '慢性呼吸不全・CO2貯留リスク',
    desc: 'COPD・慢性呼吸不全・PaCO2 > 45 mmHg の既往',
    severity: 'hard',
    impact: 'ベンゾジアゼピン系（ロラゼパム等）が呼吸抑制・CO2ナルコーシスを誘発する危険。',
    action: 'ベンゾジアゼピン系は原則禁忌。スボレキサント（呼吸抑制なし）またはクエチアピン少量を第一選択。',
  },
  {
    id: 'dl_hepatic',
    label: '重篤な肝機能障害（Child-Pugh C）',
    desc: '高度黄疸・肝性脳症・著明な凝固障害',
    severity: 'soft',
    impact: 'ベンゾジアゼピン系の代謝が著しく遅延し蓄積・過鎮静が生じやすい。長時間作用型は特に危険。',
    action: 'ベンゾジアゼピン系は避けるか最小量のみ。ハロペリドール・クエチアピンも減量して使用。',
  },
  {
    id: 'dl_elderly',
    label: '高齢者（75歳以上）',
    desc: '75歳以上',
    severity: 'soft',
    impact: '薬物代謝低下。抗精神病薬の過鎮静・転倒・誤嚥性肺炎リスク増大。BZDは認知機能悪化リスク。',
    action: '全薬剤を常用量の50%以下から開始。効果・副作用を2〜4時間毎に評価。長時間作用型BZDは避ける。',
  },
  {
    id: 'dl_bzd_dep',
    label: 'BZD長期使用・アルコール多飲歴',
    desc: 'ベンゾジアゼピン系を長期使用中、またはアルコール多飲歴あり',
    severity: 'info',
    impact: '急性離脱（不眠悪化・振戦・けいれん）のリスク。既にBZD使用中の場合は急な中止が危険。',
    action: 'BZD長期使用中の場合は急中止せず漸減を検討。離脱症状（振戦・発汗・頻脈・不安）が出現した場合はジアゼパム等で対応。',
  },
];

// ============================================================
// DELIRIUM/INSOMNIA — STATE
// ============================================================

const dlState = {
  step: 1,
  ageGroup: '',
  problem: null,
  deliriumType: null,
  causeExplored: false,
  severity: null,
  canOral: null,
  selectedRecIdx: null,
  result: { recs: [], warnings: [] },
};

// ============================================================
// DELIRIUM/INSOMNIA — RECOMMENDATION ENGINE
// ============================================================

function buildDlRecommendations(flags) {
  const hasPark    = flags.has('dl_parkinson');
  const hasCopd    = flags.has('dl_copd');
  const hasQT      = flags.has('dl_qt');
  const hasHepatic = flags.has('dl_hepatic');
  const hasElderly = flags.has('dl_elderly') || dlState.ageGroup === '>=75';
  const hasAgit    = flags.has('dl_agitation');

  const canOral = dlState.canOral;
  const prob    = dlState.problem;
  const recs = [];
  const warnings = [];

  if (prob === 'delirium' || prob === 'both') {
    if (!dlState.causeExplored) {
      warnings.push({ severity: 'soft', text: '可逆的原因（電解質異常・感染症・尿閉・便秘・薬剤性）を先に評価・是正してください。薬物療法は原因治療と並行して開始します。' });
    }
    if (hasAgit) {
      warnings.push({ severity: 'hard', text: '過活動型せん妄：転倒・自己抜去リスクが高い状態です。薬物療法を速やかに開始し安全を確保してください。' });
    }

    if (!hasPark) {
      recs.push({
        id: 'haloperidol_del', level: 'primary',
        label: '第一選択（せん妄・特に過活動型）',
        drug: 'ハロペリドール（セレネース®）',
        dose: canOral && !hasAgit
          ? (hasElderly ? '0.5 mg 経口 就寝前〜1日2回（高齢者）' : '1〜2 mg 経口 就寝前〜1日2回')
          : (hasElderly ? '0.5 mg 皮下注/静注 q4〜8h（必要時）' : '1〜2 mg 皮下注/静注 q4〜6h（必要時）'),
        doseNote: hasAgit
          ? '過活動型：0.5〜2 mg 皮下注/静注（必要時）。効果不十分なら30〜60分後に追加。注射後15〜30分で効果判定。'
          : '1日量3 mg以内を目安とし、効果確認後に漸増。',
        brands: '経口: セレネース® 0.75/1/3 mg/錠　注射: セレネース® 5 mg/mL',
        pros: ['せん妄のエビデンス最多', '注射製剤あり（経口不能でも使用可）', '低用量から開始可'],
        cons: hasQT
          ? ['パーキンソン病禁忌', 'QT延長リスクあり（要QTc確認）', '錐体外路症状（EPS）']
          : ['パーキンソン病禁忌', 'QT延長（高用量で注意）', '錐体外路症状（EPS）'],
        monitoring: ['投与15〜30分後の興奮/鎮静の変化', 'EPS（固縮・振戦）', 'QTc（心疾患/電解質異常例）', '過鎮静（呼吸抑制）'],
        note: '聖隷三方原病院ガイドにてせん妄の第一選択。少量から開始し目標鎮静レベル（RASS −1〜0）を設定する。',
      });
    } else {
      warnings.push({ severity: 'hard', text: 'パーキンソン病/レビー小体型認知症のためハロペリドール・リスペリドンは禁忌。クエチアピンを第一選択としてください。' });
    }

    recs.push({
      id: 'quetiapine', level: hasPark ? 'primary' : 'alternative',
      label: hasPark ? '第一選択（パーキンソン病でも安全）' : '代替選択（EPSリスク低・鎮静効果高め）',
      drug: 'クエチアピン（セロクエル®）',
      dose: canOral
        ? (hasElderly ? '12.5〜25 mg 経口 就寝前（高齢者—少量から）' : '25〜50 mg 経口 就寝前〜1日2回')
        : '経口製剤のみ（注射製剤なし）—経口投与が前提',
      doseNote: '注射製剤がないため経口不能な場合は使用困難。低血圧（特に高齢者）に注意し起立時を確認。血糖上昇の監視も必要。',
      brands: 'セロクエル® 25/100/200 mg/錠、ビプレッソ® 50/150 mg（徐放）',
      pros: ['パーキンソン病でも安全（第一選択）', 'EPS少ない', '鎮静効果高め（不眠合併時にも有効）'],
      cons: ['経口のみ（注射なし）', '起立性低血圧', '血糖上昇（糖尿病患者に注意）'],
      monitoring: ['血圧（特に立位）', '血糖値（糖尿病患者）', '翌朝の意識レベル・過鎮静の確認'],
      note: 'パーキンソン病・レビー小体型認知症でも最も安全な選択肢。不眠合併せん妄にも有効。経口投与が前提。',
    });

    recs.push({
      id: 'risperidone', level: hasPark ? 'caution' : 'alternative',
      label: hasPark ? '慎重選択（パーキンソン病は原則回避）' : '代替選択（少量で使いやすい）',
      drug: 'リスペリドン（リスパダール®）',
      dose: canOral
        ? (hasElderly ? '0.25〜0.5 mg 経口 就寝前（高齢者—極少量から）' : '0.5〜1 mg 経口 就寝前〜1日2回')
        : '経口/内用液のみ（注射製剤は長期作用型のみ）',
      doseNote: hasElderly ? '高齢者は0.25 mgから開始し翌日に効果を評価。内用液（1 mg/mL）を使用すると少量調整が容易。' : '1 mg未満の低用量から開始し、効果に応じて翌日以降に増量。',
      brands: 'リスパダール® 0.5/1/2/3 mg/錠　内用液 1 mg/mL',
      pros: ['少量から使いやすい', 'ハロペリドールよりEPS少ない', '内用液で嚥下障害例にも対応'],
      cons: hasPark
        ? ['パーキンソン病・レビー小体型認知症は原則禁忌（EPS悪化）', '経口のみ（注射は長期作用型のみ）', '起立性低血圧']
        : ['経口のみ（急性期注射なし）', 'EPSあり（ハロペリドールより少ない）', '起立性低血圧'],
      monitoring: ['EPS（ハロペリドールより少ないが注意）', '血圧（起立時）', '翌朝の鎮静・覚醒状態'],
      note: 'ハロペリドールより少量で調整しやすく、EPS頻度が低め。パーキンソン病・レビー小体型認知症には使用しない。',
    });

    if (!hasCopd) {
      recs.push({
        id: 'midazolam_del', level: 'adjuvant',
        label: '難治性・終末期せん妄への補助薬（注射）',
        drug: 'ミダゾラム（ドルミカム®）',
        dose: hasElderly
          ? '0.5〜1 mg 皮下注/静注（必要時）、繰り返す場合は5〜10 mg/日 持続皮下注'
          : '1〜2 mg 皮下注/静注（必要時）、繰り返す場合は5〜20 mg/日 持続皮下注',
        doseNote: '難治性せん妄・終末期の強い苦痛・興奮に。抗精神病薬で不十分な場合に追加。COPD/CO2貯留例には禁忌。呼吸・意識を頻回確認。',
        brands: 'ドルミカム® 10 mg/2 mL',
        pros: ['強い鎮静効果', '経口不能でも使用可（注射）', '抗精神病薬への上乗せが可能'],
        cons: ['呼吸抑制リスク（CO2貯留禁忌）', '意識がさらに低下する可能性', '依存性（短期使用に限定）'],
        monitoring: ['呼吸数・SpO2（投与後30分毎）', '意識レベル（RASS）', '過鎮静（呼吸回数 ≤ 8回/分で即報告）'],
        note: '抗精神病薬で不十分な難治性・終末期せん妄に使用。COPD/CO2貯留リスクがある場合は原則禁忌。',
      });
    } else {
      warnings.push({ severity: 'hard', text: 'CO2貯留リスクのためミダゾラム等のベンゾジアゼピン系は原則禁忌。クエチアピン少量またはハロペリドールを優先してください。' });
    }
  }

  if (prob === 'insomnia' || prob === 'both') {
    if (prob === 'both') {
      // Divider note
      recs.push({
        id: 'divider_note', level: 'support',
        label: '不眠への対応（せん妄の治療を優先した上で）',
        drug: '注意：せん妄の治療薬（ハロペリドール等）が不眠も改善することが多いため、まずせん妄の治療を評価してください。',
        dose: '上記のせん妄治療を先行し、不眠が残存する場合に以下を検討。',
        doseNote: '',
        brands: '',
        pros: [],
        cons: [],
        note: 'せん妄の就寝前投与が不眠にも有効であることが多い。',
      });
    }

    if (!hasCopd) {
      recs.push({
        id: 'suvorexant', level: 'primary',
        label: '第一選択（不眠・呼吸抑制なし・依存性低）',
        drug: 'スボレキサント（ベルソムラ®）',
        dose: hasElderly ? '15 mg 経口 就寝直前（高齢者は15 mgを超えない）' : '15〜20 mg 経口 就寝直前',
        doseNote: '覚醒維持に関わるオレキシン受容体を遮断。ベンゾジアゼピン系と異なり呼吸抑制がほぼない。CYP3A4相互作用（フルコナゾール等）に注意。',
        brands: 'ベルソムラ® 10/15/20 mg/錠',
        pros: ['呼吸抑制なし（COPD以外はほぼ安全）', '依存性・耐性形成が少ない', '翌朝への持ち越し少ない'],
        cons: ['経口のみ', 'CYP3A4相互作用（フルコナゾール・クラリスロマイシン等）', '高額'],
        monitoring: ['翌朝の覚醒状態・眠気の持ち越し', '睡眠の質（入眠・中途覚醒）の改善を評価'],
        note: '国内外の緩和ケアガイドラインで推奨される不眠の第一選択。COPD合併でも比較的安全（ただし重篤なCO2貯留には注意）。',
      });
    }

    recs.push({
      id: 'mirtazapine', level: 'primary',
      label: '第一選択（食欲不振・悪心・うつが合併している場合）',
      drug: 'ミルタザピン（リフレックス®・レメロン®）',
      dose: hasElderly ? '7.5 mg 経口 就寝前（高齢者—7.5 mgから開始）' : '15 mg 経口 就寝前',
      doseNote: '鎮静・食欲増進・悪心改善・抗うつ効果をあわせ持つ。緩和ケアで食欲不振・悪心・うつ・不眠の複数症状合併時に特に有効。',
      brands: 'リフレックス® / レメロン® 15/30 mg/錠',
      pros: ['食欲増進・悪心改善の副効用', '抗うつ・抗不安効果も期待できる', '依存性なし'],
      cons: ['翌朝の眠気（低用量ほど眠気が強い）', '体重増加（長期）', '経口のみ'],
      monitoring: ['翌朝の眠気・食欲・気分の変化', '体重（長期使用時）'],
      note: '食欲不振・悪心・抑うつが合併する不眠に特に有効。少量（7.5 mg）の方が鎮静効果が強い（逆説的）。',
    });

    recs.push({
      id: 'trazodone', level: 'alternative',
      label: '代替選択（依存性なし・高齢者でも使いやすい）',
      drug: 'トラゾドン（レスリン®・デジレル®）',
      dose: hasElderly ? '25 mg 経口 就寝前（高齢者—25 mgから）' : '25〜50 mg 経口 就寝前',
      doseNote: 'セロトニン調節薬。依存性・耐性なし。睡眠の質（深睡眠）を改善する。起立性低血圧に注意（投与後はすぐ横になるよう指導）。',
      brands: 'レスリン® / デジレル® 25/50 mg/錠',
      pros: ['依存性なし', '高齢者でも比較的使いやすい', '睡眠の質（深睡眠）を改善'],
      cons: ['起立性低血圧（低血圧のある患者に注意）', '翌朝の眠気', '経口のみ'],
      monitoring: ['起立時の血圧・ふらつき', '翌朝の覚醒状態', '入眠・中途覚醒の改善'],
      note: '依存性がなく長期投与が可能。スボレキサントやミルタザピンが使用困難な場合の代替。',
    });

    if (!hasCopd) {
      recs.push({
        id: 'lorazepam', level: hasHepatic || hasElderly ? 'caution' : 'adjuvant',
        label: '短期補助薬（強い不安・パニック合併の不眠）',
        drug: 'ロラゼパム（ワイパックス®）',
        dose: hasElderly || hasHepatic ? '0.5 mg 経口/舌下 就寝前（高齢者/肝障害—最小量）' : '0.5〜1 mg 経口/舌下 就寝前',
        doseNote: '短時間作用型BZD。強い不安・パニック様症状が合併する不眠に有効。連用は最小限（1〜2週間）にとどめる。',
        brands: 'ワイパックス® 0.5/1 mg/錠',
        pros: ['速効性', '不安・パニック合併時に有効', '舌下投与も可'],
        cons: hasCopd
          ? ['呼吸抑制—CO2貯留リスクあり（原則禁忌）']
          : ['依存性・耐性（短期使用に限定）', '高齢者で認知機能悪化・転倒リスク', 'CO2貯留リスク例は禁忌'],
        monitoring: ['翌朝の眠気・認知機能', '転倒の有無（特に高齢者）', '依存・耐性の兆候（使用期間を2週間以内に）'],
        note: 'CO2貯留リスクがある場合は禁忌。高齢者・肝障害では最小量を短期間のみ。不眠の根本治療ではなく橋渡し的使用に限定。',
      });
    }
  }

  return { recs, warnings };
}

// ============================================================
// DELIRIUM/INSOMNIA — WIZARD
// ============================================================

const DL_STEPS = 4;

function showDlStep(n) {
  dlState.step = n;
  document.querySelectorAll('.dl-step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('dlstep' + n)?.classList.add('active');
  makeDlStepperUpdate(n);
  const prev = document.getElementById('dlprevBtn');
  const next = document.getElementById('dlnextBtn');
  if (prev) prev.style.display = n > 1 ? '' : 'none';
  if (next) {
    next.style.display = n < DL_STEPS ? '' : 'none';
    next.textContent = n === 2 ? '治療選択肢を確認 →' : n === 3 ? '選択した治療の詳細へ →' : '次へ →';
  }
  document.getElementById('deliriumPage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getDlFlags() {
  const flags = new Set();
  DL_SAFETY_CHECKS.forEach(c => { if (document.getElementById('dlsc_' + c.id)?.checked) flags.add(c.id); });
  return flags;
}

function updateDlSafetyFlagSummary() {
  const flags = getDlFlags();
  const summaryEl = document.getElementById('dlSafetyFlagSummary');
  if (!summaryEl) return;
  if (flags.size === 0) { summaryEl.style.display = 'none'; return; }
  const active = DL_SAFETY_CHECKS.filter(c => flags.has(c.id));
  summaryEl.innerHTML = `<span style="font-size:0.78rem;color:#6b7280;margin-right:6px;">選択中:</span>` +
    active.map(c => `<span class="aflag aflag-${c.severity === 'stop' ? 'stop' : c.severity}">${escHtml(c.label)}</span>`).join('');
  summaryEl.style.display = 'block';
}

function syncDlStep2() {
  dlState.ageGroup      = document.getElementById('dlAgeGroup')?.value ?? '';
  const probRadio       = document.querySelector('input[name="dl_problem"]:checked');
  const typeRadio       = document.querySelector('input[name="dl_type"]:checked');
  const causeEl         = document.getElementById('dlCauseExplored');
  const oralRadio       = document.querySelector('input[name="dl_oral"]:checked');
  dlState.problem       = probRadio ? probRadio.value : null;
  dlState.deliriumType  = typeRadio ? typeRadio.value : null;
  dlState.causeExplored = causeEl ? causeEl.checked : false;
  dlState.canOral       = oralRadio ? oralRadio.value === 'yes' : null;
}

function selectDlRec(idx) {
  dlState.selectedRecIdx = idx;
  renderSelectableRecs('dlstep3Content', dlState.result, idx, 'selectDlRec');
}

function validateDlStep(n) {
  if (n === 2) {
    if (!dlState.ageGroup) { toast('年齢層を選択してください'); return false; }
    if (!dlState.problem) { toast('主な問題を選択してください'); return false; }
    if (dlState.canOral === null) { toast('経口投与の可否を選択してください'); return false; }
  }
  if (n === 3) {
    if (dlState.selectedRecIdx === null) { toast('治療を1つ選択してください'); return false; }
  }
  return true;
}

function renderDlStep3() {
  const flags = getDlFlags();
  dlState.result = buildDlRecommendations(flags);
  dlState.selectedRecIdx = null;
  renderSelectableRecs('dlstep3Content', dlState.result, null, 'selectDlRec');
  state.auditLog.push({ ts: new Date().toISOString(), action: 'delirium_recommendation', problem: dlState.problem, flags: [...flags], recCount: dlState.result.recs.length });
}

function renderDlStep4() {
  const rec = dlState.result.recs[dlState.selectedRecIdx];
  if (!rec) return;

  const isDelirium = dlState.problem === 'delirium' || dlState.problem === 'both';
  const isInsomnia = dlState.problem === 'insomnia' || dlState.problem === 'both';

  const monitorItems = [
    { id: 'dl_sedation',  text: '鎮静レベル（RASS目標 −1〜0）を30〜60分後に確認', priority: true },
    { id: 'dl_resp',      text: '呼吸数・SpO2を投与後30〜60分で確認', priority: true },
    { id: 'dl_agit',      text: '興奮・不穏の改善（危険行動がおさまったか）を確認', priority: isDelirium },
    { id: 'dl_eps',       text: '錐体外路症状（固縮・振戦・嚥下困難）の出現を確認', priority: isDelirium },
    { id: 'dl_bp',        text: '血圧（特にクエチアピン・トラゾドン投与後の起立時）を確認', priority: true },
    { id: 'dl_morning',   text: '翌朝の覚醒状態・過鎮静の有無を評価', priority: isInsomnia },
    { id: 'dl_sleep',     text: '睡眠の質（入眠・中途覚醒・満足感）を翌日に確認', priority: isInsomnia },
  ].filter(item => item.priority || !isDelirium);

  const escalationItems = [
    '呼吸数 ≤ 8回/分、またはSpO2の急激な低下',
    '強い過鎮静（呼びかけに対する反応不良）',
    isDelirium ? '興奮が増悪し危険行動がコントロール不能' : null,
    isDelirium ? '嚥下障害の急激な悪化（EPS・NMS疑い）' : null,
    isInsomnia ? '転倒の発生（特に高齢者・骨転移例）' : null,
  ].filter(Boolean);

  const nonPharmItems = isDelirium
    ? ['日中は覚醒を保つよう声かけ・日光浴を促す（概日リズムの維持）', '時間・場所・状況を丁寧に説明し不安を軽減（現実見当識）', '大きな声を出さず穏やかに話しかける', '不必要な処置・刺激を最小化する（静かな環境）', '家族の面会が可能なら立ち会ってもらう（安心感）']
    : ['光環境：日中は明るく（カーテンを開ける）、夜間は暗くする', '温度・騒音の管理（快適な環境づくり）', '就寝前のルーティン（温かい飲み物・軽い体操・音楽）', '痛みや排尿障害などの睡眠を妨げる症状を先に評価・対処'];

  renderDetailWithMonitor('dlstep4Content', rec, monitorItems, escalationItems, nonPharmItems);
}

function renderDlSafetyChecklist() {
  const el = document.getElementById('dlSafetyChecklist');
  if (!el) return;
  el.innerHTML = '';
  DL_SAFETY_CHECKS.forEach(check => {
    const div = document.createElement('div');
    div.className = `safety-item sev-${check.severity}`;
    div.innerHTML = `
      <div class="safety-item-header">
        <input type="checkbox" id="dlsc_${escHtml(check.id)}">
        <div class="safety-item-text">
          <div class="safety-item-label">${escHtml(check.label)}</div>
          <div class="safety-item-desc">${escHtml(check.desc)}</div>
        </div>
      </div>
      <div class="safety-impact">
        <div class="impact-text"><strong>影響:</strong> ${escHtml(check.impact)}</div>
        <div class="action-text"><strong>対処:</strong> ${escHtml(check.action)}</div>
      </div>`;
    const cb = div.querySelector('input[type="checkbox"]');
    function toggle() { div.classList.toggle('active', cb.checked); updateDlSafetyFlagSummary(); }
    cb.addEventListener('change', toggle);
    div.addEventListener('click', e => { if (e.target !== cb) { cb.checked = !cb.checked; toggle(); } });
    el.appendChild(div);
  });
}

function initDlWizard() {
  renderDlSafetyChecklist();

  document.querySelectorAll('input[name="dl_problem"]').forEach(r => {
    r.addEventListener('change', () => {
      const v = r.value;
      document.getElementById('dlDeliriumSection').style.display = (v === 'delirium' || v === 'both') ? '' : 'none';
    });
  });

  document.getElementById('dlprevBtn')?.addEventListener('click', () => {
    if (dlState.step > 1) showDlStep(dlState.step - 1);
  });
  document.getElementById('dlnextBtn')?.addEventListener('click', () => {
    if (dlState.step === 2) syncDlStep2();
    if (!validateDlStep(dlState.step)) return;
    const next = dlState.step + 1;
    showDlStep(next);
    if (next === 3) renderDlStep3();
    if (next === 4) renderDlStep4();
  });

  document.getElementById('dlRestartBtn')?.addEventListener('click', () => {
    dlState.step = 1; dlState.ageGroup = ''; dlState.problem = null;
    dlState.deliriumType = null; dlState.causeExplored = false; dlState.canOral = null;
    dlState.selectedRecIdx = null;
    DL_SAFETY_CHECKS.forEach(c => {
      const cb = document.getElementById('dlsc_' + c.id);
      if (cb) { cb.checked = false; cb.closest('.safety-item')?.classList.remove('active'); }
    });
    document.querySelectorAll('input[name="dl_problem"]').forEach(r => { r.checked = false; });
    document.querySelectorAll('input[name="dl_type"]').forEach(r => { r.checked = false; });
    document.querySelectorAll('input[name="dl_oral"]').forEach(r => { r.checked = false; });
    const ce = document.getElementById('dlCauseExplored'); if (ce) ce.checked = false;
    document.getElementById('dlDeliriumSection').style.display = 'none';
    updateDlSafetyFlagSummary();
    showDlStep(1);
  });

  showDlStep(1);
}

// ============================================================
// END-OF-LIFE — SAFETY CHECKS DATA（聖隷三方原病院ガイド準拠）
// ============================================================

const EOL_SAFETY_CHECKS = [
  {
    id: 'eol_consciousness',
    label: '意識レベルの高度低下（GCS ≤ 10）',
    desc: '声かけへの反応が鈍い・開眼しない・GCS合計 10以下・傾眠以上',
    severity: 'hard',
    impact: '経口投与は誤嚥リスクが高く困難。オピオイドへの感受性が高まり過鎮静・呼吸抑制が生じやすい。',
    action: '経口投与は避け注射（皮下注/静注）へ切替。すべての初回量を通常の50%以下に設定。投与後15〜30分毎に呼吸・意識を確認。',
  },
  {
    id: 'eol_oral_impossible',
    label: '経口投与困難',
    desc: '嚥下障害・意識低下・拒否などにより経口投与が不可能',
    severity: 'info',
    impact: '皮下注射（持続皮下注）または静脈内投与が必要。速放薬や口腔内崩壊錠は使用不可。',
    action: '持続皮下注射または静脈内投与に切り替える。外部ルート（末梢静脈/皮下ポート）の確保を確認。',
  },
  {
    id: 'eol_pain_uncontrolled',
    label: '疼痛コントロール不十分',
    desc: '安静時NRS ≥ 4、または体動時に強い疼痛あり',
    severity: 'info',
    impact: 'オピオイドの増量・経路変更・レスキュー頻度見直しが必要。疼痛は死亡直前期の最重要症状の一つ。',
    action: 'オピオイドを25〜30%増量、または持続注射へ変更。レスキュー回数・間隔を評価。難治性疼痛は「換算」タブを活用。',
  },
  {
    id: 'eol_dyspnea_uncontrolled',
    label: '呼吸困難コントロール不十分',
    desc: '呼吸困難NRS ≥ 4、または呼吸の苦しさの訴えあり',
    severity: 'info',
    impact: 'オピオイド増量・ミダゾラム追加が必要。呼吸困難は死亡直前期に最も多い苦痛症状。',
    action: 'オピオイドの増量（25〜30%）。ミダゾラムを補助薬として追加。非薬物療法（顔への送風・体位）を並行。',
  },
  {
    id: 'eol_rattle',
    label: '死前喘鳴（death rattle）あり',
    desc: '喉や気道の分泌物が呼吸とともにゴロゴロと鳴る音',
    severity: 'info',
    impact: '患者本人は通常、苦痛を感じていないが、家族・介護者にとって非常に苦痛。分泌物が出せない状態。',
    action: 'ブチルスコポラミン（ブスコパン®）で分泌物を抑制。吸引は刺激で分泌を増加させることがあるため最小限に。体位変換（側臥位）が有効なことも。',
  },
  {
    id: 'eol_agitation',
    label: '過活動型せん妄・興奮あり',
    desc: '叫ぶ・ベッドから転落しようとする・強い不穏・幻覚が激しい',
    severity: 'hard',
    impact: '患者・家族双方にとって非常に苦痛。抗精神病薬またはミダゾラムによる迅速な介入が必要。',
    action: 'ハロペリドール皮下注（0.5〜1 mg 必要時）を第一選択。難治性ならミダゾラム持続皮下注の追加を検討。',
  },
  {
    id: 'eol_family_informed',
    label: '家族・介護者への説明済み',
    desc: '現在の病状・予後・これから起こりうる変化について家族への説明・同意済み',
    severity: 'info',
    impact: '終末期の医療処置に関して家族の理解・同意を得ておくことが重要（特に鎮静や薬剤増量について）。',
    action: '主治医による家族への病状・予後説明の確認。薬剤変更・増量の方針について家族と共有。',
  },
];

// ============================================================
// END-OF-LIFE — STATE
// ============================================================

const elState = {
  step: 1,
  ageGroup: '',
  prognosis: null,
  symptoms: new Set(),
  onOpioid: false,
  canOral: false,
  selectedRecIdx: null,
  result: { recs: [], warnings: [] },
};

// ============================================================
// END-OF-LIFE — RECOMMENDATION ENGINE
// ============================================================

function buildEolRecommendations(flags) {
  const hasPain    = elState.symptoms.has('pain')     || flags.has('eol_pain_uncontrolled');
  const hasDyspnea = elState.symptoms.has('dyspnea')  || flags.has('eol_dyspnea_uncontrolled');
  const hasRattle  = elState.symptoms.has('rattle')   || flags.has('eol_rattle');
  const hasAgit    = elState.symptoms.has('delirium') || flags.has('eol_agitation');
  const hasAnxiety = elState.symptoms.has('anxiety');

  const hasElderly    = elState.ageGroup === '>=75';
  const isImminentDeath = elState.prognosis === 'hours';
  const onOpioid      = elState.onOpioid;

  const recs = [];
  const warnings = [];

  if (!flags.has('eol_family_informed')) {
    warnings.push({ severity: 'soft', text: '家族・介護者への病状説明と治療方針の共有を先に確認してください（特に鎮静・薬剤増量について）。' });
  }

  // Opioid for pain/dyspnea
  if (hasPain || hasDyspnea) {
    if (onOpioid) {
      recs.push({
        id: 'opioid_escalate', level: 'primary',
        label: `第一選択：疼痛${hasDyspnea?'・呼吸困難':''}の管理（現行オピオイド増量）`,
        drug: '現行オピオイドを 25〜30% 増量し持続皮下注へ切替',
        dose: '現行1日量 × 1.25〜1.30（経口→注射の場合は換算タブを参照）',
        doseNote: `${isImminentDeath ? '予後時間単位の場合：1時間量をレスキュー（必要時ボーラス）として随時使用。' : ''}経口→皮下注の換算は「換算」タブを使用。レスキューは1日量の1/10〜1/6を1時間分ボーラスで随時使用。`,
        brands: 'モルヒネ塩酸塩注® / オキファスト注® / フェンタニル注® / ナルベイン注®（換算タブ参照）',
        pros: ['現行薬の継続で薬剤変更不要', 'オピオイドの疼痛と呼吸困難の両方に有効', '持続注射で安定した血中濃度'],
        cons: ['換算が必要（換算タブを活用）', '過鎮静・呼吸抑制（増量時は頻回評価）', '持続注射ポンプの準備が必要'],
        monitoring: ['疼痛NRS・呼吸困難NRSを投与1〜2時間後に評価', '呼吸数・SpO2を30分毎に確認（増量直後）', '意識レベルの変化（過鎮静）'],
        note: '死亡直前期の疼痛・呼吸困難に対するオピオイド管理の原則。新規追加ではなく現行量の増量が基本（聖隷ガイド準拠）。',
      });
    } else {
      recs.push({
        id: 'morphine_sc', level: 'primary',
        label: `第一選択：疼痛${hasDyspnea?'・呼吸困難':''}の管理（オピオイド新規開始）`,
        drug: 'モルヒネ 持続皮下注',
        dose: hasElderly
          ? '2.5〜5 mg/日 持続皮下注（高齢者—少量から開始）'
          : '5〜10 mg/日 持続皮下注（意識低下例は5 mg/日から）',
        doseNote: `レスキューは1時間量相当をボーラスで（例: 5 mg/日 → 0.2 mg/時 → レスキュー 0.2 mg）。腎機能高度障害がある場合はフェンタニルを選択。${isImminentDeath ? '予後時間単位の場合：レスキューを積極的に使用しNRSを3以下に目標。' : ''}`,
        brands: 'モルヒネ塩酸塩注® 10 mg/1 mL（各社）',
        pros: ['疼痛・呼吸困難の両方に有効', '持続皮下注で24時間安定した効果', 'エビデンス最も豊富'],
        cons: ['腎機能高度障害はM6G蓄積リスク（フェンタニルへ代替）', '高齢者は少量から', '持続注射ポンプ必要'],
        monitoring: ['疼痛・呼吸困難NRSを投与1〜2時間後に評価', '呼吸数・SpO2（投与30分毎）', '意識レベル・過鎮静の確認'],
        note: '死亡直前期の疼痛・呼吸困難管理の標準治療。腎機能高度障害がある場合はフェンタニル注に変更。',
      });
    }
  }

  // Buscopan for death rattle
  if (hasRattle) {
    recs.push({
      id: 'buscopan', level: 'primary',
      label: '第一選択：死前喘鳴（分泌物による雑音）の管理',
      drug: 'ブチルスコポラミン（ブスコパン®）皮下注',
      dose: isImminentDeath
        ? '20 mg 皮下注 q4h（必要時）、または 40〜80 mg/日 持続皮下注'
        : '20 mg 皮下注 q4〜6h（必要時）',
      doseNote: '抗コリン作用で気道・唾液腺の分泌物を抑制。患者本人はほとんど苦痛を感じていないが、家族に説明が重要。吸引は分泌刺激で逆効果になることがあるため最小限に。',
      brands: 'ブスコパン® 20 mg/1 mL',
      pros: ['分泌物を速やかに抑制', '持続注射で24時間コントロール可', '他の薬剤（モルヒネ等）と混合可'],
      cons: ['口渇・尿閉・排汗抑制（高体温リスク）', '緑内障・前立腺肥大に注意', '既存の分泌物を除去する効果はない（新たな産生を抑制）'],
      monitoring: ['喘鳴の改善（音の減少）を投与30〜60分後に評価', '口腔内の乾燥・口腔ケアの必要性', '尿量・排尿困難の有無（膀胱留置カテーテルの検討）'],
      note: '死前喘鳴は患者本人には苦痛がないことが多いが家族には大きな苦痛。丁寧な説明と並行して薬物療法を開始。',
    });
  }

  // Haloperidol for delirium/agitation
  if (hasAgit) {
    recs.push({
      id: 'haloperidol_eol', level: 'primary',
      label: '第一選択：せん妄・興奮の管理',
      drug: 'ハロペリドール 皮下注/静注',
      dose: hasElderly
        ? '0.5 mg 皮下注 q4〜8h（必要時）、持続なら 1〜2 mg/日'
        : '0.5〜1 mg 皮下注/静注（必要時）、持続なら 2〜5 mg/日',
      doseNote: '過活動型せん妄に迅速に対応。効果不十分（30〜60分後も改善なし）ならミダゾラムを追加。持続注射と必要時ボーラスを組み合わせると管理しやすい。',
      brands: 'セレネース® 5 mg/mL',
      pros: ['終末期せん妄に有効', '注射製剤で経口不能でも使用可', 'ミダゾラムと混合可'],
      cons: ['EPS（高用量・高齢者）', 'QT延長', 'パーキンソン病/レビー小体型認知症は避ける'],
      monitoring: ['鎮静レベル（RASS目標 −1〜0）', '興奮・不穏の改善', '呼吸数・意識レベル'],
      note: '死亡直前期のせん妄・興奮管理の第一選択。パーキンソン病・レビー小体型認知症ではミダゾラムへ変更。',
    });
  }

  // Midazolam for anxiety/refractory
  if (hasAnxiety || hasAgit || (hasPain && hasDyspnea)) {
    recs.push({
      id: 'midazolam_eol', level: hasAgit ? 'adjuvant' : 'primary',
      label: hasAgit ? '補助薬：難治性せん妄・強い不安（ハロペリドール追加）' : '第一選択：強い不安・苦痛・難治性症状の管理',
      drug: 'ミダゾラム 持続皮下注',
      dose: hasElderly
        ? '0.5〜1 mg 皮下注（必要時）、持続なら 5〜10 mg/日（高齢者—少量から）'
        : '1〜2 mg 皮下注（必要時）、持続なら 10〜20 mg/日',
      doseNote: `${isImminentDeath ? '予後時間単位の場合、必要時の投与を積極的に活用し苦痛をゼロに近づけることを目標とする。' : ''}モルヒネ・ハロペリドールとの混合持続皮下注が可能。呼吸数・SpO2を頻回に確認。`,
      brands: 'ドルミカム® 10 mg/2 mL',
      pros: ['強い鎮静・抗不安効果', '他の薬剤（モルヒネ・ハロペリドール）と混合注射可', '皮下注射で経口不能でも使用可'],
      cons: ['呼吸抑制（CO2貯留リスク例は注意）', '意識レベルがさらに低下する可能性（家族への説明必要）', '大量投与では鎮静レベルが読みにくい'],
      monitoring: ['呼吸数・SpO2を投与15〜30分後に確認', '鎮静レベル（苦痛なく眠れているか）', '家族が傍にいられる環境の確保'],
      note: '難治性の不安・苦痛・せん妄に有効。「苦痛を和らげるための鎮静」は意図的に命を縮めるものではないことを家族に丁寧に説明する。',
    });
  }

  // Combined infusion approach
  if (recs.length >= 2) {
    recs.push({
      id: 'combined_sc', level: 'support',
      label: '包括的アプローチ：複数症状への混合持続皮下注',
      drug: 'モルヒネ + ハロペリドール ± ミダゾラム 混合持続皮下注',
      dose: '各薬剤の量を合算した混合液を1本のシリンジで持続皮下注（配合変化を事前に薬剤師に確認）',
      doseNote: '複数の苦痛症状が同時に存在する場合に1つのラインで管理できる。薬剤師への相談必須（配合禁忌: フロセミドとの混合は不可）。ポンプの準備と患者宅訪問看護の体制確認が必要。',
      brands: '各薬剤の注射液を組み合わせ（薬剤師と配合可否を事前確認）',
      pros: ['1本のラインで複数症状を同時管理', '在宅・施設でもポンプがあれば使用可', '血中濃度が安定し症状コントロールが容易'],
      cons: ['薬剤師への相談と配合確認が必要', '注射ポンプの準備・訪問看護体制が必要', '途中の薬剤追加・変更が難しい（ライン交換が必要）'],
      monitoring: ['各症状（疼痛・呼吸困難・不穏・喘鳴）の改善を定期評価', '注射部位の発赤・硬結（皮下注の場合は2〜3日毎に部位変更）', '家族への症状評価の指導'],
      note: '在宅・施設での終末期管理に有効。訪問看護師・薬剤師・医師によるチームアプローチが重要。',
    });
  }

  if (recs.length === 0) {
    warnings.push({ severity: 'soft', text: '症状を1つ以上選択してください（疼痛・呼吸困難・喘鳴・せん妄/興奮・不安）。' });
  }

  return { recs, warnings };
}

// ============================================================
// END-OF-LIFE — WIZARD
// ============================================================

const EOL_STEPS = 4;

function showElStep(n) {
  elState.step = n;
  document.querySelectorAll('.el-step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('elstep' + n)?.classList.add('active');
  makeElStepperUpdate(n);
  const prev = document.getElementById('elprevBtn');
  const next = document.getElementById('elnextBtn');
  if (prev) prev.style.display = n > 1 ? '' : 'none';
  if (next) {
    next.style.display = n < EOL_STEPS ? '' : 'none';
    next.textContent = n === 2 ? '治療選択肢を確認 →' : n === 3 ? '選択した治療の詳細へ →' : '次へ →';
  }
  document.getElementById('eolPage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getElFlags() {
  const flags = new Set();
  EOL_SAFETY_CHECKS.forEach(c => { if (document.getElementById('elsc_' + c.id)?.checked) flags.add(c.id); });
  return flags;
}

function updateElSafetyFlagSummary() {
  const flags = getElFlags();
  const summaryEl = document.getElementById('elSafetyFlagSummary');
  if (!summaryEl) return;
  if (flags.size === 0) { summaryEl.style.display = 'none'; return; }
  const active = EOL_SAFETY_CHECKS.filter(c => flags.has(c.id));
  summaryEl.innerHTML = `<span style="font-size:0.78rem;color:#6b7280;margin-right:6px;">選択中:</span>` +
    active.map(c => `<span class="aflag aflag-${c.severity === 'stop' ? 'stop' : c.severity}">${escHtml(c.label)}</span>`).join('');
  summaryEl.style.display = 'block';
}

function syncElStep2() {
  elState.ageGroup = document.getElementById('elAgeGroup')?.value ?? '';
  const progRadio  = document.querySelector('input[name="el_prognosis"]:checked');
  const opioidRadio = document.querySelector('input[name="el_onopioid"]:checked');
  elState.prognosis = progRadio ? progRadio.value : null;
  elState.onOpioid  = opioidRadio ? opioidRadio.value === 'yes' : false;
  elState.canOral   = false;
  elState.symptoms  = new Set();
  document.querySelectorAll('input[name="el_symptom"]:checked').forEach(r => elState.symptoms.add(r.value));
}

function selectElRec(idx) {
  elState.selectedRecIdx = idx;
  renderSelectableRecs('elstep3Content', elState.result, idx, 'selectElRec');
}

function validateElStep(n) {
  if (n === 2) {
    if (!elState.ageGroup) { toast('年齢層を選択してください'); return false; }
    if (!elState.prognosis) { toast('推定予後を選択してください'); return false; }
    if (elState.symptoms.size === 0) { toast('主な症状を1つ以上選択してください'); return false; }
  }
  if (n === 3) {
    if (elState.selectedRecIdx === null) { toast('治療方針を1つ選択してください'); return false; }
  }
  return true;
}

function renderElStep3() {
  const flags = getElFlags();
  elState.result = buildEolRecommendations(flags);
  elState.selectedRecIdx = null;
  renderSelectableRecs('elstep3Content', elState.result, null, 'selectElRec');
  state.auditLog.push({ ts: new Date().toISOString(), action: 'eol_recommendation', symptoms: [...elState.symptoms], flags: [...flags], recCount: elState.result.recs.length });
}

function renderElStep4() {
  const rec = elState.result.recs[elState.selectedRecIdx];
  if (!rec) return;

  const monitorItems = [
    { id: 'el_pain',    text: '疼痛NRS（可能なら）または表情・体動・顔面緊張で評価', priority: true },
    { id: 'el_resp',    text: '呼吸数・SpO2を30〜60分毎に確認', priority: true },
    { id: 'el_sedation',text: '鎮静レベル（苦痛なく眠れているか、RASS −2〜−1）', priority: true },
    { id: 'el_rattle',  text: '死前喘鳴の程度の変化を確認（家族への説明を含む）', priority: elState.symptoms.has('rattle') },
    { id: 'el_agit',    text: '不穏・興奮が改善し危険行動がおさまったか確認', priority: elState.symptoms.has('delirium') },
    { id: 'el_family',  text: '家族が傍にいられる環境を確保し、状況を丁寧に説明する', priority: true },
    { id: 'el_mouth',   text: '口腔内の乾燥（口腔ケア、スポンジで湿らせる）', priority: false },
    { id: 'el_site',    text: '皮下注射部位の発赤・硬結（2〜3日毎に部位変更）', priority: false },
  ].filter(item => item.priority || true);

  const escalationItems = [
    '呼吸数 ≤ 8回/分、または呼吸の間隔が10秒以上',
    '痛みの苦悶様表情・うめき声の増悪',
    '薬剤効果が全くなく興奮・苦痛が持続',
    '家族が強い苦痛・混乱を示し精神的支援が必要',
  ];

  const nonPharmItems = [
    '家族への継続的な状況説明（何が起きているか・これから何が起こりうるかを丁寧に伝える）',
    '口腔ケア（スポンジで口を湿らせる・リップクリーム）—水分投与が困難な場合も快適さを保つ',
    '体位変換（褥瘡予防・呼吸苦の軽減）—側臥位が呼吸や喘鳴に有効なことも',
    '顔への送風（扇風機・うちわ）—呼吸困難感の軽減',
    '音楽・静かな環境の整備—患者が好みの音楽や環境を家族から確認',
    '家族・友人との別れの時間を十分に確保する',
  ];

  renderDetailWithMonitor('elstep4Content', rec, monitorItems, escalationItems, nonPharmItems);
}

function renderElSafetyChecklist() {
  const el = document.getElementById('elSafetyChecklist');
  if (!el) return;
  el.innerHTML = '';
  EOL_SAFETY_CHECKS.forEach(check => {
    const div = document.createElement('div');
    div.className = `safety-item sev-${check.severity}`;
    div.innerHTML = `
      <div class="safety-item-header">
        <input type="checkbox" id="elsc_${escHtml(check.id)}">
        <div class="safety-item-text">
          <div class="safety-item-label">${escHtml(check.label)}</div>
          <div class="safety-item-desc">${escHtml(check.desc)}</div>
        </div>
      </div>
      <div class="safety-impact">
        <div class="impact-text"><strong>影響:</strong> ${escHtml(check.impact)}</div>
        <div class="action-text"><strong>対処:</strong> ${escHtml(check.action)}</div>
      </div>`;
    const cb = div.querySelector('input[type="checkbox"]');
    function toggle() { div.classList.toggle('active', cb.checked); updateElSafetyFlagSummary(); }
    cb.addEventListener('change', toggle);
    div.addEventListener('click', e => { if (e.target !== cb) { cb.checked = !cb.checked; toggle(); } });
    el.appendChild(div);
  });
}

function initElWizard() {
  renderElSafetyChecklist();

  document.getElementById('elprevBtn')?.addEventListener('click', () => {
    if (elState.step > 1) showElStep(elState.step - 1);
  });
  document.getElementById('elnextBtn')?.addEventListener('click', () => {
    if (elState.step === 2) syncElStep2();
    if (!validateElStep(elState.step)) return;
    const next = elState.step + 1;
    showElStep(next);
    if (next === 3) renderElStep3();
    if (next === 4) renderElStep4();
  });

  document.getElementById('elRestartBtn')?.addEventListener('click', () => {
    elState.step = 1; elState.ageGroup = ''; elState.prognosis = null;
    elState.symptoms = new Set(); elState.onOpioid = false; elState.selectedRecIdx = null;
    EOL_SAFETY_CHECKS.forEach(c => {
      const cb = document.getElementById('elsc_' + c.id);
      if (cb) { cb.checked = false; cb.closest('.safety-item')?.classList.remove('active'); }
    });
    document.querySelectorAll('input[name="el_prognosis"]').forEach(r => { r.checked = false; });
    document.querySelectorAll('input[name="el_symptom"]').forEach(r => { r.checked = false; });
    document.querySelectorAll('input[name="el_onopioid"]').forEach(r => { r.checked = r.value === 'no'; });
    updateElSafetyFlagSummary();
    showElStep(1);
  });

  showElStep(1);
}

document.addEventListener('DOMContentLoaded', init);
