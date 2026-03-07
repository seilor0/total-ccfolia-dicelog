import ToggleButton from "./components/toggle-button.js";
import ButtonCssIcon from "./components/button-css-icon.js";
import MultiSelect from "./components/multi-select.js";
import ResultCard from "./components/result-card.js";

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
    const isCoC = computed(()=>system.value.startsWith('coc'));
    const setting = ref({
      show: {selectTag: false, total: true, diceLog: true},

      mergeDupUnit: true, // 複製コマをまとめる
      totalStyle: 'log', // cc,ccb,log
      sortStyle: 'growth', // growth,skill,roll
      showStyle: 'list', // list,log

      growTarget: ['C','F','S','I','E'], // C,F,S,I,E
      selectedSkills: [],
    });
    const initSkills = ref({
      coc6th: new Map(),
      coc7th: new Map(),
    });


    /** { tab, name, nameNodup, log } [] */
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
        const nameNodup = name.replace(/ *\(\d+\)$/,'');
        const log  = normStr(arr[2].innerHTML).trim();

        const textArr = log.split(/#\d+/);
        if (textArr.length===1) {
          chatArr.value.push({tab:tab, name:name, nameNodup:nameNodup, log:log});
        } else {
          const head = textArr.shift();
          textArr.forEach(t => chatArr.value.push({tab:tab, name:name, nameNodup:nameNodup, log:`${head}${t.replaceAll('\n',' ')}`.trim()}));
        }
      });
      return;

      function normStr(str) {
        // const replaceArr = [['　',' '],['&lt;', '<'],['&gt;', '>'], ['&amp;', '&'], ['&quot;', '"'], ['&#x27;', '\''], ['&#x60;', '`'], ['<br>', '\n'], ['\t','  ']];
        let string = [
          ['　',' '],
          ['&lt;', '<'],
          ['&gt;', '>'],
          ['&amp;', '&'],
          ['&quot;', '"'],
          ['&#x27;', '\''],
          ['&#x60;', '`'],
          ['<br>', '\n'],
          ['\t','  '],
          [/[！-｝]/g, function(s){return String.fromCharCode(s.charCodeAt(0) - 0xFEE0)}],
        ].reduce((ac,cur) => ac = ac.replaceAll(cur[0], cur[1]), str);
        // string = string.replace(/[！-｝]/g, function(s){return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);});
        return string;
      }
    }

    /** {
     * rollNo, tab, name, nameNodup, log, diceVal, skill, threshold
     *  coc      : diceVal, CF
     *  emoklore : D, C, E, diceVal[], suc, sucE
    } [] */
    const rollArr = computed(() => {
      let id = 0;
      const resultArr  = [];

      const dicePat = isCoC.value ? / > (?<diceVal>\d+)\D* > / : / > \[(?<diceVal>[\d, ]+)\] > [-\d]/;
      const replaceArr = [
        [/[【】「」『』《》〈〉〔〕\[\]]/g, ''],
        [/[<≪](.*?)[>≫]/g, '$1'],
        [/\((.+?)\)/g, '：$1'],
        [':', '：'],
        ['(', '（'],
        [')', '）'],
        ['!', '！'],
        ['?', '？']
      ].concat(isCoC.value ? [['*',' × ']] : []);

      chatArr.value
      .filter(dic => (isCoC.value ? /.\(1d100<=/is : /DA.+\(\d+DA|<=.+\(\d+DM<=/is).test(dic.log))
      .forEach(dic => {
        // rollNo, タブ, キャラクター, ログ
        const rollDic = {rollNo:id++, ...dic};

        // 出目
        let {diceVal} = dic.log.match(dicePat).groups;
        if (!diceVal) return;
        diceVal = isCoC.value ? parseInt(diceVal) : diceVal.split(',').map(e=>parseInt(e));
        rollDic.diceVal = diceVal;

        // 技能名
        let skillPat;
        if (isCoC.value) {
          skillPat = /CBR|RES/i.test(dic.log) ?
            /\d+\) (?<skill>.*)\(1d100<=/si :
            /<=.+? (?<skill>.*)\(1d100<=/si;
        } else {
          skillPat = /\d+DA\d+/i.test(dic.log) ?
            /DA.+? (?<skill>.*)\(\d+DA\d+\)/si :
            /<=.+? (?<skill>.*)\(\d+DM<=\d+\)/si;
        }

        const {skill} = dic.log.match(skillPat)?.groups;
        rollDic.skill = replaceArr
          .reduce((ac, cur)=>ac=ac.replaceAll(cur[0],cur[1]), skill)
          .trim();

        // 判定値・C/F
        if (system.value==='coc6th') {
          // 組み合わせロール
          if (/ > \d+\[.+,.+\] > /.test(dic.log)) {
            rollDic.threshold = Math.min(...dic.log.match(/<=([\d,]+)\) > /)[1].split(','));
            const text = dic.log.match(/ > \d+\[(.+,.+)\] > /)[1];
            rollDic.CF =
              text.includes('決定的成功') ? 'C' :
              text.includes('スペシャル') ? 'S' :
              text.includes('致命的失敗') ? 'F' : null;
          } else {
            rollDic.threshold = parseInt(dic.log.match(/\(1d100<=([-\d]+)\).* > /i)[1]);
            rollDic.CF =
              /決定的成功(\/スペシャル)?$/.test(dic.log) ? 'C' :
              dic.log.endsWith('スペシャル') ? 'S' :
              dic.log.endsWith('致命的失敗') ? 'F' : null;
          }

        } else if (system.value==='coc7th') {
          rollDic.threshold = parseInt(dic.log.match(/\(1d100<=([-\d]+)\).* > /i)[1]);
          rollDic.CF =
            dic.log.endsWith('クリティカル') ? 'C' :
            dic.log.endsWith('イクストリーム成功') ? 'Ex' :
            dic.log.endsWith('ファンブル') ? 'F' : null;

        } else if (system.value==='emoklore') {
          const D = diceVal.length;
          const C = diceVal.filter(e=>e===1).length;
          const E = diceVal.filter(e=>e===10).length;
          const threshold = parseInt(dic.log.match(/\(\d+DM<=(\d+)\) > \[[\d, ]+\]/i)[1]);
          rollDic.D = D;
          rollDic.C = C;
          rollDic.E = E;
          rollDic.threshold = threshold;
          rollDic.suc = C - E + diceVal.filter(e=>e<=threshold).length;;
          rollDic.sucE = D * threshold / 10;
        }

        resultArr.push(rollDic);
      });

      console.log('compute roll arr', resultArr);
      return resultArr;
    });

    const skillSet = computed(() => new Set(rollArr.value.map(dic=>dic.skill).filter(Boolean).sort()));
    
    const tabMap = ref(new Map());
    watch(rollArr, ()=> {
      tabMap.value.clear();
      new Set(rollArr.value.map(dic=>dic.tab)).forEach(key=>tabMap.value.set(key,true));
    });

    /** name1 : {show:true, characters:[name1,name2,name3]} */
    const nameUnifiedMap = ref(new Map());
    watch(() => [rollArr.value, setting.value.mergeDupUnit], () => {
      nameUnifiedMap.value.clear();
      const nameSet = new Set(rollArr.value.map(dic=>setting.value.mergeDupUnit ? dic.nameNodup : dic.name).sort());
      nameSet.forEach(name=>nameUnifiedMap.value.set( name, {show:true, characters:new Set([name])} ));
    });
    function updateNameUnify (character, target, newState) {
      nameUnifiedMap.value.get(target).show = !newState;
      const targetSet = nameUnifiedMap.value.get(character).characters;
      const changeNames = nameUnifiedMap.value.get(target).characters;
      nameUnifiedMap.value.get(character).characters = newState ? 
        toRaw(targetSet).union     (toRaw(changeNames)):
        toRaw(targetSet).difference(toRaw(changeNames));
      console.log(nameUnifiedMap.value);
    }


    const diceLogHead = computed(() => {
      if (isCoC.value) {
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
        const targetRoll = structuredClone(rollArr.value)
          .filter(dic=>tabMap.value.get(dic.tab))
          .filter(dic=>value.characters.has(setting.value.mergeDupUnit ? dic.nameNodup : dic.name));
        resultMap.set(key, {show:value.show, ...makeResultData(targetRoll)});
      });
      console.log('result data map', resultMap);
      return resultMap;
    });

    const allResultData = computed(()=> {
      const allTargetRoll = structuredClone(rollArr.value).filter(dic=>tabMap.value.get(dic.tab));
      return {show:true, ...makeResultData(allTargetRoll)};
    })

    function makeResultData (targetRoll) {
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

      if (isCoC.value) {
        // 出目平均
        const average = floatRound(targetRoll.reduce((ac,cur)=>ac+cur.diceVal, 0) / targetRoll.length, 2) || null;
        totalData.set('出目平均', average);

        // Critial
        const cArr = targetRoll.filter(dic => {
          switch(setting.value.totalStyle) {
            case 'log':
              return dic.CF==='C';
            case 'cc':
              return dic.diceVal<2;
            case 'ccb':
              return dic.diceVal<6;
          }
        });
        totalData.set('Critical', cArr.length);
        if (setting.value.growTarget.includes('C')) {
          cArr.forEach(dic => dic.CF='C');
          diceLogBaseArr.push(...cArr);
        }

        // Fumble
        const fArr = targetRoll.filter(dic => {
          switch(setting.value.totalStyle) {
            case 'log':
              return dic.CF==='F';
            case 'cc':
              return dic.diceVal>99;
            case 'ccb':
              return dic.diceVal>95;
          }
        });
        totalData.set('Fumble', fArr.length);
        if (setting.value.growTarget.includes('F')) {
          fArr.forEach(dic => dic.CF='F');
          diceLogBaseArr.push(...fArr);
        }

        // Special
        const sArr = targetRoll.filter(dic => dic.CF===(system.value==='coc6th' ? 'S' : 'Ex'));
        totalData.set(system.value==='coc6th' ? 'Special' : 'Extreme', sArr.length);
        if (setting.value.growTarget.includes('S')) diceLogBaseArr.push(...sArr);

        // Init value
        let count = 0;
        const initSkill = initSkills.value[system.value];
        targetRoll
          .filter(dic => dic.diceVal <= dic.threshold)
          .forEach(dic => {
            const skill = initSkill.keys().find(key => dic.skill.includes(key));
            if (!skill) return;
            if (dic.threshold > initSkill.get(skill)) return;

            count++;

            if (setting.value.growTarget.includes('I')) {
              // 初期値成功がC/Sでもある場合
              if (diceLogBaseArr.includes(dic)) dic.CF += '/初期値';
              else {
                dic.CF = '初期値';
                diceLogBaseArr.push(dic);
              }
            }
          });
        totalData.set('初期値', count);

        // selected skill
        if (setting.value.growTarget.includes('E') && setting.value.selectedSkills.length) {
          const selectedArr = targetRoll
            .filter(dic => setting.value.selectedSkills.includes(dic.skill))
            .filter(dic => !diceLogBaseArr.includes(dic));
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
        const total = targetRoll.reduce((ac,cur) => ac+cur.diceVal.reduce((ac2,cur2)=>ac2+cur2,0),0);

        totalData.set('ダイス', totalD);
        totalData.set('出目平均', floatRound(total/totalD, 2) || null);
        totalData.set('C', totalC);
        totalData.set('E', totalE);
        totalData.set('成功数', totalSuc);
        totalData.set('→期待値', floatRound(totalSucE, 1));

        diceLogBaseArr.push(...structuredClone(targetRoll));
      }

      // -----------
      // dice log
      // -----------
      if (setting.value.sortStyle==='skill') diceLogBaseArr.sort((a,b) => a.skill > b.skill ? 1 : -1);
      else if (setting.value.sortStyle==='rollNo') diceLogBaseArr.sort((a,b) => a.rollNo - b.rollNo);

      const diceLogArr = diceLogBaseArr.map(dic=>{
        if (isCoC.value) {
          if (setting.value.showStyle==='log') return [dic.tab, dic.log, dic.CF];
          else return [dic.tab, dic.skill, dic.threshold, dic.diceVal, dic.CF];
        } else {
          if (setting.value.showStyle==='log') return [dic.tab, dic.log];
          else return [dic.tab, dic.skill, `${dic.D}DM<=${dic.threshold}`, dic.C||null, dic.E||null, dic.suc, dic.sucE];
        }
      });

      return {totalData: totalData, diceLog: diceLogArr};

      /**
       * 小数点第n位で四捨五入する関数
       * @param {number} num 元の数値
       * @param {int} digit 四捨五入する桁数
       * @returns
       */
      function floatRound(num, digit) {
        const levarage = Math.pow(10,digit);
        return Math.round(num*levarage)/levarage;
      }
    }



    onMounted(async () => {
      const json = await fetch('./setting.json').then(res=>res.json());
      initSkills.value.coc6th = new Map(json.coc6th);
      initSkills.value.coc7th = new Map(json.coc7th);

      document.querySelector('footer table tbody').innerHTML = json.changeLog
      .reduce((acc, cur) => acc += `<tr><td>${cur.date}</td><td>${cur.version}</td><td>${cur.detail}</td></tr>`, '');
    });



    return {
      system,
      isCoC,
      setting,
      initSkills,

      chatArr,
      rollArr,

      skillSet,
      tabMap,
      nameUnifiedMap,
      updateNameUnify,

      diceLogHead,
      allResultData,
      resultDataMap,

      readHtmlFile,
      dropHtmlFile,
    }
  }
});
rootApp.mount('#root');