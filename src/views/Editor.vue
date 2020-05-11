<template lang="pug">
.editor
  .sticky.top-0.left-0.right-0.h-20.flex.bg-blue-700.items-center
    .p-2
      span.rounded-lg.bg-blue-600.py-1.px-2.text-white original size
      p.text-lg.px-1.text-white {{file.originalSize}} bytes
    .p-2
      span.rounded-lg.bg-blue-600.py-1.px-2.text-white words
      p.text-lg.px-1.text-white {{file.wordPairs.length}}
    .p-2
      span.rounded-lg.py-1.px-2.text-white.transition-colors.duration-200(
        :class="{'bg-red-900': currentSize !== file.originalSize, 'bg-blue-600': currentSize === file.originalSize}"
      ) current size
      p.text-lg.px-1.text-white
        | {{currentSize}} bytes
        span.ml-2(v-if="currentSize !== file.originalSize")
          | (
          | &nbsp;
          template(v-if="currentSize - file.originalSize > 0") +
          | {{currentSize - file.originalSize}}
          | )
    .flex.flex-1.justify-end.items-center.px-2
      div.text-right.mr-2
        p.mt-1.px-1.text-white.font-mono.opacity-50.text-xs(v-if="filepath !== ''") {{filepath}}
        p.px-1.text-white.font-mono.text-xs(v-if="lastSave !== ''") Last saved: {{lastSave.toTimeString()}}
      div
        button.px-3.py-1.rounded-lg.bg-gray-200.text-gray-900.transition-colors.duration-200(
          v-if="filepath === ''"
          class="hover:bg-gray-300"
          @click="pickSaveFile"
        ) Save To...
        button.px-3.py-1.rounded-lg.bg-gray-200.text-gray-900.transition-colors.transition-opacity.duration-200(
          v-else
          class="hover:bg-gray-300"
          :class="{'pointer-events-none opacity-25': saving}"
          @click="saveJson"
        ) Save
  .p-4
    .my-1(v-for="(wp, i) in file.wordPairs")
      .flex
        .w-12 {{i+1}}
        .w-64.mx-2.break-all {{ wp.keyText }}
        .flex-1.mx-2
          input.w-full.h-8.flex.items-center.rounded-lg.border.border-gray-200.px-2.mr-1(
            type="text" :value="wp.wordText" @input="setWordText($event, i)"
          )
          p.px-1.text-sm.text-mono.text-gray-400 {{ hex(wp.word, (wp.encoding === 'ascii')? 2 : 4) }}
        .w-40.flex
          button.h-8.px-3.py-1.rounded-lg.rounded-tr-none.rounded-br-none.transition-colors.duration-200(
            tabindex="-1"
            @click="wp.encoding = 'ascii'; reComputeSize(i)"
            class="focus:outline-none"
            :class="{'bg-blue-400 text-white': wp.encoding === 'ascii', 'bg-gray-200 text-gray-900': wp.encoding !== 'ascii'}"
          ) ascii
          button.h-8.px-3.py-1.rounded-lg.rounded-tl-none.rounded-bl-none.transition-colors.duration-200(
            tabindex="-1"
            @click="wp.encoding = 'unicode'; reComputeSize(i)"
            class="focus:outline-none"
            :class="{'bg-blue-400 text-white': wp.encoding === 'unicode', 'bg-gray-200 text-gray-900': wp.encoding !== 'unicode'}"
          ) unicode
        div.text-xs.font-mono(style="flex: 2;")
          p.text-gray-400 original position: {{ wp.position.from }} - {{ wp.position.to }} (exclusive)
          p.text-gray-400 key hex: {{ hex(wp.key) }}
</template>

<script lang="ts">
import {
  defineComponent, reactive, computed, ref, Ref, onMounted,
} from '@vue/composition-api';
import { ipcRenderer, IpcMainEvent } from 'electron';

type FileJSON = {
  header: string;
  footer: string;
  originalSize: number;
  wordPairs: {
    next: number;
    key: string;
    word: string;
    encoding: string;
    position: {
      from: number;
      to: number;
    };
    size: {
      key: number;
      word: number;
      tail: number;
      total: number;
    };
    wordText: string;
    keyText: string;
  }[];
};

const Editor = defineComponent({
  setup(props) {
    const lastSave: Ref<string | Date> = ref('');
    const saving = ref(false);
    const filepath = ref('');
    const file = reactive(JSON.parse(props.parsed) as FileJSON);

    const currentSize = computed(() => {
      let checkWordPairsSize = 0;
      file.wordPairs.forEach((elm) => {
        checkWordPairsSize += (elm.key.length / 2) + (elm.word.length / 2) + 4 + 4 + (elm.size.tail);
      });
      return (file.header.length / 2) + (file.footer.length / 2) + checkWordPairsSize;
    });

    function reComputeSize(index: number) {
      file.wordPairs[index].word = Buffer
        .from(file.wordPairs[index].wordText, (file.wordPairs[index].encoding === 'ascii') ? 'ascii' : 'utf16le')
        .toString('hex');
    }

    function setWordText(event: Event, index: number) {
      file.wordPairs[index].wordText = (event.target as any).value;
      reComputeSize(index);
    }

    ipcRenderer.on('pick-save-file-reply', (event, arg: any) => {
      filepath.value = arg;
    });

    ipcRenderer.on('save-json-reply', () => {
      saving.value = false;
      lastSave.value = new Date();
    });

    ipcRenderer.on('cmd-save', () => {
      if (filepath.value !== '') {
        saving.value = true;
        ipcRenderer.send('save-json', {
          filepath: filepath.value,
          file,
        });
      }
    });

    function saveJson() {
      saving.value = true;
      ipcRenderer.send('save-json', {
        filepath: filepath.value,
        file,
      });
    }

    onMounted(() => {
      document.onkeyup = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.which === 83) {
          console.log('save');
        }
      };
    });

    return {
      lastSave,
      saving,
      filepath,
      reComputeSize,
      setWordText,
      currentSize,
      file,
      hex(string: string, group = 2) {
        if (group === 2) return (string.match(/.{2}/g) || ['']).join(' ');
        return (string.match(/.{4}/g) || ['']).join(' ');
      },
      pickSaveFile() { ipcRenderer.send('pick-save-file'); },
      saveJson,
    };
  },
  props: {
    parsed: {
      required: true,
      type: String,
    },
  },
});

export default Editor;
</script>

<style lang="scss">
// .editor {}
</style>
