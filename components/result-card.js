const {ref} = Vue;

export default {
  name: 'ResultCard',
  props: {
    character: String,
    diceLogHead: Array,
    resultData: Object,

    isCoC: Boolean,
    setting: Object,
    allCharacters: Map,
    selectedCharacters: Set,
  },
  emits: ['change-target-characters'],
  setup (props, {emit}) {
    function totalCellStyle (key) {
      if (props.isCoC) {
        return {'C':key==='Critical', 'F':key==='Fumble',}
      } else {
        return {'C':key==='C', 'F':key==='E', 'S':key==='→期待値'}
      }
    }

    function diceLogCellStyle (content, index) {
      const head = props.diceLogHead[index];
      if (props.isCoC) {        
        if (head===null)
          return {'C':content.includes('C'), 'F':content.includes('F'), 'S':/S|Ex/.test(content)};
        else if (head==='ログ') return {small:true};
        else return null;        
      } else {
        return {'C':head==='C', 'F':head==='E', 'S':head==='→期待値', small:head==='ログ'}
      }
    }

    function emitChangeTargetEvent (e, character) {
      if (e.currentTarget.value===character) {
        e.currentTarget.checked=true;
        return;
      } else {
        console.log('emit change-target-characters event');
        emit('change-target-characters', 
          character, 
          e.currentTarget.value, 
          e.currentTarget.checked
        );
      }
    }

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

    return {
      totalCellStyle,
      diceLogCellStyle,
      emitChangeTargetEvent,
      floatRound,
    }
  },
  template: `
  <div class="each-result">
    <h3>{{character}}</h3>
    <div class="each-result-content">

      <div v-if="character!=='ALL'" v-show="setting.show.selectTag" class="select-tag-wrapper">
        <label v-for="name in allCharacters.keys()" class="select-tag" 
          v-show="allCharacters.get(name).show || selectedCharacters.has(name)"
        >
          <input type="checkbox" :value="name" :checked="selectedCharacters.has(name)" @change="emitChangeTargetEvent($event, character)">
          {{name}}
        </label>
      </div>
  
      <table v-show="setting.show.total" class="dice-total-table">
        <thead>
          <tr>
            <td v-for="key in resultData.totalData.keys()" :class="{'S':!isCoC && key==='→期待値'}">
              {{key}}
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td v-for="[key, value] in resultData.totalData" :class="totalCellStyle(key)">
              {{value}}
              <template v-if="['Critical','Fumble','Special','Extreme'].includes(key) && value">
                <br>
                <small>({{ floatRound(100*value/resultData.totalData.get('ロール'), 2) }}%)</small>
              </template>
              <template v-else-if="['C','E'].includes(key) && value">
                <br>
                <small>({{ floatRound(100*value/resultData.totalData.get('ダイス'), 2) }}%)</small>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
  
      <table v-if="character!=='ALL'" v-show="setting.show.diceLog && resultData.diceLog.length" class="dice-log-table">
        <caption>{{isCoC ? '成長対象' : 'DICE LOG'}}</caption>
        <thead>
          <tr>
            <td v-for="head in diceLogHead" :class="{'S':!isCoC && head==='→期待値'}">{{head}}</td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="diceLog in resultData.diceLog">
            <td v-for="(content, index) in diceLog" :class="diceLogCellStyle(content,index)">
              {{content}}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  `
}