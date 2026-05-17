import ToggleButton from "./components/toggle-button.js";
import ButtonCssIcon from "./components/button-css-icon.js";
import MultiSelect from "./components/multi-select.js";
import ResultCard from "./components/result-card.js";

import {ChatData, CocRollData, EmokloreRollData} from './components/class.js'
import {floatRound} from '../__utility/function.js'

const {createApp, ref, computed, watch, onMounted, toRaw} = Vue;

const rootApp = createApp({
  components: {
    ToggleButton,
    ButtonCssIcon,
    MultiSelect,
    ResultCard,
  },

  setup () {
    const system = ref('coc6th');
    const isCoc = computed(()=>system.value.startsWith('coc'));
    const setting = ref({
      show: {selectTag: false, total: true, diceLog: false},

      mergeDupUnit: true, // 複製コマをまとめる
      totalStyle: 'log', // cc,ccb,log
      sortStyle: 'growth', // growth,skill,roll
      showStyle: 'list', // list,log

      growTarget: ['C','F','I'], // C,F,S,I,E
      selectedSkills: [],
    });
    const initSkills = ref({
      coc6th: new Map(),
      coc7th: new Map(),
    });

    /** ChatData [] */
    const chatArr = ref([]);

    async function readHtmlFile(e, add=false) {
      if (!e.currentTarget.files.length) return;
      if (!add) chatArr.value.splice(0);
      const files = [...e.currentTarget.files];
      e.currentTarget.value = null;
      await Promise.all(Array.from(files, file => extractChat(file)));
      console.log('end read html file', toRaw(chatArr.value));
    }

    async function dropHtmlFile(e, add=false) {
      e.currentTarget.classList.remove('target');
      if (!e.dataTransfer.files.length) return;
      if (!add) chatArr.value.splice(0);
      const files = [...e.dataTransfer.files];
      await Promise.all(Array.from(files, file => extractChat(file)));
    }

    async function extractChat(htmlFile) {
      if (htmlFile.type != 'text/html') return;

      const doc = (new DOMParser).parseFromString(await htmlFile.text(), 'text/html');
      doc.querySelectorAll('p').forEach(chat => {
        const arr  = chat.querySelectorAll('span');

        const tab  = arr[0].innerText.trim().slice(1,-1);
        const name = arr[1].innerText.replaceAll('　',' ').trim();
        const log  = normStr(arr[2].innerHTML).trim();

        const textArr = log.split(/#\d+/);
        if (textArr.length===1) {
          chatArr.value.push(new ChatData({tab:tab, name:name, log:log}));
        } else {
          const head = textArr.shift();
          textArr.forEach(t => 
            chatArr.value.push(new ChatData({tab:tab, name:name, log:`${head}${t.replaceAll('\n',' ')}`.trim()}))
          );
        }
      });
      return;

      function normStr(str) {
        const string = [
          ['　',' '],
          ['&lt;', '<'],
          ['&gt;', '>'],
          ['&amp;', '&'],
          ['&quot;', '"'],
          ['&#x27;', '\''],
          ['&#x60;', '`'],
          ['<br>', '\n'],
          ['\t','  '],
          [/[！-｝]/g, (s)=>String.fromCharCode(s.charCodeAt(0) - 0xFEE0)],
        ].reduce((ac,cur) => ac = ac.replaceAll(cur[0], cur[1]), str);
        return string;
      }
    }

    /** CocRollData | EmokloreRollData [] */
    const rollArr = computed(() => {
      let id = 0;
      const resultArr  = [];

      const dicePat = isCoc.value ? / > (?<diceVal>\d+)\D* > / : / > \[(?<diceVal>[\d, ]+)\] > [-\d]/;
      const replaceArr = [
        [/[【】「」『』《》〈〉〔〕\[\]]/g, ''],
        [/[<≪](.*?)[>≫]/g, '$1'],
        [/\((.+?)\)/g, '：$1'],
        [':', '：'],
        ['(', '（'],
        [')', '）'],
        ['!', '！'],
        ['?', '？']
      ].concat(isCoc.value ? [['*',' × ']] : []);

      chatArr.value
      .filter(chatData => (isCoc.value ? /.\(1d100<=/is : /DA.+\(\d+DA|<=.+\(\d+DM<=/is).test(chatData.log))
      .forEach(chatData => {
        // rollNo, タブ, キャラクター, ログ
        const rollData = isCoc.value ? 
          new CocRollData({rollNo:id++, ...chatData}) : 
          new EmokloreRollData({rollNo:id++, ...chatData});

        // 出目
        let {diceVal} = chatData.log.match(dicePat).groups;
        if (!diceVal) return;
        diceVal = isCoc.value ? parseInt(diceVal) : diceVal.split(',').map(e=>parseInt(e));
        rollData.diceVal = diceVal;

        // 技能名
        let skillPat;
        if (isCoc.value) {
          skillPat = /CBR|RES/i.test(chatData.log) ?
            /\d+\) (?<skill>.*)\(1d100<=/si :
            /<=.+? (?<skill>.*)\(1d100<=/si;
        } else {
          skillPat = /\d+DA\d+/i.test(chatData.log) ?
            /DA.+? (?<skill>.*)\(\d+DA\d+\)/si :
            /<=.+? (?<skill>.*)\(\d+DM<=\d+\)/si;
        }

        const {skill} = chatData.log.match(skillPat)?.groups ?? {skill:''};
        rollData.skill = replaceArr
          .reduce((ac, cur)=>ac=ac.replaceAll(cur[0],cur[1]), skill)
          .trim();

        // 判定値・C/F
        if (system.value==='coc6th') {
          // 組み合わせロール
          if (/ > \d+\[.+,.+\] > /.test(chatData.log)) {
            rollData.threshold = Math.min(...chatData.log.match(/<=([\d,]+)\) > /)[1].split(','));
            const text = chatData.log.match(/ > \d+\[(.+,.+)\] > /)[1];
            rollData.CF =
              text.includes('決定的成功') ? 'C' :
              text.includes('スペシャル') ? 'S' :
              text.includes('致命的失敗') ? 'F' : null;
          } else {
            rollData.threshold = parseInt(chatData.log.match(/\(1d100<=([-\d]+)\).* > /i)[1]);
            rollData.CF =
              /決定的成功(\/スペシャル)?$/.test(chatData.log) ? 'C' :
              chatData.log.endsWith('スペシャル') ? 'S' :
              chatData.log.endsWith('致命的失敗') ? 'F' : null;
          }

        } else if (system.value==='coc7th') {
          rollData.threshold = parseInt(chatData.log.match(/\(1d100<=([-\d]+)\).* > /i)[1]);
          rollData.CF =
            chatData.log.endsWith('クリティカル') ? 'C' :
            chatData.log.endsWith('イクストリーム成功') ? 'Ex' :
            chatData.log.endsWith('ファンブル') ? 'F' : null;

        } else if (system.value==='emoklore') {
          rollData.threshold = parseInt(chatData.log.match(/\(\d+DM<=(\d+)\) > \[[\d, ]+\]/i)[1]);
        }

        resultArr.push(rollData);
      });

      console.log('compute roll arr', resultArr);
      return resultArr;
    });

    const skillSet = computed(() => new Set(rollArr.value.map(rollData=>rollData.skill).filter(Boolean).sort()));
    
    const tabMap = ref(new Map());
    watch(rollArr, ()=> {
      tabMap.value.clear();
      new Set(rollArr.value.map(rollData=>rollData.tab)).forEach(key=>tabMap.value.set(key,true));
    });

    /** name1 : {show:true, characters:[name1,name2,name3]} */
    const nameUnifiedMap = ref(new Map());
    watch(() => [rollArr.value, setting.value.mergeDupUnit], () => {
      nameUnifiedMap.value.clear();
      const nameSet = new Set(
        rollArr.value.map(rollData=>rollData[setting.value.mergeDupUnit ? 'nameNodup' : 'name']).sort()
      );
      nameSet.forEach(name => 
        nameUnifiedMap.value.set( name, {show:true, characters:new Set([name])} )
      );
    });
    /**
     * @param {String} character 統合先のキャラクター名
     * @param {String} target 統合元のキャラクター名
     * @param {Boolean} newState 統合元の新しい表示状態
     */
    function updateNameUnify (character, target, newState) {
      nameUnifiedMap.value.get(target).show = !newState;
      const targetSet   = toRaw(nameUnifiedMap.value.get(character).characters);
      const changeNames = toRaw(nameUnifiedMap.value.get(target).characters);
      nameUnifiedMap.value.get(character).characters = newState ? 
        targetSet.union     (changeNames):
        targetSet.difference(changeNames);
      // console.log(nameUnifiedMap.value);
    }


    const diceLogHead = computed(() => {
      if (isCoc.value) {
        if (setting.value.showStyle==='log') return ['タブ', 'ログ', null];
        else return ['タブ', '技能', '判定値', '出目', null];
      } else {
        if (setting.value.showStyle==='log') return ['タブ', 'ログ'];
        else return ['タブ', '技能', '判定', 'C', 'E', '成功数', '→期待値'];
      }
    });
    /** character : {show:Boolean, totalData:Map, diceLog:Arr} */
    const resultDataMap = computed(() => {
      const resultMap = new Map();
      nameUnifiedMap.value.forEach((value, key) => {
        const targetRoll = rollArr.value
          .filter(rollData => tabMap.value.get(rollData.tab))
          .filter(rollData => value.characters.has(rollData[setting.value.mergeDupUnit ? 'nameNodup' : 'name']));
        resultMap.set(key, {show:value.show, ...computeResultData(targetRoll)});
      });
      console.log('result data map', resultMap);
      return resultMap;
    });

    const allResultData = computed(()=> {
      const allTargetRoll = rollArr.value.filter(rollData => tabMap.value.get(rollData.tab));
      return {show:true, ...computeResultData(allTargetRoll)};
    })

    function computeResultData (targetRoll) {
      targetRoll = targetRoll.map(rollData => rollData.clone());

      /**
       * coc      : [roll, average, C, F, S/Ex,  Init]
       * emoklore : [roll, D, average, C, E, Suc, SucEx]
       */
      const totalData = new Map();
      const diceLogBaseArr = [];

      // -----------
      // total data
      // -----------
      // ロール数
      totalData.set('ロール', targetRoll.length);

      if (isCoc.value) {
        // 出目平均
        const average = floatRound(targetRoll.reduce((ac,cur)=>ac+cur.diceVal, 0) / targetRoll.length, 2) || null;
        totalData.set('出目平均', average);

        // Critial
        const cArr = targetRoll.filter(rollData => {
          switch(setting.value.totalStyle) {
            case 'log': return rollData.CF==='C';
            case 'cc' : return rollData.diceVal<2;
            case 'ccb': return rollData.diceVal<6;
          }
        });
        totalData.set('Critical', cArr.length);
        if (setting.value.growTarget.includes('C')) {
          cArr.forEach(rollData => rollData.CF='C');
          diceLogBaseArr.push(...cArr);
        }

        // Fumble
        const fArr = targetRoll.filter(rollData => {
          switch(setting.value.totalStyle) {
            case 'log': return rollData.CF==='F';
            case 'cc' : return rollData.diceVal>99;
            case 'ccb': return rollData.diceVal>95;
          }
        });
        totalData.set('Fumble', fArr.length);
        if (setting.value.growTarget.includes('F')) {
          fArr.forEach(rollData => rollData.CF='F');
          diceLogBaseArr.push(...fArr);
        }

        // Special
        const sArr = targetRoll.filter(rollData => rollData.CF===(system.value==='coc6th' ? 'S' : 'Ex'));
        totalData.set(system.value==='coc6th' ? 'Special' : 'Extreme', sArr.length);
        if (setting.value.growTarget.includes('S')) diceLogBaseArr.push(...sArr);

        // Init value
        let count = 0;
        const initSkill = initSkills.value[system.value];
        targetRoll
          .filter(rollData => rollData.diceVal <= rollData.threshold)
          .forEach(rollData => {
            const skill = initSkill.keys().find(key => rollData.skill.includes(key));
            if (!skill) return;
            if (rollData.threshold > initSkill.get(skill)) return;

            count++;

            if (setting.value.growTarget.includes('I')) {
              // 初期値成功がC/Sでもある場合
              if (diceLogBaseArr.includes(rollData)) rollData.CF += '/初期値';
              else {
                rollData.CF = '初期値';
                diceLogBaseArr.push(rollData);
              }
            }
          });
        totalData.set('初期値', count);

        // selected skill
        if (setting.value.growTarget.includes('E') && setting.value.selectedSkills.length) {
          const selectedArr = targetRoll
            .filter(rollData => setting.value.selectedSkills.includes(rollData.skill))
            .filter(rollData => !diceLogBaseArr.includes(rollData));
          diceLogBaseArr.push(...selectedArr);
        }
      }

      // Emo-klore
      else {
        const totalD = targetRoll.reduce((ac,cur) => ac + cur.D, 0);
        const totalC = targetRoll.reduce((ac,cur) => ac + cur.C, 0);
        const totalE = targetRoll.reduce((ac,cur) => ac + cur.E, 0);
        const totalSuc  = targetRoll.reduce((ac,cur) => ac + cur.suc, 0);
        const totalSucE = targetRoll.reduce((ac,cur) => ac + cur.sucE, 0);
        const total = targetRoll.reduce((ac,cur) => ac + cur.sumDiceVal,0);

        totalData.set('ダイス', totalD);
        totalData.set('出目平均', floatRound(total/totalD, 2) || null);
        totalData.set('C', totalC);
        totalData.set('E', totalE);
        totalData.set('成功数', totalSuc);
        totalData.set('→期待値', floatRound(totalSucE, 1));

        diceLogBaseArr.push(...targetRoll);
      }

      // -----------
      // dice log
      // -----------
      if (setting.value.sortStyle==='skill') diceLogBaseArr.sort((a,b) => a.skill > b.skill ? 1 : -1);
      else if (setting.value.sortStyle==='rollNo') diceLogBaseArr.sort((a,b) => a.rollNo - b.rollNo);

      const diceLogArr = diceLogBaseArr.map(rollData=>{
        if (isCoc.value) {
          if (setting.value.showStyle==='log') return [rollData.tab, rollData.log, rollData.CF];
          else return [rollData.tab, rollData.skill, rollData.threshold, rollData.diceVal, rollData.CF];
        } else {
          if (setting.value.showStyle==='log') return [rollData.tab, rollData.log];
          else return [rollData.tab, rollData.skill, `${rollData.D}DM<=${rollData.threshold}`, rollData.C||null, rollData.E||null, rollData.suc, rollData.sucE];
        }
      });

      return {totalData: totalData, diceLog: diceLogArr};
    }

    function deleteLog (e) {
      console.log('deleteLog');
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
            
      // 集計に反映
      chatArr.value.splice(stRow, endRow-stRow+1);
      window.getSelection().removeAllRanges();
      e.currentTarget.blur();
    }



    onMounted(async () => {
      setting.value = await fetch('./data/setting.json').then(res=>res.json());

      const initSkillJson = await fetch('./data/init-skills.json').then(res=>res.json());
      initSkills.value.coc6th = new Map(initSkillJson.coc6th);
      initSkills.value.coc7th = new Map(initSkillJson.coc7th);

      const changeLogJson = await fetch('./data/change-log.json').then(res=>res.json());
      document.querySelector('footer table tbody').innerHTML = changeLogJson
      .reduce((acc, cur) => acc += `<tr><td>${cur.date}</td><td>${cur.version}</td><td>${cur.detail}</td></tr>`, '');
    });



    return {
      system,
      isCoc,
      setting,
      initSkills,

      chatArr,
      // rollArr,

      skillSet,
      tabMap,
      nameUnifiedMap,
      updateNameUnify,

      diceLogHead,
      allResultData,
      resultDataMap,

      readHtmlFile,
      dropHtmlFile,
      deleteLog,
    }
  }
});
rootApp.mount('#root');