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

  showPage('home');
  showStep(1);
}

document.addEventListener('DOMContentLoaded', init);
