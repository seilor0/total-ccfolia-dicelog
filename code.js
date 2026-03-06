import {floatRound} from '../__utility/function.js';
import {createMultiSelect, setOptions2MultiSelect, addRow} from '../__utility/function.js';
import {dragEnter, dragLeave, dragOver, clickNextInput} from '../__utility/function.js';

const resultDiv       = document.getElementById('result');
const noDupCheckbox   = document.getElementById('noDupCheckbox');
// const showLogCheckbox = document.getElementById('showDiceLog');
const modal           = document.getElementById('modal');

/**
 * [{tab, name, nameNodup, log}]
 */
let chatArr = [];
/**
 * [{
 tab, name, nameNodup, log,
 coc6th   : rollNo, skill, rollVal, diceVal, CF
 coc7th   : rollNo, skill, rollVal, diceVal, CF
 emoklore : rollNo, D, C, E, rollVal, suc, sucE
}]
 */
let rollArr = [];
let tabMap = new Map();
let nameSet, nameNodupSet;

// in:杖/拳銃/日本刀  out:クトゥルフ神話（初期値で振ることがないため）
const allInitSkill_6 = new Map([
  ['キック', 25],
  ['組み付き', 25],
  ['こぶし', 50],
  ['パンチ', 50],
  ['頭突き', 10],
  ['投擲', 25],
  ['マーシャルアーツ', 1],
  ['拳銃', 20],
  ['サブマシンガン', 15],
  ['ショットガン', 30],
  ['マシンガン', 15],
  ['ライフル', 25],
  ['杖', 25],
  ['応急手当', 30],
  ['鍵開け', 1],
  ['隠す', 15],
  ['隠れる', 10],
  ['聞き耳', 25],
  ['忍び歩き', 10],
  ['写真術', 10],
  ['精神分析', 1],
  ['追跡', 10],
  ['登攀', 40],
  ['図書館', 25],
  ['目星', 25],
  ['運転', 20],
  ['機械修理', 20],
  ['重機械操作', 1],
  ['乗馬', 5],
  ['水泳', 25],
  ['製作', 5],
  ['操縦', 1],
  ['跳躍', 25],
  ['電気修理', 10],
  ['ナビゲート', 10],
  ['変装', 1],
  ['言いくるめ', 5],
  ['信用', 15],
  ['説得', 15],
  ['値切り', 5],
  ['医学', 5],
  ['オカルト', 5],
  ['化学', 1],
  ['芸術', 5],
  ['経理', 10],
  ['考古学', 1],
  ['コンピュータ', 1],
  ['心理学', 5],
  ['人類学', 1],
  ['生物学', 1],
  ['地質学', 1],
  ['電子工学', 1],
  ['天文学', 1],
  ['博物学', 10],
  ['物理学', 1],
  ['法律', 5],
  ['薬学', 1],
  ['歴史', 20]
]);
// '回避': Math.floor(stats.dex/2),	// 7版ver. dex
const allInitSkill_7 = new Map([
  ['斧', 15],
  ['格闘', 25],
  ['絞殺ひも', 15],
  ['チェーンソー', 10],
  ['刀剣', 20],
  ['フレイル', 10],
  ['むち', 5],
  ['槍', 20],
  ['投擲', 20],
  ['火炎放射器', 10],
  ['拳銃', 20],
  ['サブマシンガン', 15],
  ['重火器', 10],
  ['マシンガン', 15],
  ['弓', 15],
  ['ライフル', 25],
  ['ショットガン', 25],
  ['応急手当', 30],
  ['鍵開け', 1],
  ['手さばき', 10], 
  ['聞き耳', 20],
  ['隠密', 20],
  ['精神分析', 1],
  ['追跡', 10],
  ['図書館', 20],
  ['目星', 25],
  ['鑑定', 5],
  ['運転', 20],
  ['機械修理', 10],
  ['重機械操作', 1],
  ['乗馬', 5],
  ['水泳', 20],
  ['製作', 5],
  ['操縦', 1],
  ['跳躍', 20],
  ['電気修理', 10],
  ['ナビゲート', 10],
  ['変装', 5],
  ['言いくるめ', 5],
  ['説得', 10],
  ['威圧', 15],
  ['魅惑', 15],
  ['言語', 1],
  ['医学', 1],
  ['オカルト', 5],
  ['芸術', 5],
  ['経理', 5],
  ['考古学', 1],
  ['コンピュータ', 5],
  ['科学', 1],
  ['心理学', 10],
  ['人類学', 1],
  ['電子工学', 1],
  ['自然', 10],
  ['法律', 5],
  ['歴史', 5],
  ['サバイバル', 10]
]);

