<script setup lang="ts">
const modelValue = defineModel<{
  modelValue: string
}>()
</script>

<template>
  <input
    id="input"
    v-model="modelValue"
    type="text"
    v-bind="$attrs"
    p="x-4 y-2"
    w="250px"
    text="center"
    bg="transparent"
    border="~ rounded stone-300 dark:stone-600"
    focus:border="stone-400 dark:stone-300"
    outline="none active:none"
    transition
  />
</template>
