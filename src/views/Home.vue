<template lang="pug">
.w-full.h-screen.flex.justify-center.items-center.flex-col.transition-opacity.duration-200(
  :class="{'pointer-events-none opacity-25': loading}"
)
  .text-2xl.mb-2 Pick .uasset File
  .mx-2.h-8.flex.items-center.rounded-lg.border.border-gray-200.px-2.mr-1.text-center(
    style="min-width: 12rem;") {{filename}}
  button.mt-2.px-3.py-1.rounded-lg.bg-gray-200.text-gray-900.transition-colors.duration-200(
    class="hover:bg-gray-300"
    @click="pickFile"
  ) Browse

  template(v-if="filename !== ''")
    .text-xl.mt-4.mb-2 Offset to first translation key
    input.mx-2.h-8.flex.items-center.rounded-lg.border.border-gray-200.px-2.mr-1.text-center(
      v-model.number="offset"
      style="min-width: 12rem;"
    )
    button.mt-2.px-3.py-1.rounded-lg.bg-gray-200.text-gray-900.transition-colors.duration-200(
      class="hover:bg-gray-300"
      @click="loadFile"
    ) Start!
</template>

<script lang="ts">
import { ipcRenderer } from 'electron';
import { defineComponent, ref } from '@vue/composition-api';

import useRouter from '../use/useRouter';

const App = defineComponent({
  setup() {
    const filename = ref('');
    const offset = ref(0);
    const loading = ref(false);

    ipcRenderer.on('pick-reply', (event, arg) => {
      filename.value = arg;
    });

    function loadFile() {
      loading.value = true;
      ipcRenderer.send('load', { filename: filename.value, offset: offset.value });
    }

    return {
      loading,
      filename,
      offset,
      send() { ipcRenderer.send('init'); },
      loadFile,
      pickFile() { ipcRenderer.send('pick'); },
    };
  },
  created() {
    ipcRenderer.on('load-reply', (event, arg) => {
      (this as any).$router.replace({
        name: 'Editor',
        params: {
          parsed: arg,
        },
      });
    });
  },
});

export default App;
</script>

<style lang="scss">
</style>