const multiSelect = createMultiSelect('multiSelect', document.querySelector('.hiddenSetting'), null);
multiSelect.getElementById('multiSelect').addEventListener('click', totalRoll);

// -------------------------
//      ログ読み込み関連
// -------------------------

// // ファイルボタン
// document.querySelectorAll('button.fileButton').forEach(button => {
//   button.addEventListener('click',clickNextInput);
//   button.addEventListener('dragenter',dragEnter);
//   button.addEventListener('dragleave',dragLeave);
//   button.addEventListener('dragover',dragOver);
//   button.addEventListener('drop',drop);
// });

// ログが読み込まれた時
document.querySelectorAll('input[type=file]').forEach(input =>
  input.addEventListener('change', async (e) => {
    // if (!e.currentTarget.files.length) return;
    // if (!e.currentTarget.previousElementSibling.classList.contains('add')) chatArr = [];
    // await Promise.all(Array.from(e.currentTarget.files, file => extractChat(file)));
    // extractRoll();
    showResult();
  })
);


// -------------------------
//     モーダルカード関連
// -------------------------
// 閉じる時：初期化
modal.addEventListener('beforetoggle', (e) => {
  if (e.newState==='open') return;
  e.currentTarget.querySelector('h2').innerHTML = '';
  e.currentTarget.querySelectorAll('header > :not(h2, button:has(.icon-close))').forEach(el => el.remove());
  e.currentTarget.querySelector('.modal-body').innerHTML = '';
});

// 集計タブボタン
document.getElementById('selectTab').addEventListener('click', () => {
  const body = modal.querySelector('.modal-body');

  modal.querySelector('h2').textContent = '集計するタブを選択';
  const wrapper = document.createElement('div');
  wrapper.className = 'select-tag-wrapper';
  wrapper.style.setProperty('flex-direction', 'column');
  body.appendChild(wrapper);

  // 一括選択チェックボックス
  const label = document.createElement('label');
  const allInput = document.createElement('input');
  allInput.type = 'checkbox';
  allInput.checked = tabMap.values().every((value)=>value);

  label.appendChild(allInput);
  label.appendChild(document.createTextNode('全てのタブ'));
  wrapper.appendChild(label);

  allInput.addEventListener('change', (e) => {
    wrapper.querySelectorAll('.select-tag input').forEach(input => input.checked = e.currentTarget.checked);
    tabMap.keys().forEach(key => tabMap.set(key, e.currentTarget.checked));
  });

  // 各タブのセレクトタグ
  tabMap.forEach((value,key) => addSelectTag(wrapper, key, null, value));
  modal.querySelectorAll('.select-tag input').forEach(input => 
    input.addEventListener('change', (e)=> tabMap.set(e.currentTarget.value, e.currentTarget.checked))
  );

  modal.querySelectorAll('input[type=checkbox]').forEach(input=>input.addEventListener('change',totalRoll));
});

