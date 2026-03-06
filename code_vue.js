import ToggleButton from "./components/toggle-button.js";
import ButtonCssIcon from "./components/button-css-icon.js";
import MultiSelect from "./components/multi-select.js";
const {createApp, ref, computed, watch, onMounted} = Vue;

const rootApp = createApp({
  components: {
    ToggleButton,
    ButtonCssIcon,
    MultiSelect,
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

      growTarget: ['C','F','S','I','E'] // C,F,S,I,E
    });
    const initSkills = ref({
      coc6th: new Map(),
      coc7th: new Map(),
    });


    /**
     * { tab, name, nameNodup, log } []
     */
    const chatArr = ref([]);
    // let rollArr = [];

    async function readHtmlFile(e, add=false) {
      if (!e.currentTarget.files.length) return;
      if (!add) chatArr.value.splice(0);
      await Promise.all(Array.from(e.currentTarget.files, file => extractChat(file)));
      console.log(chatArr.value);
    }

    async function dropHtmlFile(e, add=false) {
      e.currentTarget.classList.remove('target');
      if (!e.dataTransfer.files.length) return;
      if (!add) chatArr.value.splice(0);
      await Promise.all(Array.from(e.dataTransfer.files, file => extractChat(file)));
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

      chatArr.value.forEach(dic => {
        // 判定なし行 / 取り消しダイス
        if (!(isCoC.value ? /.\(1d100<=/is : /.\(\d+DM<=/is).test(dic.log)) return;

        // rollNo, タブ, キャラクター, ログ
        const rollDic = {rollNo:id++, ...dic};

        // 出目
        let {diceVal} = dic.log.match(dicePat)?.groups;
        if (!diceVal) return;
        diceVal = isCoC.value ? parseInt(diceVal) : diceVal.split(',').map(e=>parseInt(e));
        rollDic.diceVal = diceVal;
        
        // 技能名
        const skillPat = 
          !isCoC.value              ?  /<=.+? (?<skill>.*)\(\d+DM<=\d/si  :
          /CBR|RES/i.test(dic.log)  ?  /\d+\) (?<skill>.*)\(1d100<=/si  : 
          /<=.+? (?<skill>.*)\(1d100<=/si;
        const {skill} = dic.log.match(skillPat).groups;
        rollDic.skill = replaceArr.reduce((ac, cur)=>ac=ac.replaceAll(cur[0],cur[1]), skill).trim();

        // 判定値・C/F
        if (system.value==='coc6th') {
          // 組み合わせロール
          if (/ > \d+\[.+,.+\] > /.test(dic.log)) {
            rollDic.rollVal = Math.min(...dic.log.match(/<=([\d,]+)\) > /)[1].split(','));
            const text = dic.log.match(/ > \d+\[(.+,.+)\] > /)[1];
            rollDic.CF =
              text.includes('決定的成功') ? 'C' : 
              text.includes('スペシャル') ? 'S' : 
              text.includes('致命的失敗') ? 'F' : null;
          } else {
            rollDic.rollVal = parseInt(dic.log.match(/\(1d100<=([-\d]+)\).* > /i)[1]);
            rollDic.CF =
              /決定的成功(\/スペシャル)?$/.test(dic.log) ? 'C' : 
              dic.log.endsWith('スペシャル') ? 'S' : 
              dic.log.endsWith('致命的失敗') ? 'F' : null;
          }

        } else if (system.value==='coc7th') {
          rollDic.rollVal = parseInt(dic.log.match(/\(1d100<=([-\d]+)\).* > /i)[1]);
          rollDic.CF =
            dic.log.endsWith('クリティカル') ? 'C' : 
            dic.log.endsWith('イクストリーム成功') ? 'Ex' : 
            dic.log.endsWith('ファンブル') ? 'F' : null;

        } else if (system.value==='emoklore') {
          const D = diceVal.length;
          const C = diceVal.filter(e=>e===1).length;
          const E = diceVal.filter(e=>e===10).length;
          const rollVal = parseInt(dic.log.match(/\(\d+DM<=(\d+)\) > \[[\d, ]+\]/i)[1]);
          rollDic.D = D;
          rollDic.C = C;
          rollDic.E = E;
          rollDic.rollVal = rollVal;
          rollDic.suc = C - E + diceVal.filter(e=>e<=rollVal).length;;
          rollDic.sucE = D * rollVal / 10;
        }

        resultArr.push(rollDic);
      });
    
      console.log('rollArr:', resultArr);
      return resultArr;
    });
    
    const tabMap = ref(new Map());
    watch(rollArr, ()=> {
      tabMap.value.clear();
      new Set(rollArr.value.map(dic=>dic.tab)).forEach(key=>tabMap.value.set(key,true));
    });
    const nameSet      = computed(() => {return new Set(rollArr.value.map(dic=>dic.name).sort())});
    const nameNoDupSet = computed(() => {return new Set(rollArr.value.map(dic=>dic.nameNodup).sort())});
    const skillSet     = computed(() => {return new Set(rollArr.value.map(dic=>dic.skill).filter(Boolean).sort())});

    

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

      rollArr,
      tabMap,
      nameSet,
      nameNoDupSet,
      skillSet,

      readHtmlFile,
      dropHtmlFile,
    }
  }
});
rootApp.mount('#root');