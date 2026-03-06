const {ref} = Vue;

export default {
  name: 'MultiSelect',
  props: {
    selectId: String,
    options: Set,
  },
  emits: ['change-selected-options'],
  setup () {
    const selectedOptions = ref([]);
    return {
      selectedOptions,
    }
  },
  template: `
  <div class="multi-select" :style="{'--anchor-name': '--' + selectId}">
    <button :popovertarget="selectId">
      <span>{{selectedOptions.sort().join(', ')}}</span>
      <div class="arrow"></div>
    </button>
    <div :id="selectId" class="multi-picker" popover="hint">
      <label v-for="(option,index) in options" :key="selectId+'-'+index">
        <input type="checkbox" :value="option" v-model="selectedOptions" @change="$emit('change-selected-options', selectedOptions)">
        {{option}}
      </label>
    </div>
  </div>
  `
}