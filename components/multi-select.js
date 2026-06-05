const {ref} = Vue;

export default {
  name: 'MultiSelect',
  props: {
    id: {type: String, required: true},
    options: Set,
    pickerStyle: Object,
  },
  emits: ['change-selected-options'],
  setup () {
    const selectedOptions = ref([]);
    return {
      selectedOptions,
    }
  },
  template: `
  <div class="multi-select" :style="{'--anchor-name': '--' + id}">
    <button :popovertarget="id">
      <span>{{selectedOptions.sort().join(', ')}}</span>
      <div class="arrow"></div>
    </button>
    <div :id="id" class="multi-select__picker" :style="pickerStyle" popover="hint">
      <label v-for="(option,index) in options" :key="id+'-'+index">
        <input type="checkbox" :value="option" v-model="selectedOptions" @change="$emit('change-selected-options', selectedOptions)">
        {{option}}
      </label>
    </div>
  </div>
  `
}