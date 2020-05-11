<template lang="pug">
.app
  router-view
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

const App = defineComponent({
});

export default App;
</script>

<style lang="scss">
@tailwind base;
@tailwind components;
@tailwind utilities;

// .app {}
</style>