// ログ編集
document.getElementById('editLog').addEventListener('click', () => {
  const body = modal.querySelector('.modal-body');

  modal.querySelector('h2').textContent = 'ログを編集';

  const parentDiv = document.createElement('div');
  parentDiv.className = 'logWrap';
  parentDiv.tabIndex = -1;
  body.appendChild(parentDiv);

  const delButton = document.createElement('button');
  delButton.innerText = 'delete';
  delButton.className = 'tab-button';
  delButton.style.setProperty('position','absolute');
  delButton.style.setProperty('left', '8.25rem');
  modal.querySelector('h2').after(delButton);

  chatArr.forEach( (dic, i) => {
    const rowDiv = document.createElement('div');
    rowDiv.dataset.index = i;
    
    const tabSpan  = document.createElement('span');
    const nameSpan = document.createElement('span');
    const logP     = document.createElement('p');
    tabSpan.innerText  = dic.tab;
    nameSpan.innerText = dic.name;
    logP.innerText     = dic.log;
    
    rowDiv.appendChild(tabSpan);
    rowDiv.appendChild(nameSpan);
    rowDiv.appendChild(logP);
    parentDiv.appendChild(rowDiv);
  });

  // 削除イベント
  delButton.addEventListener('click', deleteLog);
  parentDiv.addEventListener('keydown', (e) => {
    if (e.key!='Delete') {
      e.currentTarget.blur();
      return;
    }
    deleteLog();
    e.currentTarget.blur();
  });

  function deleteLog () {
    const rangeObj = window.getSelection().getRangeAt(0);
    if (rangeObj.collapsed) return;
    
    const stNode  = rangeObj.startContainer;
    const endNode = rangeObj.endContainer;
    const stEl  = stNode.tagName  ? stNode  : stNode.parentElement;
    const endEl = endNode.tagName ? endNode : endNode.parentElement;
    let   stRow  = parseInt(stEl.closest('div[data-index]').dataset.index);
    let   endRow = parseInt(endEl.closest('div[data-index]').dataset.index);
    
    // start : 行末の場合
    if (rangeObj.startOffset==stNode.length && !stEl.nextElementSibling)  stRow++;
    
    // end : 行頭の場合
    if (rangeObj.endOffset==0 && !endEl.previousElementSibling)  endRow--;
    
    rangeObj.setStartBefore(document.querySelector(`.modal-body div[data-index="${stRow}"]`));
    rangeObj.setEndAfter   (document.querySelector(`.modal-body div[data-index="${endRow}"]`));
    rangeObj.deleteContents();

    // 番号の振り直し
    document.querySelectorAll('.modal-body div[data-index]').forEach((div,i) => div.dataset.index = i);
    
    // 集計に反映
    chatArr.splice(stRow, endRow-stRow+1);
    extractRoll();
    showResult();
  }
});

// -------------------------
// システム
document.getElementsByName('system').forEach(radio => {
  // radio.addEventListener('change', (e) => {
  //   batchMove(showLogCheckbox,'↑↑←').textContent = e.currentTarget.value.startsWith('coc') ? '成長ログ' : 'ダイスログ';
  //   batchMove(document.querySelector('[name=growTarget][value=S]'),'↑←').textContent = e.currentTarget.value=='coc7th' ? 'Extreme' : 'Special';
  // });
  // radio.addEventListener('change', extractRoll);
  radio.addEventListener('change', showResult);
});

// 複製コマ
noDupCheckbox.addEventListener('change', showResult);

// ダイス, 並び替え, 表示形式
document.getElementById('totalStyle').addEventListener('change', totalRoll);
document.getElementById('sortStyle').addEventListener ('change', totalRoll);
document.getElementById('showStyle').addEventListener ('change', totalRoll);

// 成長対象
document.getElementsByName('growTarget').forEach(input=>input.addEventListener('change', totalRoll));


// -------------------------
//         メイン処理
// -------------------------

// /**
//  * ファイルから{タブ,発言者,ログ}を抽出してchatArrに格納する関数
//  * @param {htmlFile} file ログファイル
//  */
// async function extractChat(file) {
//   console.log('start of extractChat -->');
//   if (file.type != 'text/html') return;

//   const parser = new DOMParser;
//   const doc = parser.parseFromString(await file.text(), 'text/html');
  
//   // 初回処理
//   if (document.getElementById('root').dataset.flag)  delete document.getElementById('root').dataset.flag;

//   // 抽出
//   doc.querySelectorAll('p').forEach(chat => {
//     const arr  = chat.querySelectorAll('span');

//     const tab  = arr[0].innerText.trim().slice(1,-1);
//     const name = arr[1].innerText.replaceAll('　',' ').trim();
//     const nameNodup = name.replace(/ *\(\d+\)$/,'');
//     const log  = normStr(arr[2].innerHTML).trim();

//     const textArr = log.split(/#\d+/);
//     if (textArr.length > 1) {
//       const head = textArr.shift();
//       textArr.forEach(t => 
//         chatArr.push({tab:tab, name:name, nameNodup:nameNodup, log:`${head}${t.replaceAll('\n',' ')}`.trim()})
//       );
//       return;
//     }
//     chatArr.push({tab:tab, name:name, nameNodup:nameNodup, log:log});
//   });
//   console.log('chatArr', chatArr);
//   console.log('--> end of extractChat');
//   return;
// }

/**
 * chatArrから判定情報を抽出してrollArrに格納する関数（nameSet, nameNodupSet, tabMapも更新）
 */
