export class ChatData {
  constructor({
    tab = '',
    name = '',
    log = '',
  } = {}) {
    this.tab = tab;
    this.name = name;
    this.log = log;
  }
  get nameNodup() {
    // console.log()
    return this.name.replace(/ *\(\d+\)$/,'');
  }
  clone() {
    return new ChatData({
      tab: this.tab,
      name: this.name,
      log: this.log
    });
  }
}


class RollData extends ChatData {
  constructor({
    tab = '',
    name = '',
    log = '',
    rollNo = null,
    skill = '',
    threshold = null,
  }={}) {
    super({
      tab: tab,
      name: name,
      log: log,
    });
    this.rollNo = rollNo;
    this.skill = skill;
    this.threshold = threshold;
  }
  clone() {
    return new RollData({
      tab: this.tab,
      name: this.name,
      log: this.log,
      rollNo: this.rollNo,
      skill: this.skill,
      threshold: this.threshold,
    })
  }
}


export class CocRollData extends RollData {
  constructor({
    tab = '',
    name = '',
    log = '',
    rollNo = null,
    skill = '',
    threshold = null,
    diceVal = null,
    CF = '',
  } = {}) {
    super({
      tab : tab,
      name : name,
      log : log,
      rollNo : rollNo,
      skill : skill,
      threshold : threshold,
    });
    this.diceVal = diceVal;
    this.CF = CF;
  }
  clone() {
    return new CocRollData({
      tab: this.tab,
      name: this.name,
      log: this.log,
      rollNo: this.rollNo,
      skill: this.skill,
      threshold: this.threshold,
      diceVal: this.diceVal,
      CF: this.CF,
    })
  }
}


export class EmokloreRollData extends RollData {
  constructor({
    tab = '',
    name = '',
    log = '',
    rollNo = null,
    skill = '',
    threshold = null,
    diceVal = [],
  } = {}) {
    super({
      rollNo : rollNo,
      tab : tab,
      name : name,
      log : log,
      diceVal : diceVal,
      skill : skill,
      threshold : threshold,
    });
    this.diceVal = [...diceVal];
  }
  get D() {return this.diceVal.length;}
  get C() {return this.diceVal.filter(e => e===1).length;}
  get E() {return this.diceVal.filter(e => e===10).length;}
  get suc() {return this.C - this.E + this.diceVal.filter(e => e<=this.threshold).length;}
  get sucE() {return this.D * this.threshold / 10;}
  get sumDiceVal() {return this.diceVal.reduce((acc,cur)=>acc+cur,0);}

  clone() {
    return new EmokloreRollData({
      tab: this.tab,
      name: this.name,
      log: this.log,
      rollNo: this.rollNo,
      skill: this.skill,
      threshold: this.threshold,
      diceVal: this.diceVal,
    })
  }
}