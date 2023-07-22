<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Footer from '../components/Footer.vue'
import { getBlockHeight, searchBRCText } from '../api'
import { shortenAddress } from '../utils'

const REFRESH_INTERVAL = 10000
const vSize = 173.5

const blockHeight = ref(0)
const nextBlockHeight = computed(() => blockHeight.value + 1)

const currentData = ref()
const nextData = ref()

const currentMaxFee = computed(() => {
  const max = currentData.value?.length
    ? Math.max(...currentData.value.map((d: any) => d.fee))
    : 0
  return max
})

const nextMaxFee = computed(() => {
  const max = nextData.value?.length
    ? Math.max(...nextData.value.map((d: any) => d.fee))
    : 0
  return max
})

async function getBitmapInfo(block: number) {
  const name = `${block}.bitmap`
  const { matchCount, detail } = await searchBRCText(name)

  if (matchCount === 0) return []

  return await Promise.all(
    detail.map(async (d: any) => {
      const { inscriptionId, inSatoshi, outSatoshi, address, timestamp } = d
      // const txHex = await getTranscationHex(inscriptionId)
      // const _vSize = (await getAdjustedVsize(txHex!)) || vSize.value
      return {
        name,
        fee: inSatoshi - outSatoshi,
        feeRate: ((inSatoshi - outSatoshi) / vSize).toFixed(2),
        address,
      }
    })
  )
}

const currentTableRowClassName = ({ row }: any) => {
  if (row.fee === Math.max(...currentData.value.map((d: any) => d.fee))) {
    return 'max'
  }
  return ''
}

const nextTableRowClassName = ({ row }: any) => {
  if (row.fee === Math.max(...nextData.value.map((d: any) => d.fee))) {
    return 'max'
  }
  return ''
}

onMounted(async () => {
  blockHeight.value = await getBlockHeight()
  currentData.value = await getBitmapInfo(blockHeight.value)
  nextData.value = await getBitmapInfo(nextBlockHeight.value)

  setInterval(async () => {
    blockHeight.value = await getBlockHeight()
    nextData.value = await getBitmapInfo(nextBlockHeight.value)
  }, REFRESH_INTERVAL)
})
</script>

<template>
  <div class="lg:flex gap-10">
    <el-card class="flex-1">
      <template #header>
        <el-tag size="large" type="warning">{{ nextBlockHeight }}</el-tag>
      </template>
      <el-table :data="nextData" :row-class-name="nextTableRowClassName">
        <el-table-column prop="name" label="铭文" />
        <el-table-column prop="fee" label="费用（sats）" align="center" />
        <el-table-column prop="feeRate" label="费率（sat/vB）" align="center" />
        <el-table-column prop="address" label="地址" align="center">
          <template #default="scope">
            <el-link
              type="primary"
              :underline="false"
              :href="`https://mempool.space/address/${scope.row.address}`"
              target="_blank"
              >{{ shortenAddress(scope.row.address) }}</el-link
            >
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-card class="flex-1 mt-4 md:mt-6 lg:mt-0">
      <template #header>
        <el-tag size="large" type="success">{{ blockHeight }}</el-tag>
      </template>
      <el-table :data="currentData" :row-class-name="currentTableRowClassName">
        <el-table-column prop="name" label="铭文" />
        <el-table-column prop="fee" label="费用（sats）" align="center" />
        <el-table-column prop="feeRate" label="费率（sat/vB）" align="center" />
        <el-table-column prop="address" label="地址" align="center">
          <template #default="scope">
            <el-link
              type="primary"
              :underline="false"
              :href="`https://mempool.space/address/${scope.row.address}`"
              target="_blank"
              >{{ shortenAddress(scope.row.address) }}</el-link
            >
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
  <Footer />
</template>

<style scoped>
.el-button--primary {
  background-color: var(--el-color-primary);
}

.el-button--primary.is-disabled,
.el-button--primary.is-disabled:hover {
  background-color: var(--el-color-primary-light-5);
}
.el-button--primary:hover {
  background-color: var(--el-color-primary-light-3);
}
.el-button--primary:active {
  background-color: var(--el-color-primary-dark-2);
}

.el-table :deep(.max) {
  color: var(--el-color-danger);
}
</style>
