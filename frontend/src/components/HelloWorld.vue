<!-- eslint-disable -->
<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <p>Welcome to Your Vue.js + TypeScript App</p>
    <a-button type="primary">Hello Ant Design Vue!</a-button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "HelloWorld",
  props: {
    msg: {
      type: String,
      default: "FastAPI + Vue.js Template",
    },
  },
});
</script>

<style scoped>
.hello {
  text-align: center;
  padding: 40px;
}

h1 {
  color: #42b983;
}
</style>