async function extractRoll() {
  console.log('start of extractRoll -->');
  if(!chatArr)  return;
  
  rollArr = [];
  const system = document.querySelector('input[type=radio][name=system]:checked')?.value;
  let   rollNo = 1;
  const dicePat = system.startsWith('coc') ? 
    / > (?<diceVal>\d+)\D* > / : 
    / > \[(?<diceVal>[\d, ]+)\] > [-\d]/;
  const replaceArr = [
    [/[【】「」『』《》〈〉〔〕\[\]]/g, ''],
    [/[<≪](.*?)[>≫]/g, '$1'],
    [/\((.+?)\)/g, '：$1'],
    [':', '：'], 
    ['(', '（'], 
    [')', '）'], 
    ['!', '！'], 
    ['?', '？']
  ].concat(system.startsWith('coc')?[['*',' × ']]:[]);

  chatArr.forEach(dic => {
    // 判定なし行 / 取り消しダイス
    if (!(system.startsWith('coc') ? /.\(1d100<=/is : /.\(\d+DM<=/is).test(dic.log)) return;
    
    // タブ・キャラクター・ログ
    const rollDic = structuredClone(dic);
    
    // 出目
    let diceVal = dic.log.match(dicePat)?.groups.diceVal;
    if (!diceVal) return;
    diceVal = system=='emoklore' ? diceVal.split(',').map(e=>parseInt(e)) : parseInt(diceVal);
    rollDic.diceVal = diceVal;
    
    // No.
    rollDic.rollNo = rollNo;
    rollNo++;

    // 技能名
    const skillPat = system=='emoklore'  ?  /<=.+? (.*)\(\d+DM<=\d/si  :
      /CBR|RES/i.test(dic.log)  ?  /\d+\) (.*)\(1d100<=/si  : 
      /<=.+? (.*)\(1d100<=/si;
    const skill = dic.log.match(skillPat)[1];
    rollDic.skill = replaceArr.reduce((ac, cur)=>ac=ac.replaceAll(cur[0],cur[1]), skill).trim();

    switch (system) {
      case 'coc6th':
        // 判定値・C/F
        if (/ > \d+\[.+,.+\] > /.test(dic.log)) {
          // 組み合わせロール
          rollDic.rollVal = Math.min(...dic.log.match(/<=([\d,]+)\) > /)[1].split(','));
          const text = dic.log.match(/ > \d+\[(.+,.+)\] > /)[1];
          rollDic.CF = text.includes('決定的成功') ? 'C' : 
            text.includes('スペシャル') ? 'S' : 
            text.includes('致命的失敗') ? 'F' : null;
        } else {
          rollDic.rollVal = parseInt(dic.log.match(/\(1d100<=([-\d]+)\).* > /i)[1]);
          rollDic.CF = /決定的成功(\/スペシャル)?$/.test(dic.log) ? 'C' : 
            dic.log.endsWith('スペシャル') ? 'S' : 
            dic.log.endsWith('致命的失敗') ? 'F' : null;
        }
        break;

      case 'coc7th':
        rollDic.rollVal = parseInt(dic.log.match(/\(1d100<=([-\d]+)\).* > /i)[1]);
        rollDic.CF = dic.log.endsWith('クリティカル') ? 'C' : 
          dic.log.endsWith('イクストリーム成功') ? 'Ex' : 
          dic.log.endsWith('ファンブル') ? 'F' : null;
        break;

      case 'emoklore':
        const D = diceVal.length;
        const C = diceVal.filter(e=>e==1).length;
        const E = diceVal.filter(e=>e==10).length;
        const rollVal = parseInt(dic.log.match(/\(\d+DM<=(\d+)\) > \[[\d, ]+\]/i)[1]);
        rollDic.D = D;
        rollDic.C = C;
        rollDic.E = E;
        rollDic.rollVal = rollVal;
        rollDic.suc = C - E + diceVal.filter(e=>e<=rollVal).length;;
        rollDic.sucE = D * rollVal / 10;;
        break;
    }
    rollArr.push(rollDic);
  });

  console.log('rollArr:', rollArr);
  nameSet      = new Set(rollArr.map(dic => dic.name));
  nameNodupSet = new Set(rollArr.map(dic => dic.nameNodup));
  tabMap.clear();
  new Set(rollArr.map(dic => dic.tab)).forEach(key => tabMap.set(key,true));

  setOptions2MultiSelect(multiSelect, new Set(rollArr.map(dic => dic.skill).filter(Boolean).sort()));

  console.log('--> end of extractRoll');
}


async function showResult() {
  // 初期化
  resultDiv.innerHTML = '';
  if (!rollArr.length) return;

  // HTML作成
  const createResultCard = (parent, name=null) => {
    parent.appendChild(document.getElementById('eachResultTemplate').content.cloneNode(true));
    const cardDiv = parent.lastElementChild; // .each-resultのdiv
    if (name)  cardDiv.dataset.name = name;
    else cardDiv.classList.add('all');
    
    cardDiv.querySelector('h3').innerText = name || 'ALL';
    
    const selectTagWrapper = cardDiv.querySelector('.select-tag-wrapper');
    (noDupCheckbox.checked ? nameNodupSet : nameSet).forEach(selectTagName => addSelectTag(selectTagWrapper, selectTagName, 'character', !name || selectTagName==name));
  
    // クリックイベント：再統計
    selectTagWrapper.querySelectorAll('input').forEach(input => 
      input.addEventListener('change', (e)=>totalEachRoll(e.currentTarget.closest('.each-result')))
    );
  
    // タグによるキャラ結果の表示切替
    if (name) {
      selectTagWrapper.querySelectorAll('.select-tag input').forEach(input => {
        input.addEventListener('click', (e)=> {
          const character = e.currentTarget.value;
          const selected  = e.currentTarget.checked;
          // 本人の集計欄は消さない
          if (e.currentTarget.closest(`.each-result[data-name='${character}']`)) return;
          // 集計欄
          resultDiv.querySelector(`.each-result[data-name='${character}']`).style.display = selected ? 'none' : null;
          // キャラ選択タグ
          resultDiv.querySelectorAll(`.each-result[data-name] .select-tag:has(>[value='${character}'])`).forEach(label => {
            if(label.contains(e.currentTarget)) return;
            label.style.display = selected ? 'none' : null;
          });
        });
      });
    }
    return cardDiv;
  }
  createResultCard(resultDiv);
  (noDupCheckbox.checked ? nameNodupSet : nameSet).forEach(name => createResultCard(resultDiv, name));

  // 統計結果の反映
  totalRoll();
}


function totalRoll() {
  document.querySelectorAll('.each-result').forEach(div => totalEachRoll(div));
}

/* 
totalData:
coc6th   : Map[roll, average, C, F, S,  Init]
coc7th   : Map[roll, average, C, F, Ex, Init]
emoklore : Map[roll, D, average, C, E, Suc, SucEx]
 */

/**
 * 各選択キャラのダイスを統計してテーブルに表示する関数
 * @param {HTMLDivElement} parentDiv 
 * @returns 
 */
function totalEachRoll(parentDiv) {
  // ----------------------
  //          統計
  // ----------------------
  const totalData = new Map();
  let   growArr = [];
  const system = document.querySelector('input[type=radio][name=system]:checked')?.value;
  
  const character = Array.from(parentDiv.querySelectorAll('.select-tag input:checked'), e=>e.value);
  const targetRoll = structuredClone(rollArr).filter(dic => tabMap.get(dic.tab) && character.includes(noDupCheckbox.checked ? dic.nameNodup : dic.name));

  // ロール数
  totalData.set('ロール', targetRoll.length);
  
  if (system.startsWith('coc')) {
    const growTarget = Array.from(document.querySelectorAll('input[name=growTarget]:checked'), e=>e.value);
    const totalStyle = document.getElementById('totalStyle').value;
    
    // 出目平均
    totalData.set('出目平均', floatRound(targetRoll.reduce((ac,cur) => ac + cur.diceVal, 0) / targetRoll.length, 2));

    // Critical
    {
      const cArr = targetRoll.filter(dic => totalStyle=='log' ? dic.CF=='C' : totalStyle=='cc' ? dic.diceVal<2 : dic.diceVal<6);
      let   value = cArr.length;
      if (value) value += `<br><small>(${floatRound(cArr.length/targetRoll.length*100,1)}%)</small>`;
      totalData.set('Critical', value);
      
      if (growTarget.includes('C') && parentDiv.dataset.name) {
        cArr.forEach(dic => dic.CF='C');
        growArr = growArr.concat(cArr);
      }
    }

    // Fumble
    {
      const fArr = targetRoll.filter(dic => totalStyle=='log' ? dic.CF=='F' : totalStyle=='cc' ? dic.diceVal>99 : dic.diceVal>95);
      let   value = fArr.length;
      if (value) value += `<br><small>(${floatRound(fArr.length/targetRoll.length*100,1)}%)</small>`;
      totalData.set('Fumble', value);
      
      if (growTarget.includes('F') && parentDiv.dataset.name) {
        fArr.forEach(dic => dic.CF='F');
        growArr = growArr.concat(fArr);
      }
    }

    // Special
    {
      const sArr = targetRoll.filter(dic => dic.CF == (system=='coc6th' ? 'S' : 'Ex'));
      let   value = sArr.length;
      if (value) value += `<br><small>(${floatRound(sArr.length/targetRoll.length*100,1)}%)</small>`;
      totalData.set(system=='coc6th' ? 'Special' : 'Extreme', value);
      if (growTarget.includes('S') && parentDiv.dataset.name)  growArr = growArr.concat(sArr);
    }

    // Init value
    {
      let count = 0;
      const initSkill = structuredClone(system=='coc6th' ? allInitSkill_6 : allInitSkill_7);
      targetRoll.forEach(dic => {
        if (dic.diceVal > dic.rollVal) return;
        const normSkill = initSkill.keys().filter(key => dic.skill.includes(key)).next().value;
        if (!normSkill || dic.rollVal > initSkill.get(normSkill)) return;
        
        count++;
        
        if (growTarget.includes('I') && parentDiv.dataset.name) {
          // 初期値成功がC/Sでもある場合
          if (growArr.includes(dic)) dic.CF+= '/初期値';
          else {
            dic.CF = '初期値';
            growArr.push(dic);
          }
        }
      });
      totalData.set('初期値', count);
    }

    // selected skill
    if (growTarget.includes('E') && parentDiv.dataset.name) {
      const selectedSkills = document.querySelector('.multi-select > :first-child span').innerText.split(', ').filter(Boolean);
      if (selectedSkills.length) {
        const selArr = targetRoll.filter(dic => selectedSkills.includes(dic.skill) && !growArr.includes(dic));
        growArr.push(...selArr);
        // growArr = growArr.concat(selArr);
      }
    }

  } else {
    // Emo-klore
    const totalD = targetRoll.reduce((ac,cur) => ac + cur.D, 0);
    let   totalC = targetRoll.reduce((ac,cur) => ac + cur.C, 0);
    let   totalE = targetRoll.reduce((ac,cur) => ac + cur.E, 0);
    const totalSuc  = targetRoll.reduce((ac,cur) => ac + cur.suc, 0);
    const totalSucE = targetRoll.reduce((ac,cur) => ac + cur.sucE, 0);
    const total = targetRoll.reduce((ac,cur) => ac + cur.diceVal.reduce((ac2,cur2) => ac2 + cur2, 0), 0);
    
    if (totalC) totalC += `<br><small>(${floatRound(totalC/totalD*100,1)}%)</small>`;
    if (totalE) totalE += `<br><small>(${floatRound(totalE/totalD*100,1)}%)</small>`;
    
    totalData.set('ダイス', totalD);
    totalData.set('出目平均', floatRound(total/totalD, 2) || null);
    totalData.set('C', totalC);
    totalData.set('E', totalE);
    totalData.set('成功数', totalSuc);
    totalData.set('→期待値', floatRound(totalSucE, 1));

    growArr = targetRoll;
  }


  // ----------------------
  //        結果表示
  // ----------------------
  // diceTotal table
  const diceTotalTable = parentDiv.querySelector('table.diceTotal');
  [...diceTotalTable.children].forEach(e => e.innerHTML = '');

  addRow(diceTotalTable.querySelector('thead'), totalData.keys());
  addRow(diceTotalTable.querySelector('tbody'), totalData.values());

  const cCol = [...totalData.keys()].indexOf(system.startsWith('coc') ? 'Critical' : 'C');
  const fCol = [...totalData.keys()].indexOf(system.startsWith('coc') ? 'Fumble'   : 'E');
  diceTotalTable.querySelectorAll('tbody td')[cCol].dataset.cf = 'C';
  diceTotalTable.querySelectorAll('tbody td')[fCol].dataset.cf = 'F';
  if (system=='emoklore') {
    [...diceTotalTable.querySelectorAll('thead td')].at(-1).dataset.cf = 'S';
    [...diceTotalTable.querySelectorAll('body td')] .at(-1).dataset.cf = 'S';
  }


  // diceLog table
  const diceLogTable = parentDiv.querySelector('table.diceLog');
  [...diceLogTable.children].forEach(e => e.innerHTML='');

  if (!growArr.length)  return;

  switch (document.getElementById('sortStyle').value) {
    case 'growth' :
      break;
    case 'skill' :
      growArr.sort((a,b) => a.skill - b.skill);
      break;
    case 'roll' :
      growArr.sort((a,b) => a.rollNo - b.rollNo);
      break;
  }

  // caption
  diceLogTable.querySelector('caption').innerText = system.startsWith('coc') ? '成長対象' : 'DICE LOG';

  // header
  let header;
  const showStyle = document.getElementById('showStyle').value;
  if (system.startsWith('coc')) {
    if (showStyle=='list')  header = ['タブ', '技能', '判定値', '出目', null];
    else                    header = ['タブ', 'ログ', null];
  } else {
    if (showStyle=='list')  header = ['タブ', '技能', '判定', 'C', 'E', '成功数', '→期待値'];
    else                    header = ['タブ', 'ログ'];
  }
  addRow(diceLogTable.querySelector('thead'), header);
  if (system=='emoklore'&&showStyle=='list') diceLogTable.querySelector('thead :nth-child(7)').dataset.cf='S';

  // body
  const diceLogBody = diceLogTable.querySelector('tbody');
  growArr.forEach(dic => {
    if (system.startsWith('coc')) {
      // coc
      const content = showStyle=='list' ? 
        [dic.tab, dic.skill, dic.rollVal, dic.diceVal, dic.CF] : 
        [dic.tab, dic.log, dic.CF];
      const row = addRow(diceLogBody, content);
      if (showStyle=='log') row.children[1].style.fontSize = 'small';
      if      (dic.CF?.includes('C')) row.lastElementChild.dataset.cf = 'C';
      else if (dic.CF?.includes('F')) row.lastElementChild.dataset.cf = 'F';
      else if (dic.CF?.includes(system=='coc6th' ? 'S' : 'Ex')) row.lastElementChild.dataset.cf = 'S';

    } else {
      // emoklore
      if (showStyle=='list') {
        const content = [dic.tab, dic.skill, `${dic.D}DM<=${dic.rollVal}`, dic.C||null, dic.E||null, dic.suc, dic.sucE];
        const row = addRow(diceLogBody, content);
        row.children[3].dataset.cf = 'C';
        row.children[4].dataset.cf = 'F';
        row.children[6].dataset.cf = 'S';
      } else {
        addRow(diceLogBody, [dic.tab, dic.log]);
      }
    }
  });
  return;
}


// -------------------------
//         function
// -------------------------

function normStr(str) {
  const replaceArr = [['　',' '],['&lt;', '<'],['&gt;', '>'], ['&amp;', '&'], ['&quot;', '"'], ['&#x27;', '\''], ['&#x60;', '`'], ['<br>', '\n'], ['\t','  ']];
  let string = replaceArr.reduce((ac,cur) => ac = ac.replaceAll(cur[0], cur[1]), str);
  string = string.replace(/[！-｝]/g, function(s){return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);});
  return string;
}

// EventListener
async function drop(e) {
  // e.preventDefault();
  // e.currentTarget.classList.remove('target');
  // if (!e.currentTarget.classList.contains('add')) chatArr = [];
  // await Promise.all(Array.from(e.dataTransfer.files, file => extractChat(file)));
  // extractRoll();
  showResult();
  return;
}

/**
 * parentエレメントにselectTagを追加する関数
 * @param {HTMLElement} parent 
 * @param {String} value 
 * @param {String} name *要素名
 * @param {Boolean} selected *選択済みか
 */
function addSelectTag(parent, value, name=null, selected=false) {
  const label    = document.createElement('label');
  const checkbox = document.createElement('input');
  label.className = 'select-tag';
  checkbox.type = 'checkbox';
  checkbox.value = value;
  if (name)  checkbox.name  = name;
  checkbox.checked = selected;

  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(value));
  parent.appendChild(label);
}
